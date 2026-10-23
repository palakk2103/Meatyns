# MEATYNS — PHASE 2 IMPLEMENTATION REPORT
## Marketing Automations, Flash Deals, Customer Segmentation & Category SEO

**Date:** 2026-10-23  
**Status:** Completed & Regression-Verified  
**Repository Source of Truth:** `c:\Users\HP\Desktop\Meatyns`

---

## 1. Initial Audit and Confirmed Gaps

Prior to Phase 2 implementation, an exhaustive audit was performed across the codebase, client requirement documents, and previous Phase 1 reports. The verified gaps identified and targeted were:

1. **Flash Deals:**
   - *Previous state:* Hardcoded client-side countdown timer with dummy promotional mock data in `FlashDeals.jsx`. No database persistence, no start/end timestamp scheduling, no per-customer purchase limit enforcement, and no server-side pricing protection against tampering.
   - *Phase 2 requirement:* Database-backed `FlashDeal` model, admin scheduling/management panel, live countdowns derived from server timestamps, authoritative pricing integration in checkout calculations, and atomic per-customer quantity limit enforcement.

2. **Abandoned-Cart Reminders:**
   - *Previous state:* Carts were persisted in MongoDB with items and timestamps, but had no tracking for reminder status, inactivity duration, or converted orders. No background scanner or reminder notifications existed.
   - *Phase 2 requirement:* Safe, configurable background job checking inactivity ($\ge 60$ mins default), customer opt-out preferences, completed order conversion checks, multi-reminder caps, idempotency cooldowns, and admin visibility into abandoned carts.

3. **Customer Segmentation:**
   - *Previous state:* Admin customer view was an unsegmented flat list with basic search. No behavioral segmentation or cohort views based on purchase history.
   - *Phase 2 requirement:* Real-time behavioral segmentation (`NEW`, `ACTIVE`, `REPEAT`, `VIP`, `AT_RISK`) computed from actual order and customer collections, filtering out cancelled/failed orders, with admin overview metrics and paginated customer lists guarded by RBAC.

4. **Category SEO Metadata:**
   - *Previous state:* `Category` model lacked SEO fields. Public category pages used hardcoded fallback document titles without dynamic OpenGraph or meta descriptions.
   - *Phase 2 requirement:* Category schema extensions (`metaTitle`, `metaDescription`, `canonicalUrl`, `ogImage`), admin UI inputs with character counters, and dynamic client/head rendering with fallback to category name and description.

*Note on Phase 3:* Features such as Meta Ads Manager, Meta OAuth, Meta Pixel, Conversions API (CAPI), and ROAS tracking were intentionally excluded to preserve scope safety.

---

## 2. Implementation Summary for Each Stage

### Stage 1: Database-Backed Flash Deals
- **Backend Model & Validation:** Created `FlashDeal` Mongoose schema with `startTime`, `endTime`, `products` array (`productId`, `flashPrice`, `originalPrice`, `dealStock`, `soldCount`), `maxQtyPerCustomer` (default 2), and strict validator requiring `endTime > startTime`.
- **Authoritative Pricing Service:** Hooked into `backend/app/services/finance/pricingService.js` (`hydrateOrderItems`) to check active deals on the server and apply `item.price = dealProduct.flashPrice` with `item.isFlashDeal = true`. Prevents any client price tampering.
- **Purchase Limit Enforcement:** Implemented `validateCustomerDealLimit` in `backend/app/services/checkoutPricingService.js`. Counts past quantities from confirmed/delivered/processing orders and prevents customers from purchasing more than the allowed limit (e.g. 2 units) per deal across multiple checkouts.
- **Admin Interface:** Created `FlashDealsManagement.jsx` in the admin panel with search, status toggles, product selection, date-time pickers, and deal creation/editing.
- **Customer UI:** Rewrote `frontend/src/modules/customer/components/home/FlashDeals.jsx` to fetch `/api/flash-deals/active`, calculate live countdowns derived from server timestamps, display Upcoming/Active/Expired badges, and render flash price chips.

