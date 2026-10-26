import crypto from "crypto";
import Customer from "../models/customer.js";
import Referral from "../models/referral.js";
import Setting from "../models/setting.js";
import { creditWallet } from "./finance/walletService.js";
import { OWNER_TYPE, LEDGER_TRANSACTION_TYPE } from "../constants/finance.js";
import { createFinanceAuditLog } from "./finance/auditLogService.js";

/**
 * Generates an uppercase 8-character unique referral code (e.g. MEAT4X9K)
 */
export async function ensureCustomerReferralCode(customer) {
  if (customer.referralCode) {
    return customer.referralCode;
  }

  let code = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    attempts += 1;
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
    code = `MEAT${randomSuffix}`;
    const found = await Customer.findOne({ referralCode: code }).select("_id").lean();
    if (!found) {
      exists = false;
    }
  }

  customer.referralCode = code;
  await customer.save();
  return code;
}

/**
 * Validates a referral code format and checks if a valid referrer exists.
 */
export async function validateReferralCode(rawCode, refereeId = null) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code || code.length < 4) {
    return { valid: false, message: "Invalid referral code length" };
  }

  const referrer = await Customer.findOne({ referralCode: code, isActive: true })
    .select("_id name phone referralCode")
    .lean();

  if (!referrer) {
    return { valid: false, message: "Referral code not found or inactive" };
  }

  if (refereeId && String(referrer._id) === String(refereeId)) {
    return { valid: false, message: "You cannot use your own referral code" };
  }

  return {
    valid: true,
    referrer: {
      id: referrer._id,
      name: referrer.name || "Meatyns Member",
      code: referrer.referralCode,
    },
  };
}

/**
 * Links a newly registered customer with the referrer who invited them.
 */
export async function linkReferralOnRegistration({
  refereeCustomer,
  referralCode,
  session = null,
}) {
  if (!referralCode || !refereeCustomer) return null;

  const code = String(referralCode).trim().toUpperCase();
  const referrer = await Customer.findOne({ referralCode: code, isActive: true })
    .select("_id phone")
    .session(session)
    .lean();

  if (!referrer) return null;

  // Prevent self referral
  if (
    String(referrer._id) === String(refereeCustomer._id) ||
    referrer.phone === refereeCustomer.phone
  ) {
    console.warn(`[Referral] Self-referral attempt blocked for user ${refereeCustomer._id}`);
    return null;
  }

  // Prevent duplicate referral linking
  const existingReferral = await Referral.findOne({ refereeId: refereeCustomer._id }).session(session);
  if (existingReferral) {
    return existingReferral;
  }

  const settings = await Setting.findOne().session(session).lean();
  const referralConfig = settings?.referral || {
    referrerRewardAmount: 100,
    refereeRewardAmount: 50,
  };

  const referral = await Referral.create(
    [
      {
        referrerId: referrer._id,
        refereeId: refereeCustomer._id,
        referralCode: code,
        status: "pending",
        referrerRewardAmount: referralConfig.referrerRewardAmount || 100,
        refereeRewardAmount: referralConfig.refereeRewardAmount || 50,
      },
    ],
    { session }
  );

  refereeCustomer.referredBy = referrer._id;
  await refereeCustomer.save({ session });

  return referral[0];
}

/**
 * Triggered on order delivery settlement:
 * If the customer is an invited referee completing their first qualifying order,
 * credit both referrer and referee with auditable wallet rewards.
 */
export async function processOrderDeliveryReferral(order, { session = null } = {}) {
  if (!order || !order.customer) {
    return { processed: false, reason: "No customer linked to order" };
  }

  if (order.financeFlags?.referralRewardProcessed) {
    return { processed: false, reason: "Referral reward already processed for this order" };
  }

  // Look for a pending referral record where this customer is the referee
  const referral = await Referral.findOne({
    refereeId: order.customer,
    status: "pending",
  }).session(session);

  if (!referral) {
    return { processed: false, reason: "No pending referral found for referee" };
  }

  const settings = await Setting.findOne().session(session).lean();
  const referralConfig = settings?.referral || {
    enabled: true,
    minOrderAmountToQualify: 299,
  };

  if (referralConfig.enabled === false) {
    return { processed: false, reason: "Referral program is disabled" };
  }

  const orderTotal =
    order.paymentBreakdown?.grandTotal ||
    order.pricing?.total ||
    order.total ||
    0;

  if (orderTotal < (referralConfig.minOrderAmountToQualify || 299)) {
    return {
      processed: false,
      reason: `Order total (₹${orderTotal}) is below qualifying referral threshold (₹${referralConfig.minOrderAmountToQualify})`,
    };
  }

  // Mark referral as rewarded
  referral.status = "rewarded";
  referral.qualifyingOrderId = order._id;
  referral.rewardedAt = new Date();
  await referral.save({ session });

  // 1. Credit Referrer Wallet
  if (referral.referrerRewardAmount > 0) {
    await creditWallet({
      ownerType: OWNER_TYPE.CUSTOMER,
      ownerId: referral.referrerId,
      amount: referral.referrerRewardAmount,
      bucket: "available",
      session,
      ledgerType: LEDGER_TRANSACTION_TYPE.REFERRAL,
      ledgerReference: `REF-REFERRER-${referral._id}`,
      ledgerDescription: `Referral reward for inviting friend (Order #${order.orderId || order._id})`,
      idempotencyKey: `REF-REFERRER-${referral._id}-${order._id}`,
      metadata: {
        referralId: String(referral._id),
        refereeId: String(referral.refereeId),
        orderId: String(order._id),
      },
    });
  }

  // 2. Credit Referee Wallet
  if (referral.refereeRewardAmount > 0) {
    await creditWallet({
      ownerType: OWNER_TYPE.CUSTOMER,
      ownerId: referral.refereeId,
      amount: referral.refereeRewardAmount,
      bucket: "available",
      session,
      ledgerType: LEDGER_TRANSACTION_TYPE.REFERRAL,
      ledgerReference: `REF-REFEREE-${referral._id}`,
      ledgerDescription: `Welcome referral gift for your first delivered order #${order.orderId || order._id}`,
      idempotencyKey: `REF-REFEREE-${referral._id}-${order._id}`,
      metadata: {
        referralId: String(referral._id),
        referrerId: String(referral.referrerId),
        orderId: String(order._id),
      },
    });
  }

  order.financeFlags = {
    ...(order.financeFlags || {}),
    referralRewardProcessed: true,
  };

  await createFinanceAuditLog(
    {
      action: "REFERRAL_REWARD_SETTLED",
      actorType: OWNER_TYPE.CUSTOMER,
      actorId: referral.referrerId,
      orderId: order._id,
      metadata: {
        referralId: String(referral._id),
        referrerRewardAmount: referral.referrerRewardAmount,
        refereeRewardAmount: referral.refereeRewardAmount,
      },
    },
    { session }
  );

  return {
    processed: true,
    referrerRewardAmount: referral.referrerRewardAmount,
    refereeRewardAmount: referral.refereeRewardAmount,
  };
}
