import { jest } from "@jest/globals";

const mockOrderFindOne = jest.fn();
const mockPaymentFindOne = jest.fn();
const mockProductUpdateOne = jest.fn();
const mockStockHistoryCreate = jest.fn();
const mockTransactionCreate = jest.fn();
const mockCreditWallet = jest.fn();
const mockDebitWallet = jest.fn();
const mockGetOrCreateWallet = jest.fn();
const mockCreateLedgerEntry = jest.fn();
const mockInitiateRazorpayRefund = jest.fn();
const mockCompensateOrderCancellation = jest.fn();
const mockEmitOrderStatusUpdate = jest.fn();
const mockEmitNotificationEvent = jest.fn();

jest.unstable_mockModule("../app/models/order.js", () => ({
  default: {
    findOne: mockOrderFindOne,
  },
}));

jest.unstable_mockModule("../app/models/payment.js", () => ({
  default: {
    findOne: mockPaymentFindOne,
  },
}));

jest.unstable_mockModule("../app/models/product.js", () => ({
  default: {
    updateOne: mockProductUpdateOne,
  },
}));

jest.unstable_mockModule("../app/models/stockHistory.js", () => ({
  default: {
    create: mockStockHistoryCreate,
  },
}));

jest.unstable_mockModule("../app/models/transaction.js", () => ({
  default: {
    create: mockTransactionCreate,
  },
}));

jest.unstable_mockModule("../app/services/finance/walletService.js", () => ({
  creditWallet: mockCreditWallet,
  debitWallet: mockDebitWallet,
  getOrCreateWallet: mockGetOrCreateWallet,
}));

jest.unstable_mockModule("../app/services/finance/ledgerService.js", () => ({
  createLedgerEntry: mockCreateLedgerEntry,
}));

jest.unstable_mockModule("../app/services/paymentService.js", () => ({
  initiateRazorpayRefund: mockInitiateRazorpayRefund,
}));

jest.unstable_mockModule("../app/services/orderCompensation.js", () => ({
  compensateOrderCancellation: mockCompensateOrderCancellation,
}));

jest.unstable_mockModule("../app/services/orderSocketEmitter.js", () => ({
  emitOrderStatusUpdate: mockEmitOrderStatusUpdate,
}));

jest.unstable_mockModule("../app/modules/notifications/notification.emitter.js", () => ({
  emitNotificationEvent: mockEmitNotificationEvent,
}));

const {
  calculateItemRefundPreview,
  markOrderItemUnavailable,
  retryOrderItemRefund,
} = await import("../app/services/partialOrderFulfillmentService.js");

const {
  releaseStockForOrderItem,
  releaseReservedStockForOrder,
} = await import("../app/services/stockService.js");

const {
  ITEM_FULFILLMENT_STATUS,
  ITEM_REFUND_STATUS,
  WORKFLOW_STATUS,
} = await import("../app/constants/orderWorkflow.js");