### Stage 2: Automated Abandoned-Cart Reminders
- **Cart Schema Enhancements:** Added `reminderCount` (default 0), `lastReminderSentAt`, and `abandonedNotified` flags, indexed with `{ "items.0": 1, updatedAt: 1, reminderCount: 1 }`.
- **System Settings:** Added configurable keys in `Setting` model: `abandonedCartIntervalMinutes` (default 60), `abandonedCartMaxReminders` (default 2), and `abandonedCartEnabled` (default true).
- **Background Worker (`abandonedCartJob.js`):** Built a non-blocking scheduler task that:
  1. Finds carts updated $> X$ minutes ago with $\ge 1$ item and `reminderCount < maxReminders`.
  2. Verifies the customer is active and has not opted out of promotional communications (`user.notificationPreferences?.promotions !== false`).
  3. Checks whether an order was created by the user after the cart's last update timestamp (converting/clearing the cart).
  4. Enforces a 24-hour cooldown between successive reminder stages.
  5. Dispatches an in-app/push notification via `NOTIFICATION_EVENTS.ABANDONED_CART_REMINDER` with deep link `/cart` and atomically increments `reminderCount`.
- **Admin Visibility:** Added `GET /api/admin/abandoned-carts` and admin endpoint returning inactive carts, item counts, customer contact info, and reminder statuses.

### Stage 3: Customer Behavioral Segmentation
- **Segmentation Service (`customerSegmentationService.js`):** Implemented high-performance MongoDB aggregation pipelines to calculate dynamic segments:
  - **NEW:** Registered within the last 30 days with 0 completed orders.
  - **ACTIVE:** At least 1 completed order within the last 30 days.
  - **REPEAT:** 2 or more completed orders lifetime.
  - **VIP:** High-value customers ($\ge 5$ completed orders or total spend $\ge ₹5,000$).
  - **AT_RISK:** Past buyers with no orders in the last 60 days.
- **Exclusion of Non-Completed Orders:** Strictly filters out `cancelled`, `payment_failed`, and `returned` orders so financial and frequency totals reflect genuine purchases.
- **Admin Endpoints & UI:** Added `GET /api/admin/segments` and `GET /api/admin/segments/:key/customers`. Enhanced `CustomerManagement.jsx` with segment filter pills, live counts, and filtered customer browsing.

### Stage 4: Category SEO Metadata
- **Category Schema:** Extended `Category` model with `metaTitle` (max 100), `metaDescription` (max 300), `canonicalUrl`, and `ogImage`.
- **Category Controller:** Updated `allowedKeys` and tree caching `selectFields` in `categoryController.js` to whitelist and return SEO fields.
- **Admin Forms:** Added SEO Metadata cards to both Category and Subcategory modals in `CategoryManagement.jsx` featuring real-time character counters and canonical URL inputs.
- **Dynamic Frontend SEO:** Created `CategorySeo.jsx` and mounted it inside `CategoryProductsPage.jsx`. Dynamically sets `document.title`, `<meta name="description">`, canonical links, and OpenGraph tags, gracefully falling back to category name and description when custom SEO tags are absent.

---

## 3. Exact Changed File Paths and Reasons

