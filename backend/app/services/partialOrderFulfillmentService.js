import mongoose from "mongoose";
import Order from "../models/order.js";
import Payment from "../models/payment.js";
import Transaction from "../models/transaction.js";
import { WORKFLOW_STATUS } from "../constants/orderWorkflow.js";
import {
  ITEM_FULFILLMENT_STATUS,
  ITEM_REFUND_STATUS,
} from "../constants/orderItemStatus.js";
import {
  LEDGER_DIRECTION,
  LEDGER_TRANSACTION_TYPE,
  ORDER_PAYMENT_STATUS,
  OWNER_TYPE,
} from "../constants/finance.js";
import { addMoney, roundCurrency } from "../utils/money.js";
import { releaseStockForOrderItem } from "./stockService.js";
import { compensateOrderCancellation } from "./orderCompensation.js";
import { creditWallet, debitWallet, getOrCreateWallet } from "./finance/walletService.js";
import { createLedgerEntry } from "./finance/ledgerService.js";
import { emitOrderStatusUpdate } from "./orderSocketEmitter.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import logger from "./logger.js";

async function getPaymentRefundFn() {
  const mod = await import("./paymentService.js");
  return mod.initiateRazorpayRefund;
}

function err(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function syncOrderLegacyPricing(order) {
  const breakdown = order.paymentBreakdown || {};
  order.pricing = {
    subtotal: breakdown.productSubtotal ?? order.pricing?.subtotal ?? 0,
    deliveryFee: breakdown.deliveryFeeCharged ?? order.pricing?.deliveryFee ?? 0,
    platformFee: breakdown.handlingFeeCharged ?? order.pricing?.platformFee ?? 0,
    gst: breakdown.taxTotal ?? order.pricing?.gst ?? 0,
    tip: breakdown.tipTotal ?? order.pricing?.tip ?? 0,
    discount: breakdown.discountTotal ?? order.pricing?.discount ?? 0,
    total: breakdown.grandTotal ?? order.pricing?.total ?? 0,
    walletAmount: breakdown.walletAmount ?? order.pricing?.walletAmount ?? 0,
  };
}

/**
 * Calculates the authoritative preview of item-level refund breakdown.
 *
 * Financial Rules (Sprint 3A / ORD-005):
 *   - itemGross = roundCurrency(price * quantity)
 *   - Proportional coupon discount = roundCurrency((itemGross / productSubtotal) * discountTotal)
 *   - Proportional tax = roundCurrency((itemGross / productSubtotal) * taxTotal)
 *   - Shared delivery fee, platform handling fee, and rider tips are preserved for active delivery
 *     and NOT refunded when other items remain in the order.
 *   - eligibleRefund = Math.max(0, itemGross - allocatedDiscount + allocatedTax)
 *   - Proportional wallet refund = roundCurrency((itemGross / productSubtotal) * walletAmount)
 *   - Gateway refund = net eligible refund after wallet refund (for captured online orders)
 *   - COD reduction = net eligible refund after wallet refund (for COD orders)
 */
export function calculateItemRefundPreview(order, itemIndex) {
  if (!order || !Array.isArray(order.items) || itemIndex < 0 || itemIndex >= order.items.length) {
    throw err("Invalid item selection for refund preview", 400);
  }

  const item = order.items[itemIndex];
  const itemGross = roundCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0));

  // Determine order-level totals from paymentBreakdown or fallback to legacy pricing / items sum
  const sumItemsGross = order.items.reduce(
    (sum, it) => sum + roundCurrency((Number(it.price) || 0) * (Number(it.quantity) || 0)),
    0,
  );
  const productSubtotal = roundCurrency(
    order.paymentBreakdown?.productSubtotal ?? order.pricing?.subtotal ?? sumItemsGross,
  );
  const discountTotal = roundCurrency(
    order.paymentBreakdown?.discountTotal ?? order.pricing?.discount ?? 0,
  );
  const taxTotal = roundCurrency(
    order.paymentBreakdown?.taxTotal ?? order.pricing?.gst ?? 0,
  );
  const walletAmount = roundCurrency(
    order.paymentBreakdown?.walletAmount ?? order.pricing?.walletAmount ?? 0,
  );
  const grandTotal = roundCurrency(
    order.paymentBreakdown?.grandTotal ?? order.pricing?.total ?? 0,
  );

  // Proportional discount allocation
  let allocatedDiscount = 0;
  if (discountTotal > 0 && productSubtotal > 0) {
    allocatedDiscount = roundCurrency((itemGross / productSubtotal) * discountTotal);
    allocatedDiscount = Math.min(allocatedDiscount, itemGross);
  }

  // Proportional tax allocation
  let allocatedTax = 0;
  if (taxTotal > 0 && productSubtotal > 0) {
    allocatedTax = roundCurrency((itemGross / productSubtotal) * taxTotal);
  }

  // Net eligible refund for this line item
  const eligibleRefund = Math.max(0, roundCurrency(itemGross - allocatedDiscount + allocatedTax));

  // Proportional wallet allocation
  let allocatedWallet = 0;
  if (walletAmount > 0 && productSubtotal > 0) {
    allocatedWallet = roundCurrency((itemGross / productSubtotal) * walletAmount);
    allocatedWallet = Math.min(allocatedWallet, eligibleRefund);
  }

  const walletRefund = allocatedWallet;
  const isOnlineCaptured =
    order.paymentMode === "ONLINE" &&
    (Boolean(order.financeFlags?.onlinePaymentCaptured) || order.paymentStatus === "PAID");

  const gatewayRefund = isOnlineCaptured ? Math.max(0, roundCurrency(eligibleRefund - walletRefund)) : 0;
  const codReduction = order.paymentMode === "COD" ? Math.max(0, roundCurrency(eligibleRefund - walletRefund)) : 0;

  // Check state eligibility
  const isAlreadyUnavailable = item.status === ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
  const terminalStatuses = ["cancelled", "delivered", "out_for_delivery"];
  const isTerminalOrder =
    terminalStatuses.includes(String(order.status || "").toLowerCase()) ||
    [WORKFLOW_STATUS.CANCELLED, WORKFLOW_STATUS.DELIVERED, WORKFLOW_STATUS.OUT_FOR_DELIVERY].includes(
      order.workflowStatus,
    );

  let canMarkUnavailable = true;
  let reasonMessage = "";

  if (isAlreadyUnavailable) {
    canMarkUnavailable = false;
    reasonMessage = "Item is already marked unavailable.";
  } else if (isTerminalOrder) {
    canMarkUnavailable = false;
    reasonMessage = `Order cannot be partially fulfilled in its current status (${order.status || order.workflowStatus}).`;
  }

  // Count remaining active items
  const activeItemsCount = order.items.filter(
    (it, idx) => idx !== itemIndex && it.status !== ITEM_FULFILLMENT_STATUS.UNAVAILABLE,
  ).length;

  const isOrderFullyCancelled = activeItemsCount === 0;

  return {
    canMarkUnavailable,
    reasonMessage,
    item: {
      itemIndex,
      productId: item.product?._id || item.product,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      unitValue: item.unitValue,
      status: item.status || ITEM_FULFILLMENT_STATUS.AVAILABLE,
      refundStatus: item.refundStatus || ITEM_REFUND_STATUS.NONE,
      refundAmount: item.refundAmount || 0,
    },
    calculation: {
      itemGross,
      allocatedDiscount,
      allocatedTax,
      eligibleRefund,
      walletRefund,
      gatewayRefund,
      codReduction,
      currentOrderGrandTotal: grandTotal,
      newOrderGrandTotal: Math.max(0, roundCurrency(grandTotal - eligibleRefund)),
      activeItemsRemaining: activeItemsCount,
      isOrderFullyCancelled,
    },
  };
}

