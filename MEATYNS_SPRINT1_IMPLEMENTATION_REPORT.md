# MEATYNS — SPRINT 1: SECURITY HARDENING & VERIFICATION IMPLEMENTATION REPORT

**Sprint Identifier:** SPRINT-1  
**Target System:** Meatyns Production-Oriented E-Commerce Application  
**Execution Date:** October 24, 2026  
**Auditor & Implementation Engineer:** Senior Software Architect, Principal Security Auditor & QA Lead  
**Working Directory:** `Meatyns` (`backend` / `frontend`)  
**Status:** COMPLETED & VERIFIED (Zero regressions, no destructive operations)  

---

## 1. INITIAL AUDIT FINDINGS

Prior to executing any code or configuration edits, a comprehensive forensic audit was conducted on the active repository, checking git status, environment settings, secrets handling, OTP validation paths, and test isolation.

### 1.1 Secrets & Environment Vulnerabilities Discovered
1. **Unsafe Dev Secret Fallbacks in Production Code Paths:**
   - In `backend/app/services/otpAuthService.js` (line 29) and `backend/app/modules/otp/otp.service.js` (line 29), OTP hashing defaulted to `"unsafe-dev-secret"` if `OTP_HASH_SECRET` or `JWT_SECRET` was omitted:
     ```javascript
     return process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "unsafe-dev-secret";
     ```
   - In `backend/app/services/sellerVerificationService.js` (lines 37–44), verification hashing similarly fell back to `"unsafe-dev-secret"`.
   - In `backend/app/services/meta/metaOAuthService.js` (lines 41, 69), Meta OAuth CSRF state signing fell back to static `"meatyns_meta_csrf_secret"`.
2. **Production Mock OTP Leakage & Bypass Vulnerabilities:**
   - In `backend/app/utils/otp.js` (lines 28–31), an explicit production fallback returned `MOCK_OTP` ("1234") if real SMS was not configured:
     ```javascript
     const production = process.env.NODE_ENV === "production";
     if (production && !useRealSMS()) {
       return MOCK_OTP;
     }
     ```
   - In `backend/app/services/sellerVerificationService.js` (lines 68–70), an identical production fallback returned `"1234"`.
   - In `backend/app/modules/otp/otp.service.js` (lines 173–175), hardcoded test mobile numbers (`6268423925` and `9111966732`) unconditionally forced `otp = "1234"` regardless of environment.
   - In `backend/app/services/otpAuthService.js` (lines 180–184), `response.mockOtp = otp;` was returned in the API JSON response if real SMS was disabled without checking `NODE_ENV`.
3. **Permissive CORS with Credentials in Production:**
   - In `backend/index.js` (lines 150–162), `corsOptions` configured `origin: true` with `credentials: true`. Although `allowedOrigins` was parsed from `CORS_ALLOWED_ORIGINS`, it was not bound to the CORS middleware, allowing any browser origin to make authenticated cross-origin requests.
   - Socket.IO similarly configured `cors: { origin: true, credentials: true }`.
4. **Startup Environment Validation Gaps:**
   - In `backend/app/core/startup.js`, `JWT_SECRET` was only checked against `"your-secret-key"` and `"default-secret"`. Short keys (<32 chars) or other insecure defaults (`"secret"`, `"test-secret"`, `"changeme"`) passed startup validation.
   - `startup.js` did not validate whether `USE_MOCK_OTP=true` was mistakenly set in production containers.
   - `startup.js` did not check for wildcard (`*`) CORS origins when credentials are enabled.
   - `startup.js` did not verify `RAZORPAY_WEBHOOK_SECRET` when `RAZORPAY_KEY_ID` was present.
5. **Database Isolation Hazard in Skipped Integration Tests:**
   - In `backend/__tests__/finance-api-e2e.test.js` (line 232), the test suite fell back to `process.env.MONGO_URI` if `MONGO_URI_E2E` was absent:
     ```javascript
     mongoUri = process.env.MONGO_URI_E2E || process.env.MONGO_URI;
     ```
     On teardown (line 252), it invoked `await mongoose.connection.dropDatabase()`. If someone turned on `RUN_E2E_TESTS=true` without providing a dedicated test database, this would have connected to the shared/live MongoDB cluster and dropped the database.

---

## 2. SUMMARY OF CODE CHANGES & ARCHITECTURAL RATIONALE

All changes were implemented to fail safely, enforce zero-trust in production, preserve local development convenience, and maintain 100% backward compatibility with all existing functional contracts and tests.

