import mongoose from "mongoose";
import Cart from "../models/cart.js";
import Product from "../models/product.js";
import handleResponse from "../utils/helper.js";
import { getApprovedOrLegacyFilter } from "../services/productModerationService.js";
import { evaluateProductAvailability } from "../services/productSchedulingService.js";

const CART_POPULATE_FIELDS =
  "name slug price salePrice mainImage stock status headerId categoryId subcategoryId sellerId variants unit unitValue orderIncrement minOrderQty maxOrderQty isScheduled scheduleDays availableFromTime availableToTime";

const CUSTOMER_VISIBLE_PRODUCT_MATCH = {
  status: "active",
  ...getApprovedOrLegacyFilter(),
};

function sanitizeCartItems(cart) {
  if (!cart || !Array.isArray(cart.items)) return cart;
  cart.items = cart.items.filter((item) => Boolean(item?.productId));
  return cart;
}

async function getCustomerVisibleProductById(productId) {
  if (!productId || !mongoose.isValidObjectId(productId)) return null;
  return Product.findOne({
    _id: productId,
    ...CUSTOMER_VISIBLE_PRODUCT_MATCH,
  })
    .select("_id name isScheduled scheduleDays availableFromTime availableToTime scheduleStartDate scheduleEndDate minOrderQty maxOrderQty orderIncrement unit")
    .lean();
}

async function fetchPopulatedCart(cartId) {
  const cart = await Cart.findById(cartId)
    .populate({
      path: "items.productId",
      select: CART_POPULATE_FIELDS,
      match: CUSTOMER_VISIBLE_PRODUCT_MATCH,
    })
    .lean();

  return sanitizeCartItems(cart);
}

/* ===============================
   GET CUSTOMER CART
================================ */
export const getCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    let cart = await Cart.findOne({ customerId })
      .populate({
        path: "items.productId",
        select: CART_POPULATE_FIELDS,
        match: CUSTOMER_VISIBLE_PRODUCT_MATCH,
      })
      .lean();

    if (!cart) {
      const newCart = await Cart.create({ customerId, items: [] });
      return handleResponse(res, 200, "Cart fetched successfully", newCart);
    }

    return handleResponse(res, 200, "Cart fetched successfully", sanitizeCartItems(cart));
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   ADD TO CART
================================ */
export const addToCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId, quantity = 1, variantSku = "" } = req.body;
    const normalizedVariantSku = String(variantSku || "").trim();
    const customerVisibleProduct = await getCustomerVisibleProductById(productId);
    if (!customerVisibleProduct) {
      return handleResponse(res, 404, "Product is not available for purchase");
    }

    const scheduleCheck = evaluateProductAvailability(customerVisibleProduct);
    if (!scheduleCheck.isAvailable) {
      return handleResponse(res, 400, `Product is currently unavailable: ${scheduleCheck.message}`);
    }

    const requestedQty = Number(quantity);
    if (customerVisibleProduct.minOrderQty && requestedQty < customerVisibleProduct.minOrderQty) {
      return handleResponse(res, 400, `Minimum order quantity is ${customerVisibleProduct.minOrderQty}`);
    }

    let cart = await Cart.findOne({ customerId });

    if (!cart) {
      cart = new Cart({ customerId, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        String(item.productId?._id || item.productId) === String(productId) &&
        String(item.variantSku || "").trim() === normalizedVariantSku,
    );

    const currentQty = itemIndex > -1 ? Number(cart.items[itemIndex].quantity || 0) : 0;
    const finalQty = Number((currentQty + requestedQty).toFixed(3));

    if (customerVisibleProduct.maxOrderQty && finalQty > customerVisibleProduct.maxOrderQty) {
      return handleResponse(res, 400, `Maximum order limit of ${customerVisibleProduct.maxOrderQty} exceeded for this product`);
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, variantSku: normalizedVariantSku, quantity });
    }

    await cart.save();
    const updatedCart = await fetchPopulatedCart(cart._id);

    return handleResponse(res, 200, "Item added to cart", updatedCart);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE QUANTITY
