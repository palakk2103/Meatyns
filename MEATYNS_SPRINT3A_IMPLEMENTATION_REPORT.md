# Meatyns Sprint 3A Implementation Report
## Partial Order Fulfillment & Item-Wise Refunds (`ORD-005`)

**Generated Local Time:** 2026-10-26T15:58:00+05:30  
**Repository Working Copy:** `c:\Users\HP\Desktop\Meatyns`  
**Target Requirement:** Gap `ORD-005` in `MEATYNS_FINAL_REQUIREMENT_GAP_AUDIT.md` & Sprint 3A of `MEATYNS_REMAINING_IMPLEMENTATION_ROADMAP.md`.

---

## 1. Audit & Initial Findings

Prior to implementation, an audit of the Meatyns codebase was conducted against the order lifecycle, database schemas, financial ledgers, and payment integrations:

1. **Order Item Model Gap:**
   - Order items in `backend/app/models/order.js` only contained product reference, quantity, price, image, and name.
   - There was no schema tracking whether an individual item was available, unavailable, fulfilled, cancelled, or returned.
   - Orders were treated as all-or-nothing: if an item was missing at the merchant node, merchants had to either cancel the entire order or manually communicate with customers without proper audit tracking or partial refund triggers.

2. **Inventory Release Gap:**
   - `stockService.releaseReservedStockForOrder` only handled full order inventory release on full cancellation or expiration.
   - Releasing an individual item's reserved inventory without cancelling the whole order had no supported mechanism, risking double-release or inventory locking.

3. **Financial Ledger & Refund Gap:**
   - Existing refund routines (`financeApi.refundPayment`, `handleCancellationFinance`) operated strictly on the order-level grand total or manually entered custom amounts.
   - No authoritative server-side calculation existed to proportionally distribute coupon discounts, tax shares, and payment method splits (Gateway vs. Wallet vs. COD) to a specific item.
   - There was no item-level refund state (`NONE`, `PENDING`, `COMPLETED`, `FAILED`) or retry path if Razorpay refund APIs timed out or encountered intermittent errors.

---

## 2. Architecture & Design Principles

### A. Authoritative Server-Side Financial Math
- **Item Gross Aggregate:** $\text{itemGross} = \text{item.price} \times \text{item.quantity}$
- **Proportional Discount Share:** If an order has a positive coupon discount total ($\text{discountTotal} > 0$), the item's share is:
  $$\text{allocatedDiscount} = \text{round}\left(\frac{\text{itemGross}}{\text{productSubtotal}} \times \text{discountTotal}\right)$$
- **Proportional Tax Share:** If product taxes are collected ($\text{taxTotal} > 0$):
  $$\text{allocatedTax} = \text{round}\left(\frac{\text{itemGross}}{\text{productSubtotal}} \times \text{taxTotal}\right)$$
- **Net Item Refund:**
  $$\text{eligibleRefund} = \text{itemGross} - \text{allocatedDiscount} + \text{allocatedTax}$$
- **Shared Operational Fees Policy:** Delivery fees and platform handling fees represent logistical operations required to fulfill and dispatch the remaining items in the order. In partial fulfillment, these shared fees are retained. If marking an item unavailable causes **all** items in the order to become unavailable, the workflow automatically transitions the entire order into full cancellation via `compensateOrderCancellation`, releasing all remaining stock and refunding the full order total including fees.

### B. Payment Provider & Ledger Handling
- **Online (Razorpay):** Initiates a partial refund via `initiateRazorpayRefund` for the gateway share. In case of network errors or provider rejection, status is marked `FAILED` with error message saved for Admin retry.
- **Wallet Payments:** Proportional customer wallet share is credited back with `LEDGER_TRANSACTION_TYPE.WALLET_REFUND`.
- **Cash on Delivery (COD):** No payment gateway refund is triggered. Instead, `order.paymentBreakdown.codPendingAmount` is automatically decremented on the server, ensuring delivery agents collect the updated payable amount upon arrival.
- **Seller Ledger:** The unavailable item's net contribution (seller payout minus platform commission) is deducted from the seller payout record so merchants are never paid for unfulfilled items.

### C. Exact-Once Stock Release
- Added `item.stockReleased: Boolean` flag per item.
- `stockService.releaseStockForOrderItem` checks and sets `stockReleased = true` atomically, preventing race conditions or double stock incrementation.
- Updated `stockService.releaseReservedStockForOrder` to skip any items already marked `stockReleased === true`.

---

## 3. Files Created and Modified