describe("Partial Order Fulfillment & Item-Wise Refunds (ORD-005)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrCreateWallet.mockResolvedValue({ _id: "wallet-test-1" });
    mockCreditWallet.mockResolvedValue({ before: 0, after: 100 });
    mockDebitWallet.mockResolvedValue({ before: 1000, after: 900 });
    mockCreateLedgerEntry.mockResolvedValue({ _id: "ledger-test-1" });
    mockProductUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockStockHistoryCreate.mockResolvedValue([{}]);
    mockTransactionCreate.mockResolvedValue([{}]);
  });

  function buildSampleOrder(overrides = {}) {
    const defaultOrder = {
      _id: "order-sample-1",
      orderId: "ORD-Sample-101",
      customer: "cust-1",
      seller: "seller-1",
      status: "confirmed",
      orderStatus: "confirmed",
      workflowStatus: WORKFLOW_STATUS.DELIVERY_SEARCH,
      paymentMode: "ONLINE",
      paymentStatus: "PAID",
      financeFlags: { onlinePaymentCaptured: true },
      items: [
        {
          product: "prod-1",
          name: "Chicken Curry Cut",
          quantity: 2,
          price: 200,
          status: ITEM_FULFILLMENT_STATUS.AVAILABLE,
          refundStatus: ITEM_REFUND_STATUS.NONE,
          stockReleased: false,
        },
        {
          product: "prod-2",
          name: "Mutton Biryani Cut",
          quantity: 1,
          price: 500,
          status: ITEM_FULFILLMENT_STATUS.AVAILABLE,
          refundStatus: ITEM_REFUND_STATUS.NONE,
          stockReleased: false,
        },
        {
          product: "prod-3",
          name: "Eggs 6-Pack",
          quantity: 1,
          price: 100,
          status: ITEM_FULFILLMENT_STATUS.AVAILABLE,
          refundStatus: ITEM_REFUND_STATUS.NONE,
          stockReleased: false,
        },
      ],
      paymentBreakdown: {
        productSubtotal: 1000, // 400 + 500 + 100
        deliveryFeeCharged: 40,
        handlingFeeCharged: 10,
        discountTotal: 100, // 10% coupon discount
        taxTotal: 0,
        tipTotal: 0,
        walletAmount: 0,
        grandTotal: 950, // 1000 + 40 + 10 - 100 = 950
        sellerPayoutTotal: 850,
        adminProductCommissionTotal: 150,
        lineItems: [
          { productId: "prod-1", sellerPayout: 340, adminProductCommission: 60 },
          { productId: "prod-2", sellerPayout: 425, adminProductCommission: 75 },
          { productId: "prod-3", sellerPayout: 85, adminProductCommission: 15 },
        ],
      },
      pricing: {
        subtotal: 1000,
        deliveryFee: 40,
        platformFee: 10,
        discount: 100,
        total: 950,
        walletAmount: 0,
      },
      partialFulfillment: {
        hasUnavailableItems: false,
        refundTotal: 0,
        refundStatus: "NONE",
        auditHistory: [],
      },
      save: jest.fn().mockResolvedValue(true),
    };

    return Object.assign({}, defaultOrder, overrides);
  }

  describe("1. Item-Level Refund Calculation & Preview", () => {
    it("correctly allocates proportional discounts and computes net eligible refund", () => {
      const order = buildSampleOrder();
      // Item 0: Chicken Curry Cut (price: 200, qty: 2 => gross: 400).
      // Product subtotal: 1000. Discount: 100.
      // Proportional discount = (400 / 1000) * 100 = 40.
      // Eligible refund = 400 - 40 = 360.
      const preview = calculateItemRefundPreview(order, 0);

      expect(preview.canMarkUnavailable).toBe(true);
      expect(preview.calculation.itemGross).toBe(400);
      expect(preview.calculation.allocatedDiscount).toBe(40);
      expect(preview.calculation.eligibleRefund).toBe(360);
      expect(preview.calculation.gatewayRefund).toBe(360);
      expect(preview.calculation.walletRefund).toBe(0);
      expect(preview.calculation.isOrderFullyCancelled).toBe(false);
      expect(preview.calculation.activeItemsRemaining).toBe(2);
    });

    it("correctly splits refund between wallet and gateway if partial wallet was used", () => {
      const order = buildSampleOrder({
        paymentBreakdown: {
          productSubtotal: 1000,
          discountTotal: 0,
          walletAmount: 200, // 20% paid by wallet
          grandTotal: 850,
        },
      });

      // Item 1: Mutton Biryani Cut (gross: 500)
      // Allocated wallet = (500 / 1000) * 200 = 100
      // Gateway refund = 500 - 100 = 400
      const preview = calculateItemRefundPreview(order, 1);

      expect(preview.calculation.eligibleRefund).toBe(500);
      expect(preview.calculation.walletRefund).toBe(100);
      expect(preview.calculation.gatewayRefund).toBe(400);
    });

    it("disallows preview on terminal status orders (delivered/cancelled)", () => {
      const deliveredOrder = buildSampleOrder({ status: "delivered", workflowStatus: WORKFLOW_STATUS.DELIVERED });
      const preview = calculateItemRefundPreview(deliveredOrder, 0);

      expect(preview.canMarkUnavailable).toBe(false);
      expect(preview.reasonMessage).toMatch(/cannot be partially fulfilled/i);
    });

    it("disallows preview if item is already unavailable", () => {
      const order = buildSampleOrder();
      order.items[0].status = ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
      const preview = calculateItemRefundPreview(order, 0);

      expect(preview.canMarkUnavailable).toBe(false);
      expect(preview.reasonMessage).toMatch(/already marked unavailable/i);
    });
  });

  describe("2. Partial Item Availability & Fulfillment Flow", () => {
    it("marks 1 item of a 3-item order unavailable, releases stock, refunds gateway, and preserves other items", async () => {
      const order = buildSampleOrder();
      mockOrderFindOne.mockResolvedValue(order);
      mockPaymentFindOne.mockResolvedValue({
        _id: "pay-1",
        gatewayOrderId: "order_rzp_123",
        gatewayPaymentId: "pay_rzp_456",
        amount: 95000,
        refundedAmount: 0,
        status: "CAPTURED",
      });
      mockInitiateRazorpayRefund.mockResolvedValue({
        success: true,
        refund: { refundId: "rfnd_item_01", amount: 36000 },
      });

      const result = await markOrderItemUnavailable({
        orderId: order.orderId,
        itemIndex: 0,
        reason: "Supplier out of stock",
        actorId: "seller-1",
        actorRole: "seller",
      });

      expect(result.isOrderFullyCancelled).toBe(false);
      expect(order.items[0].status).toBe(ITEM_FULFILLMENT_STATUS.UNAVAILABLE);
      expect(order.items[0].unavailableReason).toBe("Supplier out of stock");
      expect(order.items[0].refundStatus).toBe(ITEM_REFUND_STATUS.COMPLETED);
      expect(order.items[0].refundAmount).toBe(360);
      expect(order.items[0].stockReleased).toBe(true);

      // Remaining items are still available
      expect(order.items[1].status).toBe(ITEM_FULFILLMENT_STATUS.AVAILABLE);
      expect(order.items[2].status).toBe(ITEM_FULFILLMENT_STATUS.AVAILABLE);

      // Order total recalculated
      expect(order.paymentBreakdown.productSubtotal).toBe(600); // 1000 - 400
      expect(order.paymentBreakdown.grandTotal).toBe(590); // 950 - 360
      expect(order.paymentBreakdown.sellerPayoutTotal).toBe(510); // 850 - 340

      // Razorpay refund was called with 360
      expect(mockInitiateRazorpayRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 360,
          paymentId: "pay-1",
        }),
      );

      // Stock was released
      expect(mockProductUpdateOne).toHaveBeenCalled();
      expect(mockStockHistoryCreate).toHaveBeenCalled();

      // Saved order
      expect(order.save).toHaveBeenCalled();
    });

    it("adjusts COD collection for COD orders without gateway refund", async () => {
      const order = buildSampleOrder({
        paymentMode: "COD",
        paymentStatus: "PENDING_CASH_COLLECTION",
        financeFlags: { onlinePaymentCaptured: false },
      });
      order.paymentBreakdown.codPendingAmount = 950;
      mockOrderFindOne.mockResolvedValue(order);

      const result = await markOrderItemUnavailable({
        orderId: order.orderId,
        itemIndex: 0,
        reason: "Damaged packaging",
        actorId: "seller-1",
        actorRole: "seller",
      });

      expect(result.isOrderFullyCancelled).toBe(false);
      expect(order.items[0].status).toBe(ITEM_FULFILLMENT_STATUS.UNAVAILABLE);
      expect(order.items[0].refundStatus).toBe(ITEM_REFUND_STATUS.COMPLETED);
      // COD pending amount reduced by 360
      expect(order.paymentBreakdown.codPendingAmount).toBe(590);
      // Gateway refund was NOT called
      expect(mockInitiateRazorpayRefund).not.toHaveBeenCalled();
    });

    it("cancels entire order when all items become unavailable", async () => {
      const order = buildSampleOrder();
      // Items 1 and 2 already unavailable
      order.items[1].status = ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
      order.items[2].status = ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
      mockOrderFindOne.mockResolvedValue(order);

      const result = await markOrderItemUnavailable({
        orderId: order.orderId,
        itemIndex: 0,
        reason: "Store closed unexpectedly",
        actorId: "seller-1",
        actorRole: "seller",
      });

      expect(result.isOrderFullyCancelled).toBe(true);
      expect(order.status).toBe("cancelled");
      expect(order.workflowStatus).toBe(WORKFLOW_STATUS.CANCELLED);
      expect(mockCompensateOrderCancellation).toHaveBeenCalledWith(
        order,
        order.orderId,
        expect.objectContaining({ reason: expect.stringContaining("All items unavailable") }),
      );
    });
  });

  describe("3. Duplicate Action & Exactly-Once Inventory Release", () => {
    it("rejects duplicate unavailable attempt on an already unavailable item", async () => {
      const order = buildSampleOrder();
      order.items[0].status = ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
      mockOrderFindOne.mockResolvedValue(order);

      await expect(
        markOrderItemUnavailable({
          orderId: order.orderId,
          itemIndex: 0,
          reason: "Repeat click",
          actorId: "seller-1",
          actorRole: "seller",
        }),
      ).rejects.toThrow(/already been marked unavailable/i);
    });

    it("ensures stock is released exactly once and not double-released if full order is cancelled later", async () => {
      const order = buildSampleOrder();

      // Release stock for item 0
      const released = await releaseStockForOrderItem(order, 0, { reason: "Partial unavailable" });
      expect(released).toBe(true);
      expect(order.items[0].stockReleased).toBe(true);
      expect(mockProductUpdateOne).toHaveBeenCalledTimes(1);

      // Re-invoking releaseStockForOrderItem on item 0 is idempotent
      const releasedAgain = await releaseStockForOrderItem(order, 0, { reason: "Repeat" });
      expect(releasedAgain).toBe(false);
      expect(mockProductUpdateOne).toHaveBeenCalledTimes(1);

      // If releaseReservedStockForOrder is subsequently called, item 0 is skipped
      mockProductUpdateOne.mockClear();
      await releaseReservedStockForOrder(order, { reason: "Order cancelled" });

      // Only items 1 and 2 should have stock incremented
      expect(mockProductUpdateOne).toHaveBeenCalledTimes(2);
    });
  });

  describe("4. Security & Role Authorization", () => {
    it("rejects unauthorized seller attempting to mark items unavailable on another merchant's order", async () => {
      const order = buildSampleOrder({ seller: "seller-1" });
      mockOrderFindOne.mockResolvedValue(order);

      await expect(
        markOrderItemUnavailable({
          orderId: order.orderId,
          itemIndex: 0,
          reason: "Hacker attempt",
          actorId: "seller-intruder",
          actorRole: "seller",
        }),
      ).rejects.toThrow(/Access denied/i);
    });

    it("rejects customer role attempting to mark order items unavailable", async () => {
      const order = buildSampleOrder({ customer: "cust-1" });
      mockOrderFindOne.mockResolvedValue(order);

      await expect(
        markOrderItemUnavailable({
          orderId: order.orderId,
          itemIndex: 0,
          reason: "Customer trying to modify order",
          actorId: "cust-1",
          actorRole: "customer",
        }),
      ).rejects.toThrow(/Access denied/i);
    });

    it("allows admin to mark item unavailable and issue refund", async () => {
      const order = buildSampleOrder({ seller: "seller-1" });
      mockOrderFindOne.mockResolvedValue(order);
      mockPaymentFindOne.mockResolvedValue(null); // COD fallback

      const result = await markOrderItemUnavailable({
        orderId: order.orderId,
        itemIndex: 0,
        reason: "Admin quality inspection reject",
        actorId: "admin-1",
        actorRole: "admin",
      });

      expect(result.item.status).toBe(ITEM_FULFILLMENT_STATUS.UNAVAILABLE);
      expect(order.items[0].markedUnavailableBy).toBe("admin-1");
    });
  });

  describe("5. Gateway Failure & Admin Retry Flow", () => {
    it("preserves item unavailability with FAILED refund state when payment gateway throws", async () => {
      const order = buildSampleOrder();
      mockOrderFindOne.mockResolvedValue(order);
      mockPaymentFindOne.mockResolvedValue({
        _id: "pay-1",
        amount: 95000,
        refundedAmount: 0,
        status: "CAPTURED",
      });
      mockInitiateRazorpayRefund.mockRejectedValue(new Error("Gateway connection timeout"));

      const result = await markOrderItemUnavailable({
        orderId: order.orderId,
        itemIndex: 0,
        reason: "Out of stock",
        actorId: "seller-1",
        actorRole: "seller",
      });

      expect(result.item.status).toBe(ITEM_FULFILLMENT_STATUS.UNAVAILABLE);
      expect(result.item.refundStatus).toBe(ITEM_REFUND_STATUS.FAILED);
      expect(result.item.refundReason).toBe("Gateway connection timeout");
      expect(order.partialFulfillment.refundStatus).toBe("FAILED");
    });

    it("allows admin to retry failed refund successfully", async () => {
      const order = buildSampleOrder();
      order.items[0].status = ITEM_FULFILLMENT_STATUS.UNAVAILABLE;
      order.items[0].refundStatus = ITEM_REFUND_STATUS.FAILED;
      order.items[0].refundAmount = 360;
      order.partialFulfillment.refundStatus = "FAILED";

      mockOrderFindOne.mockResolvedValue(order);
      mockPaymentFindOne.mockResolvedValue({
        _id: "pay-1",
        amount: 95000,
        refundedAmount: 0,
        status: "CAPTURED",
      });
      mockInitiateRazorpayRefund.mockResolvedValue({
        success: true,
        refund: { refundId: "rfnd_retry_01" },
      });

      const retryResult = await retryOrderItemRefund({
        orderId: order.orderId,
        itemIndex: 0,
        actorId: "admin-1",
        actorRole: "admin",
      });

      expect(retryResult.item.refundStatus).toBe(ITEM_REFUND_STATUS.COMPLETED);
      expect(retryResult.item.refundId).toBe("rfnd_retry_01");
      expect(order.partialFulfillment.refundStatus).toBe("PARTIAL_REFUNDED");
    });
  });

  describe("6. Backward Compatibility with Existing Orders", () => {
    it("handles legacy orders without item-level status or partialFulfillment cleanly", () => {
      const legacyOrder = {
        _id: "legacy-order-1",
        orderId: "LEGACY1001",
        customer: "cust-legacy",
        seller: "seller-legacy",
        status: "pending",
        workflowStatus: WORKFLOW_STATUS.SELLER_PENDING,
        paymentMode: "COD",
        items: [
          {
            product: "prod-leg-1",
            name: "Fish Fillet",
            price: 300,
            quantity: 1,
            // Notice: no status, no refundStatus, no stockReleased
          },
        ],
        pricing: { subtotal: 300, total: 300 },
      };

      const preview = calculateItemRefundPreview(legacyOrder, 0);

      expect(preview.canMarkUnavailable).toBe(true);
      expect(preview.item.status).toBe(ITEM_FULFILLMENT_STATUS.AVAILABLE);
      expect(preview.calculation.eligibleRefund).toBe(300);
      expect(preview.calculation.isOrderFullyCancelled).toBe(true); // Only 1 item
    });
  });
});