================================ */
export const updateQuantity = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId, quantity, variantSku = "" } = req.body;
    const normalizedVariantSku = String(variantSku || "").trim();

    let cart = await Cart.findOne({ customerId });

    if (!cart) {
      return handleResponse(res, 404, "Cart not found");
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        String(item.productId?._id || item.productId) === String(productId) &&
        String(item.variantSku || "").trim() === normalizedVariantSku,
    );

    if (itemIndex > -1) {
      const targetQty = Number(Number(quantity || 0).toFixed(3));
      if (targetQty > 0) {
        const product = await getCustomerVisibleProductById(productId);
        if (product) {
          const scheduleCheck = evaluateProductAvailability(product);
          if (!scheduleCheck.isAvailable) {
            return handleResponse(res, 400, `Product is currently unavailable: ${scheduleCheck.message}`);
          }
          if (product.maxOrderQty && targetQty > product.maxOrderQty) {
            return handleResponse(res, 400, `Maximum order limit of ${product.maxOrderQty} exceeded`);
          }
        }
        cart.items[itemIndex].quantity = targetQty;
      } else {
        cart.items.splice(itemIndex, 1);
      }
    } else {
      return handleResponse(res, 404, "Product not in cart");
    }

    await cart.save();
    const updatedCart = await fetchPopulatedCart(cart._id);

    return handleResponse(res, 200, "Cart updated successfully", updatedCart);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   REMOVE FROM CART
================================ */
export const removeFromCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId } = req.params;
    const normalizedVariantSku = String(req.query?.variantSku || "").trim();

    let cart = await Cart.findOne({ customerId });

    if (!cart) {
      return handleResponse(res, 404, "Cart not found");
    }

    cart.items = cart.items.filter((item) => {
      if (String(item.productId?._id || item.productId) !== String(productId)) return true;
      // If variantSku is provided, remove only that variant line.
      if (normalizedVariantSku) {
        return String(item.variantSku || "").trim() !== normalizedVariantSku;
      }
      // If no variantSku is provided, keep legacy behavior: remove all lines for that product.
      return false;
    });

    await cart.save();
    const updatedCart = await fetchPopulatedCart(cart._id);

    return handleResponse(res, 200, "Item removed from cart", updatedCart);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   CLEAR CART
================================ */
export const clearCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    let cart = await Cart.findOne({ customerId });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return handleResponse(res, 200, "Cart cleared successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   ADMIN: GET ABANDONED CARTS
================================ */
export const getAdminAbandonedCarts = async (req, res) => {
  try {
    const { page = 1, limit = 20, hours = 1 } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (p - 1) * l;
    const cutoffHours = Math.max(0.1, parseFloat(hours) || 1);
    const cutoff = new Date(Date.now() - cutoffHours * 3600 * 1000);

    const query = {
      "items.0": { $exists: true },
      updatedAt: { $lte: cutoff },
    };

    const [items, totalCount, notifiedCount] = await Promise.all([
      Cart.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(l)
        .populate("customerId", "_id name email phone")
        .populate("items.productId", "name price salePrice mainImage")
        .lean(),
      Cart.countDocuments(query),
      Cart.countDocuments({ "items.0": { $exists: true }, reminderCount: { $gt: 0 } }),
    ]);

    const formatted = items.map((cart) => {
      const totalAmount = (cart.items || []).reduce((sum, it) => {
        const pr = Number(it.productId?.salePrice || it.productId?.price || 0);
        return sum + pr * (it.quantity || 1);
      }, 0);

      return {
        _id: cart._id,
        customer: cart.customerId || { name: "Registered Customer", phone: "N/A" },
        itemsCount: (cart.items || []).reduce((s, it) => s + (it.quantity || 1), 0),
        items: cart.items || [],
        totalAmount,
        reminderCount: cart.reminderCount || 0,
        lastReminderSentAt: cart.lastReminderSentAt,
        updatedAt: cart.updatedAt,
      };
    });

    return handleResponse(res, 200, "Abandoned carts fetched successfully", {
      items: formatted,
      total: totalCount,
      activeAbandonedCount: totalCount,
      notifiedCount,
      page: p,
      limit: l,
      totalPages: Math.ceil(totalCount / l) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
