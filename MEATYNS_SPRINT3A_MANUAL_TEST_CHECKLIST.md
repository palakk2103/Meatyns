# Meatyns Sprint 3A Manual Test Checklist
## Partial Order Fulfillment & Item-Wise Refunds (`ORD-005`)

**Generated Local Time:** 2026-10-26T15:58:30+05:30  
**Target Requirement:** Gap `ORD-005` in `MEATYNS_FINAL_REQUIREMENT_GAP_AUDIT.md`  
**Purpose:** Comprehensive step-by-step verification procedures for QA engineers, product managers, and merchants across Merchant, Admin, Delivery, and Customer roles.

---

## Pre-requisites & Test Accounts

| Role | Username / Identity | Target Page |
|---|---|---|
| **Seller / Merchant** | Active verified vendor account | `/seller/orders` |
| **Admin** | Superadmin credentials | `/admin/orders/:orderId` |
| **Customer** | Registered mobile number / app user | `/orders/:orderId` |
| **Delivery Partner** | Active rider app login | `/delivery/orders` |

---

## Test Suite 1: Merchant Workflow (Seller Portal)

### TC-M01: Inspect Multi-Item Order and View Item Status
- **Precondition:** Order placed with at least two different products (e.g., Item A: ₹300, Item B: ₹200). Status is `pending` or `confirmed`.
- **Steps:**
  1. Navigate to `/seller/orders`.
  2. Locate the target order and click **View Details** or open the order card.
  3. Verify that each item lists its thumbnail, title, price, quantity, and aggregate total.
  4. Verify that each item displays an **Available** status badge and a **Mark Out of Stock** button.
- **Expected Result:** All items display their default available state and action buttons are visible for orders in `pending`, `confirmed`, or `packed` status.

---

### TC-M02: Refund Preview Breakdown Verification
- **Precondition:** Order contains a coupon discount (e.g., Subtotal ₹500, Coupon ₹50, Total ₹450).
- **Steps:**
  1. On Item A (₹300), click **Mark Out of Stock**.
  2. Observe the modal that opens.
  3. Verify the displayed breakdown:
     - Item Gross: ₹300
     - Proportional Discount: ₹30 (i.e., $(300 / 500) \times 50$)
     - Net Eligible Refund: ₹270
     - Payment Mode: `ONLINE` (or `COD`)
- **Expected Result:** Authoritative preview displays exact server calculation before any modification occurs.

---

### TC-M03: Confirm Mark Item Unavailable (Online Payment)
- **Precondition:** Order paid via Razorpay (Online).
- **Steps:**
  1. In the modal, provide a reason: `"Product did not pass morning freshness inspection"`.
  2. Click **Confirm Out of Stock**.
  3. Observe loading state on button and toast notification.
- **Expected Result:**
  - Toast displays `"Item marked unavailable and refund processed"`.
  - Item status updates to **Out of Stock** with badge.
  - Refund badge displays **Refunded ₹270** (or **Refund Pending**).
  - Stock for Item A is immediately restored to product inventory.

---

### TC-M04: Duplicate Action Prevention
- **Steps:**
  1. Locate the item marked unavailable in TC-M03.
  2. Check if the **Mark Out of Stock** button is displayed.
- **Expected Result:** Action button is replaced with static status badges; subsequent requests to the endpoint return `400 Bad Request` (`ALREADY_UNAVAILABLE`).

---

### TC-M05: Last Item Out of Stock (Auto-Order Cancellation)
- **Precondition:** Order with only 1 item remaining.
- **Steps:**
  1. Mark the final remaining item as out of stock.
  2. Confirm the action in the preview dialog.
- **Expected Result:**
  - System detects 0 remaining items.
  - Automatically triggers full order cancellation.
  - Entire order transitions to `cancelled`.
  - All fees (delivery and handling) are refunded alongside item costs.

---

## Test Suite 2: Financial & Payment Modes

### TC-F01: Cash on Delivery (COD) Order Adjustment
- **Precondition:** Multi-item COD order placed (Subtotal ₹400 + Delivery ₹40 = Total ₹440).
- **Steps:**
  1. Merchant marks Item 1 (₹150) as out of stock.
  2. Check the order's financial ledger in database or order response.
- **Expected Result:**
  - No Razorpay API call is initiated.
  - `order.paymentBreakdown.codPendingAmount` is reduced from ₹440 to ₹290.
  - `item.refundStatus` is set to `NONE` (or `COD Adjusted`).
  - Delivery app reflects revised collection total of ₹290.

