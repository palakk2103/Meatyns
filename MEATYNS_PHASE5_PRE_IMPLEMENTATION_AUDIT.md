# MEATYNS — PHASE 5 PRE-IMPLEMENTATION AUDIT
## Customer Retention, Subscriptions, Loyalty, Referrals, Smart Reorder, Recipe-to-Cart and Meal Combos

**Date**: 2026-10-23  
**Status**: Pre-Implementation Audit Completed  
**Branch**: `main`  
**Working Tree**: Clean  
**Author**: Antigravity (AI Engineering Lead)  

---

### 1. EXECUTIVE SUMMARY & OBJECTIVE

Phase 5 introduces advanced customer retention, repeat purchase mechanisms, and culinary engagement features to the Meatyns platform. 

In strict adherence to the **Non-Negotiable Existing-Functionality Protection Rules**:
1. All changes must be **strictly additive and backward-compatible**.
2. Legacy customer records, orders, cart calculation mechanisms, financial ledgers, and Phase 1–4 capabilities (RBAC, product attributes, flexible units, product availability scheduling, dark-store multi-seller routing, Meta CAPI & Pixel) must remain 100% operational with zero regressions.
3. No automatic credit card or recurring gateway charging is permitted; subscriptions will leverage scheduled order generation with payment on delivery / payment reminders.
4. Loyalty rewards and referral bonuses must interface with the existing canonical `Wallet` and `LedgerEntry` collections—preventing the creation of redundant or conflicting wallet models.
5. No code execution or database alterations will proceed without explicit stakeholder approval of this pre-implementation plan.

---

### 2. CODEBASE AUDIT & EXISTING SYSTEM CAPABILITIES

#### 2.1 Architecture Overview
- **Backend**: Node.js + Express with MongoDB (Mongoose ODM).
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons + React Router DOM v6.
- **Financial Architecture**: Dual-layer ledger with canonical `Wallet` (`ownerType: 'CUSTOMER' | 'SELLER' | 'DELIVERY_PARTNER' | 'ADMIN'`), `LedgerEntry` (double-entry audit trail), and backward-compatible `User.walletBalance` synchronization via `walletService.js`.
- **Order Engine**: Atomic order placement (`orderPlacementService.js`), authoritative server-side checkout pricing (`pricingService.js`), and delivery slot management (`deliverySlotService.js`).

#### 2.2 Subscriptions & Scheduled Orders (Module A)
- **Current State**:
  - `Order` schema contains `deliveryMethod: ['NORMAL', 'EXPRESS', 'SCHEDULED']`, `scheduledDate`, `timeSlot`, `scheduledStartTime`, and `scheduledEndTime`.
  - There is currently **no recurring subscription model**, no recurring frequency engine, and no customer-facing subscription configuration.
- **Confirmed Missing Elements**:
  - `Subscription` schema (`customerId`, `items`, `frequency`, `dayOfWeek`, `timeSlot`, `status: ['ACTIVE', 'PAUSED', 'CANCELLED']`, `nextOrderDate`).
  - Idempotent subscription execution service to generate scheduled orders with stock and price revalidation.
  - Customer panel view: `/subscriptions` (view, pause, resume, cancel).
  - Admin panel view: `/admin/subscriptions` (manage all subscriptions).

#### 2.3 Loyalty & Rewards (Module B)
- **Current State**:
  - Canonical `Wallet` already supports `LEDGER_TRANSACTION_TYPE.CASHBACK`, `LEDGER_TRANSACTION_TYPE.WELCOME_BONUS`, `LEDGER_TRANSACTION_TYPE.ORDER_REDEEM`.
  - Checkout allows wallet deduction up to order total or available balance.
  - However, there is **no automatic loyalty/cashback earning engine** on order delivery settlement, nor are there configurable rules in `Setting` defining points earned per order.
- **Confirmed Missing Elements**:
  - Loyalty configuration in `Setting` schema (`loyalty: { enabled, pointsPer100Rupees, maxRedemptionPercentage, minOrderAmountToEarn }`).
  - Delivery settlement hook in `settleDeliveredOrder` to idempotently credit loyalty reward points/coins to `Wallet` with `LEDGER_TRANSACTION_TYPE.CASHBACK`.
  - Reversal handling for returns/cancellations.
  - Customer panel: Enhanced Rewards/Coins breakdown on `WalletPage.jsx`.
  - Admin panel: Loyalty & Rewards configuration panel under Admin Settings / Marketing.

#### 2.4 Customer Referral Program (Module C)
- **Current State**:
  - `finance.js` defines `LEDGER_TRANSACTION_TYPE.REFERRAL`. `Order` schema records `trafficSource: 'Referral'`.
  - There is **no referral code generator**, no tracking of referrer-referee relationships, and no automated referral reward qualification.
