# MEATYNS — PHASE 4 PRE-IMPLEMENTATION AUDIT
## Product & Category Expansion, Flexible Units, Product Scheduling and Inventory Enhancements

**Document Version:** 1.0.0  
**Audit Date:** October 23, 2026  
**Auditor:** Antigravity AI Engineering & Senior Software Architect  
**Target Repository:** `Meatyns` (`backend` / `frontend`)  
**Scope:** Phase 4 Master Prompt (Modules A through G)

---

## 1. Executive Summary

This audit forensically examines the Meatyns codebase across the frontend (React + Tailwind CSS) and backend (Node.js/Express + MongoDB/Mongoose + Redis/Bull) to establish an authoritative baseline for Phase 4.

The core goal of Phase 4 is expanding product and category capabilities, introducing flexible units of measurement (grams, kilograms, pieces, packs), implementing product availability scheduling, hardening inventory and store-wise stock management with admin visibility, and establishing POS/ERP synchronization readiness—all while preserving 100% backward compatibility with Phase 1 (RBAC + meat attributes + delivery thresholds + CRM notes), Phase 2 (Flash Deals + abandoned cart + segmentation + category SEO), and Phase 3 (Meta Ads Manager + Pixel + CAPI + Attribution).

---

## 2. Baseline Build & Test Results

### 2.1 Frontend Tests
- Command: `npm test -- --watchAll=false` (in `frontend/`)
- Result: **PASS** (3 test suites passed, 20 tests passed, 0 failures)
  - `src/__tests__/meta/metaAttribution.test.js`: PASS
  - `src/__tests__/debounce/cartLocalStorageDebounce.property.test.js`: PASS
  - `src/__tests__/debounce/checkoutPreviewDebounce.property.test.js`: PASS

### 2.2 Backend Tests
- Command: `npm test -- --watchAll=false` (in `backend/`)
- Result: **46 passed, 7 failed, 4 skipped, 53 of 57 suites executed**
  - Pre-existing failures documented:
    1. `sellerVerificationService.test.js`: Email "from" name assertion (`"Noyo"` vs `"Meatyns"`).
    2. `deliveryOtpService.test.js`: Cache mock discrepancy.
    3. `cache-invalidation-mutations.test.js`: Pattern matching assertion.
    4. `phase0-order-placement.test.js` & `checkout-atomic-service.test.js`: Mocking setup for `sellerSchema.methods.comparePassword`.
    5. Two long-running finance test timeout cases (>5000ms default Jest timeout on Windows).
- **Integrity Rule**: Phase 4 work will not touch or weaken any existing test suites, and new tests will be created for Phase 4 modules.

---

## 3. Module-by-Module Architectural Audit

### 3.1 MODULE A: Product and Category Expansion
- **Current State**:
  - `Category` model (`backend/app/models/category.js`) implements a 3-tier hierarchy: `header`, `category`, `subcategory` linked via `parentId`.
  - Categories carry metadata (`name`, `slug`, `image`, `iconId`, `status`, `displayOrder`, commissions, handling fees, and SEO fields: `metaTitle`, `metaDescription`, `canonicalUrl`, `ogImage`).
  - `CategoryController.js` validates that categories with assigned products cannot be deleted (`linkedCount > 0` check).
  - Products (`backend/app/models/product.js`) link to `headerId`, `categoryId`, and `subcategoryId`.
- **Gaps Identified**:
  - Deactivating a category currently sets `status: "inactive"`, but direct product queries, cached catalogs, or checkout hydration do not actively verify category active status. If a category is deactivated, its products should not be purchasable.
  - Category-to-subcategory referential integrity: Product creation does not validate whether the chosen `subcategoryId` actually has `parentId === categoryId`.
- **Action Plan**:
  - Add category-status validation during checkout hydration (`pricingService.js` / `hydrateOrderItems`) and cart addition (`cartController.js`).
  - Validate category hierarchy integrity during product creation/updates.