| File Changed | Component | Change Implemented | Rationale |
| :--- | :--- | :--- | :--- |
| `backend/app/utils/otp.js` | OTP Utility | Added `isMockOtpPermitted()` (strictly `false` in production). Enforced `useRealSMS()` returns `true` in production. Removed silent fallback returning `"1234"`. | Guarantees that production systems never generate or permit mock OTP `"1234"`. |
| `backend/app/services/otpAuthService.js` | Customer Auth | Hardened `otpHashSecret()` to throw if secrets are missing in production. Prevented `mockOtp` from ever being returned in API responses when `NODE_ENV === "production"`. | Eliminates static fallback key exposure and prevents credential leakage to frontend clients. |
| `backend/app/modules/otp/otp.service.js` | Shared SMS OTP | Hardened `otpHashSecret()` to throw in production. Updated `isMockOtpEnabled()` to strictly return `false` in production. Scoped hardcoded test phone bypass to non-production only. | Prevents phone number auth bypass and static hash keys in live production. |
| `backend/app/services/sellerVerificationService.js` | Merchant Verification | Hardened `verificationSecret()` to throw in production. Updated `isMockOtpEnabled()` and `generateSellerOtp` to strictly generate random cryptographically distinct OTPs in production. | Closes seller onboarding verification bypass. |
| `backend/app/services/emailService.js` | Email Service | Updated `useRealEmailOTP()` to return `true` in production. | Ensures transactional emails are always dispatched in live environments. |
| `backend/app/services/meta/metaOAuthService.js` | Meta Ads OAuth | Replaced static `"meatyns_meta_csrf_secret"` fallback with `getMetaCsrfSecret()`, throwing if `JWT_SECRET` is unset in production. | Prevents CSRF token forgery on Meta Business connection handshakes. |
| `backend/app/core/startup.js` | Core Startup | Enhanced `validateDependencies()` to: (1) require `JWT_SECRET` >= 32 chars and block common placeholders; (2) fail if `USE_MOCK_OTP` or `ALLOW_MOCK_DELIVERY_OTP` is true in production; (3) fail if `CORS_ALLOWED_ORIGINS` contains `*` with credentials; (4) require `RAZORPAY_WEBHOOK_SECRET` if `RAZORPAY_KEY_ID` is present. | Ensures fail-safe boot: container refuses to start if security configuration is deficient. |
| `backend/index.js` | Server & Socket.IO | Bound `allowedOrigins` to Express CORS and Socket.IO CORS in production. Allowed non-browser requests (no origin) while strictly blocking unauthorized web origins. | Closes CORS reflection vulnerability while preserving mobile and API tool access. |
| `backend/__tests__/finance-api-e2e.test.js` | E2E Integration Suite | Removed fallback to `MONGO_URI`. Strictly requires `MONGO_URI_E2E` environment variable. | Protects shared and production databases from accidental `dropDatabase()` execution. |
| `backend/__tests__/production-security-hardening.test.js` | New Automated Test Suite | Created 9 unit tests verifying OTP production blocking, startup validation failures, and Meta OAuth secret requirements. | Ensures automated regression testing for all Sprint 1 hardening controls. |

---

## 3. AUTOMATED TEST EXECUTION RESULTS

### 3.1 Backend Test Suites
- **Target Suite:** `npm test -- production-security-hardening.test.js`
  - **Result:** **1 passed, 1 total (9 passed tests, 0 failures)** (Execution time: 0.769s)
- **Full Backend Test Run:** `npm test`
  - **Result:** **61 passed, 4 skipped out of 65 total suites (366 passed tests, 22 skipped tests, 0 failures)**
  - **Execution Time:** 7.684s
  - **Diff against baseline:** +1 passing suite, +9 passing tests, 0 regressions.

### 3.2 Frontend Test Suites & Build
- **Frontend Test Run:** `npm test` (in `frontend/`)
  - **Result:** **3 passed out of 3 total suites (20 passed tests, 0 failures)** (Execution time: 0.449s)
- **Frontend Production Build:** `npm run build` (in `frontend/`)
  - **Result:** **Vite v7.3.1 production build succeeded in 12.49s across 198 chunks with 0 compilation errors.**

---

## 4. SKIPPED & BLOCKED TESTS AUDIT (TASK B)

The user prompt requested forensic verification of previously skipped integration suites.

### 4.1 Investigation of Previously Claimed Test Names
The report `MEATYNS_POST_FIX_TEST_REPORT.md` claimed 4 skipped suites named:
- `phase0-orders-e2e.test.js`
- `phase0-delivery-e2e.test.js`
- `finance-ledger-concurrency.test.js`
- `cart-pricing-isolation.test.js`