| File Path | Component | Reason for Change |
| :--- | :--- | :--- |
| `backend/app/models/flashDeal.js` | Backend Model | Created persistent Mongoose model for scheduled flash deals and per-customer limits. |
| `backend/app/services/flashDealService.js` | Backend Service | Implemented deal lookup, customer limit validation, and admin CRUD logic. |
| `backend/app/controller/admin/flashDealController.js` | Backend Controller | Admin API endpoints for creating, updating, listing, and toggling flash deals. |
| `backend/app/routes/flashDealRoutes.js` | Backend Routes | Public and admin routes for flash deals (`/api/flash-deals`). |
| `backend/app/routes/index.js` | Backend Routes | Registered `flashDealRoutes` in central API router. |
| `backend/app/services/finance/pricingService.js` | Backend Service | Updated `hydrateOrderItems` to query active flash deals and apply authoritative pricing. |
| `backend/app/services/checkoutPricingService.js` | Backend Service | Integrated `validateCustomerDealLimit` into checkout snapshot calculations. |
| `frontend/src/modules/customer/components/home/FlashDeals.jsx` | Frontend Customer | Replaced mock deals with live API fetching and real timestamp-based countdown timer. |
| `frontend/src/modules/admin/services/api/flashDealsApi.js` | Frontend Admin API | Admin API client methods for flash deals. |
| `frontend/src/modules/admin/pages/FlashDealsManagement.jsx` | Frontend Admin UI | Admin interface for scheduling flash deals, setting stock and customer limits. |
| `frontend/src/modules/admin/routes/index.jsx` | Frontend Admin Routes | Added `/admin/flash-deals` route and sidebar navigation link under Marketing Tools. |
| `backend/app/models/cart.js` | Backend Model | Added `reminderCount`, `lastReminderSentAt`, `abandonedNotified` and compound index. |
| `backend/app/models/setting.js` | Backend Model | Added abandoned-cart interval, max reminders, and toggle configuration fields. |
| `backend/app/modules/notifications/notification.constants.js` | Backend Constants | Added `ABANDONED_CART_REMINDER` to `NOTIFICATION_EVENTS`. |
| `backend/app/modules/notifications/notification.builder.js` | Backend Builder | Added push notification templates and deep link `/cart` payload builder. |
| `backend/app/jobs/abandonedCartJob.js` | Backend Job | Created idempotent background scanner for detecting and dispatching cart reminders. |
| `backend/index.js` | Backend Main | Registered `abandonedCartJob` in background scheduler cycle. |
| `backend/app/controller/cartController.js` | Backend Controller | Added `getAbandonedCartsAdmin` endpoint for admin visibility. |
| `backend/app/routes/adminAuth.js` | Backend Routes | Mounted abandoned-cart and customer-segment admin endpoints with RBAC guards. |
| `backend/app/services/customerSegmentationService.js` | Backend Service | Aggregation pipeline service for computing customer behavioral segments. |
| `backend/app/controller/admin/customerSegmentController.js` | Backend Controller | Controller for segment summaries and paginated customer segment membership. |
| `frontend/src/modules/admin/services/api/usersApi.js` | Frontend Admin API | Added `getCustomerSegments`, `getSegmentCustomers`, `getAbandonedCarts` methods. |
| `frontend/src/modules/admin/pages/CustomerManagement.jsx` | Frontend Admin UI | Added segment filter bar, counts, and segment-filtered customer views. |
| `backend/app/models/category.js` | Backend Model | Added `metaTitle`, `metaDescription`, `canonicalUrl`, `ogImage` schema fields. |
| `backend/app/controller/categoryController.js` | Backend Controller | Whitelisted SEO keys in `allowedKeys` and included in tree cache `selectFields`. |
| `frontend/src/modules/customer/components/seo/CategorySeo.jsx` | Frontend Customer | Dynamic meta tag, title, and OpenGraph injector with fallback cleanup. |
| `frontend/src/modules/customer/pages/CategoryProductsPage.jsx` | Frontend Customer | Mounted `<CategorySeo category={category} />` on public category page. |
| `frontend/src/modules/admin/pages/CategoryManagement.jsx` | Frontend Admin UI | Added SEO inputs and character counters to Category and Subcategory modals. |
| `backend/__tests__/stage1-flash-deals.test.js` | Tests | Unit test suite for Flash Deal models, validations, active filters, and purchase limits. |
| `backend/__tests__/stage2-abandoned-cart.test.js` | Tests | Unit test suite for abandoned-cart criteria, order conversions, and opt-outs. |
| `backend/__tests__/stage3-customer-segmentation.test.js` | Tests | Unit test suite for behavioral segmentation definitions and order status filtering. |
| `backend/__tests__/stage4-category-seo.test.js` | Tests | Unit test suite for category SEO metadata validation, limits, and fallback resolution. |

---

## 4. Database, Schema, and Index Changes

### `FlashDeal` (New Collection: `flashdeals`)
- Fields:
  - `title`: String, required, trimmed
  - `description`: String
  - `bannerImage`: String
  - `startTime`: Date, required, indexed
  - `endTime`: Date, required, indexed (validated: `endTime > startTime`)
  - `status`: String, enum: `["active", "inactive"]`, default: `"active"`, indexed
  - `maxQtyPerCustomer`: Number, default 2, min 1
  - `products`: Array of `{ productId, flashPrice, originalPrice, dealStock, soldCount }`
- Indexes:
  - `{ status: 1, startTime: 1, endTime: 1 }`
  - `{ "products.productId": 1 }`

### `Cart` (Updated Collection: `carts`)
- Added Fields:
  - `reminderCount`: Number, default 0, min 0
  - `lastReminderSentAt`: Date, default null
  - `abandonedNotified`: Boolean, default false
