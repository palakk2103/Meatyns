# MEATYNS — PHASE 1 TO PHASE 5 BUG REPORT

**Execution Date:** 2026-10-24  
**Auditor Roles:** Senior QA Engineer, Full-Stack Testing Engineer, Software Architect, Application Reliability Engineer  
**Repository Source of Truth:** `c:\Users\HP\Desktop\Meatyns`  
**Status:** Verification Complete — **TESTING ONLY MODE (NO BUSINESS LOGIC MODIFIED)**

---

## 1. Bug Classification Summary

| Bug ID | Severity | Phase / Feature | Summary | Status |
| :--- | :---: | :--- | :--- | :---: |
| **BUG-01** | **CRITICAL** | Core Security / Delivery | Hardcoded unconditional mock OTP bypass (`"1234"`) in `deliveryOtpService.js` allows arbitrary delivery completion | Confirmed Defect |
| **BUG-02** | **MEDIUM** | Phase 2 Regression / Pricing | Unmocked `FlashDeal` model in `finance-pricing-flow.test.js` & `checkout-pricing-handling-fee.test.js` causes 5000ms Jest timeouts | Confirmed Defect |
| **BUG-03** | **MEDIUM** | Phase 5 Regression / Finance | Incomplete `mongoose` mock in `finance-order-flow.test.js` causes `TypeError: Cannot read properties of undefined (reading 'Types')` on `setting.js` | Confirmed Defect |
| **BUG-04** | **MEDIUM** | Phase 0 Regression / Orders | Incomplete `Schema` mock in `phase0-order-placement.test.js` & `checkout-atomic-service.test.js` crashes on `sellerSchema.methods.comparePassword` | Confirmed Defect |
| **BUG-05** | **MEDIUM** | Phase 5 / Admin Settings | `settingsController.js` strips Phase 5 `loyalty` and `referral` objects due to omission from `ALLOWED_KEYS`, Joi schema, and projection | Confirmed Defect |
| **BUG-06** | **MEDIUM** | Phase 5 / Subscriptions | Background automated scheduler lacks recurring cron execution for `processDueSubscriptionOrders` | Confirmed Defect |
| **BUG-07** | **LOW** | Phase 1 / Seller Auth Tests | Test assertion mismatch in `sellerVerificationService.test.js` expecting legacy subject instead of branded `Meatyns — Your Verification Code` | Confirmed Defect |
| **BUG-08** | **LOW** | Core Catalog / Cache Tests | Invalid ObjectId `"cat-1"` in `cache-invalidation-mutations.test.js` short-circuits controller before cache invalidation | Confirmed Defect |
| **BUG-09** | **LOW** | Phase 5 / Subscriptions API | Missing ObjectId format validation in `subscriptionController.js:getSubscriptionById` triggers unhandled 500 CastError on malformed IDs | Confirmed Defect |
| **BUG-10** | **LOW** | Frontend / Code Quality | ES2021 numeric separator (`60_000`) in `Topbar.jsx` triggers ESLint parsing error under default config | Confirmed Defect |

---

## 2. Detailed Bug Reports

---

### BUG-01: Critical Security Vulnerability in Delivery OTP Verification (Hardcoded "1234" Bypass)