### 3.2 MODULE B: Flexible Product Units and Quantities
- **Current State**:
  - `Product.weight` is an unstructured string (e.g. `"500g"`).
  - `ProductManagement.jsx` admin form has a field `unit` defaulting to `'packet'`, but `Product.js` Mongoose schema has **no `unit` field**; Mongoose drops it silently.
  - `Cart.js` schema defines `items.quantity` with `min: 1`, assuming integer quantities.
  - `pricingService.js` enforces `normalizeLineQuantity(quantity)` with `Math.floor(q)` (strictly integer quantities).
  - Both `pricingService.js` and `CartContext.jsx` maintain an ad-hoc regex parser (`parseWeightToGramsOrUnits`) attempting to extract units from strings.
  - `ProductCard.jsx` hardcodes fallback `{product.weight || "500 g"}`.
- **Gaps Identified**:
  - Missing formal, structured unit model in `Product`:
    - `unit`: Enumerated (`"g"`, `"kg"`, `"pc"`, `"pack"`, `"box"`).
    - `unitValue`: Numeric measure (e.g., `500` for 500g, `1` for 1kg, `1` for 1pc).
    - `minOrderQty`: Minimum order quantity (e.g. `1` or `0.5`).
    - `maxOrderQty`: Max purchase cap per order.
    - `orderIncrement`: Allowed purchase step (e.g. `1` for piece, `0.25` or `0.5` for weight-based if sold in increments).
  - Financial precision safety: Financial calculations must avoid IEEE-754 floating point drift using integer paisa or standard `roundCurrency()`.
  - Frontend display: Product cards, product details, cart, and checkout summary must display the explicit unit and formatted weight.
- **Backward Compatibility**:
  - Legacy products without structured units must seamlessly default to `unit: "pack"`, `orderIncrement: 1`, `minOrderQty: 1`. Historical orders are completely untouched.

### 3.3 MODULE C: Product Availability and Scheduling
- **Current State**:
  - Sellers have operating hours (`storeHours` in `seller.js` and `storeStatusService.js`).
  - Delivery slots exist (`deliverySlotService.js`).
  - Flash Deals have start and end timestamps (`FlashDeal.js`).
  - Products have only `status: "active" | "inactive"` and `approvalStatus: "approved" | "pending" | "rejected"`.
  - **No product-level selling window or time-of-day availability logic exists.**
- **Gaps Identified**:
  - Fresh meat and seafood require time-of-day availability windows (e.g., Morning Fresh Catch available 06:00 to 11:00, or specific days of the week).
  - Missing schema fields on `Product`:
    - `isScheduled: Boolean` (default: `false`)
    - `scheduleDays: [String]` (days of week: Sunday to Saturday)
    - `availableFromTime: String` (HH:mm format, e.g., `"06:00"`)
    - `availableToTime: String` (HH:mm format, e.g., `"11:00"`)
    - `scheduleStartDate: Date` (optional promo/season window)
    - `scheduleEndDate: Date` (optional promo/season window)
  - Missing backend validation:
    - Service `productSchedulingService.js` to compute availability status in IST timezone (`Asia/Kolkata`).
    - Enforcement in `cartController.js` (prevent adding unavailable products).
    - Enforcement in `checkoutPricingService.js` / `hydrateOrderItems` (reject order placement if product schedule is closed).
  - Missing frontend UI:
    - Availability badges on customer product cards ("Available 6:00 AM – 11:00 AM", "Opens Monday").
    - Scheduling controls in Admin `ProductManagement.jsx` and Seller `AddProduct.jsx`.

### 3.4 MODULE D: Inventory and Store/Branch-Wise Stock
- **Current State**:
  - Meatyns architecture utilizes **Sellers** (`models/seller.js`) as store locations/dark-stores. Each seller has a geographic location (`coordinates`), `serviceRadius`, and `shopName`.
  - Products are owned by a seller (`Product.sellerId`). Stock is stored per product (`Product.stock`) and per variant (`Product.variants[].stock`).
  - `StockHistory` model tracks all stock changes (`Restock`, `Sale`, `Correction`, `Reservation`, `Release`, `Set Stock`).
  - Sellers have a dedicated stock management page (`frontend/src/modules/seller/pages/StockManagement.jsx`).
  - Concurrency safety is already implemented in `stockService.js` using atomic MongoDB `$inc` operations with `$gte: quantity` locks.
