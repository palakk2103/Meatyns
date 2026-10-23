# MEATYNS — PHASE 3 PRE-IMPLEMENTATION AUDIT
## Custom Meta Ads Manager + Meta Pixel + Conversions API + Campaign Analytics

**Audit Date:** 2026-10-23  
**Status:** Audit Complete — Awaiting Approval Before Implementation  
**Repository Source of Truth:** `c:\Users\HP\Desktop\Meatyns`  
**Author:** Antigravity AI Engineering

---

## 1. Existing System Architecture & State Verification

A thorough inspection of the active frontend and backend was conducted to understand the exact foundation, conventions, and constraints.

### 1.1 Backend Architecture
- **Runtime & Framework:** Node.js (v18+ compatible), Express.js (v5.2.1), ES Modules (`"type": "module"`).
- **Database:** MongoDB via Mongoose (v8.12.0). Models in `backend/app/models/`.
- **Authentication & RBAC:**
  - Token-based JWT in `Authorization: Bearer <token>` or `x-access-token`.
  - Roles: `customer`/`user`, `seller`, `delivery`, `admin` (with `adminRole` sub-roles: `super_admin`, `order_manager`, `inventory_manager`, `delivery_manager`, `marketing_manager`).
  - Permission middleware: `requireAdminPermission(...)` and `requireSuperAdmin` in `backend/app/middleware/authMiddleware.js`.
  - RBAC constants in `backend/app/constants/rbac.js`. `MARKETING_VIEW` and `MARKETING_MANAGE` are already assigned to `super_admin` and `marketing_manager`.
- **Payment & Order Lifecycle:**
  - Multi-seller checkout engine in `backend/app/services/orderPlacementService.js`.
  - Canonical order placement endpoint: `POST /api/orders` handled by `createOrderWithFinancialSnapshot` in `backend/app/controller/orderFinanceController.js`.
  - Payment modes: `ONLINE` (Razorpay) and `COD`.
  - Payment verification: `POST /api/payments/razorpay/verify` and webhooks in `backend/app/controller/paymentController.js`.
  - Order model: `backend/app/models/order.js` contains financial snapshots, settlement statuses, and customer references. Currently **no attribution fields exist** in the order schema.
- **Settings System:**
  - `backend/app/models/setting.js` holds platform-wide configuration (branding, delivery fees, thresholds, SEO).
  - Public route: `GET /api/settings`. Admin route: `PUT /api/settings`.
  - Currently **no Meta Pixel or Meta credentials exist** in the settings model.
- **Existing Meta / Facebook Integrations:**
  - Grep search for `pixel`, `meta`, `fbevents`, `capi`, `fbclid` revealed **zero existing Meta integrations**. The codebase is a clean slate for Phase 3.

### 1.2 Frontend Architecture
- **Framework & Build:** React 19, Vite 7.3, React Router v7 (`createBrowserRouter` + `RouterProvider`).
- **Styling & UI:** Tailwind CSS v4, Lucide React icons, Framer Motion for micro-animations, Recharts for charts.
- **Admin Center Navigation:**
  - `frontend/src/modules/admin/routes/index.jsx` configures `navItems` rendered inside `DashboardLayout`.
  - Existing `Marketing Tools` section has: Flash Deals, Create Sections, Hero Categories, Send Notifications, Coupons & Promos, Offer Sections, Shop by Store.
  - New required section: `Marketing & Meta Ads`.
- **Customer Pages & Tracking Points:**
  - Entry/Routing: `frontend/src/core/routes/AppRouter.jsx` with `RootLayout` and `CustomerLayoutWrapper`.
  - Product Page: `frontend/src/modules/customer/pages/ProductDetailPage.jsx`.
  - Search Page: `frontend/src/modules/customer/pages/SearchPage.jsx`.
  - Cart: `frontend/src/modules/customer/context/CartContext.jsx` and `CartPage.jsx`.
  - Checkout: `frontend/src/modules/customer/pages/CheckoutPage.jsx`.
  - Order Success/Confirmation: `PaymentStatusPage.jsx` and `DesktopOrderConfirmation.jsx`.

---

## 2. Baseline Test & Build Status

Before planning changes, existing automated test suites were executed:

### 2.1 Backend Tests
- Command: `npm test`
- Result: **45 passed test suites (284 tests passed)**.
- Pre-existing failures (7 suites failed due to historical mock mismatches unrelated to Phase 3):
  1. `__tests__/sellerVerificationService.test.js`: Expects `"from: Noyo <no-reply@example.com>"` but app uses `"Meatyns"`.
  2. `__tests__/deliveryOtpService.test.js`: Enum expectation difference (`MAX_ATTEMPTS_EXCEEDED` vs `VALIDATION_FAILED`).
  3. `__tests__/cache-invalidation-mutations.test.js`: Pattern mock assertion.
  4. `__tests__/phase0-order-placement.test.js` & `checkout-atomic-service.test.js`: Schema mock method assignment (`comparePassword`).
  5. `__tests__/checkout-pricing-handling-fee.test.js` & `finance-pricing-flow.test.js`: Jest 5000ms timeout on heavy chains.
- **Rule:** None of these pre-existing failures will be falsely attributed to Phase 3, and existing test suites will not be weakened.

### 2.2 Frontend Tests
- Command: `npm test`
- Result: **2 test suites passed (16 tests passed)** with 0 failures.

---

## 3. Scope of Phase 3 Modules & Planned Implementation

### Module A — Admin Panel Integration
- Add top-level navigation item: `Marketing & Meta Ads` in `frontend/src/modules/admin/routes/index.jsx` with sub-pages:
  - **Overview:** Connection status, quick KPI cards, recent campaign summaries, tracking event counters.
  - **Meta Account Connection:** OAuth initiation, account/pixel selection, token status, safe disconnect.
  - **Campaigns:** Read-only campaign viewer, draft creator with safety checks, pause/activate toggles with confirmation modals.
  - **Performance Analytics:** Spend, impressions, CTR, CPC, conversions, Meatyns-attributed revenue, ROAS.
  - **Pixel & CAPI Tracking:** Live browser and server-side event logs, delivery status, retry failed events.
  - **Integration Settings:** Pixel ID, CAPI token setup, Test Event Code for Meta Events Manager.
- RBAC permissions: Guarded by `MARKETING_VIEW` (read-only) and `MARKETING_MANAGE` (admin/manager).

### Module B — Secure Meta Account Connection
- **Backend Service & Routes:**
  - `backend/app/services/meta/metaOAuthService.js` and `backend/app/routes/metaRoutes.js`.
  - OAuth flow with secure `state` parameter to prevent CSRF.
  - Token exchange for long-lived access token (`grant_type=fb_exchange_token`).
  - Model: `MetaIntegration` (Mongoose schema) storing encrypted/server-only access tokens, ad account IDs, pixel IDs, permissions, token expiry, connection state.
  - Sensitive tokens are **never returned to the frontend** (only masked IDs and status flags).
  - Graceful disconnect/revoke endpoint.
  - Clear "Unconnected / Setup Required" state when real Meta credentials are not yet entered in environment or DB.

### Module C — Campaign Management
- Retrieve real campaigns from Meta Graph API (`/act_<ID>/campaigns`) if connected.
- If unconnected or credentials missing, display informative unconfigured state.
- Create campaign drafts (`PAUSED` status only, never auto-publish).
- Strict validation of objectives (`OUTCOME_SALES`, `OUTCOME_TRAFFIC`, etc.) and budgets.
- Two-step confirmation modal before any API submission affecting ad state.
- Idempotency check to prevent duplicate submissions on double-clicks.

### Module D — Meta Pixel Event Tracking (Client-Side)
- Create `MetaPixelProvider` and `useMetaPixel` hook in `frontend/src/core/meta/`.
- Safe initialization: Injects `fbevents.js` only once when Pixel ID is configured and user consent is active.
- Track standard events:
  - `PageView`: Tracked on React Router route changes.
  - `ViewContent`: Tracked on `ProductDetailPage.jsx`.
  - `Search`: Tracked on `SearchPage.jsx`.
  - `AddToCart`: Tracked in `CartContext.jsx` upon item addition.
  - `InitiateCheckout`: Tracked on `CheckoutPage.jsx`.
  - `Purchase`: Tracked on confirmed order placement with a unique `eventId` (`purchase_${orderId}`).
- Duplicate prevention: Deduplication tracker prevents re-firing `Purchase` on page reload.

