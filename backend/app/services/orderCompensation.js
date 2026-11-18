import Transaction from "../models/transaction.js";
import Order from "../models/order.js";
import Payment from "../models/payment.js";
import CheckoutGroup from "../models/checkoutGroup.js";
import { releaseReservedStockForOrder } from "./stockService.js";
import { clearOrderTracking } from "./firebaseService.js";
import { reverseOrderFinanceOnCancellation } from "./finance/orderFinanceService.js";
import logger from "./logger.js";

/**
 * Reverse stock and fail seller transaction when an order is cancelled
 * after stock was deducted at placement.
 *
 * This function is the single chokepoint hit by every cancellation path
 * (seller timeout, payment timeout, delivery timeout, customer cancel,
 * auto-cancel job), so realtime tracking cleanup is wired here once and
 * stays consistent regardless of which caller triggers the cancellation.
 *
 * Audit Phase 3 (C-3): finance reversal (refund wallet redemption + debit
 * admin wallet for captured online payment) is also wired here so that
 * v2 cancellations stop silently keeping the customer's money. The
 * reversal is idempotent via `Order.financeFlags.cancellationReversalApplied`
 * (set inside the reversal's own transaction), so retried jobs and
 * legacy v1 callers that already invoke `reverseOrderFinanceOnCancellation`
 * directly (orderController.cancelOrder) never double-refund.
 */
export async function compensateOrderCancellation(order, orderIdString, opts = {}) {
  const { actorId = null, reason = "Cancelled before settlement" } = opts;

  const existing = await Order.findById(order._id);
  if (existing) {
    await releaseReservedStockForOrder(existing, {
      reason: "Cancelled",
    });
    // A cancelled order must never carry `expiresAt`: older databases have
    // a TTL index on it, which made MongoDB silently delete cancelled
    // (including PAID) orders a minute later.
    existing.expiresAt = undefined;
    await existing.save();
  }

  await Transaction.findOneAndUpdate(
    { reference: orderIdString },
    { status: "Failed" },
  );

  if (existing?.checkoutGroupId) {
    const activeCount = await Order.countDocuments({
      checkoutGroupId: existing.checkoutGroupId,
      status: { $ne: "cancelled" },
      workflowStatus: { $ne: "CANCELLED" },
    });
    if (activeCount === 0) {
      await CheckoutGroup.updateOne(
        { checkoutGroupId: existing.checkoutGroupId },
        {
          $set: {
            status: "CANCELLED",
            paymentStatus: "FAILED",
            "stockReservation.status": "RELEASED",
            "stockReservation.releasedAt": new Date(),
          },
        },
      );
    }
  }

  // Audit Phase 3 (C-3): refund wallet redemption + reverse captured
  // online payment. Idempotent through `financeFlags.cancellationReversalApplied`
  // — orderController.cancelOrder (v1) and this v2 path can both fire safely.
  //
  // Only invoked when the order carries a frozen pricing snapshot
  // (`paymentBreakdown.grandTotal != null`). Older orders that never went
  // through the new placement flow skip the reversal to avoid touching
  // wallets without a known refund amount; ops can backfill via the
  // audit-plan migration if needed.
  //
  // Failures are logged and swallowed (mirroring orderController.cancelOrder
  // L350-358). The cancellation path itself must not roll back stock release
  // or tracking cleanup because the finance reversal failed — surface the
  // error to ops and retry via the standard finance recovery tooling.
  if (existing?.paymentBreakdown?.grandTotal != null) {
    try {
      await reverseOrderFinanceOnCancellation(existing._id, {
        actorId,
        reason,
      });
    } catch (financeError) {
      logger.warn?.("compensateOrderCancellation finance reversal failed", {
        scope: "compensateOrderCancellation",
        orderId: existing.orderId || orderIdString,
        error: financeError?.message,
      });
    }
  }

  // Return the customer's money at the gateway. The finance reversal above
  // only adjusts internal books; without this a paid online order that is
  // cancelled (seller timeout, rejection, delivery timeout...) kept the
  // customer's money until someone refunded it by hand.
  if (existing) {
    await refundCapturedOnlinePaymentForOrder(existing, reason);
  }

  // Fire-and-forget cleanup of realtime tracking nodes. Mongo state is
  // already cancelled at this point — keeping RTDB nodes around would
  // just leave stale "live" markers on customer maps and bloat costs.
  const canonicalOrderId = existing?.orderId || orderIdString;
  if (canonicalOrderId) {
    clearOrderTracking(canonicalOrderId).catch(() => {});
  }
}

/**
 * Issue a Razorpay refund for the online-paid share of a cancelled order.
 * Idempotent per order via `Payment.sideEffectsApplied`, so retried cancel
 * jobs and the late-capture refund path never refund twice. Failures are
 * logged loudly (manual refund needed) but never break the cancellation.
 */
export async function refundCapturedOnlinePaymentForOrder(order, reason = "Order cancelled") {
  if (!order || order.paymentMode !== "ONLINE") return;

  const payment = await Payment.findOne({
    paymentType: "ORDER",
    status: "CAPTURED",
    $or: [
      { orderIds: order._id },
      { order: order._id },
      ...(order.checkoutGroupId ? [{ checkoutGroupId: order.checkoutGroupId }] : []),
    ],
  });
  if (!payment) return;

  const claimKey = `CANCEL_REFUND:${order._id}`;
  const claim = await Payment.updateOne(
    { _id: payment._id, sideEffectsApplied: { $ne: claimKey } },
    { $addToSet: { sideEffectsApplied: claimKey } },
  );
  if (claim.modifiedCount !== 1) return;

  const ordersInPayment = Array.isArray(payment.orderIds) ? payment.orderIds.length : 1;
  const orderAmount = Number(order.paymentBreakdown?.grandTotal ?? order.pricing?.total ?? 0);
  // Single-order payment → refund everything still refundable; otherwise
  // refund only this order's share of the checkout.
  const amount = ordersInPayment <= 1 ? null : orderAmount;
  if (amount !== null && !(amount > 0)) return;

  try {
    const { initiateRazorpayRefund } = await import("./paymentService.js");
    await initiateRazorpayRefund({
      paymentId: payment._id.toString(),
      amount,
      reason: `Auto refund: ${reason}`,
    });
  } catch (error) {
    // Release the claim so a later retry / admin action can refund.
    await Payment.updateOne(
      { _id: payment._id },
      { $pull: { sideEffectsApplied: claimKey } },
    ).catch(() => {});
    logger.error("Auto-refund for cancelled online order failed; needs manual refund", {
      scope: "compensateOrderCancellation",
      orderId: order.orderId,
      paymentId: payment._id.toString(),
      gatewayPaymentId: payment.gatewayPaymentId,
      error: error.message,
    });
  }
}