- **Gaps Identified**:
  - Admins currently have **no visibility or control over store stock**.
  - `backend/app/controller/stockController.js` currently uses `req.user.id` as `sellerId`, meaning only sellers can view stock history or adjust stock. Admins are blocked (404/unauthorized).
  - `ADMIN_PERMISSIONS.STOCK_MANAGE` was defined in Phase 1 RBAC, but has no Admin routes or controllers backing it.
  - Admin needs an inventory overview API with seller/store filter, low-stock filter, and manual adjustment capabilities with full `StockHistory` audit logging.
- **Branch-Wise Decision**:
  - The repository's canonical store location entity is `Seller`. Introducing a disconnected speculative "Branch" model would violate safety rules and risk duplicate inventory. We will enhance store-wise inventory management leveraging the existing `Seller` (store) model.

### 3.5 MODULE E: Product Administration and Validation
- **Current State**:
  - Admin has `ProductManagement.jsx` with tabs (General, Pricing, Images, Variants, Attributes, SEO).
  - Seller has `AddProduct.jsx` and `ProductManagement.jsx`.
  - Backend validation lives in `productValidation.js` (Joi).
- **Gaps Identified**:
  - Admin and seller forms lack unit configuration pickers (unit type, value, step/increment).
  - Forms lack scheduling controls (toggle schedule, select days, pick from/to time).
  - Admin panel lacks a centralized Store Stock & Inventory Audit interface.

### 3.6 MODULE F: POS / ERP Integration Readiness
- **Current State**:
  - No POS or ERP connectors exist in the codebase.
  - Requirement audit documents (INV-009, INT-012) state: "No pre-built connectors for Tally, Zoho, SAP, or retail POS hardware. Design standardized webhook bridge in Phase 4."
- **Gaps Identified & Scope Boundary**:
  - No commercial POS vendor or client credentials exist.
  - Scope: Implement a standardized, secure webhook & API contract for POS/ERP synchronization (`/api/v1/integrations/pos`):
    - Authenticated via secure API Key (`x-pos-api-key`).
    - Catalog & stock enquiry endpoint (`GET /api/v1/integrations/pos/inventory`).
    - Idempotent stock adjustment / sync webhook (`POST /api/v1/integrations/pos/inventory/sync`) with external transaction ID and audit logging.
    - Full idempotency protection and safety mocks for testing.

---

## 4. Phase 1–3 Compatibility Impact Analysis

| System / Module | Phase 4 Touchpoint | Compatibility Risk | Mitigation Strategy |
|---|---|---|---|
| **Phase 1: RBAC** | Admin inventory management endpoints | Low | Guard all admin stock routes with `requireAdminPermission(ADMIN_PERMISSIONS.STOCK_MANAGE)`. |
| **Phase 1: Meat Attributes** | Product model extensions | None | Attributes (`cutType`, `boneType`, `skinType`, `freshness`) remain intact and untouched. |
| **Phase 1: Delivery Thresholds** | Checkout pricing calculations | None | Delivery thresholds & fee calculations remain unchanged; product pricing math is strictly backward-compatible. |
| **Phase 2: Flash Deals** | Product pricing hydration | Low | Flash deal price overrides in `pricingService.js` remain highest priority over regular unit price. |
| **Phase 2: Category SEO** | Category expansion | None | SEO fields on `Category` remain intact; new validation is strictly additive. |
| **Phase 3: Meta Ads & Pixel** | Product catalog & CAPI | Low | Product IDs, titles, and price feeds for Meta Catalog and Pixel `ViewContent`/`AddToCart`/`Purchase` events remain identical. |
| **Two-Phase Stock Reservation** | Stock deduction & release | Low | `stockService.js` atomic reservation and release logic preserved; units and adjustments fully audited in `StockHistory`. |

---

## 5. Proposed Database Schema Modifications