- Added Index:
  - `{ "items.0": 1, updatedAt: 1, reminderCount: 1 }` (optimizes scans for active, non-empty, unreminded carts)

### `Setting` (Updated Collection: `settings`)
- Added Fields:
  - `abandonedCartIntervalMinutes`: Number, default 60
  - `abandonedCartMaxReminders`: Number, default 2
  - `abandonedCartEnabled`: Boolean, default true

### `Category` (Updated Collection: `categories`)
- Added Fields:
  - `metaTitle`: String, trim, maxlength 100, default `""`
  - `metaDescription`: String, trim, maxlength 300, default `""`
  - `canonicalUrl`: String, trim, default `""`
  - `ogImage`: String, trim, default `""`

---

## 5. New or Modified APIs and Permission Requirements

| Method | Endpoint | Access | Required Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/flash-deals/active` | Public | None | Fetches currently active flash deal with real server start/end times. |
| `GET` | `/api/flash-deals/admin` | Admin | `MARKETING_VIEW` | Lists all flash deals with filters. |
| `POST` | `/api/flash-deals/admin` | Admin | `MARKETING_MANAGE` | Creates a new flash deal with validation. |
| `PUT` | `/api/flash-deals/admin/:id` | Admin | `MARKETING_MANAGE` | Updates flash deal parameters or schedule. |
| `PATCH`| `/api/flash-deals/admin/:id/toggle` | Admin | `MARKETING_MANAGE` | Activates or deactivates a flash deal. |
| `DELETE`| `/api/flash-deals/admin/:id` | Admin | `MARKETING_MANAGE` | Deletes a flash deal. |
| `GET` | `/api/admin/abandoned-carts` | Admin | `MARKETING_VIEW` | Lists abandoned carts, items, and reminder status. |
| `GET` | `/api/admin/segments` | Admin | `CUSTOMERS_VIEW` | Returns cohort summary counts for all 5 customer segments. |
| `GET` | `/api/admin/segments/:key/customers` | Admin | `CUSTOMERS_VIEW` | Returns paginated list of customers belonging to a segment. |
| `POST` | `/api/categories` | Admin | `PRODUCTS_MANAGE` | Accepts optional SEO metadata fields (`metaTitle`, etc.). |
| `PUT` | `/api/categories/:id` | Admin | `PRODUCTS_MANAGE` | Updates category including SEO metadata fields. |

---

## 6. Flash Deal Eligibility and Purchase-Limit Behavior

- **Authoritative Server Pricing:** When `hydrateOrderItems` calculates item pricing, it looks up whether an active flash deal currently applies to each product. If active and within `startTime <= now <= endTime`, the item price is clamped to `flashPrice`. Client-supplied prices are completely ignored.
- **Purchase Limits (`maxQtyPerCustomer`):**
  - Evaluated in `validateCustomerDealLimit` during checkout calculation.
  - Queries customer's past orders with statuses `["pending", "confirmed", "packed", "out_for_delivery", "delivered"]`.
  - Excludes `cancelled` and `payment_failed` orders.
  - If `(pastPurchasedQty + requestedQty) > maxQtyPerCustomer`, the server throws an error specifying the remaining allowed quantity (e.g., `"You can only purchase up to 2 units of this flash deal. You have already purchased 1."`).

---

## 7. Abandoned-Cart Rules, Queue Workflow, and Safeguards

- **Inactivity Threshold:** Default 60 minutes (`abandonedCartIntervalMinutes`), evaluated against `cart.updatedAt`.
- **Exclusion of Converted Orders:** Before queuing or dispatching a reminder, the worker verifies `Order.findOne({ user: cart.user, createdAt: { $gte: cart.updatedAt } })`. If a newer order exists, the cart is considered converted/superseded and skipped.
- **Customer Opt-Out & Consent:** Checks `user.notificationPreferences?.promotions !== false`. Customers who opted out of promotional communications are skipped.
- **Multi-Stage Reminder Cooldown:** Supports up to `abandonedCartMaxReminders` (default 2). Subsequent reminders require a minimum 24-hour interval since `lastReminderSentAt`.
- **Idempotency:** Atomic update `{ _id: cart._id, reminderCount: currentCount }` ensures concurrent worker sweeps cannot send duplicate reminders for the same stage.
- **Transport Safety:** Built on internal `notification.emitter.js` using non-sensitive deep link `/cart` without exposing raw tokens or PII.

---

## 8. Customer Segment Definitions and Query Behavior

| Segment Key | Name | Exact Eligibility Criteria |
| :--- | :--- | :--- |
| `NEW` | New Customers | Registered within last 30 days (`createdAt >= now - 30d`) and exactly 0 completed orders. |
| `ACTIVE` | Active Buyers | At least 1 completed order within the last 30 days (`latestOrderDate >= now - 30d`). |
| `REPEAT` | Repeat Buyers | 2 or more completed orders lifetime (`orderCount >= 2`). |
| `VIP` | VIP Customers | 5 or more completed orders lifetime OR total spend $\ge ₹5,000$. |
| `AT_RISK` | At-Risk Customers | Past buyers (`orderCount >= 1`) with no orders in the last 60 days (`latestOrderDate < now - 60d`). |

*Completed Order Status Definition:* `status IN ["delivered", "confirmed", "packed", "out_for_delivery"]`. `cancelled` and `payment_failed` orders are strictly filtered out before counting orders or calculating total spend.

---

## 9. Category SEO Fields, Rendering Strategy, and Fallback Behavior

- **Fields:**
  - `metaTitle`: Up to 100 characters.
  - `metaDescription`: Up to 300 characters.
  - `canonicalUrl`: Absolute or root-relative URL.
  - `ogImage`: Image URL for social preview.
- **Fallback Resolution:**
  - Title: `category.metaTitle` $\rightarrow$ `"{category.name} | Meatyns"` $\rightarrow$ `"Fresh Meat Delivered | Meatyns"`.
  - Description: `category.metaDescription` $\rightarrow$ `category.description` $\rightarrow$ `"Order fresh chicken, mutton, and seafood online..."`.
  - Canonical: `category.canonicalUrl` $\rightarrow$ `window.location.origin + window.location.pathname`.
- **Dynamic Mounting:** `CategorySeo.jsx` updates `document.title`, creates or updates `<meta name="description">`, OpenGraph tags (`og:title`, `og:description`, `og:url`), and `<link rel="canonical">`. Upon component unmount, custom tags are cleaned up to avoid leaking into other pages.

---

## 10. Tests Actually Executed and Pass/Fail Results

### Test Execution Command:
```bash
npm test -- stage1-rbac.test.js stage2-meat-attributes.test.js stage3-delivery-settings.test.js stage4-crm-notes.test.js stage1-flash-deals.test.js stage2-abandoned-cart.test.js stage3-customer-segmentation.test.js stage4-category-seo.test.js product-seo.test.js
```

### Test Results:
```
PASS __tests__/stage3-delivery-settings.test.js
PASS __tests__/stage4-category-seo.test.js
PASS __tests__/stage3-customer-segmentation.test.js
PASS __tests__/stage1-flash-deals.test.js
PASS __tests__/stage2-abandoned-cart.test.js
PASS __tests__/stage1-rbac.test.js
PASS __tests__/stage4-crm-notes.test.js
PASS __tests__/product-seo.test.js
PASS __tests__/stage2-meat-attributes.test.js

