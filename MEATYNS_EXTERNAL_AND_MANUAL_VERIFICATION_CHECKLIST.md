# MEATYNS — EXTERNAL & MANUAL VERIFICATION CHECKLIST
## Pre-Launch Third-Party Credentials, Staging Test Protocols & Client Decision Matrix

**Document Version:** 1.0.0  
**Date:** October 24, 2026  
**Auditor / Architect:** Senior Software Architect & Lead Security Auditor  
**Repository:** `Meatyns`  

---

## 1. EXECUTIVE SUMMARY

The Meatyns codebase has reached **77.61% complete code surface**, with all core e-commerce, RBAC, marketing, retention, and advertising features fully programmed and unit-tested offline.

However, several critical systems interface directly with third-party service providers (Meta, Razorpay, SMSIndiaHub, Google Maps, Firebase, Cloudinary). These features cannot execute real-world network operations in local development without valid external credentials, active billing, and production vendor reviews.

This document serves as the master checklist of all external credentials, staging test protocols, and client business decisions required to transition Meatyns into production operations.

---

## 2. EXTERNAL INTEGRATIONS CREDENTIALS & ACTION CHECKLIST

### 1. Custom Meta Ads Manager, Pixel & Conversions API (CAPI)

- [ ] **Meta Developer App Registration:**
  - Create or select an existing business app in the [Meta for Developers Console](https://developers.facebook.com/).
  - Add the **Marketing API** product to the app.
  - Set App Mode to **Live** (requires Meta Business Verification).
- [ ] **Environment Variables Configuration (`backend/.env`):**
  - `META_APP_ID`: Meta App ID.
  - `META_APP_SECRET`: Meta App Secret.
  - `META_REDIRECT_URI`: `https://admin.meatyns.com/api/admin/meta/oauth/callback` (or staging equivalent; must match Meta App valid OAuth redirect URIs).
  - `META_PIXEL_ID`: Production Meta Pixel ID.
  - `META_CAPI_ACCESS_TOKEN`: Permanent System User Access Token with `ads_management` and `ads_read` permissions.
  - `META_TEST_EVENT_CODE`: Test code from Meta Events Manager (for staging verification).
- [ ] **Staging Verification Protocol:**
  1. Open Admin Panel $	o$ **Marketing & Meta Ads** $	o$ **Meta Connect** tab.
  2. Click **Connect Meta Business Account** and execute OAuth authorization handshake.
  3. Verify Ad Account and Pixel assets are discovered and saved to `MetaIntegration`.
  4. Create a test campaign draft in **Campaigns** tab $	o$ confirm it is created strictly in `PAUSED` state on Facebook Ads Manager.
  5. Place a test order on the customer web store $	o$ open Meta Events Manager **Test Events** $	o$ verify server `Purchase` event appears with green checkmark and matching `event_id: "purchase_<orderId>"`.

---

### 2. Razorpay Payment Gateway

- [ ] **Merchant Account Setup:**
  - Complete KYC verification on the [Razorpay Merchant Dashboard](https://dashboard.razorpay.com/).
  - Activate domestic UPI, Credit/Debit cards, and Netbanking payment methods.
- [ ] **Environment Variables Configuration (`backend/.env`):**
  - `RAZORPAY_KEY_ID`: Production Key ID (`rzp_live_...`) or Staging Key ID (`rzp_test_...`).
  - `RAZORPAY_KEY_SECRET`: Corresponding Secret Key.
  - `RAZORPAY_WEBHOOK_SECRET`: Secret configured in Razorpay Webhooks.
- [ ] **Webhook Endpoint Configuration:**
  - Add webhook URL: `https://api.meatyns.com/api/payments/webhook`
  - Subscribe to events: `payment.captured`, `payment.failed`, `refund.processed`.
- [ ] **Staging Verification Protocol:**
  1. Place a test order using Razorpay Sandbox Card (`4111 1111 ...`) or UPI ID.
  2. Confirm payment capture transitions order from `pending` to `confirmed` in database.
  3. Cancel the test order $	o$ confirm automated refund API is invoked and recorded in `LedgerEntry`.

---

### 3. SMS & OTP Telephony (SMSIndiaHub)

- [ ] **TRAI DLT Registration (Mandatory in India):**
  - Complete Principal Entity (PE) registration on DLT portal (Jio / Airtel / Vodafone).
  - Register approved Sender ID / Header (e.g. `MEATYN`).
  - Register transactional OTP template:
    ```text
    Your Meatyns verification code is {#var#}. Valid for 10 minutes. Do not share this OTP with anyone.
    ```
- [ ] **Environment Variables Configuration (`backend/.env`):**
  - `SMS_INDIA_HUB_API_KEY`: SMSIndiaHub API key.
  - `SMS_INDIA_HUB_SENDER_ID`: Approved 6-character DLT Header (`MEATYN`).
  - `SMS_INDIA_HUB_TEMPLATE_ID`: Approved DLT Content Template ID.
  - `USE_MOCK_OTP`: Set strictly to `false` for live SMS testing.
- [ ] **Staging Verification Protocol:**
  1. Trigger customer mobile login $	o$ verify real 4-digit SMS OTP is received on physical phone within 15 seconds.
  2. Attempt entering invalid OTP $	o$ verify rejection.
  3. Enter valid OTP $	o$ verify customer token issuance.
  4. Trigger delivery completion $	o$ verify delivery handoff OTP arrives on customer phone.

---

### 4. Google Maps Platform Services

- [ ] **GCP Project & API Activation:**
  - Create project in [Google Cloud Console](https://console.cloud.google.com/).
  - Enable: **Maps JavaScript API**, **Places API**, **Geocoding API**, **Directions API**.
  - Associate billing account.
- [ ] **API Key Restrictions:**
  - Restrict Key HTTP referrers to `meatyns.com`, `*.meatyns.com`, and staging domains.
- [ ] **Environment Variables Configuration:**
  - `frontend/.env`: `VITE_GOOGLE_MAPS_API_KEY`
  - `backend/.env`: `GOOGLE_MAPS_API_KEY`
- [ ] **Staging Verification Protocol:**
  1. Open Address Book on customer app $	o$ type address $	o$ verify Google Places autocomplete dropdown populates.
  2. Select address $	o$ verify latitude and longitude coordinates save correctly.
  3. Open Customer Order Detail Page for an active delivery $	o$ verify Google Map renders route polyline between store and customer.

---

### 5. Firebase Cloud Messaging (FCM) & Realtime Database (RTDB)

- [ ] **Firebase Project Configuration:**
  - Open [Firebase Console](https://console.firebase.google.com/).
  - Download Service Account Private Key JSON file.
- [ ] **Environment Variables Configuration (`backend/.env`):**
  - `FIREBASE_SERVICE_ACCOUNT_PATH`: Absolute path to service account JSON file.
  - `FIREBASE_DATABASE_URL`: Realtime Database URL (e.g. `https://meatyns-default-rtdb.firebaseio.com`).
- [ ] **Frontend VAPID Key (`frontend/.env`):**
  - `VITE_FIREBASE_VAPID_KEY`: Web push certificate key for Service Worker push subscriptions.
- [ ] **Staging Verification Protocol:**
  1. Allow push notifications on customer browser $	o$ verify device token saves to `User.fcmTokens`.
  2. Dispatch broadcast push from Admin **Notification Composer** $	o$ verify alert banner appears on client screen.
  3. Simulate driver location update $	o$ verify coordinates update in Firebase RTDB and rider icon moves in real-time.

---

### 6. Cloudinary Media Storage & CDN

- [ ] **Cloudinary Account Setup:**
  - Open [Cloudinary Console](https://cloudinary.com/).
  - Create unsigned upload preset (if direct client uploads enabled) or configure backend signing.
- [ ] **Environment Variables Configuration (`backend/.env`):**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- [ ] **Staging Verification Protocol:**
  1. Upload new product image in Admin Product Management $	o$ verify image uploads to Cloudinary.
  2. Inspect image URL on customer storefront $	o$ verify Cloudinary WebP transformation parameters (`f_auto,q_auto`) are applied.

---

### 7. Transactional Email Service (Nodemailer / SMTP)

- [ ] **SMTP Provider Configuration:**
  - Configure Amazon SES, SendGrid, or Google Workspace SMTP relay.
- [ ] **Environment Variables Configuration (`backend/.env`):**
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM`: `Meatyns <noreply@meatyns.com>`
- [ ] **Staging Verification Protocol:**
  1. Trigger seller signup email verification $	o$ confirm email arrives in inbox with branded subject `Meatyns — Your Verification Code is d{4}`.

---

## 3. CLIENT BUSINESS DECISIONS & SCOPE CLARIFICATIONS

| # | Topic | Current Architecture State | Decision Required from Client |
|---|---|---|---|
| 1 | **Native Mobile Apps vs. PWA** | Web PWA exists with responsive UI, manifest, and push notifications. | **Decision:** Does the Progressive Web Application (PWA) satisfy the mobile app requirement, or is a dedicated native React Native / Flutter mobile app build and Apple App Store / Google Play Store submission required? |
| 2 | **Meta Ad Spend Authority** | Ad drafts are strictly created in `PAUSED` state with confirmation modals. | **Decision:** Confirm whether campaign publishing from Meatyns admin should always remain in `PAUSED` draft status for manual review in Facebook Ads Manager, or if direct `ACTIVE` live spending should ever be permitted. |
| 3 | **Free Delivery Threshold Policy** | Configurable in Admin (`Setting.freeDeliveryThreshold`, default ₹499). | **Decision:** Confirm commercial free delivery threshold and whether minimum cart value checks should apply across all outlets. |
| 4 | **Loyalty & Referral Commercial Rates** | Default: 5% referral reward, 1 loyalty coin per ₹100 spent. | **Decision:** Confirm reward coin value (₹1 per coin vs ₹0.25 per coin) and maximum wallet coin redemption percentage per order. |
| 5 | **Third-Party POS Vendor** | Webhook bridge `/api/v1/integrations/pos` implemented. | **Decision:** Identify contracted commercial retail POS vendor (Petpooja, UrbanPiper, Posist, Tally) to map specific webhook payloads. |

---

## 4. PRE-LAUNCH STAGING SIGN-OFF CHECKLIST

- [ ] All environment variables populated in production secret manager.
- [ ] `USE_MOCK_OTP` verified as `false`.
- [ ] MongoDB Atlas continuous daily automated snapshot backup verified.
- [ ] Redis in-memory cache cluster operational with persistence enabled.
- [ ] Full Jest test suite executed on staging runner (0 failing tests).
- [ ] Vite production bundle build executed with 0 errors.
- [ ] End-to-end test order placed, paid via live Razorpay card, and confirmed delivered via real SMS OTP.
- [ ] CAPI `Purchase` event verified in Meta Events Manager.