**Audit Verification Finding:**  
Inspection of git history, disk contents, and `backend/__tests__` revealed that test files with those exact four file names **do not exist on disk**; they were mislabeled in an earlier report. The **actual 4 skipped test suites** in the repository are:

1. `backend/__tests__/order-deletion-preservation.test.js` (Skipped via `RUN_DB_TESTS === "true"`)
2. `backend/__tests__/order-deletion-on-refresh-bug.test.js` (Skipped via `RUN_DB_TESTS === "true"`)
3. `backend/__tests__/missing-customer-otp-display.test.js` (Skipped via `RUN_DB_TESTS === "true"`)
4. `backend/__tests__/finance-api-e2e.test.js` (Skipped via `RUN_E2E_TESTS === "true"`)

### 4.2 Prerequisites & Safety Status of Skipped Suites
- **Database Dependency:** All 4 suites execute real Mongoose transactions, insert live records, and in the case of `finance-api-e2e.test.js`, invoke `mongoose.connection.dropDatabase()` on completion.
- **Local Isolation Verification:** A port check on `127.0.0.1:27017` confirmed no local MongoDB instance was running.
- **Safety Rule Compliance:** In strict adherence to the mandate (*"Never point these tests at production or a shared live database. Do not enable RUN_E2E_TESTS=true until you have verified the database target and isolation safeguards"*), these tests were **NOT** executed against the shared database configured in `.env`.
- **Status:** **BLOCKED / PENDING DEDICATED TEST CONTAINER**.
- **Exact Activation Prerequisites:**
  1. Provision an isolated local MongoDB instance (e.g. `docker run -d -p 27017:27017 mongo:6`).
  2. Set `MONGODB_TEST_URI="mongodb://127.0.0.1:27017/meatyns_test"` and `RUN_DB_TESTS="true"`.
  3. Set `MONGO_URI_E2E="mongodb://127.0.0.1:27017/meatyns_e2e"` and `RUN_E2E_TESTS="true"`.

---

## 5. EXTERNAL INTEGRATION READINESS MATRIX (TASK C)

Each external integration was inspected for implementation completeness, credential configuration, and live operational readiness.

| Integration | Purpose | Code Implementation Status | Verification Classification | Detailed Finding & Requirements for Live Verification |
| :--- | :--- | :---: | :---: | :--- |
| **Razorpay Payment Gateway** | UPI, Cards, Netbanking & Webhook Signatures | Fully Coded | **`CONFIGURATION MISSING`** | The adapter (`backend/app/services/payment/providers/razorpay.adapter.js`) includes constant-time HMAC SHA-256 signature verification and refund handlers. However, `backend/.env` currently lacks valid production `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Staging test with test cards required once keys are provisioned. |
| **Meta Marketing API & OAuth** | Ad creation, campaigns, insights | Fully Coded | **`CLIENT/PROVIDER ACTION REQUIRED`** | OAuth 2.0 handshake, HMAC state signing, and PAUSED draft creators are verified in code (`backend/app/services/meta/metaOAuthService.js`, `metaAdsService.js`). Requires client to create a Meta Developer App, complete Business Verification, configure `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI`. |
| **Meta Pixel & Conversions API (CAPI)** | Client and server-side tracking | Fully Coded | **`CONFIGURATION MISSING`** | `MetaPixelTracker.jsx` and `metaCapiService.js` implement SHA-256 PII hashing and `purchase_<orderId>` deduplication. Requires client to provide `META_PIXEL_ID` and a permanent System User `META_CAPI_ACCESS_TOKEN`. |
| **SMSIndiaHub Telephony** | Customer & Delivery OTP SMS | Fully Coded | **`CLIENT/PROVIDER ACTION REQUIRED`** | `smsIndiaHubService.js` and `smsOtpService.js` handle XML/JSON provider responses and status codes (`000`, `001`, `006`, `007`). Live SMS transmission is blocked until the client completes TRAI DLT Principal Entity registration, registers sender header (`MEATYN`), and provides approved `SMS_INDIA_HUB_DLT_TEMPLATE_ID`. |
| **Google Maps Platform** | Geocoding, Places Autocomplete, Route Polylines | Fully Coded | **`STAGING TEST REQUIRED`** | `mapsRouteService.js` and `mapsGeocodeService.js` feature automatic fallback to OpenStreetMap Nominatim and Redis/Mongo caching. An API key is configured in local `.env`, but client must ensure GCP Billing is enabled, and API quotas for Places, Directions, and Geocoding APIs are active. |
| **MongoDB Atlas Backups** | Production Database Snapshots & PITR | Infrastructure | **`CLIENT/PROVIDER ACTION REQUIRED`** | Database backups are managed at the cloud provider layer (MongoDB Atlas Cloud Console). Client must verify that continuous cloud backup (Point-in-Time Restore) and automated daily snapshots are active in the Atlas cluster settings. |
| **Firebase Cloud Messaging & RTDB** | Push Notifications & Driver GPS Tracking | Fully Coded | **`CODE VERIFIED`** | Firebase Admin SDK and RTDB services are initialized with private key service credentials in `.env` and verified operational. |
| **Cloudinary Media Storage** | Product Image CDN & WebP Compression | Fully Coded | **`CODE VERIFIED`** | Cloudinary credentials configured and active; media upload endpoints operational. |

---

## 6. NATIVE APP VS. PWA SCOPE AUDIT (TASK D)

### 6.1 Current Architecture Reality
- **PWA Status:** The frontend is a modern, responsive Single Page Application (SPA) built with React 19 and Vite. It contains:
  - Responsive, touch-optimized layouts with `viewport-fit=cover`.
  - Apple touch icons (`apple-touch-icon.png`) and multiple favicon resolutions.
  - Theme color headers (`#FDCE04`).
  - Background Service Worker (`firebase-messaging-sw.js`) for web push notifications.
