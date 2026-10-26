# MEATYNS — SPRINT 1: MANUAL VERIFICATION CHECKLIST
## Pre-Launch Security Hardening, External Integration Readiness & Client Decision Matrix

**Document Version:** 1.0.0  
**Target Repository:** `Meatyns`  
**Date:** October 24, 2026  
**Auditor / Architect:** Senior Software Architect & Lead Security Auditor  

---

## 1. EXECUTIVE SUMMARY

Sprint 1 focused on **Security Hardening & Verification**. All insecure secret fallbacks, production mock OTP bypasses, CORS reflection hazards, and test database isolation risks have been resolved and verified with automated test suites.

This checklist provides the structured, step-by-step verification protocols that QA, DevOps, and project stakeholders must execute before promoting the Meatyns application into live production.

---

## 2. PRODUCTION SECRETS & ENVIRONMENT HARDENING VERIFICATION

| Check Item | Target Environment | Verification Command / Procedure | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- | :---: |
| **JWT Secret Strength** | Production Container | Inspect hosting secret manager for `JWT_SECRET`. | Must be >= 32 characters, high-entropy hex/base64 string. Cannot be default placeholders. | [ ] PENDING PROD DEPLOY |
| **Startup Fail-Safe (Weak Secret)** | Staging Container | Temporarily set `JWT_SECRET="short-key"` with `NODE_ENV=production` and start server. | Application startup halts with `FATAL: Startup failed: JWT_SECRET must be at least 32 characters in production`. | [x] CODE VERIFIED VIA TEST |
| **Mock OTP Prohibition** | Production API | Send POST to `/api/auth/otp/send` with `NODE_ENV=production` and `USE_MOCK_OTP=true`. | API dispatches real SMS or throws error; response JSON **never** includes `mockOtp: "1234"`. | [x] CODE VERIFIED VIA TEST |
| **Delivery OTP Mock Rejection** | Production API | Attempt delivery completion using `"1234"` as handoff OTP. | System returns HTTP 400 `Invalid OTP. Please try again.` | [x] CODE VERIFIED VIA TEST |
| **Production CORS Origins** | Production Server | Send `OPTIONS /api/products` with `Origin: https://evil-attacker.com`. | Server rejects request with CORS error. Request is not reflected with `Access-Control-Allow-Origin`. | [x] CODE VERIFIED |
| **CORS Wildcard Block** | Production Container | Set `CORS_ALLOWED_ORIGINS="*"` with `NODE_ENV=production` and boot. | Startup halts with `CORS_ALLOWED_ORIGINS cannot contain wildcard "*" in production with credentials enabled`. | [x] CODE VERIFIED VIA TEST |

---

## 3. ISOLATED INTEGRATION TEST ENVIRONMENT SETUP (TASK B)

Because live integration suites execute database drops and state resets, they must **only** be executed against a dedicated, isolated test database instance.

### Prerequisites Setup Guide
1. Launch local isolated MongoDB instance:
   ```bash
   docker run -d --name meatyns-test-mongo -p 27017:27017 mongo:6.0
   ```
2. Verify local connectivity:
   ```bash
   node -e "const m = require('mongoose'); m.connect('mongodb://127.0.0.1:27017/test').then(() => { console.log('Connected'); process.exit(0); });"
   ```
3. Run the isolated integration suites:
   ```bash
   # In backend directory:
   $env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/meatyns_test"
   $env:RUN_DB_TESTS="true"
   npm test -- order-deletion-preservation.test.js order-deletion-on-refresh-bug.test.js missing-customer-otp-display.test.js

   $env:MONGO_URI_E2E="mongodb://127.0.0.1:27017/meatyns_e2e"
   $env:RUN_E2E_TESTS="true"
   npm test -- finance-api-e2e.test.js
   ```

- [ ] **Task B Isolation Safeguard Verified:** `finance-api-e2e.test.js` strictly aborts if `MONGO_URI_E2E` is missing, preventing shared database corruption.

---

## 4. EXTERNAL INTEGRATION STAGING TEST PROTOCOLS (TASK C)

### 4.1 Razorpay Payment Gateway
- **Classification:** `CONFIGURATION MISSING`
- **Required Configuration:**
  - `RAZORPAY_KEY_ID`: Sandbox Key ID (`rzp_test_...`)
  - `RAZORPAY_KEY_SECRET`: Sandbox Secret
  - `RAZORPAY_WEBHOOK_SECRET`: Configured in Razorpay Webhooks dashboard
- **Verification Protocol:**
  1. Add meat items to customer cart $	o$ navigate to checkout.
  2. Select **Online Payment (Razorpay)** $	o$ proceed to payment modal.
  3. Enter Razorpay test card credentials (`4111 1111 1111 1111`, expiry in future, CVV `123`, OTP `123456`).
  4. Confirm payment capture transitions order status from `pending` to `confirmed`.
  5. Check `LedgerEntry` collection $	o$ verify gateway payment ledger record created.
  6. In Admin Orders $	o$ Cancel order $	o$ verify automated Razorpay refund is initiated and recorded.
- **Sign-Off:** [ ] PENDING LIVE CREDENTIALS