### 5.1 `Product` Model (`backend/app/models/product.js`)
All schema additions are strictly **additive and optional** with safe defaults:
```javascript
// Flexible Units
unit: {
  type: String,
  enum: ["g", "kg", "pc", "pack", "box"],
  default: "pack",
},
unitValue: {
  type: Number,
  default: 1,
  min: 0.01,
},
orderIncrement: {
  type: Number,
  default: 1,
  min: 0.01,
},
minOrderQty: {
  type: Number,
  default: 1,
  min: 0.01,
},
maxOrderQty: {
  type: Number,
  default: null,
},

// Availability Scheduling
isScheduled: {
  type: Boolean,
  default: false,
},
scheduleDays: [{
  type: String,
  enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
}],
availableFromTime: {
  type: String,
  default: null, // "HH:mm" e.g., "06:00"
},
availableToTime: {
  type: String,
  default: null, // "HH:mm" e.g., "11:00"
},
scheduleStartDate: {
  type: Date,
  default: null,
},
scheduleEndDate: {
  type: Date,
  default: null,
},
```

### 5.2 `Cart` Model (`backend/app/models/cart.js`)
- Update `quantity` schema validation: change `min: 1` to `min: 0.01` to allow weight-based fractional purchase quantities (e.g. 0.5 kg) while preserving integer defaults.

### 5.3 `Order` Model (`backend/app/models/order.js`)
- Add optional snapshot fields to `items`:
  - `unit`: String (e.g., "kg", "g", "pack")
  - `unitValue`: Number
  - Historical order snapshots remain 100% valid.

---

## 6. Files Proposed for Modification and Creation

### 6.1 Backend Files to Create
1. `backend/app/services/productSchedulingService.js`: Core availability and schedule evaluation engine (IST timezone).
2. `backend/app/services/integrations/posIntegrationService.js`: Standardized POS/ERP inventory inquiry and sync service.
3. `backend/app/routes/posIntegrationRoutes.js`: POS/ERP webhook endpoints with API key security.
4. `backend/app/controller/admin/inventoryAdminController.js`: Admin-level stock oversight and adjustment controller with RBAC.
5. `backend/__tests__/product-units-scheduling-inventory.test.js`: Comprehensive automated test suite.

### 6.2 Backend Files to Modify
1. `backend/app/models/product.js`: Add unit, quantity increments, and scheduling fields.
2. `backend/app/models/cart.js`: Relax `quantity.min` to 0.01 for fractional weight compatibility.
3. `backend/app/models/order.js`: Store unit snapshot in order line items.
4. `backend/app/validation/productValidation.js`: Add Joi validation for units and scheduling.
5. `backend/app/controller/productController.js`: Normalize units and scheduling on create/update.
6. `backend/app/controller/cartController.js`: Validate scheduling window and unit increments.
7. `backend/app/services/finance/pricingService.js`: Enforce category active check and product schedule check in `hydrateOrderItems`.
8. `backend/app/routes/adminAuth.js`: Register admin inventory endpoints.
9. `backend/app/routes/index.js` or `app.js`: Mount POS integration routes.

### 6.3 Frontend Files to Modify
1. `frontend/src/modules/customer/components/shared/ProductCard.jsx`: Display formatted unit/weight badge and schedule availability indicator.
2. `frontend/src/modules/customer/pages/ProductDetailPage.jsx`: Display units, increment selector, and availability time window.
3. `frontend/src/modules/customer/context/CartContext.jsx`: Support unit increments and validate schedule status.
4. `frontend/src/modules/admin/pages/ProductManagement.jsx`: Add unit and scheduling configuration inputs in modal.
5. `frontend/src/modules/admin/pages/InventoryManagement.jsx` (or dedicated tab in Product Management): Store-wise stock overview, low-stock filter, and stock adjustment dialog with audit history.
6. `frontend/src/modules/admin/services/adminApi.js`: Add inventory API calls.

---

## 7. Migration & Rollback Strategy

1. **Zero-Downtime Additive Migration**: All database fields added are optional with safe defaults. No existing document requires a blocking migration script or collection rebuild.
2. **Rollback Safety**: If any Phase 4 code needs to be rolled back, the newly added fields will simply be ignored by older application code with zero data corruption or schema collisions.
3. **No Destructive Action**: No collection drops, no database resets, no changes to existing order records or historical finance ledgers.
