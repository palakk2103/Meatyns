# Customer App: Test-Numbers-Only Mode (Pilot Lock)

**Status: ON** (turned on 2026-11-18)

While this mode is on, the **customer app** (website and mobile app) works only for the
phone numbers on the allow-list. **Seller, Admin and Delivery apps are not affected.**

## What happens right now

| | Allowed (test) numbers | Every other number |
|---|---|---|
| Send OTP (login / signup) | OTP is sent as usual | **No OTP is sent.** The app shows a "We're launching soon!" popup |
| Verify OTP | Works as usual | Refused with the same message |
| Email OTP / password login | Works if the account's phone is on the list | Refused |
| Already logged-in session (auto refresh) | Keeps working | Session is ended, user is logged out |
| Place order / checkout / new subscription | Works as usual | Refused with the same message |
| Scheduled subscription orders | Created as usual | Not created |

Message shown to blocked customers:

> **We're launching soon!**
> Thank you for your interest in Meatyns! We're not live yet. Our app is currently in
> development and testing, so login and ordering are open only to our test team for now.
> We'll be launching very soon, please check back shortly.

Customers can still open the app and browse products; they just can't log in or order.

## Numbers allowed right now

| Number | OTP |
|---|---|
| 8770620342 | Fixed test OTP `1234` (no SMS) |
| 7558598590 | Real SMS OTP |
| 7841849908 | Real SMS OTP |
| 9096533667 | Real SMS OTP |
| 9011571573 | Real SMS OTP |

Keep this table in sync with `PILOT_PHONES` in the code.

## Add or remove test numbers

Either way works (both lists are merged):

1. **In code:** edit the `PILOT_PHONES` list in
   [backend/app/utils/customerPilotAccess.js](backend/app/utils/customerPilotAccess.js), then deploy.
   ```js
   const PILOT_PHONES = [
     "8770620342",
     "98XXXXXXXX",
   ];
   ```
2. **Without a code change:** set this in the backend environment (`backend/.env` or the hosting
   dashboard) and restart the backend:
   ```
   CUSTOMER_PILOT_PHONES=98XXXXXXXX,97XXXXXXXX
   ```

Write plain 10-digit numbers; `+91` is added automatically.

Note: `8770620342` is also the fixed-OTP test number (OTP `1234`, no SMS). Other allowed
numbers get a real SMS OTP, just like normal.

## Go back to normal (everyone can log in and order)

Set this in the backend environment and restart the backend:

```
CUSTOMER_PILOT_MODE=off
```

That's it. No frontend change or app rebuild is needed: the popup only appears when the backend
blocks a number. To turn the lock on again, remove that line (or set `CUSTOMER_PILOT_MODE=on`).

After launch, the lock code can be deleted entirely if you no longer need it (see "Where the code is").

## Where the code is

| File | What it does |
|---|---|
| `backend/app/utils/customerPilotAccess.js` | The switch, the allow-list and the message |
| `backend/app/controller/customerAuthController.js` | Blocks phone OTP, email OTP, password login and session refresh |
| `backend/app/modules/otp/otp.service.js` | Blocks the generic `/auth/otp` route for `userType: "Customer"` only |
| `backend/app/services/orderPlacementService.js` | Blocks order placement (all checkout routes and subscription orders) |
| `backend/app/controller/subscriptionController.js` | Blocks creating new subscriptions |
| `frontend/src/modules/customer/pages/CustomerAuth.jsx` | Shows the "launching soon" popup (error code `PILOT_ACCESS_ONLY`) |
| `backend/__tests__/customer-pilot-access.test.js` | Tests for the allow-list |

Automated tests run with the lock **off** unless a test sets `CUSTOMER_PILOT_MODE=on`.
