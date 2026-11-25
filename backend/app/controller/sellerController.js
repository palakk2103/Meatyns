import { normalizeServiceRadiusKm } from "../services/customerVisibilityService.js";
import Seller from "../models/seller.js";
import Order from "../models/order.js";
import Product from "../models/product.js";
import Transaction from "../models/transaction.js";
import { handleResponse, calculateDistance } from "../utils/helper.js";
import mongoose from "mongoose";
import { invalidateSellerName } from "../services/entityNameCache.js";
import { getSellerCurrentOpenStatus } from "../services/storeStatusService.js";
import { debitWallet, getOrCreateWallet } from "../services/finance/walletService.js";
import { LEDGER_TRANSACTION_TYPE, OWNER_TYPE } from "../constants/finance.js";
import { roundCurrency } from "../utils/money.js";

/* ===============================
   GET NEARBY SELLERS
================================ */
export const getNearbySellers = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return handleResponse(res, 400, "Latitude and longitude are required");
    }

    const customerLat = Number(lat);
    const customerLng = Number(lng);

    // Fetch all active/verified sellers
    const sellers = await Seller.find({
      isActive: true,
      isVerified: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [customerLng, customerLat],
          },
          $maxDistance: 100000, // 100km max search area
        },
      },
    }).lean();

    // Filter based on individual service radius and compute store open status
    const nearbySellers = sellers
      .map((seller) => {
        const sellerLng = seller.location.coordinates[0];
        const sellerLat = seller.location.coordinates[1];
        const distance = calculateDistance(
          customerLat,
          customerLng,
          sellerLat,
          sellerLng,
        );

        return {
          ...seller,
          distance,
          isStoreOpen: getSellerCurrentOpenStatus(seller),
        };
      })
      .filter((seller) => seller.distance <= normalizeServiceRadiusKm(seller.serviceRadius));

    return handleResponse(
      res,
      200,
      "Nearby sellers fetched successfully",
      nearbySellers,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   BANK DETAILS (Seller payout destination)
================================ */
const maskAccountNumber = (value) => {
  const digits = String(value || "");
  if (digits.length <= 4) return digits ? "****" : "";
  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
};

const toBankDetailsView = (seller) => {
  const bank = seller?.bankDetails || {};
  const accountNumber = bank.accountNumber || "";
  return {
    isSet: Boolean(accountNumber && bank.ifsc && bank.accountHolderName),
    accountHolderName: bank.accountHolderName || "",
    accountNumberMasked: maskAccountNumber(accountNumber),
    ifsc: bank.ifsc || "",
    bankName: bank.bankName || "",
  };
};

export const getSellerBankDetails = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id).select(
      "+bankDetails.accountNumber",
    );
    if (!seller) return handleResponse(res, 404, "Seller not found");
    return handleResponse(res, 200, "Bank details fetched", toBankDetailsView(seller));
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateSellerBankDetails = async (req, res) => {
  try {
    const accountHolderName = String(req.body?.accountHolderName || "").trim();
    const accountNumber = String(req.body?.accountNumber || "").replace(/\s+/g, "");
    const ifsc = String(req.body?.ifsc || "").trim().toUpperCase();
    const bankName = String(req.body?.bankName || "").trim();

    if (accountHolderName.length < 2 || accountHolderName.length > 100) {
      return handleResponse(res, 400, "Enter the account holder name as on the bank account");
    }
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return handleResponse(res, 400, "Account number must be 9 to 18 digits");
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return handleResponse(res, 400, "Enter a valid IFSC code (e.g. HDFC0001234)");
    }
    if (bankName.length > 100) {
      return handleResponse(res, 400, "Bank name is too long");
    }

    const seller = await Seller.findById(req.user.id).select(
      "+bankDetails.accountNumber",
    );
    if (!seller) return handleResponse(res, 404, "Seller not found");

    seller.bankDetails = {
      accountHolderName,
      accountNumber,
      ifsc,
      bankName,
      updatedAt: new Date(),
    };
    await seller.save();

    return handleResponse(res, 200, "Bank details saved", toBankDetailsView(seller));
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   REQUEST WITHDRAWAL (Seller)
================================ */
export const requestWithdrawal = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const amount = roundCurrency(Number(req.body?.amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return handleResponse(res, 400, "Please enter a valid amount");
    }

    // The admin pays out manually, so we need to know where to send the money.
    const sellerWithBank = await Seller.findById(sellerId).select(
      "+bankDetails.accountNumber",
    );
    const bankView = toBankDetailsView(sellerWithBank);
    if (!bankView.isSet) {
      return handleResponse(
        res,
        400,
        "Please add your bank account details before requesting a withdrawal",
      );
    }

    // The canonical Wallet is the source of truth: only `availableBalance`
    // (post-commission, post return-window hold) can be withdrawn. The amount
    // is debited atomically at request time so the same money can't be
    // requested twice; a rejected request credits it back (see
    // walletAdminService.updateWithdrawalStatusById).
    const reference = `WDR-${Date.now()}`;
    const session = await mongoose.startSession();
    let withdrawal;
    try {
      await session.withTransaction(async () => {
        await debitWallet({
          ownerType: OWNER_TYPE.SELLER,
          ownerId: sellerId,
          amount,
          session,
          ledgerType: LEDGER_TRANSACTION_TYPE.WITHDRAWAL,
          ledgerReference: reference,
          ledgerDescription: "Seller withdrawal requested",
          metadata: { flow: "seller_withdrawal_request" },
        });

        [withdrawal] = await Transaction.create(
          [
            {
              user: sellerId,
              userModel: "Seller",
              type: "Withdrawal",
              amount: -amount,
              status: "Pending",
              reference,
              meta: {
                walletDebited: true,
                bankLast4: bankView.accountNumberMasked.slice(-4),
              },
            },
          ],
          { session },
        );
      });
    } catch (error) {
      if (/^Insufficient/i.test(error.message || "")) {
        const wallet = await getOrCreateWallet(OWNER_TYPE.SELLER, sellerId);
        return handleResponse(
          res,
          400,
          `Insufficient balance. Available: ₹${roundCurrency(wallet.availableBalance || 0)}`,
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }

    return handleResponse(
      res,
      201,
      "Withdrawal request submitted successfully",
      withdrawal,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET SELLER PROFILE
================================ */
export const getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }
    const sellerObj = seller.toObject();
    sellerObj.isStoreOpen = getSellerCurrentOpenStatus(seller);

    return handleResponse(
      res,
      200,
      "Seller profile fetched successfully",
      sellerObj,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE SELLER PROFILE
================================ */
export const updateSellerProfile = async (req, res) => {
  try {
    const { name, shopName, phone, address, locality, pincode, city, state, lat, lng, radius, profileImage } = req.body;

    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    if (name) seller.name = name;
    if (shopName) seller.shopName = shopName;
    if (phone) seller.phone = phone;
    if (profileImage !== undefined) seller.profileImage = profileImage;
    if (address !== undefined) seller.address = address;
    if (locality !== undefined) seller.locality = locality;
    if (pincode !== undefined) seller.pincode = pincode;
    if (city !== undefined) seller.city = city;
    if (state !== undefined) seller.state = state;

    if (lat !== undefined && lng !== undefined) {
      if (lat < -90 || lat > 90)
        return handleResponse(res, 400, "Invalid latitude");
      if (lng < -180 || lng > 180)
        return handleResponse(res, 400, "Invalid longitude");

      seller.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    if (radius !== undefined) {
      if (radius < 1 || radius > 100)
        return handleResponse(res, 400, "Radius must be between 1 and 100 km");
      seller.serviceRadius = Number(radius);
    }

    const updatedSeller = await seller.save();

    invalidateSellerName(req.user.id).catch((err) => {
      console.warn("[Seller] Name cache invalidation failed:", err.message);
    });

    const sellerObj = updatedSeller.toObject();
    sellerObj.isStoreOpen = getSellerCurrentOpenStatus(updatedSeller);

    return handleResponse(
      res,
      200,
      "Profile updated successfully",
      sellerObj,
    );
  } catch (error) {
    if (error.code === 11000) {
      return handleResponse(res, 400, "Phone number already in use");
    }
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   TOGGLE SELLER ONLINE STATUS
================================ */
export const toggleStoreStatus = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    if (seller.adminClosed) {
      return handleResponse(
        res,
        403,
        "Your store has been closed by admin. Please contact admin to reopen.",
      );
    }

    const { isOnline } = req.body;
    seller.isOnline = isOnline !== undefined ? Boolean(isOnline) : !seller.isOnline;
    seller.isManualOverride = true;

    await seller.save();
    const isStoreOpen = getSellerCurrentOpenStatus(seller);

    return handleResponse(
      res,
      200,
      `Store status updated to ${seller.isOnline ? "Online" : "Offline"}`,
      {
        isOnline: seller.isOnline,
        isManualOverride: seller.isManualOverride,
        isStoreOpen,
      },
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE STORE OPERATING HOURS
================================ */
export const updateStoreHours = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    const { enabled, schedule, resetManualOverride } = req.body;

    if (enabled !== undefined) {
      seller.storeHours.enabled = Boolean(enabled);
    }

    if (Array.isArray(schedule)) {
      seller.storeHours.schedule = schedule;
    }

    if (resetManualOverride) {
      seller.isManualOverride = false;
    }

    await seller.save();
    const isStoreOpen = getSellerCurrentOpenStatus(seller);

    return handleResponse(
      res,
      200,
      "Store operating hours updated successfully",
      {
        storeHours: seller.storeHours,
        isManualOverride: seller.isManualOverride,
        isStoreOpen,
      },
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   DELETE SELLER ACCOUNT
================================ */
export const deleteSellerAccount = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    // Check for active orders
    const activeOrder = await Order.findOne({
      seller: sellerId,
      status: { $in: ["Placed", "Accepted", "Processing", "Packed"] },
    });

    if (activeOrder) {
      return handleResponse(
        res,
        400,
        `Cannot delete seller account with active order (#${activeOrder.orderId || activeOrder._id}) in progress. Please fulfill or resolve active orders first.`
      );
    }

    // Inactivate all products for this seller
    await Product.updateMany({ seller: sellerId }, { isActive: false });

    // Invalidate cached seller name
    invalidateSellerName(sellerId).catch(() => {});

    // Delete seller document
    await Seller.findByIdAndDelete(sellerId);

    return handleResponse(res, 200, "Seller account deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};


