import Setting from "../models/setting.js";
import { creditWallet } from "./finance/walletService.js";
import { OWNER_TYPE, LEDGER_TRANSACTION_TYPE } from "../constants/finance.js";
import { createFinanceAuditLog } from "./finance/auditLogService.js";

/**
 * Calculates eligible loyalty coins/cashback based on order total and platform settings.
 */
export function calculateLoyaltyRewards(orderTotal, loyaltySettings = {}) {
  const {
    enabled = true,
    pointsPer100Rupees = 5,
    minOrderAmountToEarn = 199,
  } = loyaltySettings;

  if (!enabled || !orderTotal || orderTotal < minOrderAmountToEarn) {
    return 0;
  }

  // E.g. ₹500 spent with 5 pts / ₹100 => 25 coins
  const earned = Math.floor((orderTotal / 100) * pointsPer100Rupees);
  return Math.max(0, earned);
}

/**
 * Processes loyalty reward credit upon successful order delivery and settlement.
 * Strictly idempotent: guarded by `order.financeFlags.loyaltyRewardCredited`.
 */
export async function processOrderDeliveryLoyalty(order, { session = null } = {}) {
  if (!order || !order.customer) {
    return { credited: false, reason: "No customer linked to order" };
  }

  if (order.financeFlags?.loyaltyRewardCredited) {
    return { credited: false, reason: "Loyalty reward already credited" };
  }

  const settings = await Setting.findOne().lean();
  const loyaltyConfig = settings?.loyalty || {
    enabled: true,
    pointsPer100Rupees: 5,
    minOrderAmountToEarn: 199,
  };

  if (!loyaltyConfig.enabled) {
    return { credited: false, reason: "Loyalty rewards disabled in settings" };
  }

  const orderTotal =
    order.paymentBreakdown?.grandTotal ||
    order.pricing?.total ||
    order.total ||
    0;

  const rewardCoins = calculateLoyaltyRewards(orderTotal, loyaltyConfig);
  if (rewardCoins <= 0) {
    return { credited: false, reason: "Order total below threshold or 0 points earned" };
  }

  const customerId = order.customer;
  const idempotencyKey = `LOYALTY-${order._id}`;

  const creditResult = await creditWallet({
    ownerType: OWNER_TYPE.CUSTOMER,
    ownerId: customerId,
    amount: rewardCoins,
    bucket: "available",
    session,
    ledgerType: LEDGER_TRANSACTION_TYPE.CASHBACK,
    ledgerReference: `LOYALTY-${order.orderId || order._id}`,
    ledgerDescription: `Loyalty reward coins earned on order #${order.orderId || order._id}`,
    idempotencyKey,
    metadata: {
      orderId: String(order._id),
      orderNumber: order.orderId,
      orderTotal,
      pointsPer100Rupees: loyaltyConfig.pointsPer100Rupees,
    },
  });

  order.financeFlags = {
    ...(order.financeFlags || {}),
    loyaltyRewardCredited: true,
    loyaltyRewardCoins: rewardCoins,
  };

  await createFinanceAuditLog(
    {
      action: "LOYALTY_REWARD_CREDITED",
      actorType: OWNER_TYPE.CUSTOMER,
      actorId: customerId,
      orderId: order._id,
      metadata: {
        rewardCoins,
        orderTotal,
        walletId: creditResult?.wallet?._id || null,
      },
    },
    { session }
  );

  return { credited: true, rewardCoins, creditResult };
}
