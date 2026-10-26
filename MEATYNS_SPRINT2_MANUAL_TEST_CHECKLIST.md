# MEATYNS — SPRINT 2 MANUAL TEST CHECKLIST

This checklist guides manual quality assurance and end-to-end verification of the features implemented in **Sprint 2: Core Shopping & Pricing Completion**.

---

## 1. Product-Level Tiered Volume Pricing (HD-004)

### Objective
Verify that quantity-based volume discounts apply accurately on PDP, Cart, and Checkout, and that the server is the authoritative source of calculations.

### Test Steps
1. **Configure Tiers in Product:**
   - Log into Admin Panel at `/admin/products`.
   - Open or create a test product (e.g. *Fresh Chicken Breast* priced at ₹200).
   - Set up tiered pricing:
     - Tier 1: `minQty: 2`, `discountPercentage: 5%` (Effective: ₹190/unit)
     - Tier 2: `minQty: 4`, `discountPercentage: 10%` (Effective: ₹180/unit)
   - Save the product.
2. **Verify Product Detail Page (PDP) & Bottom Sheet:**
   - Navigate to the product page on desktop or click the product card on mobile.
   - Verify that the "Buy More, Save More (Volume Pricing)" chips are rendered:
     - Badge: `Buy 2+: 5% OFF`
     - Badge: `Buy 4+: 10% OFF`
3. **Cart Quantity Scaling:**
   - Add 1 unit to cart: Verify cart item price displays standard ₹200.
   - Increase quantity to 2: Verify unit price updates to ₹190, line total is ₹380, and a green badge `Volume Discount: 5% OFF` appears.
   - Increase quantity to 4: Verify unit price updates to ₹180, line total is ₹720, and the badge displays `Volume Discount: 10% OFF`.
   - Reduce quantity back to 1: Verify discount safely reverts without negative totals or stale state.
4. **Checkout Totals & Authoritative Calculation:**
   - Proceed to `/checkout`.
   - Verify item subtotal accurately reflects the effective unit price (`₹720` for 4 units).
   - Apply a valid coupon (e.g., flat ₹50 off):
     - Verify coupon applies on the tiered subtotal (`₹720 - ₹50 = ₹670 + delivery/fees`).
   - Complete checkout with Cash on Delivery or Test Gateway.
   - Inspect the created Order record:
     - Verify `order.items[0].price` reflects the authoritative discounted unit price.
     - Verify total matches client calculations exactly.

---

## 2. Meat Cut and Boneless Filters (UX-004)

### Objective
Verify that cut type and boneless facet filters filter products correctly on category browsing and search results on both desktop and mobile.

### Test Steps
1. **Category Page Browsing:**
   - Navigate to `/category/chicken` (or any meat category).
   - Observe the horizontal scrolling facet filter pill bar at the top of the products section:
     - `All Cuts` (selected by default)
     - `Curry Cut`
     - `Biryani Cut`
     - `Boneless`
     - `Bone-In`
2. **Filter Interaction:**
   - Click **Curry Cut**:
     - Verify that only curry cut items are displayed.
     - Confirm products with "Curry Cut" in attributes or title match.
   - Click **Boneless**:
     - Verify that only boneless items (e.g., Boneless Cubes, Breast Fillet) are displayed.
   - Click **All Cuts**:
     - Verify that the filter resets and all category products return immediately.
3. **Search Page Filtering:**
   - Click the search bar and search for `"Chicken"` or `"Meat"`.
   - On the search results page `/search?q=chicken`, observe the facet pills above the product grid.
   - Click **Boneless**:
     - Verify the results count changes to `X of Y found`.
     - Confirm only boneless items appear in the grid.
   - Click **Reset Filters** or **All Cuts**:
     - Confirm full search results are restored.
4. **Mobile Responsiveness:**
   - Switch browser developer tools to mobile viewport (e.g., iPhone 14 or Pixel 7).
   - Verify that facet pill bars scroll smoothly horizontally without overflowing or breaking layout.

---

## 3. Experience Studio Banner Scheduling (HD-010 / MKT-008)

### Objective
Verify that banners with configured start and end dates only appear when their schedule is active, and that future or expired banners are never served to the customer.

### Test Steps
1. **Admin Banner Scheduling:**
   - Log into Admin Panel and navigate to **Content Manager** (`/admin/content-manager`) or **Hero Banners** (`/admin/hero-categories`).
   - Add a new banner item with a test image and title.
   - Set **Active From** (`validFrom`) to a future date/time (e.g., 2 hours from now).
   - Click Save.
2. **Customer Visibility Check (Future Banner):**
   - Open customer storefront homepage `/`.
   - Verify that the future scheduled banner is **NOT visible** in the carousel or section.
3. **Public API Validation:**
   - Open browser network tab or send a GET request to `/api/experience/public?pageType=home`.
   - Inspect the returned banner items array:
     - Confirm the future banner was omitted authoritatively on the backend.
4. **Active Window Check:**
   - In Admin Panel, edit the banner schedule so `validFrom` is in the past (e.g., 1 hour ago) and `validTo` is in the future (e.g., tomorrow).
   - Refresh the customer storefront:
     - Verify that the banner is now prominently visible.
5. **Expired Banner Check:**
   - Edit the banner schedule so `validTo` is in the past (e.g., 10 minutes ago).
   - Refresh the customer storefront:
     - Verify that the expired banner disappears automatically.
6. **Date Validation Error Handling:**
   - In Admin Panel, set `validFrom` to tomorrow and `validTo` to yesterday.
   - Attempt to save:
     - Verify the admin displays a warning toast: `"Banner active start date cannot be after expiry date"` and prevents invalid submission.

---

## 4. Admin Dashboard Today KPIs (ANA-001)

### Objective
Verify that the Admin Dashboard correctly aggregates and displays live Today KPIs in `Asia/Kolkata` (IST) timezone.

### Test Steps
1. **View Today's Performance Section:**
   - Log into Admin Panel at `/admin/dashboard`.
   - Verify the compact **Today's Performance (IST)** card is rendered above the lifetime stats grid.
   - Verify the live status indicator (green pulse) and current IST date string (e.g., `2026-10-24`).
2. **Verify Metrics Displayed:**
   - **Gross Sales:** Total value of all non-cancelled orders placed today.
   - **Net Delivered Sales:** Total value of delivered orders today.
   - **Orders Placed:** Number of customer checkouts placed today.
   - **Delivered:** Count of completed orders.
   - **In Progress:** Count of orders currently pending, confirmed, packed, or out for delivery.
3. **Order Lifecycle Impact:**
   - Place a new order on the customer app (e.g. ₹450).
   - Refresh Admin Dashboard:
     - Verify **Gross Sales** increases by ₹450.
     - Verify **Orders Placed** increases by 1.
     - Verify **In Progress** increases by 1.
     - Verify **Net Delivered Sales** remains unchanged until delivery.
4. **Multi-Seller Checkout De-duplication:**
   - Place a multi-seller checkout with items from 2 different outlets (creates 2 split sub-orders with the same `checkoutGroupId`).
   - Refresh Admin Dashboard:
     - Verify **Orders Placed** increments by **1** (unique customer checkout), and subtext shows `"X fulfillments"`.
5. **Cancellation & Refund Exclusion:**
   - Cancel one of the test orders:
     - Verify that Gross Sales and Orders Placed remove or separate the cancelled order, and neither Gross Sales nor Net Delivered Sales include the cancelled amount.
