# Meatyns Sprint 3B Manual Test Checklist
## Polygon-Based Delivery Service Zones (`DEL-001`, `DEL-002`, `ADM-014`)

**Document Version:** 1.1.0 (Post-Verification Executed)  
**Execution Timestamp:** 2026-10-26T17:16:30+05:30  
**Target Environment:** Local Integration Staging (`http://localhost:7000` / `http://localhost:5173`)  
**Automated Verification Script:** `backend/scripts/verify-sprint3b-e2e.js`  
**Test Suite Reference:** `backend/__tests__/delivery-zone.test.js`

---

## 1. Prerequisites & Test Setup

- [x] Backend running on Port 7000 with MongoDB connected.
- [x] Frontend running on Port 5173 (`vite` dev server).
- [x] Admin credentials active (`ankit1@gmail.com`).
- [x] Customer account active with saved addresses.
- [x] `.env` contains valid configurations (with manual JSON coordinate fallback supported).

---

## 2. Test Execution Matrix

### Section A: Admin Delivery Zones Management (`ADM-014`)

| Test ID | Test Case | Steps & Observed Execution | Expected Result | Status |
|---|---|---|---|---|
| **MAN-ZON-001** | Navigation to Delivery Zones tab | Logged in to Admin portal $\rightarrow$ `/admin/delivery-management`. Observed top tab bar. | A 6th tab titled **"Delivery Zones"** with MapPin icon is visible alongside General, Express, Normal, Advance, and Slots. | [x] Pass |
| **MAN-ZON-002** | Empty State Visibility | Inspected Delivery Zones tab when 0 zones exist. | Displays empty state illustration with message and "+ Create Zone" CTA. | [x] Pass |
| **MAN-ZON-003** | Visual Polygon Drawing on Map | Clicked "+ Create Zone", observed map container, added coordinates. | Map renders numbered markers, real-time perimeter, and vertex counter badge. | [x] Pass |
| **MAN-ZON-004** | Undo and Clear Drawing | Added coordinates, clicked "Undo" and "Clear" buttons. | "Undo" removes last vertex; "Clear" resets vertices to 0. | [x] Pass |
| **MAN-ZON-005** | Manual Coordinates / JSON Fallback Mode | Clicked "Switch to Text / JSON", pasted coordinate array `[[85.10, 25.58], ...]`. | System bidirectional sync parses JSON and maps polygon without map clicks. | [x] Pass |
| **MAN-ZON-006** | Zone Validation Guard | Attempted submission with < 3 points. | Form blocks submission with error *"A delivery zone requires at least 3 points on the map to form a polygon."* | [x] Pass |
| **MAN-ZON-007** | Custom Delivery Fee Override (`DEL-002`) | Created zone with Fee ₹35 and Surcharge ₹5 via `POST /api/admin/delivery-zones`. | Zone persists with custom fee ₹35 and surcharge ₹5. | [x] Pass |
| **MAN-ZON-008** | Edit Existing Zone | Updated zone properties via `PUT /api/admin/delivery-zones/:id`. | Updated zone properties persisted and reloaded successfully. | [x] Pass |
| **MAN-ZON-009** | Active / Inactive Status Toggle | Executed `PATCH /api/admin/delivery-zones/:id/status` `{ isActive: false }`. | Badge toggles between green "Active" and gray "Inactive". | [x] Pass |
| **MAN-ZON-010** | Safe Soft-Delete Guard | Executed `DELETE /api/admin/delivery-zones/:id`. | Zone is soft-deleted (`isDeleted: true`), preserving historical order audit integrity. | [x] Pass |

---

### Section B: Customer Checkout & Serviceability Validation (`DEL-001`)

| Test ID | Test Case | Steps & Observed Execution | Expected Result | Status |
|---|---|---|---|---|
| **MAN-CHK-001** | Inside Serviceable Polygon Zone | Queried `/api/orders/delivery/slots` with coords `[85.13, 25.60]` inside active zone. | `isServiceable: true`, delivery options enabled, zone ID attached. | [x] Pass |
| **MAN-CHK-002** | Outside Serviceable Polygon Zone | Queried `/api/orders/delivery/slots` with coords `[85.30, 25.60]` outside zone. | `isServiceable: false`, delivery options disabled with warning reason. | [x] Pass |
| **MAN-CHK-003** | Dynamic Recalculation on Address Change | Tested address switch from outside to inside coordinates. | Live serviceability recalculates immediately upon coordinate update. | [x] Pass |
| **MAN-CHK-004** | Zone Delivery Fee Override Applied | Evaluated `calculateCustomerDeliveryFee` with zone delivery fee override ₹25. | Charged ₹25 flat instead of standard distance calculation. | [x] Pass |
| **MAN-CHK-005** | Express Delivery Restriction | Evaluated zone with `expressAvailable: false`. | Express delivery option disabled with zone restriction message. | [x] Pass |
| **MAN-CHK-006** | Overlapping Zones Precedence | Created overlapping Zone 1 (P5, ₹35) and Zone 2 (P15, ₹20). Tested overlap point. | Resolved Zone 2 (higher priority P15 wins) with fee ₹20. | [x] Pass |
| **MAN-CHK-007** | Zero Active Zones Fallback | Deactivated all active zones. Tested check endpoint. | Returned `fallbackToRadius: true` and `isServiceable: true` (zero-downtime fallback). | [x] Pass |

---

### Section C: Security & Integrity Enforcement

| Test ID | Test Case | Steps & Observed Execution | Expected Result | Status |
|---|---|---|---|---|
| **MAN-SEC-001** | Unauthorized Zone Management Attempt | Sent `POST /api/admin/delivery-zones` without auth header. | Server returned `HTTP 401 Unauthorized`. | [x] Pass |
| **MAN-SEC-002** | Direct Server-Side Checkout Bypass Prevention | Sent `POST /api/orders/checkout/preview` with address outside zone. | Server authoritatively rejected with `HTTP 400 Bad Request` (*"Your delivery address is outside our serviceable delivery zones."*). | [x] Pass |
| **MAN-SEC-003** | Malformed Coordinates Payload | Sent invalid polygon (< 3 vertices, collinear, or out-of-bounds). | Server rejected with `HTTP 400 Bad Request` and detailed geometry error. | [x] Pass |

---

## 3. Post-Verification Sign-Off

- **Lead QA Engineer:** Lead Automated & Browser Subagent QA  
- **Lead Backend Architect:** Principal Logistics & Payments Architect  
- **Date Verified:** October 26, 2026  
- **Sprint 3B Overall Verdict:** **[x] ACCEPTED / VERIFIED COMPLETE**