### 4.2 Meta Marketing API, Pixel & CAPI
- **Classification:** `CLIENT/PROVIDER ACTION REQUIRED`
- **Required Configuration:**
  - `META_APP_ID`: Registered in Meta for Developers
  - `META_APP_SECRET`: App Secret
  - `META_REDIRECT_URI`: `https://admin.meatyns.com/api/admin/meta/oauth/callback`
  - `META_PIXEL_ID`: Meta Events Manager Pixel ID
  - `META_CAPI_ACCESS_TOKEN`: System User Permanent Token with `ads_management` scope
- **Verification Protocol:**
  1. In Admin Panel $	o$ **Marketing & Meta Ads** $	o$ **Meta Connect** tab.
  2. Click **Connect Meta Business Account** $	o$ complete Meta OAuth permissions dialog.
  3. Confirm Ad Account ID and Pixel are saved to `MetaIntegration`.
  4. Create a test campaign draft $	o$ verify campaign appears in Facebook Ads Manager strictly in `PAUSED` status.
  5. Place a test store purchase $	o$ open Meta Events Manager **Test Events** $	o$ confirm server `Purchase` event received with matching `event_id`.
- **Sign-Off:** [ ] PENDING CLIENT CREDENTIALS

### 4.3 SMSIndiaHub Telephony & DLT Compliance
- **Classification:** `CLIENT/PROVIDER ACTION REQUIRED`
- **Required Configuration:**
  - `SMS_INDIA_HUB_API_KEY`: Account API key
  - `SMS_INDIA_HUB_SENDER_ID`: Approved 6-character Header (e.g. `MEATYN`)
  - `SMS_INDIA_HUB_DLT_TEMPLATE_ID`: TRAI-approved Content Template ID
  - `USE_REAL_SMS`: `true`
  - `USE_MOCK_OTP`: `false`
- **Verification Protocol:**
  1. Enter mobile number on customer login page $	o$ trigger OTP dispatch.
  2. Confirm SMS arrives on physical mobile device within 15 seconds.
  3. Confirm sender ID matches registered DLT header (`MEATYN`).
  4. Confirm message content matches approved TRAI template format exactly.
  5. Enter code on client $	o$ confirm successful token issuance.
- **Sign-Off:** [ ] PENDING CLIENT DLT REGISTRATION

### 4.4 Google Maps Platform
- **Classification:** `STAGING TEST REQUIRED`
- **Required Configuration:**
  - `GOOGLE_MAPS_API_KEY`: API Key with Places API, Geocoding API, and Directions API enabled.
  - Billing account linked in Google Cloud Console.
  - HTTP referrer restrictions bound to Meatyns web domains.
- **Verification Protocol:**
  1. Open Address Book on customer web store $	o$ enter delivery street address.
  2. Verify Google Places autocomplete dropdown populates suggestions.
  3. Select address $	o$ confirm latitude and longitude are returned and pinned on map.
  4. Place delivery order $	o$ open rider tracking screen $	o$ confirm route polyline renders between store and delivery coordinates.
- **Sign-Off:** [ ] PENDING GCP BILLING ACTIVATION

### 4.5 MongoDB Atlas Cloud Backups
- **Classification:** `CLIENT/PROVIDER ACTION REQUIRED`
- **Required Actions:**
  1. Log in to [MongoDB Atlas Console](https://cloud.mongodb.com/).
  2. Navigate to Cluster $	o$ **Backup** tab.
  3. Verify that **Continuous Cloud Backup** is enabled.
  4. Confirm snapshot schedule (Daily snapshots with 7-day retention; weekly snapshots with 4-week retention).
  5. Verify Point-in-Time Restore (PITR) window is active.
- **Sign-Off:** [ ] PENDING CLIENT CLUSTER CONFIRMATION

---

## 5. NATIVE APP VS. PWA CLIENT DECISION (TASK D)

The client must explicitly answer the following question to define subsequent development phases:

| Question for Client | Option A (Recommended) | Option B |
| :--- | :--- | :--- |
| **Mobile Application Delivery Scope** | **Progressive Web App (PWA):** Use the existing touch-optimized, installable web application with Service Worker push notifications (`firebase-messaging-sw.js`), fast load times, and universal compatibility across iOS Safari, Android Chrome, and Desktop browsers with zero app store commissions. | **Native Mobile Apps:** Scope a new separate mobile development initiative to build and maintain dedicated iOS (Swift/React Native) and Android (Kotlin/React Native) apps and manage Apple Developer and Google Play Console store publishing. |

- [ ] **Client Decision Received:** `____________________`
- [ ] **Authorized By:** `____________________`  **Date:** `__________`

---

## 6. PRE-LAUNCH STAGING SIGN-OFF SUMMARY

| Item | Requirement | Sign-off Status |
| :--- | :--- | :---: |
| 1 | Production Secret Rotation procedure reviewed and approved | [ ] PENDING DEPLOY |
| 2 | Dedicated isolated test MongoDB container available for E2E suites | [ ] PENDING LOCAL DOCKER |
| 3 | Razorpay production/staging credentials configured | [ ] PENDING CREDENTIALS |
| 4 | Meta App ID, Secret, and CAPI access token provisioned | [ ] PENDING CREDENTIALS |
| 5 | SMSIndiaHub TRAI DLT approved sender header and template ID active | [ ] PENDING CREDENTIALS |
| 6 | Google Cloud Platform billing active on Google Maps API key | [ ] PENDING GCP BILLING |
| 7 | MongoDB Atlas Automated Continuous Backup active | [ ] PENDING ATLAS CHECK |
| 8 | Client platform decision recorded on Native App vs PWA | [ ] PENDING CLIENT DECISION |