- **Unique Bug ID:** `BUG-01`
- **Severity:** **CRITICAL**
- **Affected Phase and Feature:** Core Delivery Management / OTP Verification Workflow
- **Affected Files:**
  - [backend/app/services/deliveryOtpService.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/deliveryOtpService.js#L239-L281)
  - [backend/__tests__/deliveryOtpService.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/deliveryOtpService.test.js#L375-L430)
- **Environment and Prerequisites:**
  - Any environment (Development, Staging, Production).
  - No environment flag required; bypass is unconditionally hardcoded.

#### Reproduction Steps:
1. Invoke `validateDeliveryOtp(orderId, "1234")` for any existing order where:
   - Case A: No OTP record has ever been generated.
   - Case B: An OTP record exists but has already expired (`isOtpExpired(expiresAt) === true`).
   - Case C: An OTP record exists but maximum validation attempts have been exceeded (`attempts >= maxAttempts`).
2. Observe return value.

#### Code Evidence:
Lines 239 & 281 of `backend/app/services/deliveryOtpService.js`:
```javascript
239: const isMockOtp = String(enteredOtp) === "1234";
240: 
241: if (!otpRecord && !isMockOtp) {
242:   return {
243:     valid: false,
244:     error: 'OTP_NOT_FOUND',
245:     message: 'No OTP has been generated for this order yet'
246:   };
247: }
...
280: const enteredHash = OrderOtp.hashCode(enteredOtp);
281: const isMatch = isMockOtp || (otpRecord && enteredHash === otpRecord.codeHash);
```

#### Test Evidence:
```text
FAIL __tests__/deliveryOtpService.test.js
  ● deliveryOtpService › validateDeliveryOtp › should fail when no active OTP found
    Expected: false
    Received: true
      380 |       expect(result.valid).toBe(false);

  ● deliveryOtpService › validateDeliveryOtp › should fail when max attempts exceeded
    Expected: "MAX_ATTEMPTS_EXCEEDED"
    Received: "VALIDATION_FAILED"
      402 |       expect(result.error).toBe('MAX_ATTEMPTS_EXCEEDED');

  ● deliveryOtpService › validateDeliveryOtp › should fail when OTP is expired
    Expected: "OTP_EXPIRED"
    Received: "VALIDATION_FAILED"
      424 |       expect(result.error).toBe('OTP_EXPIRED');
```

#### Expected Result:
Entering `"1234"` when no OTP exists or when an OTP is expired/exhausted must be strictly rejected with HTTP 400 / `valid: false` and corresponding error code, unless `process.env.USE_MOCK_OTP === "true"` is explicitly enabled in non-production environments.

#### Actual Result:
Entering `"1234"` unconditionally validates the delivery OTP, bypassing customer verification, expiry checks, and attempt limits, allowing arbitrary delivery completion.

#### Recommended Fix:
Wrap `isMockOtp` with environment and configuration checks:
```javascript
const isMockOtp = 
  (process.env.USE_MOCK_OTP === "true" || process.env.NODE_ENV === "test") &&
  String(enteredOtp) === "1234";
```
In production, `isMockOtp` must evaluate to `false` under all circumstances.

#### Required Regression Tests:
Run `backend/__tests__/deliveryOtpService.test.js`, `backend/__tests__/delivery-otp-location-error.test.js`, and verify live delivery completion with randomized 4-digit OTP.

---

### BUG-02: Test Suite Hang in `finance-pricing-flow.test.js` & `checkout-pricing-handling-fee.test.js` Due to Unmocked `FlashDeal`

- **Unique Bug ID:** `BUG-02`
- **Severity:** **MEDIUM**
- **Affected Phase and Feature:** Phase 2 Integration / Pricing Engine & Regression Test Suites
- **Affected Files:**
  - [backend/app/services/finance/pricingService.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/finance/pricingService.js#L372-L379)
  - [backend/__tests__/finance-pricing-flow.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/finance-pricing-flow.test.js#L183)
  - [backend/__tests__/checkout-pricing-handling-fee.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/checkout-pricing-handling-fee.test.js#L39)
- **Environment and Prerequisites:**
  - Running unit tests without an active live MongoDB connection (standard CI/CD unit testing runner).

#### Reproduction Steps:
1. Run `npm test -- __tests__/finance-pricing-flow.test.js` in `backend/`.
2. Run `npm test -- __tests__/checkout-pricing-handling-fee.test.js` in `backend/`.

#### Code Evidence:
In `backend/app/services/finance/pricingService.js`:
```javascript
372:   const dealQuery = FlashDeal.find({
373:     status: "active",
374:     startTime: { $lte: now },
375:     endTime: { $gt: now },
376:     "products.productId": { $in: validProductObjIds },
377:   }).lean();
378:   if (session) dealQuery.session(session);
379:   const activeDeals = await dealQuery;
```
Neither `finance-pricing-flow.test.js` nor `checkout-pricing-handling-fee.test.js` mock `FlashDeal`.

#### Test Evidence:
```text
FAIL __tests__/finance-pricing-flow.test.js (6.874 s)
  ● finance pricing flow › hydrates cart items from product catalog
    thrown: "Exceeded timeout of 5000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."
      183 |   it("hydrates cart items from product catalog", async () => {

FAIL __tests__/checkout-pricing-handling-fee.test.js (7.052 s)
  ● checkout pricing snapshot handling fee › charges only the highest header-category handling fee once across a multi-seller checkout
    thrown: "Exceeded timeout of 5000 ms for a test.
      39 |   it("charges only the highest header-category handling fee once across a multi-seller checkout", async () => {
```

#### Expected Result:
Unit tests should execute in < 200ms using mock queries.

#### Actual Result:
`FlashDeal.find()` encounters unbuffered Mongoose connection wait, causing Jest's 5000ms timeout to trip.

#### Recommended Fix:
Add `FlashDeal` mock in both test files:
```javascript
jest.unstable_mockModule("../app/models/flashDeal.js", () => ({
  default: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  },
}));
```

#### Required Regression Tests:
Execute `npm test -- __tests__/finance-pricing-flow.test.js __tests__/checkout-pricing-handling-fee.test.js`.

---

### BUG-03: Incomplete Mongoose Mock in `finance-order-flow.test.js` Causing TypeError on `setting.js`

- **Unique Bug ID:** `BUG-03`
- **Severity:** **MEDIUM**
- **Affected Phase and Feature:** Phase 5 Integration / Double-Entry Ledger Order Settlement & Unit Tests
- **Affected Files:**
  - [backend/app/models/setting.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/models/setting.js#L74)
  - [backend/app/services/finance/orderFinanceService.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/finance/orderFinanceService.js#L22)
  - [backend/__tests__/finance-order-flow.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/finance-order-flow.test.js#L56-L65)
- **Environment and Prerequisites:**
  - Running backend Jest test suite.

#### Reproduction Steps:
1. Run `npm test -- __tests__/finance-order-flow.test.js` in `backend/`.

#### Code Evidence:
In `backend/__tests__/finance-order-flow.test.js`:
```javascript
56: jest.unstable_mockModule("mongoose", () => ({
57:   default: {
58:     startSession: mockStartSession,
59:     Types: {
60:       ObjectId: class MockObjectId { ... }
61:     }
62:   }
63: }));
```
In `backend/app/models/setting.js`:
```javascript
74: type: mongoose.Schema.Types.ObjectId,
```
Because Phase 5 added loyalty/referral hooks in `orderFinanceService.js`, `setting.js` is imported. `mongoose.Schema` is undefined in this mock.

#### Test Evidence:
```text
FAIL __tests__/finance-order-flow.test.js
  ● Test suite failed to run
    TypeError: Cannot read properties of undefined (reading 'Types')
      72 | // Optional: multi-tenant (null = default tenant)
      73 | tenantId: {
    > 74 | type: mongoose.Schema.Types.ObjectId,
         | ^
      75 | default: null,
      at app/models/setting.js:74:35
      at __tests__/finance-order-flow.test.js:106:5
```

#### Expected Result:
Test suite should run and verify all ledger transitions for COD and online orders.

#### Actual Result:
Suite crashes during module import with `TypeError: Cannot read properties of undefined (reading 'Types')`.

#### Recommended Fix:
Add `Schema` definition to `mongoose` mock in `backend/__tests__/finance-order-flow.test.js`:
```javascript
const SchemaMock = function() {};
SchemaMock.Types = { ObjectId: class MockObjectId {} };
SchemaMock.prototype.index = jest.fn();
SchemaMock.prototype.pre = jest.fn();
```

#### Required Regression Tests:
Execute `npm test -- __tests__/finance-order-flow.test.js` and verify all 12 ledger test cases.

---

### BUG-04: Incomplete `Schema` Mock in `phase0-order-placement.test.js` & `checkout-atomic-service.test.js` Crashing on `sellerSchema.methods.comparePassword`

- **Unique Bug ID:** `BUG-04`
- **Severity:** **MEDIUM**
- **Affected Phase and Feature:** Core Checkout Order Placement / Unit Test Suites
- **Affected Files:**
  - [backend/app/models/seller.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/models/seller.js#L202)
  - [backend/__tests__/phase0-order-placement.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/phase0-order-placement.test.js)
  - [backend/__tests__/checkout-atomic-service.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/checkout-atomic-service.test.js#L56-L68)
- **Environment and Prerequisites:**
  - Running backend Jest unit tests.

#### Reproduction Steps:
1. Run `npm test -- __tests__/phase0-order-placement.test.js` in `backend/`.
2. Run `npm test -- __tests__/checkout-atomic-service.test.js` in `backend/`.

#### Code Evidence:
In `backend/app/models/seller.js`:
```javascript
202: sellerSchema.methods.comparePassword = async function (enteredPassword) {
203:   return await bcrypt.compare(enteredPassword, this.password);
204: };
```
In `backend/__tests__/checkout-atomic-service.test.js`:
```javascript
56: jest.unstable_mockModule("mongoose", () => {
57:   const Schema = function () {};
58:   Schema.prototype.index = jest.fn();
59:   Schema.prototype.pre = jest.fn();
60:   Schema.Types = { ObjectId: "ObjectId" };
...
```
`Schema.prototype.methods` or `this.methods` is not initialized on instances of `Schema`.

#### Test Evidence:
```text
FAIL __tests__/phase0-order-placement.test.js
  ● Test suite failed to run
    TypeError: Cannot set properties of undefined (setting 'comparePassword')
      202 | sellerSchema.methods.comparePassword = async function (enteredPassword) {
          | ^
      at app/models/seller.js:202:38
      at __tests__/phase0-order-placement.test.js:150:30

FAIL __tests__/checkout-atomic-service.test.js
  ● Test suite failed to run
    TypeError: Cannot set properties of undefined (setting 'comparePassword')
      202 | sellerSchema.methods.comparePassword = async function (enteredPassword) {
          | ^
      at app/models/seller.js:202:38
      at __tests__/checkout-atomic-service.test.js:153:30
```

#### Expected Result:
Order placement unit tests execute successfully.

#### Actual Result:
Test suites crash during setup with `TypeError: Cannot set properties of undefined (setting 'comparePassword')`.

#### Recommended Fix:
Initialize `this.methods = {};` inside the mock `Schema` constructor in both test files:
```javascript
const Schema = function () {
  this.methods = {};
};
```

#### Required Regression Tests:
Execute `npm test -- __tests__/phase0-order-placement.test.js __tests__/checkout-atomic-service.test.js`.

---

### BUG-05: Settings Controller Omission of Phase 5 Loyalty & Referral Configurations

- **Unique Bug ID:** `BUG-05`
- **Severity:** **MEDIUM**
- **Affected Phase and Feature:** Phase 5 Customer Retention / Settings Persistence & Administration
- **Affected Files:**
  - [backend/app/controller/settingsController.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/controller/settingsController.js#L12-L170)
  - [backend/app/models/setting.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/models/setting.js#L192-L215)
- **Environment and Prerequisites:**
  - Admin panel settings API (`GET /api/settings` and `PUT /api/settings`).

#### Reproduction Steps:
1. Issue a `PUT /api/settings` with a payload containing:
   ```json
   {
     "loyalty": { "enabled": true, "pointsPer100Rupees": 5, "minOrderAmountToEarn": 200 },
     "referral": { "enabled": true, "referrerReward": 50, "refereeReward": 25 }
   }
   ```
2. Retrieve the settings with `GET /api/settings`.

#### Code Evidence:
In `backend/app/controller/settingsController.js`:
- Lines 12–55: `ALLOWED_KEYS` does not include `"loyalty"` or `"referral"`.
- Lines 83–140: `updateSettingsSchema` does not define validation rules for `loyalty` or `referral`.
- Lines 153–155: `.select(...)` projection in `getSettings` does not include `loyalty` or `referral`.

#### Expected Result:
Admins can read and update platform loyalty and referral parameters via the settings API.

#### Actual Result:
The settings controller filters out `loyalty` and `referral` from `PUT` requests, and does not project them in `GET` responses.

#### Recommended Fix:
1. Add `"loyalty"` and `"referral"` to `ALLOWED_KEYS` in `settingsController.js`.
2. Add Joi schemas for `loyalty` and `referral` in `updateSettingsSchema`.
3. Add `loyalty` and `referral` to the `.select(...)` string in `getSettings`.

#### Required Regression Tests:
Test saving and retrieving loyalty/referral configurations via `PUT /api/settings` and verifying that `calculateLoyaltyRewards` reflects updated rates.

---

### BUG-06: Missing Background Automated Cron for Due Subscription Orders

- **Unique Bug ID:** `BUG-06`
- **Severity:** **MEDIUM**
- **Affected Phase and Feature:** Phase 5 Subscriptions / Automated Order Generation
- **Affected Files:**
  - [backend/index.js](file:///c:/Users/HP/Desktop/Meatyns/backend/index.js#L350-L380)
  - [backend/scheduler.js](file:///c:/Users/HP/Desktop/Meatyns/backend/scheduler.js)
  - [backend/app/services/subscriptionService.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/subscriptionService.js#L256)
- **Environment and Prerequisites:**
  - Production or long-running development server.

#### Reproduction Steps:
1. Create an active subscription with `nextOrderDate` set to today.
2. Allow server to run without admin intervention.
3. Observe whether scheduled orders are automatically created.

#### Code Evidence:
`processDueSubscriptionOrders` is exported from `subscriptionService.js` and mounted to `POST /api/subscriptions/admin/run-due-batch` in `subscriptionController.js`, but it is nowhere registered in the background scheduler in `backend/index.js` or `backend/scheduler.js`.

#### Expected Result:
A daily background job runs automatically (e.g. at 00:05 IST) to evaluate due subscriptions and place scheduled orders.

#### Actual Result:
Scheduled subscription orders are only generated if an admin manually hits the `POST /api/subscriptions/admin/run-due-batch` endpoint.

#### Recommended Fix:
Register `processDueSubscriptionOrders` as a scheduled background interval task in `backend/index.js` or `backend/scheduler.js`.

#### Required Regression Tests:
Verify automatic order placement for due subscriptions across day boundary.

---

### BUG-07: Test Expectation Mismatch in `sellerVerificationService.test.js`

- **Unique Bug ID:** `BUG-07`
- **Severity:** **LOW**
- **Affected Phase and Feature:** Core Seller Onboarding / Automated Tests
- **Affected Files:**
  - [backend/__tests__/sellerVerificationService.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/sellerVerificationService.test.js#L133-L139)
  - [backend/app/services/emailService.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/services/emailService.js#L119)
- **Environment and Prerequisites:**
  - Running `npm test -- __tests__/sellerVerificationService.test.js`.

#### Reproduction Steps:
1. Run `npm test -- __tests__/sellerVerificationService.test.js` in `backend/`.

#### Code Evidence:
In `backend/__tests__/sellerVerificationService.test.js`:
```javascript
133: expect(mockSendMail).toHaveBeenCalledWith(
134:   expect.objectContaining({
135:     from: "Noyo <no-reply@example.com>",
136:     to: "seller@example.com",
137:     subject: "Verify your seller signup email",
138:   }),
139: );
```
In `backend/app/services/emailService.js`:
```javascript
119: subject: `${appName} — Your Verification Code is ${otp}`,
```

#### Test Evidence:
```text
FAIL __tests__/sellerVerificationService.test.js
  ● sellerVerificationService › sends seller email OTP through nodemailer and stores the session
    expect(mockSendMail).toHaveBeenCalledWith(expected)
    Expected: "subject": "Verify your seller signup email"
    Received: "subject": "Meatyns — Your Verification Code is 1234"
```

#### Expected Result:
Test assertion reflects the current email subject template.

#### Actual Result:
Test asserts legacy subject string, causing a failure despite correct email sending logic.

#### Recommended Fix:
Update test assertion in `backend/__tests__/sellerVerificationService.test.js`:
```javascript
subject: expect.stringMatching(/Your Verification Code is \d{4}/),
```

#### Required Regression Tests:
Execute `npm test -- __tests__/sellerVerificationService.test.js`.

---

### BUG-08: Invalid ObjectId `"cat-1"` in `cache-invalidation-mutations.test.js`

- **Unique Bug ID:** `BUG-08`
- **Severity:** **LOW**
- **Affected Phase and Feature:** Core Catalog Caching / Automated Unit Tests
- **Affected Files:**
  - [backend/__tests__/cache-invalidation-mutations.test.js](file:///c:/Users/HP/Desktop/Meatyns/backend/__tests__/cache-invalidation-mutations.test.js#L86-L95)
  - [backend/app/controller/categoryController.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/controller/categoryController.js#L642-L645)
- **Environment and Prerequisites:**
  - Running `npm test -- __tests__/cache-invalidation-mutations.test.js`.

#### Reproduction Steps:
1. Run `npm test -- __tests__/cache-invalidation-mutations.test.js` in `backend/`.

#### Code Evidence:
In `backend/__tests__/cache-invalidation-mutations.test.js`:
```javascript
86: test("deleteCategory invalidates category caches", async () => {
87:   await deleteCategory({ params: { id: "cat-1" } }, {});
88:   expect(mockInvalidate).toHaveBeenCalledWith("cache:catalog:categories:*");
89: });
```
In `backend/app/controller/categoryController.js`:
```javascript
643: if (!mongoose.Types.ObjectId.isValid(id)) {
644:   return handleResponse(res, 400, "Invalid category ID");
645: }
```

#### Test Evidence:
```text
FAIL __tests__/cache-invalidation-mutations.test.js
  ● cache invalidation on category mutations › deleteCategory invalidates category caches
    expect(jest.fn()).toHaveBeenCalledWith(...expected)
    Expected: "cache:catalog:categories:*"
    Number of calls: 0
```

#### Expected Result:
Test passes a valid 24-character hexadecimal ObjectId to reach the cache invalidation call.

#### Actual Result:
`"cat-1"` is rejected by `mongoose.Types.ObjectId.isValid()`, returning 400 before reaching `invalidate()`.

#### Recommended Fix:
In `backend/__tests__/cache-invalidation-mutations.test.js`, replace `"cat-1"` with a valid ObjectId:
```javascript
params: { id: "507f1f77bcf86cd799439011" },
```

#### Required Regression Tests:
Execute `npm test -- __tests__/cache-invalidation-mutations.test.js`.

---

### BUG-09: Unhandled CastError in `subscriptionController.js:getSubscriptionById`

- **Unique Bug ID:** `BUG-09`
- **Severity:** **LOW**
- **Affected Phase and Feature:** Phase 5 Customer Subscriptions / API Error Handling
- **Affected Files:**
  - [backend/app/controller/subscriptionController.js](file:///c:/Users/HP/Desktop/Meatyns/backend/app/controller/subscriptionController.js#L30-L50)
- **Environment and Prerequisites:**
  - Any authenticated customer request to `/api/subscriptions/:id` with non-hexadecimal string.

#### Reproduction Steps:
1. Authenticate as customer.
2. Send `GET /api/subscriptions/invalid-id`.

#### Test Evidence:
```text
GET /api/subscriptions/admin FORBIDDEN: 500 Cast to ObjectId failed for value "admin" (type string) at path "_id" for model "Subscription"
```

#### Expected Result:
API returns HTTP 400 Bad Request with `{ "success": false, "message": "Invalid subscription ID" }`.

#### Actual Result:
Server catches Mongoose `CastError` and responds with HTTP 500 Internal Server Error.

#### Recommended Fix:
Add ObjectId validation guard at the top of `getSubscriptionById`:
```javascript
if (!mongoose.Types.ObjectId.isValid(id)) {
  return handleResponse(res, 400, "Invalid subscription ID");
}
```

#### Required Regression Tests:
Send `GET /api/subscriptions/not-an-id` and verify HTTP 400 response.

---

### BUG-10: ES2021 Numeric Separator Parsing Error in `Topbar.jsx`

- **Unique Bug ID:** `BUG-10`
- **Severity:** **LOW**
- **Affected Phase and Feature:** Frontend Admin / Delivery Topbar / Linter Configuration
- **Affected Files:**
  - [frontend/src/shared/layout/Topbar.jsx](file:///c:/Users/HP/Desktop/Meatyns/frontend/src/shared/layout/Topbar.jsx#L118)
  - [frontend/eslint.config.js](file:///c:/Users/HP/Desktop/Meatyns/frontend/eslint.config.js)
- **Environment and Prerequisites:**
  - Running `npm run lint` in `frontend/`.

#### Reproduction Steps:
1. Run `npm run lint` in `frontend/`.

#### Code Evidence:
In `frontend/src/shared/layout/Topbar.jsx`:
```javascript
118: const FALLBACK_POLL_MS = 60_000;
```

#### Test Evidence:
```text
C:\Users\HP\Desktop\Meatyns\frontend\src\shared\layout\Topbar.jsx
  118:36  error  Parsing error: Identifier directly after number
```

#### Expected Result:
Frontend linter parses without syntax parsing errors.

#### Actual Result:
ESLint fails on the numeric separator `60_000`. (Note: Vite builds cleanly).

#### Recommended Fix:
Change `60_000` to `60000` or configure ESLint parser options for `ecmaVersion: 2021` or `latest`.

#### Required Regression Tests:
Execute `npm run lint` in `frontend/`.

---

## 3. Prioritized Remediation Roadmap

1. **Immediate Priority (P0 — Security Vulnerability):**
   - Fix `BUG-01`: Close the unconditional `"1234"` OTP bypass in `deliveryOtpService.js` to prevent unauthorized order deliveries.
2. **High Priority (P1 — Test Suite Stability):**
   - Fix `BUG-02`, `BUG-03`, `BUG-04`: Update mock setups in `finance-pricing-flow.test.js`, `checkout-pricing-handling-fee.test.js`, `finance-order-flow.test.js`, and `checkout-atomic-service.test.js` so that all CI/CD unit tests pass cleanly.
3. **Medium Priority (P2 — Operational Completeness):**
   - Fix `BUG-05`: Add `loyalty` and `referral` to `settingsController.js` to enable admin configuration.
   - Fix `BUG-06`: Register `processDueSubscriptionOrders` in the automated background job runner.
4. **Low Priority (P3 — Polish & Quality of Life):**
   - Fix `BUG-07`, `BUG-08`, `BUG-09`, `BUG-10`: Address test assertions, ObjectId validation, and ESLint numeric separator parsing.