### Module E — Node.js Conversions API (CAPI) (Server-Side)
- Model: `MetaConversionEvent` storing `eventId`, `eventName`, `orderId`, `payload`, `status` (`PENDING`, `SENT`, `FAILED`), `attempts`, `error`.
- Service: `backend/app/services/meta/metaCapiService.js` communicating with Meta Graph API (`/<PIXEL_ID>/events`).
- Event ID matching: Generates identical `eventId` (`purchase_${orderId}`) to deduplicate against client Pixel.
- PII hashing: SHA-256 normalized email and phone as per Meta requirements.
- Reliable trigger points:
  - Razorpay payment verified (`verifyRazorpayPayment` / webhook).
  - COD order placed/confirmed.
- Never fire on unverified client requests.
- Admin inspection: `GET /api/admin/meta/events` allows viewing delivery status and manually retrying failed deliveries.

### Module F — Order Attribution
- Client-side helper `frontend/src/core/meta/attribution.js`:
  - Captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`.
  - Reads/generates Meta `_fbc` and `_fbp` cookies.
  - Persists in `localStorage` / session storage.
- Pass attribution data in order placement payload (`customerApi.createOrder`).
- Schema extension on `Order` (`backend/app/models/order.js`):
  - Additive field `attribution`: `{ source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, fbclid, fbc, fbp, attributedAt }`.
  - Safe fallback: If no attribution signals exist, defaults to `source: "direct"`.
  - Distinguishes Meatyns recorded orders, internally attributed Meta orders, and Meta reported metrics.

### Module G — Campaign Performance Analytics
- Sourced from Meta Graph API Insights (`/act_<ID>/insights`) combined with internal Meatyns MongoDB order records.
- Metrics: Spend, Impressions, Clicks, CTR, CPC, Meta-reported Purchases vs Internal Meatyns Meta-attributed Orders & Revenue, Calculated ROAS.
- Safe division guards: Zero denominator protection for CPC, CTR, and ROAS.
- If Meta API data is unavailable, clearly state why; never fabricate mock statistics as live data.

### Module H — Settings & Operational Visibility
- Admin panel cards showing:
  - Meta Connection Status (Connected / Disconnected / Token Expired).
  - Pixel ID & Selected Ad Account.
  - Test Event Code configuration.
  - Conversions API health & recent deliveries (24h success/failure counters).

### Module I — Security & Authorization Controls
- Backend authorization enforced with `verifyToken`, `allowRoles("admin")`, `requireAdminPermission`.
- Sensitive tokens stored securely and never leaked to frontend.
- Zero live advertising budget spend without explicit confirmation.

---

## 4. Planned File Modifications & Additions

### 4.1 Backend Files to Create
1. `backend/app/models/metaIntegration.js` — Mongoose schema for Meta credentials, ad account, pixel config, token expiry.
2. `backend/app/models/metaConversionEvent.js` — Mongoose schema for CAPI event logging, idempotency, and retries.
3. `backend/app/services/meta/metaOAuthService.js` — Meta OAuth, token exchange, ad accounts retrieval.
4. `backend/app/services/meta/metaAdsService.js` — Campaigns, ad sets, insights from Meta Marketing API.
5. `backend/app/services/meta/metaCapiService.js` — Server-side Conversions API event dispatcher with SHA-256 PII hashing.
6. `backend/app/controller/metaController.js` — Admin API endpoints for OAuth, campaigns, analytics, tracking events, settings.
7. `backend/app/routes/metaRoutes.js` — Express router mounted at `/api/admin/meta`.
8. `backend/__tests__/meta-integration.test.js` — Test suite for OAuth validation, CAPI event generation, idempotency, and attribution.

### 4.2 Backend Files to Modify (Additive & Backward-Compatible Only)
1. `backend/app/models/order.js` — Add `attribution` schema object (additive, default empty).
2. `backend/app/services/orderPlacementService.js` — Attach attribution data to order during placement.
3. `backend/app/controller/paymentController.js` — Trigger CAPI `Purchase` event upon successful payment verification / webhook.
4. `backend/app/controller/orderFinanceController.js` — Trigger CAPI `Purchase` event on COD placement.
5. `backend/app/routes/index.js` — Mount `metaRoutes` under `/admin/meta`.
6. `backend/app/constants/rbac.js` — Ensure Meta Ads permissions map cleanly to existing admin roles.
7. `backend/.env.example` — Document optional Meta environment variables (`META_APP_ID`, `META_APP_SECRET`, etc.).

### 4.3 Frontend Files to Create
1. `frontend/src/core/meta/attribution.js` — Captures UTM params, `fbclid`, `fbc`, `fbp` from URL and cookies.
2. `frontend/src/core/meta/pixelService.js` — Safe client Pixel initialization, consent verification, and standard event tracking.
3. `frontend/src/modules/admin/pages/metaAds/MetaAdsManager.jsx` — Main hub with tabs for Overview, Connection, Campaigns, Analytics, Tracking, Settings.
4. `frontend/src/modules/admin/pages/metaAds/MetaOverviewTab.jsx` — Health overview, connection badge, quick stats.
5. `frontend/src/modules/admin/pages/metaAds/MetaConnectTab.jsx` — OAuth connect button, account selector, pixel selector, disconnect.
6. `frontend/src/modules/admin/pages/metaAds/MetaCampaignsTab.jsx` — Campaign list, draft creator modal, safety confirmation dialogs.
7. `frontend/src/modules/admin/pages/metaAds/MetaAnalyticsTab.jsx` — Performance charts, spend vs revenue, ROAS, date picker.
8. `frontend/src/modules/admin/pages/metaAds/MetaTrackingTab.jsx` — CAPI and Pixel event logs, delivery status, manual retry.
9. `frontend/src/modules/admin/pages/metaAds/MetaSettingsTab.jsx` — Pixel ID input, Test Event Code, toggle switches.
10. `frontend/src/modules/admin/services/metaAdminApi.js` — Axios API service for admin Meta endpoints.
11. `frontend/src/__tests__/meta/metaAttribution.test.js` — Unit tests for attribution parameter parsing and cookie handling.

### 4.4 Frontend Files to Modify (Preserving Existing Logic)
1. `frontend/src/modules/admin/routes/index.jsx` — Add `Marketing & Meta Ads` nav item and lazy-loaded routes.
2. `frontend/src/core/routes/AppRouter.jsx` — Initialize UTM / click-ID attribution capture on customer routes.
3. `frontend/src/modules/customer/pages/ProductDetailPage.jsx` — Call `trackViewContent` when product loads.
4. `frontend/src/modules/customer/pages/SearchPage.jsx` — Call `trackSearch` on query submission.
5. `frontend/src/modules/customer/context/CartContext.jsx` — Call `trackAddToCart` on item addition.
6. `frontend/src/modules/customer/pages/CheckoutPage.jsx` — Call `trackInitiateCheckout` on mount; pass attribution data in `orderData`; call `trackPurchase` with event ID on success.

---

## 5. Potential Risks & Mitigations

1. **Risk:** Accidentally publishing a live campaign or incurring real advertising spend.
   - **Mitigation:** Force all created campaigns into `PAUSED` draft status; mandate a two-step explicit confirmation modal displaying the budget and account before any API call is made. Never execute automatic budget changes.
2. **Risk:** Exposing Meta access tokens or secrets in frontend responses or logs.
   - **Mitigation:** Strip `accessToken` and secrets from all API responses via Mongoose projection and explicit DTO mapping. Sanitize logging middleware to redact authorization headers and token parameters.
3. **Risk:** Double-counting conversion events between Meta Pixel and Conversions API.
   - **Mitigation:** Use identical deterministic `eventId` (e.g. `purchase_${orderId}`) in both browser `fbq('track')` and backend CAPI call, enabling Meta's automatic deduplication algorithm.
4. **Risk:** Breaking existing checkout, payment, or order flows.
   - **Mitigation:** All schema changes to `Order` are strictly additive and optional. CAPI dispatching is executed asynchronously without blocking payment confirmation or order placement responses.
5. **Risk:** Missing real Meta credentials during development/testing.
   - **Mitigation:** Implement clean unconfigured/disconnected UI states with instructions on how administrators can provide their Meta App credentials. When unconfigured, API returns descriptive 400/404 messages rather than fabricating fake data.

---

## 6. Baseline Verification Summary & Next Step

The pre-implementation audit confirms that the Meatyns repository is in a healthy, modular state. The proposed Phase 3 design cleanly integrates into existing admin navigation, authentication, and order workflows without any breaking changes.

**Awaiting user review and authorization to proceed with implementation.**
