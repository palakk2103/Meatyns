import Referral from "../models/referral.js";
import Customer from "../models/customer.js";
import Setting from "../models/setting.js";
import handleResponse from "../utils/helper.js";
import {
  ensureCustomerReferralCode,
  validateReferralCode,
} from "../services/referralService.js";

/* ===============================
   CUSTOMER CONTROLLERS
================================ */

export const getMyReferralDetails = async (req, res) => {
  try {
    const customerId = req.user.id;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return handleResponse(res, 404, "Customer not found");
    }

    const code = await ensureCustomerReferralCode(customer);

    const [referrals, settings] = await Promise.all([
      Referral.find({ referrerId: customerId })
        .populate("refereeId", "name phone createdAt")
        .populate("qualifyingOrderId", "orderId total deliveredAt")
        .sort({ createdAt: -1 })
        .lean(),
      Setting.findOne().select("referral appName").lean(),
    ]);

    const referralConfig = settings?.referral || {
      enabled: true,
      referrerRewardAmount: 100,
      refereeRewardAmount: 50,
      minOrderAmountToQualify: 299,
    };

    const totalInvited = referrals.length;
    const totalRewarded = referrals.filter((r) => r.status === "rewarded").length;
    const totalEarned = referrals
      .filter((r) => r.status === "rewarded")
      .reduce((sum, r) => sum + (r.referrerRewardAmount || 100), 0);

    return handleResponse(res, 200, "Referral program details fetched", {
      referralCode: code,
      programConfig: referralConfig,
      stats: {
        totalInvited,
        totalRewarded,
        totalEarned,
      },
      referrals: referrals.map((r) => ({
        _id: r._id,
        refereeName: r.refereeId?.name || "Friend",
        status: r.status,
        rewardAmount: r.referrerRewardAmount,
        joinedAt: r.createdAt,
        rewardedAt: r.rewardedAt,
        qualifyingOrderId: r.qualifyingOrderId?._id,
        qualifyingOrderNumber: r.qualifyingOrderId?.orderId,
      })),
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const validateCustomerReferralCode = async (req, res) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.id || null;
    const validation = await validateReferralCode(code, currentUserId);
    if (!validation.valid) {
      return handleResponse(res, 400, validation.message);
    }
    return handleResponse(res, 200, "Valid referral code", validation);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   ADMIN CONTROLLERS
================================ */

export const getAllReferralsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "20", 10));
    const status = req.query.status;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Referral.find(query)
        .populate("referrerId", "name email phone referralCode")
        .populate("refereeId", "name email phone createdAt")
        .populate("qualifyingOrderId", "orderId total deliveredAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Admin referrals fetched", {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getReferralStatsAdmin = async (req, res) => {
  try {
    const [totalReferrals, rewardedReferrals] = await Promise.all([
      Referral.countDocuments(),
      Referral.find({ status: "rewarded" }).select("referrerRewardAmount refereeRewardAmount").lean(),
    ]);

    const totalDistributed = rewardedReferrals.reduce(
      (acc, curr) => acc + (curr.referrerRewardAmount || 100) + (curr.refereeRewardAmount || 50),
      0
    );

    return handleResponse(res, 200, "Referral stats fetched", {
      totalReferrals,
      successfulReferrals: rewardedReferrals.length,
      conversionRate: totalReferrals > 0 ? ((rewardedReferrals.length / totalReferrals) * 100).toFixed(1) : "0.0",
      totalDistributed,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