/**
 * Marks an individual order item as unavailable, releases stock, computes the item refund,
 * executes wallet/gateway refunds, and updates order financial ledger entries.
 */
export async function markOrderItemUnavailable({
  orderId,
  itemIndex,
  reason = "Item out of stock",
  actorId,
  actorRole = "seller",
  session: optsSession = null,
}) {
  const query = mongoose.Types.ObjectId.isValid(orderId)
    ? { $or: [{ _id: new mongoose.Types.ObjectId(orderId) }, { orderId: String(orderId) }] }
    : { orderId: String(orderId) };

  const order = await Order.findOne(query);
  if (!order) {
    throw err("Order not found", 404);
  }

  // 1. Authorization checks
  if (actorRole === "seller") {
    if (order.seller?.toString() !== actorId?.toString()) {
      throw err("Access denied: You are not authorized to modify this order.", 403);
    }
  } else if (actorRole !== "admin") {
    throw err("Access denied: Only merchants and administrators can mark items unavailable.", 403);
  }

  // 2. Order lifecycle validations
  const terminalStatuses = ["cancelled", "delivered", "out_for_delivery"];
  if (
    terminalStatuses.includes(String(order.status || "").toLowerCase()) ||
    [WORKFLOW_STATUS.CANCELLED, WORKFLOW_STATUS.DELIVERED, WORKFLOW_STATUS.OUT_FOR_DELIVERY].includes(
      order.workflowStatus,
    )
  ) {
    throw err(
      `Cannot mark item unavailable: Order is in '${order.status || order.workflowStatus}' status.`,
      400,
    );
  }

  if (itemIndex < 0 || itemIndex >= order.items.length) {
    throw err("Invalid itemIndex specified.", 400);
  }

  const targetItem = order.items[itemIndex];
  if (targetItem.status === ITEM_FULFILLMENT_STATUS.UNAVAILABLE) {
    throw err("This item has already been marked unavailable.", 400);
  }

  // 3. Compute authoritative refund breakdown
  const preview = calculateItemRefundPreview(order, itemIndex);
  const {
    itemGross,
    allocatedDiscount,
    eligibleRefund,
    walletRefund,
    gatewayRefund,
    codReduction,
    isOrderFullyCancelled,
  } = preview.calculation;

  const now = new Date();
  const trimmedReason = String(reason || "Item out of stock").trim();

  // 4. Session & Transaction Execution
  let session = optsSession || null;
  let useTransaction = false;

  if (!session && mongoose.connection?.readyState === 1 && typeof mongoose.startSession === "function") {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (sessErr) {
      logger.debug("Mongo session unavailable, running in single-op mode", { error: sessErr.message });
      session = null;
      useTransaction = false;
    }
  }

  let gatewayRefundResult = null;
  let gatewayRefundSuccess = false;
  let gatewayRefundErrorMsg = null;

  try {
    // A. Release Stock for this item exactly once
    await releaseStockForOrderItem(order, itemIndex, {
      session,
      reason: `Out of stock: ${trimmedReason}`,
    });

    // B. Process Wallet Refund (if customer used wallet balance for this order)
    if (walletRefund > 0 && order.customer) {
      await creditWallet({
        ownerType: OWNER_TYPE.CUSTOMER,
        ownerId: order.customer,
        amount: walletRefund,
        bucket: "available",
        session,
        ledgerType: LEDGER_TRANSACTION_TYPE.WALLET_REFUND,
        ledgerReference: `REF-ITEM-WALLET-${order.orderId}-${itemIndex + 1}`,
        ledgerDescription: `Refund for unavailable item: ${targetItem.name || "Item"}`,
        orderId: order._id,
      });

      const customerWallet = await getOrCreateWallet(OWNER_TYPE.CUSTOMER, order.customer, { session });
      await createLedgerEntry(
        {
          orderId: order._id,
          walletId: customerWallet._id,
          actorType: OWNER_TYPE.CUSTOMER,
          actorId: order.customer,
          type: LEDGER_TRANSACTION_TYPE.WALLET_REFUND,
          direction: LEDGER_DIRECTION.CREDIT,
          amount: walletRefund,
          paymentMode: "WALLET",
          description: `Refund for unavailable item: ${targetItem.name || "Item"} (${trimmedReason})`,
          reference: `${order.orderId}-ITEM-${itemIndex + 1}`,
        },
        { session },
      );

      await Transaction.create(
        [
          {
            user: order.customer,
            userModel: "User",
            order: order._id,
            type: "Wallet Refund",
            amount: walletRefund,
            status: "Settled",
            reference: `REF-ITEM-WALLET-${order.orderId}-${itemIndex + 1}-${Date.now()}`,
            reason: `Item unavailable: ${targetItem.name}`,
          },
        ],
        session ? { session } : {},
      );

      // Decrement walletAmount in order payment breakdown
      order.paymentBreakdown.walletAmount = Math.max(
        0,
        roundCurrency((order.paymentBreakdown.walletAmount || 0) - walletRefund),
      );
    }

    // C. Process Online Gateway Refund (if payment was captured via Razorpay)
    if (gatewayRefund > 0) {
      targetItem.refundStatus = ITEM_REFUND_STATUS.PENDING;
      try {
        const paymentLookup = order.checkoutGroupId
          ? { $or: [{ checkoutGroupId: order.checkoutGroupId }, { order: order._id }, { publicOrderId: order.orderId }] }
          : { $or: [{ order: order._id }, { publicOrderId: order.orderId }] };

        const payment = await Payment.findOne(paymentLookup);

        if (payment) {
          const initiateRefund = await getPaymentRefundFn();
          gatewayRefundResult = await initiateRefund({
            paymentId: payment._id,
            amount: gatewayRefund,
            reason: `Partial fulfillment: ${targetItem.name} unavailable - ${trimmedReason}`,
            adminId: actorId,
          });

          gatewayRefundSuccess = Boolean(gatewayRefundResult?.success);
          targetItem.refundId = gatewayRefundResult?.refund?.refundId || gatewayRefundResult?.payment?.gatewayRefundId;
          targetItem.refundStatus = ITEM_REFUND_STATUS.COMPLETED;
          targetItem.refundedAt = now;

          // Debit Admin wallet for the captured payment refund
          await debitWallet({
            ownerType: OWNER_TYPE.ADMIN,
            ownerId: null,
            amount: gatewayRefund,
            bucket: "available",
            session,
            ledgerType: LEDGER_TRANSACTION_TYPE.REFUND,
            ledgerReference: `REF-ITEM-ONLINE-${order.orderId}-${itemIndex + 1}`,
            ledgerDescription: `Admin refund debit for unavailable item: ${targetItem.name}`,
            orderId: order._id,
          });

          const adminWallet = await getOrCreateWallet(OWNER_TYPE.ADMIN, null, { session });
          await createLedgerEntry(
            {
              orderId: order._id,
              walletId: adminWallet._id,
              actorType: OWNER_TYPE.ADMIN,
              actorId: null,
              type: LEDGER_TRANSACTION_TYPE.REFUND,
              direction: LEDGER_DIRECTION.DEBIT,
              amount: gatewayRefund,
              paymentMode: "ONLINE",
              description: `Gateway refund for unavailable item: ${targetItem.name}`,
              reference: `${order.orderId}-ITEM-${itemIndex + 1}`,
            },
            { session },
          );

          await Transaction.create(
            [
              {
                user: actorId || order.customer,
                userModel: actorRole === "admin" ? "Admin" : "User",
                order: order._id,
                type: "Refund",
                amount: -gatewayRefund,
                status: "Settled",
                reference: `REF-ITEM-GATEWAY-${order.orderId}-${itemIndex + 1}-${Date.now()}`,
                reason: `Item unavailable gateway refund: ${targetItem.name}`,
              },
            ],
            session ? { session } : {},
          );
        } else {
          // No payment document found to initiate refund
          targetItem.refundStatus = ITEM_REFUND_STATUS.FAILED;
          gatewayRefundErrorMsg = "No matching payment record found for gateway refund.";
        }
      } catch (refundError) {
        logger.error("Item-level gateway refund failed", {
          orderId: order.orderId,
          itemIndex,
          error: refundError.message,
        });
        targetItem.refundStatus = ITEM_REFUND_STATUS.FAILED;
        targetItem.refundReason = refundError.message;
        gatewayRefundErrorMsg = refundError.message;
      }
    } else if (order.paymentMode === "COD") {
      targetItem.refundStatus = ITEM_REFUND_STATUS.COMPLETED;
      targetItem.refundedAt = now;
      order.paymentBreakdown.codPendingAmount = Math.max(
        0,
        roundCurrency((order.paymentBreakdown.codPendingAmount || order.paymentBreakdown.grandTotal || 0) - codReduction),
      );
    } else {
      // 100% wallet paid or already handled
      targetItem.refundStatus = ITEM_REFUND_STATUS.COMPLETED;
      targetItem.refundedAt = now;
    }

    // D. Update item attributes
    targetItem.status = ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
    targetItem.unavailableReason = trimmedReason;
    targetItem.markedUnavailableAt = now;
    targetItem.markedUnavailableBy = actorId;
    targetItem.refundAmount = eligibleRefund;

    // E. Rebalance seller payout & platform commission in financial breakdown
    const lineItemIndex = Array.isArray(order.paymentBreakdown?.lineItems)
      ? order.paymentBreakdown.lineItems.findIndex(
          (li) => String(li.productId) === String(targetItem.product?._id || targetItem.product),
        )
      : -1;

    let sellerPayoutReduction = 0;
    let adminCommissionReduction = 0;

    if (lineItemIndex >= 0 && order.paymentBreakdown.lineItems[lineItemIndex]) {
      const li = order.paymentBreakdown.lineItems[lineItemIndex];
      sellerPayoutReduction = roundCurrency(Number(li.sellerPayout) || 0);
      adminCommissionReduction = roundCurrency(Number(li.adminProductCommission) || 0);
    } else {
      // Default commission allocation fallback if lineItems snapshot was missing
      sellerPayoutReduction = roundCurrency(itemGross * 0.85);
      adminCommissionReduction = roundCurrency(itemGross * 0.15);
    }

    order.paymentBreakdown = order.paymentBreakdown || {};
    order.paymentBreakdown.productSubtotal = Math.max(
      0,
      roundCurrency((order.paymentBreakdown.productSubtotal || 0) - itemGross),
    );
    order.paymentBreakdown.sellerPayoutTotal = Math.max(
      0,
      roundCurrency((order.paymentBreakdown.sellerPayoutTotal || 0) - sellerPayoutReduction),
    );
    order.paymentBreakdown.adminProductCommissionTotal = Math.max(
      0,
      roundCurrency((order.paymentBreakdown.adminProductCommissionTotal || 0) - adminCommissionReduction),
    );
    order.paymentBreakdown.grandTotal = Math.max(
      0,
      roundCurrency((order.paymentBreakdown.grandTotal || 0) - eligibleRefund),
    );
    order.paymentBreakdown.discountTotal = Math.max(
      0,
      roundCurrency((order.paymentBreakdown.discountTotal || 0) - allocatedDiscount),
    );

    syncOrderLegacyPricing(order);

    // F. Update partial fulfillment tracking & audit history
    order.partialFulfillment = order.partialFulfillment || {
      hasUnavailableItems: false,
      refundTotal: 0,
      refundStatus: "NONE",
      auditHistory: [],
    };
    order.partialFulfillment.hasUnavailableItems = true;
    order.partialFulfillment.refundTotal = addMoney(
      order.partialFulfillment.refundTotal || 0,
      eligibleRefund,
    );
    if (targetItem.refundStatus === ITEM_REFUND_STATUS.FAILED) {
      order.partialFulfillment.refundStatus = "FAILED";
    } else if (order.partialFulfillment.refundStatus !== "FAILED") {
      order.partialFulfillment.refundStatus = "PARTIAL_REFUNDED";
    }

    order.partialFulfillment.auditHistory = order.partialFulfillment.auditHistory || [];
    order.partialFulfillment.auditHistory.push({
      itemIndex,
      productId: targetItem.product?._id || targetItem.product,
      productName: targetItem.name,
      action: "MARKED_UNAVAILABLE",
      reason: trimmedReason,
      actorId,
      actorRole,
      refundAmount: eligibleRefund,
      timestamp: now,
    });

    // G. Full order cancellation check
    // If ALL items in the order are now unavailable, cancel the entire order
    if (isOrderFullyCancelled) {
      order.status = "cancelled";
      order.orderStatus = "cancelled";
      order.workflowStatus = WORKFLOW_STATUS.CANCELLED;
      order.cancelledBy = actorRole === "admin" ? "admin" : "seller";
      order.cancelReason = `All items unavailable: ${trimmedReason}`;

      await order.save(session ? { session } : {});
      if (useTransaction && session) {
        await session.commitTransaction();
      }

      await compensateOrderCancellation(order, order.orderId, {
        actorId,
        reason: `All items unavailable: ${trimmedReason}`,
      });

      emitOrderStatusUpdate(
        order.orderId,
        {
          status: "cancelled",
          workflowStatus: WORKFLOW_STATUS.CANCELLED,
          cancelReason: order.cancelReason,
        },
        order.customer?._id || order.customer,
      );

      return {
        order,
        item: targetItem,
        itemIndex,
        isOrderFullyCancelled: true,
        calculation: preview.calculation,
        gatewayRefundSuccess,
        gatewayRefundError: gatewayRefundErrorMsg,
      };
    }

    // Save updated order
    await order.save(session ? { session } : {});
    if (useTransaction && session) {
      await session.commitTransaction();
    }
  } catch (error) {
    if (useTransaction && session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.warn("Transaction abort error", { error: abortErr.message });
      }
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }

  // 5. Emit real-time events to customer and seller
  try {
    emitOrderStatusUpdate(
      order.orderId,
      {
        orderId: order.orderId,
        partialFulfillment: order.partialFulfillment,
        items: order.items,
        pricing: order.pricing,
        paymentBreakdown: order.paymentBreakdown,
      },
      order.customer?._id || order.customer,
    );

    emitNotificationEvent(NOTIFICATION_EVENTS.ORDER_UPDATED, {
      orderId: order.orderId,
      customerId: order.customer?._id || order.customer,
      userId: order.customer?._id || order.customer,
      sellerId: order.seller?._id || order.seller,
      message: `Item '${targetItem.name}' is unavailable and has been refunded (₹${eligibleRefund.toFixed(2)}). Remaining items are being prepared.`,
    });
  } catch (emitErr) {
    logger.warn("Socket or notification event emission failed", { error: emitErr.message });
  }

  return {
    order,
    item: targetItem,
    itemIndex,
    isOrderFullyCancelled: false,
    calculation: preview.calculation,
    gatewayRefundSuccess,
    gatewayRefundError: gatewayRefundErrorMsg,
  };
}