Test Suites: 9 passed, 9 total
Tests:       65 passed, 65 total
Snapshots:   0 total
Time:        2.147 s
```

### Breakdown of Phase 2 Tests (25 new tests):
1. **Stage 1 Flash Deals (`stage1-flash-deals.test.js` — 9/9 Passed):**
   - Timing validation (`endTime > startTime`)
   - Non-empty products array validation
   - Product pricing validation (`flashPrice < originalPrice`)
   - Customer purchase limit enforcement (`maxQtyPerCustomer`)
   - Cancellation exclusions from customer purchase limit
   - Active deal query filtering (`now` between start and end)
   - Order price hydration using authoritative flash price
   - Admin deal creation and toggle
2. **Stage 2 Abandoned Cart (`stage2-abandoned-cart.test.js` — 5/5 Passed):**
   - Inactivity threshold eligibility
   - Exclusion of carts with newer converted orders
   - Customer opt-out preference enforcement
   - Notification dispatch and atomic `reminderCount` increment
   - Max reminder cap enforcement
3. **Stage 3 Customer Segmentation (`stage3-customer-segmentation.test.js` — 4/4 Passed):**
   - Segment definitions and criteria
   - Aggregation summary count accuracy
   - Exclusion of cancelled/payment_failed orders
   - Paginated customer segment list
4. **Stage 4 Category SEO (`stage4-category-seo.test.js` — 7/7 Passed):**
   - Category SEO field persistence
   - Default empty string backward compatibility
   - `metaTitle` maxlength enforcement (100 chars)
   - `metaDescription` maxlength enforcement (300 chars)
   - Trimming of leading/trailing whitespace
   - Graceful fallback title and description generation
   - Custom SEO value priority over generic defaults

### Frontend Production Build:
- **Command:** `npm run build` in `frontend/`
- **Result:** Successfully compiled 4,706 modules in 22.91s with 0 errors.

---

## 11. Baseline Failures and Unresolved Issues

- **Baseline Failures:** None. All 9 test suites (both Phase 1 regression suites and new Phase 2 suites) passed with zero failures.
- **Unresolved Regressions:** None. Existing cart persistence, checkout, RBAC, category hierarchy, and product SEO continue to operate as expected.

---

## 12. Manual Verification Checklist

- [x] **Flash Deals UI:** Verify active flash deals appear on customer home page with live countdown timer counting down seconds smoothly.
- [x] **Flash Deals Expiry:** Verify countdown transitions to "Expired" or hides deal when end time is reached.
- [x] **Admin Flash Deals:** Navigate to `/admin/flash-deals`, create a deal with start/end time and limit, and toggle status.
- [x] **Price Tampering Prevention:** Verify that modifying client-side item price in request payload is overridden by backend pricing service.
- [x] **Customer Purchase Limit:** Add more than allowed deal limit in cart; checkout should block with user-friendly error message.
- [x] **Abandoned Cart Detection:** Leave items in cart for $> 60$ minutes; verify cart appears in `/api/admin/abandoned-carts`.
- [x] **Abandoned Cart Opt-Out:** In customer profile preferences, toggle promotional notifications off; verify no abandoned cart reminder is queued.
- [x] **Customer Segmentation:** In Admin Customers (`/admin/users`), click segment pills (`New`, `Active`, `Repeat`, `VIP`, `At-Risk`); verify customer lists filter accordingly with correct counts.
- [x] **Category SEO Editing:** In Admin Categories (`/admin/categories`), edit a category or subcategory, enter Meta Title and Meta Description with character counter feedback, and save.
- [x] **Public Category Head Tags:** Navigate to `/category/:categoryName`, open browser dev tools; verify `<title>`, `<meta name="description">`, and `<link rel="canonical">` reflect the saved SEO values.

---

## 13. Required Migration and Deployment Steps

1. **Environment Variables:** No new required environment variables. All features use existing database and notification configuration.
2. **Database Migrations:** None required. Mongoose schemas are additive with backward-compatible defaults (`default: ""` or `default: 0`).
3. **Database Indexes:** MongoDB will build the following compound indexes on startup automatically:
   - `Cart`: `{ "items.0": 1, updatedAt: 1, reminderCount: 1 }`
   - `FlashDeal`: `{ status: 1, startTime: 1, endTime: 1 }`
4. **Daemon Processes:** Ensure existing backend worker process runs alongside API server to execute the scheduled `abandonedCartJob` scan.

---

## 14. Client Clarifications Still Required

1. **Abandoned Cart Push vs SMS vs Email:** Currently configured to dispatch in-app/push alerts via existing notification infrastructure. If external SMS (e.g. MSG91) or transactional email (e.g. SendGrid) transports should be activated for abandoned carts, provider API keys and approved templates will be required.
2. **Flash Deal Notification:** Confirm whether customers who have wishlisted a product should receive an automated push notification 15 minutes before its scheduled flash deal starts.

---

## 15. Explicit Confirmation of Incomplete or Runtime-Unverified Features

- **Runtime-Unverified External Services:** Live external push dispatch via Firebase Cloud Messaging (FCM) and external SMS gateways were not triggered with real customer phone numbers/devices during automated testing to uphold safety rule #10. Transports were verified via unit mocks.
- **Phase 3 Exclusions:** Meta Ads Manager, Meta Pixel, Conversions API (CAPI), and Meta OAuth remain unbuilt as per the explicit instructions to restrict Phase 2 to marketing automations, flash deals, customer segmentation, and category SEO.
