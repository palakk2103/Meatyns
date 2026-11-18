/**
 * CUSTOMER PILOT ACCESS (temporary testing lock for the customer app only).
 *
 * While pilot mode is ON, only the phone numbers below can log in to the
 * customer app (website + mobile app), receive an OTP, or place orders.
 * Every other number is refused before any OTP/SMS is sent and is shown
 * PILOT_ACCESS_MESSAGE instead. Seller, admin and delivery are NOT affected.
 *
 * How to switch back to normal (everyone can log in): see CUSTOMER_PILOT_ACCESS_README.md
 * at the repo root. Short version: set CUSTOMER_PILOT_MODE=off in backend env
 * and restart the backend.
 */
import Customer from "../models/customer.js";
import { normalizePhoneNumber } from "./phone.js";

// ---------------------------------------------------------------------------
// ALLOWED CUSTOMER NUMBERS. Add/remove 10-digit numbers here.
// More numbers can also be added without a code change through the backend
// env var CUSTOMER_PILOT_PHONES (comma separated); both lists are merged.
// ---------------------------------------------------------------------------
const PILOT_PHONES = [
  "8770620342",
  "7558598590",
  "7841849908",
  "9096533667",
];

export const PILOT_ACCESS_CODE = "PILOT_ACCESS_ONLY";
export const PILOT_ACCESS_TITLE = "We're launching soon!";
export const PILOT_ACCESS_MESSAGE =
  "Thank you for your interest in Meatyns! We're not live yet. Our app is currently in development and testing, so login and ordering are open only to our test team for now. We'll be launching very soon, please check back shortly.";

/** ON by default. Set CUSTOMER_PILOT_MODE=off (or false/0) to open the app to everyone. */
export function isCustomerPilotModeOn() {
  const raw = process.env.CUSTOMER_PILOT_MODE;
  if (raw == null || String(raw).trim() === "") {
    // Unit tests exercise the normal flow unless they opt in explicitly.
    return process.env.NODE_ENV !== "test";
  }
  return !["off", "false", "0", "no"].includes(String(raw).trim().toLowerCase());
}

function allowedPhoneSet() {
  const fromEnv = String(process.env.CUSTOMER_PILOT_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return new Set(
    [...PILOT_PHONES, ...fromEnv].map(normalizePhoneNumber).filter(Boolean),
  );
}

/** True when pilot mode is off, or the phone is on the allow-list. */
export function isPilotAllowedPhone(rawPhone) {
  if (!isCustomerPilotModeOn()) return true;
  const phone = normalizePhoneNumber(rawPhone);
  return Boolean(phone) && allowedPhoneSet().has(phone);
}

export function createPilotAccessError() {
  const err = new Error(PILOT_ACCESS_MESSAGE);
  err.statusCode = 403;
  err.code = PILOT_ACCESS_CODE;
  err.providerCode = PILOT_ACCESS_CODE; // read by modules/otp controller
  return err;
}

/** Throws a 403 pilot error unless the phone may use the customer app. */
export function assertPilotAllowedPhone(rawPhone) {
  if (!isPilotAllowedPhone(rawPhone)) throw createPilotAccessError();
}

/**
 * Same check for an existing customer account (email/password/session/order paths).
 * `allowNonCustomer`: when the id is not a customer at all (e.g. an admin placing
 * an order) let it through, so admin/seller/delivery flows stay untouched.
 */
export async function assertPilotAllowedCustomer(customerOrId, { allowNonCustomer = false } = {}) {
  if (!isCustomerPilotModeOn()) return;
  let customer = customerOrId;
  if (!customer || typeof customer !== "object" || !("phone" in customer)) {
    customer = customerOrId ? await Customer.findById(customerOrId).select("phone").lean() : null;
  }
  if (!customer) {
    if (allowNonCustomer) return;
    throw createPilotAccessError();
  }
  if (!isPilotAllowedPhone(customer.phone)) throw createPilotAccessError();
}

/** Response body for a blocked request (frontend shows the "launching soon" dialog on this code). */
export function pilotAccessResponseData() {
  return { code: PILOT_ACCESS_CODE, title: PILOT_ACCESS_TITLE };
}