---

### TC-F02: Wallet Payment Refund
- **Precondition:** Order paid partially or fully using customer wallet balance.
- **Steps:**
  1. Mark an item unavailable.
  2. Check the customer's wallet balance and wallet transaction log (`/wallet`).
- **Expected Result:**
  - Customer wallet is credited with the exact proportional wallet share.
  - Ledger transaction created with type `WALLET_REFUND` referencing the order ID.

---

### TC-F03: Over-Refund Prevention
- **Steps:**
  1. Attempt to trigger multiple concurrent refunds on the same item or refund an amount exceeding eligible captured total.
- **Expected Result:**
  - Server validates `completedRefunds + requestedRefund <= grandTotal`.
  - Excessive refund requests are rejected with `400 Bad Request`.

---

## Test Suite 3: Admin Dossier & Reconciliation

### TC-A01: Admin Order Detail Audit Banner
- **Steps:**
  1. Log into Admin Portal and navigate to `/admin/orders/:orderId` for an order with partial fulfillment.
  2. Review the Order Detail Dossier.
- **Expected Result:**
  - A prominent amber alert banner is displayed: `"Partial Order Fulfillment Active: One or more items in this order were marked out of stock..."`.
  - Total refunded amount is displayed.

---

### TC-A02: Admin Table Status Badges & Controls
- **Steps:**
  1. In the items table, observe the new **Fulfillment & Refund** and **Actions** columns.
  2. Verify that unavailable items show **Out of Stock** and **Refunded ₹X**.
  3. Verify that available items on active orders allow Admin to trigger **Mark Out of Stock**.
- **Expected Result:** Admin has complete visibility and operational controls.

---

### TC-A03: Failed Refund Retry (Admin Only)
- **Precondition:** Item with `refundStatus === 'FAILED'` (e.g., simulated gateway timeout or invalid merchant keys).
- **Steps:**
  1. Locate the item in the Admin table.
  2. Observe the **Retry** button next to the **Refund Failed** badge.
  3. Click **Retry**.
- **Expected Result:**
  - Initiates retry via `POST /api/orders/:orderId/items/:itemIndex/retry-refund`.
  - Re-checks provider status or re-attempts refund.
  - Updates status to `COMPLETED` upon success.

---

## Test Suite 4: Customer Order Experience

### TC-C01: Customer Order Detail Partial Fulfillment Alert
- **Steps:**
  1. Log in as the customer who placed the order.
  2. Navigate to `/orders/:orderId`.
- **Expected Result:**
  - Displays notice: `"Partial Order Fulfillment Update: One or more items in your order were unavailable and could not be packed. A refund of ₹X has been credited..."`.
  - Reassures customer that remaining items are on the way.

---

### TC-C02: Unavailable Item Strikethrough & Refund Tag
- **Steps:**
  1. Inspect the items list on `/orders/:orderId`.
- **Expected Result:**
  - Unavailable item image is grayscale with an `"OOS"` overlay tag.
  - Item name and price have strikethrough styling.
  - Displays `"Out of Stock"` pill and `"• Refunded ₹X"` indicator.
  - Customer cannot edit, tamper with, or dispute the server-calculated refund amount directly.

---

## Test Suite 5: Security & Role Boundaries

### TC-S01: Customer Unauthorized Access Prevention
- **Steps:**
  1. Using customer session token, execute:
     `POST /api/orders/:orderId/items/0/unavailable`
- **Expected Result:**
  - Request rejected with `403 Forbidden` (`Access denied. Only sellers or admins can mark items unavailable`).

---

### TC-S02: Post-Fulfillment Invalidation
- **Steps:**
  1. Select an order in `delivered` or `cancelled` status.
  2. Attempt to mark an item unavailable via API or UI.
- **Expected Result:**
  - Button is disabled / hidden in UI.
  - API returns `400 Bad Request` with message `"Cannot modify items for order in delivered status"`.

---

### TC-S03: Inventory Release Exactly Once
- **Steps:**
  1. Note product inventory before marking item unavailable (e.g., Stock = 10, Reserved = 2).
  2. Mark item unavailable (Quantity = 2).
  3. Inspect product inventory in database.
  4. Trigger full order cancellation subsequently.
- **Expected Result:**
  - Stock increases from 10 to 12 upon marking unavailable.
  - Full order cancellation skips already-released items, preventing inventory from inflating to 14.