### Backend Core
| File | Action | Description |
|---|---|---|
| [`backend/app/constants/orderItemStatus.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/constants/orderItemStatus.js) | Created | Canonical constants for `ITEM_FULFILLMENT_STATUS` (`AVAILABLE`, `UNAVAILABLE`, `FULFILLED`, `CANCELLED`, `RETURNED`) and `ITEM_REFUND_STATUS` (`NONE`, `PENDING`, `COMPLETED`, `FAILED`). |
| [`backend/app/constants/orderWorkflow.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/constants/orderWorkflow.js) | Modified | Re-exports item status constants for backward compatibility. |
| [`backend/app/models/order.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/models/order.js) | Modified | Extended `items` schema with backward-compatible item-level status, refund tracking, and stock release flag; added `partialFulfillment` object with audit history. |
| [`backend/app/services/stockService.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/stockService.js) | Modified | Added `releaseStockForOrderItem(order, itemIndex)` and protected `releaseReservedStockForOrder` against double-releasing items. |
| [`backend/app/services/partialOrderFulfillmentService.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/partialOrderFulfillmentService.js) | Created | Core domain service for preview calculation, marking item unavailable, updating ledgers, triggering partial refund, and retrying failed refunds. |
| [`backend/app/validation/orderValidation.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/validation/orderValidation.js) | Modified | Added Joi validation schema `markOrderItemUnavailableSchema` validating `reason` string (3–500 chars). |
| [`backend/app/controller/orderController.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/controller/orderController.js) | Modified | Implemented `getOrderItemRefundPreview`, `markOrderItemUnavailableController`, and `retryOrderItemRefundController`. |
| [`backend/app/routes/orderRoutes.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/app/routes/orderRoutes.js) | Modified | Registered authenticated and authorized routes for preview, mark unavailable, and retry refund. |
| [`backend/__tests__/partial-order-fulfillment.test.js`](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/partial-order-fulfillment.test.js) | Created | 15 automated unit tests verifying calculations, discount distribution, stock release, over-refund prevention, role enforcement, and auto-cancellation. |

### Frontend
| File | Action | Description |
|---|---|---|
| [`frontend/src/modules/seller/services/sellerApi.js`](file:///c:/Users/HP/Desktop/Meatyns/frontend/src/modules/seller/services/sellerApi.js) | Modified | Added seller API endpoints `getOrderItemRefundPreview`, `markOrderItemUnavailable`, and `retryOrderItemRefund`. |
| [`frontend/src/modules/admin/services/api/ordersApi.js`](file:///c:/Users/HP/Desktop/Meatyns/frontend/src/modules/admin/services/api/ordersApi.js) | Modified | Added admin API endpoints for partial fulfillment and item refund. |
| [`frontend/src/modules/seller/pages/Orders.jsx`](file:///c:/Users/HP/Desktop/Meatyns/frontend/src/modules/seller/pages/Orders.jsx) | Modified | Added item status badges, "Mark Out of Stock" action button for eligible orders (`pending`, `confirmed`, `packed`), and a preview modal displaying item gross, discount share, and net refund. |
| [`frontend/src/modules/admin/pages/OrderDetail.jsx`](file:///c:/Users/HP/Desktop/Meatyns/frontend/src/modules/admin/pages/OrderDetail.jsx) | Modified | Added partial fulfillment status banner, table columns for fulfillment and refund state, admin action to mark unavailable, preview modal, and admin "Retry Refund" button for failed refunds. |
| [`frontend/src/modules/customer/pages/OrderDetailPage.jsx`](file:///c:/Users/HP/Desktop/Meatyns/frontend/src/modules/customer/pages/OrderDetailPage.jsx) | Modified | Added customer alert banner notifying partial fulfillment and refund destination; item list displays "Out of Stock" badge, strikethrough styling, and refund confirmation tags. |

---

## 4. Verification & Test Suite Summary

### Automated Tests
1. **Targeted Unit Test Suite (`backend/__tests__/partial-order-fulfillment.test.js`):**
   - 15 of 15 tests passed (`PASS`, runtime 0.55s).
   - Test coverage includes:
     - Multi-item orders with proportional coupon discount and tax calculation.
     - Single-item orders where marking the item unavailable automatically triggers order cancellation.
     - Cash on Delivery (COD) adjustments without gateway refund.
     - Online payment partial refund initiation via Razorpay abstraction.
     - Preventing duplicate actions on already unavailable items (`ALREADY_UNAVAILABLE`).
     - Preventing actions on delivered/cancelled orders (`INVALID_ORDER_STATE`).
     - Exact-once stock release verification.
     - Non-admin authorization restrictions on retry refund.
     - Preventing over-refunds across multiple partial item cancellations.
     - Backward compatibility for legacy orders lacking `status` fields.
2. **Full Backend Test Suite:**
   - 67 test suites passed, 4 skipped (irrelevant integration suites without local test DB), 0 failed.
   - Total tests passing: 421 tests passed, 22 skipped, 0 failed.
3. **Frontend Production Build:**
   - Ran `npm run build` in `frontend/`.
   - Completed successfully in 14.54s with zero compilation or syntax errors.

---

## 5. Financial & Business Decisions Documented

1. **Shared Delivery and Platform Fees:**
   - In accordance with standard quick-commerce logistics practices, delivery fees and handling fees are not refunded on partial order fulfillment because riders and logistical routes are still dispatched to deliver the remaining items.
   - If *all* items are marked unavailable, the entire order is cancelled and all fees are refunded.
2. **Proportional Discount Allocation:**
   - Discounts are distributed proportionally across item values. Net item refund cannot exceed `itemGross - allocatedDiscount + allocatedTax`.
3. **Over-Refund Protection:**
   - The total sum of all partial refunds is bounded by `order.paymentBreakdown.grandTotal`. Any attempt to refund more than the captured amount is rejected server-side with `400 Bad Request`.

---

## 6. External Verification & Client Action Required

- **Razorpay Sandbox Testing:** While automated mocks verify the integration contract, live staging verification with Razorpay test keys is required to observe webhook processing for partial refund events.
- **Rider App COD Recalculation:** Delivery app updates should verify that riders display `order.paymentBreakdown.codPendingAmount` rather than the initial `pricing.total`.