/**
 * Admin-only: Retries a failed gateway refund for an unavailable item.
 */
export async function retryOrderItemRefund({
  orderId,
  itemIndex,
  actorId,
  actorRole = "admin",
}) {
  if (actorRole !== "admin") {
    throw err("Only administrators can retry failed refunds.", 403);
  }

  const query = mongoose.Types.ObjectId.isValid(orderId)
    ? { $or: [{ _id: new mongoose.Types.ObjectId(orderId) }, { orderId: String(orderId) }] }
    : { orderId: String(orderId) };

  const order = await Order.findOne(query);
  if (!order) {
    throw err("Order not found", 404);
  }

  if (itemIndex < 0 || itemIndex >= order.items.length) {
    throw err("Invalid itemIndex.", 400);
  }

  const item = order.items[itemIndex];
  if (item.status !== ITEM_FULFILLMENT_STATUS.UNAVAILABLE) {
    throw err("Refund can only be retried for unavailable items.", 400);
  }

  if (item.refundStatus === ITEM_REFUND_STATUS.COMPLETED) {
    throw err("Refund has already been completed successfully for this item.", 400);
  }

  const refundAmount = Number(item.refundAmount) || 0;
  if (refundAmount <= 0) {
    throw err("Item has no eligible refund amount.", 400);
  }

  const paymentLookup = order.checkoutGroupId
    ? { $or: [{ checkoutGroupId: order.checkoutGroupId }, { order: order._id }, { publicOrderId: order.orderId }] }
    : { $or: [{ order: order._id }, { publicOrderId: order.orderId }] };

  const payment = await Payment.findOne(paymentLookup);
  if (!payment) {
    throw err("Payment record not found for this order.", 404);
  }

  const initiateRefund = await getPaymentRefundFn();
  const refundResult = await initiateRefund({
    paymentId: payment._id,
    amount: refundAmount,
    reason: `Admin retry refund: ${item.name} unavailable`,
    adminId: actorId,
  });

  item.refundStatus = ITEM_REFUND_STATUS.COMPLETED;
  item.refundId = refundResult?.refund?.refundId || refundResult?.payment?.gatewayRefundId;
  item.refundedAt = new Date();
  item.refundReason = null;

  // Check if all failed items are now resolved
  const anyFailed = order.items.some((it) => it.refundStatus === ITEM_REFUND_STATUS.FAILED);
  if (!anyFailed && order.partialFulfillment) {
    order.partialFulfillment.refundStatus = "PARTIAL_REFUNDED";
  }

  order.partialFulfillment?.auditHistory?.push({
    itemIndex,
    productId: item.product?._id || item.product,
    productName: item.name,
    action: "REFUND_RETRIED",
    reason: "Admin retried gateway refund successfully",
    actorId,
    actorRole,
    refundAmount,
    timestamp: new Date(),
  });

  await order.save();

  return {
    order,
    item,
    refundResult,
  };
}