- **Confirmed Missing Elements**:
  - User referral code generation (`User.referralCode`).
  - `Referral` collection (`referrerId`, `refereeId`, `code`, `status: ['PENDING', 'QUALIFIED', 'REWARDED']`, `qualifyingOrderId`).
  - Validation endpoint for referral codes during customer signup.
  - Settlement hook on first qualifying delivered order to credit referrer (and referee) wallet.
  - Anti-fraud protections: Self-referral prevention (checking phone, IP, deviceId).
  - Customer panel: `/referrals` ("Refer & Earn") with unique code, share link, and invite status.
  - Admin panel: `/admin/referrals` to inspect all referral activity.

#### 2.5 Smart Reorder (Module D)
- **Current State**:
  - `OrdersPage.jsx` and `OrderDetailPage.jsx` allow users to inspect historical items, but there is no 1-click reorder action.
- **Confirmed Missing Elements**:
  - Backend endpoint `POST /api/v1/orders/:id/reorder` or `POST /api/v1/cart/reorder` that takes an order ID, revalidates item stock, active product status, category status, product scheduling, and current pricing, and safely appends valid items into the customer's cart.
  - Returns detailed feedback on available vs unavailable/price-adjusted items.
  - Frontend: "Reorder Items" action button on `OrdersPage` card and `OrderDetailPage`, with confirmation modal redirecting to `/cart`.
  - Hard constraint: Reorder never places an order or charges automatically.

#### 2.6 Recipe-to-Cart (Module E)
- **Current State**:
  - No recipe models or routes exist.
- **Confirmed Missing Elements**:
  - `Recipe` schema (`title`, `slug`, `description`, `image`, `prepTime`, `cookTime`, `servings`, `difficulty`, `instructions`, `ingredients: [{ name, quantity, unit, productId, isOptional }]`, `status: ['ACTIVE', 'INACTIVE']`).
  - Public APIs: `GET /api/v1/recipes`, `GET /api/v1/recipes/:slugOrId`, `POST /api/v1/recipes/:id/add-to-cart`.
  - Customer panel: `/recipes` discovery catalog and `/recipes/:slug` interactive recipe detail page with checkboxes for ingredients and "Add Selected to Cart" button.
  - Admin panel: `/admin/recipes` management interface to create recipes and map ingredients to store products.

#### 2.7 Meal Prep Packages & Combos (Module F)
- **Current State**:
  - Phase 4 added `'combo'` to product unit enums, but multi-item combo bundling and bundle discounts are absent.
- **Confirmed Missing Elements**:
  - `Combo` / `MealPackage` schema (`name`, `slug`, `description`, `image`, `sellerId`, `items: [{ productId, quantity, unit }]`, `comboPrice`, `originalPrice`, `discountPercentage`, `status: ['ACTIVE', 'INACTIVE']`).
  - Multi-item stock and seller consistency validation.
  - Customer panel: `/combos` browsing section and combo modal/page with "Add Combo to Cart".
  - Admin panel: `/admin/combos` interface to assemble product packages.

---

### 3. FEATURE CLASSIFICATION & GAP ANALYSIS MATRIX

| Module | Requirement | Current Status | Planned Action in Phase 5 |
| :--- | :--- | :---: | :--- |
| **A** | Customer Subscription Engine | **Missing** | Create `Subscription` model, schedule generator, customer `/subscriptions` UI, admin view. |
| **A** | Recurring Gateway Charging | **Forbidden / Out of Scope** | Strictly disabled; use COD/payment on delivery / payment notification workflow. |
| **B** | Loyalty / Cashback Earning | **Partially Implemented** | Reuse `Wallet` and `LedgerEntry`; implement automated delivery settlement earning hook. |
| **B** | Loyalty Rules Configuration | **Missing** | Add `loyalty` configuration fields to `Setting` model and Admin Settings UI. |
| **C** | Customer Referral Program | **Missing** | Implement `Referral` model, unique user codes, fraud protection, and `/referrals` UI. |
| **D** | Smart Reorder ("Order Again") | **Missing** | Add backend revalidation endpoint and customer UI reorder button with cart append. |
| **E** | Recipe-to-Cart Experience | **Missing** | Implement `Recipe` schema, recipe catalog/detail pages, ingredient-to-product cart bundling. |
| **F** | Meal Prep Packages & Combos | **Missing** | Implement `Combo` schema, bundle stock checks, combo browsing, and admin combo builder. |

---

### 4. ARCHITECTURAL & FINANCIAL SAFEGUARDS