- **Native App Status:** There are **no native Android (Kotlin/Java) or iOS (Swift/Objective-C) projects, nor React Native or Flutter mobile codebases** in the repository.

### 6.2 Mandatory Question for the Client
> **Client Platform Decision Question:**  
> *"Does the existing mobile-responsive, installable Progressive Web Application (PWA) — which can be added to the customer's home screen and receive real-time push notifications — fulfill your commercial mobile app requirement, or does your business contractually require separate native iOS and Android applications published directly to the Apple App Store and Google Play Store?"*

*Note: In accordance with safety rules, no platform decision was made on the client's behalf, and no native mobile scaffold was generated.*

---

## 7. SAFE MANUAL SECRET ROTATION PROCEDURE & DEPLOYMENT CHECKLIST

To maintain zero-trust security without disrupting active user sessions, secrets must never be rotated automatically via automated scripts. Follow this procedure:

### 7.1 Manual Secret Rotation Procedure
1. **JWT Secret Rotation:**
   - Generate a 64-character cryptographic hex secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Update `JWT_SECRET` in the hosting secret manager (Render / Kubernetes Secrets).
   - *User Impact:* Active sessions will expire upon token expiration (default 7 days) and require OTP re-authentication. For zero-downtime rotation, schedule during low-traffic windows (e.g. 03:00–04:00 AM IST).
2. **Razorpay Webhook Secret Rotation:**
   - In the [Razorpay Merchant Dashboard](https://dashboard.razorpay.com/) $	o$ Settings $	o$ Webhooks, create a secondary webhook endpoint with a new secret.
   - Update `RAZORPAY_WEBHOOK_SECRET` in backend hosting environment variables.
   - Deploy backend. Verify incoming test webhook signature verification succeeds.
   - Delete the old webhook endpoint in Razorpay.
3. **SMS Telephony API Key Rotation:**
   - Generate new API key in SMSIndiaHub portal.
   - Update `SMS_INDIA_HUB_API_KEY` in hosting environment variables.
   - Deploy backend and send a test login OTP to verify delivery.

### 7.2 Pre-Deployment Checklist
- [ ] Set `NODE_ENV="production"` in container environment.
- [ ] Set `USE_MOCK_OTP="false"` and `ALLOW_MOCK_DELIVERY_OTP="false"`.
- [ ] Set `USE_REAL_SMS="true"`.
- [ ] Ensure `JWT_SECRET` is at least 32 characters and contains high entropy.
- [ ] Set `CORS_ALLOWED_ORIGINS` to exact production domains (e.g. `https://meatyns.com,https://admin.meatyns.com,https://seller.meatyns.com`); ensure no wildcard `*` is present.
- [ ] Ensure `RAZORPAY_WEBHOOK_SECRET` is set if `RAZORPAY_KEY_ID` is populated.

---

## 8. CONFIRMATION OF SAFETY & WORKSPACE INTEGRITY

- **Destructive Operation Audit:** No database records were dropped, no remote clusters were altered, and no live payment transactions were executed.
- **Production Deployment:** No production deployment was triggered.
- **User Work Preservation:** All preexisting uncommitted files and work in the repository were preserved intact.