1. **Idempotency Across Financial Operations**:
   - Loyalty rewards: `idempotencyKey = "LOYALTY-" + order._id`
   - Referral rewards: `idempotencyKey = "REFERRAL-" + referral._id + "-" + order._id`
   - Subscription order generation: `idempotencyKey = "SUB-ORDER-" + subscription._id + "-" + executionDate`
2. **Single Source of Truth for Wallets**:
   - No second wallet model. All loyalty coins and referral earnings are credited via `walletService.creditWallet({ ownerType: "CUSTOMER", ownerId: userId, ... })` which keeps `Wallet` and `User.walletBalance` in sync.
3. **Inventory & Component Stock Safeguards**:
   - For combos and recipe-to-cart, stock is checked against individual constituent products at cart-addition time and verified atomically during checkout.
4. **Non-Disruptive Cart Mutations**:
   - Smart reorder and recipe ingredient additions append to the active cart without wiping existing cart items.

---

### 5. PROPOSED FILES TO CREATE & MODIFY

#### New Files Proposed:
1. `backend/app/models/subscription.js`
2. `backend/app/models/referral.js`
3. `backend/app/models/recipe.js`
4. `backend/app/models/combo.js`
5. `backend/app/services/subscriptionService.js`
6. `backend/app/services/loyaltyService.js`
7. `backend/app/services/referralService.js`
8. `backend/app/services/recipeService.js`
9. `backend/app/services/comboService.js`
10. `backend/app/controller/subscriptionController.js`
11. `backend/app/controller/referralController.js`
12. `backend/app/controller/recipeController.js`
13. `backend/app/controller/comboController.js`
14. `backend/app/routes/subscriptionRoutes.js`
15. `backend/app/routes/referralRoutes.js`
16. `backend/app/routes/recipeRoutes.js`
17. `backend/app/routes/comboRoutes.js`
18. `backend/__tests__/phase5-retention-growth.test.js`
19. `frontend/src/modules/customer/pages/SubscriptionsPage.jsx`
20. `frontend/src/modules/customer/pages/ReferralsPage.jsx`
21. `frontend/src/modules/customer/pages/RecipesPage.jsx`
22. `frontend/src/modules/customer/pages/RecipeDetailPage.jsx`
23. `frontend/src/modules/customer/pages/CombosPage.jsx`
24. `frontend/src/modules/admin/pages/SubscriptionsManagement.jsx`
25. `frontend/src/modules/admin/pages/ReferralsManagement.jsx`
26. `frontend/src/modules/admin/pages/RecipesManagement.jsx`
27. `frontend/src/modules/admin/pages/CombosManagement.jsx`

#### Existing Files Proposed for Additive Modification:
1. `backend/app/models/setting.js` (Add `loyalty` and `referral` rule fields)
2. `backend/app/models/customer.js` (Add `referralCode` and `referredBy` fields)
3. `backend/app/services/finance/orderFinanceService.js` (Add loyalty & referral delivery settlement trigger)
4. `backend/app/controller/cartController.js` / `backend/app/routes/cartRoutes.js` (Support batch/reorder items)
5. `backend/app/routes/index.js` (Mount Phase 5 routes)
6. `frontend/src/core/routes/AppRouter.jsx` (Register `/subscriptions`, `/referrals`, `/recipes`, `/combos`)
7. `frontend/src/modules/customer/services/customerApi.js` (Add API client functions)
8. `frontend/src/modules/customer/pages/OrdersPage.jsx` & `OrderDetailPage.jsx` (Add "Reorder" action)
9. `frontend/src/modules/customer/pages/ProfilePage.jsx` (Add navigation links to Subscriptions, Referrals)
10. `frontend/src/modules/admin/routes/index.jsx` (Add admin menu links for Phase 5 modules)

---

### 6. DATABASE SAFETY & MIGRATION RISK EVALUATION

- All new database models are isolated and independent collections (`subscriptions`, `referrals`, `recipes`, `combos`).
- Additions to `setting.js` and `customer.js` have non-breaking defaults (`referralCode` generated lazily or via hook, settings defaulted to disabled or zero values).
- No fields are deleted or renamed; zero breaking schema changes.
- Rollback strategy: Dropping new collections leaves legacy functionality completely unharmed.

---

### 7. BASELINE TEST STATUS

- **Phase 4 Suite**: 13 passed, 0 failed.
- Node.js / Jest VM modules operating cleanly.
- Vite and React hot-reload dev servers operating cleanly.

---

### 8. NEXT STEPS & APPROVAL GATE

In accordance with user instructions, no implementation will occur until this audit and the detailed Phase 5 implementation plan are presented and approved by the user.
