import crypto from "crypto";
import { MOCK_OTP } from "./otp.js";

/**
 * Shared login-OTP helpers for the email / phone OTP login flows
 * (customer email, seller, admin, delivery).
 *
 * The fixed test OTP ("1234") is accepted ONLY for identifiers listed in
 * TEST_OTP_IDENTIFIERS (comma-separated emails / 10-digit phones).
 * Set TEST_OTP_IDENTIFIERS=none to disable test logins entirely.
 */
const DEFAULT_TEST_OTP_IDENTIFIERS =
  "8770620342,palakk2103@gmail.com,palakpatel0342@gmail.com";

export const LOGIN_OTP_TTL_MINUTES = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Per-identifier failed-attempt tracking (in-process). Combined with the
// IP rate limiters on the routes, this stops brute-forcing a 4-digit code.
const failedAttempts = new Map();

export function normalizeOtpIdentifier(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function getTestIdentifiers() {
  const configured = String(
    process.env.TEST_OTP_IDENTIFIERS ?? DEFAULT_TEST_OTP_IDENTIFIERS,
  ).trim();
  if (!configured || configured.toLowerCase() === "none") return [];
  return configured.split(",").map(normalizeOtpIdentifier).filter(Boolean);
}

export function isTestOtpIdentifier(value) {
  const normalized = normalizeOtpIdentifier(value);
  return Boolean(normalized) && getTestIdentifiers().includes(normalized);
}

/** Create a login OTP for an identifier (fixed test OTP for test accounts). */
export function createLoginOtp(identifier) {
  const isTest = isTestOtpIdentifier(identifier);
  return {
    otp: isTest ? MOCK_OTP : String(crypto.randomInt(1000, 10000)),
    isTest,
    expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_MINUTES * 60 * 1000),
  };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Check a submitted OTP. Returns { ok: true } or { ok: false, message }.
 * `stored` / `expiresAt` must be loaded with .select("+field").
 */
export function checkLoginOtp({ identifier, submitted, stored, expiresAt }) {
  const key = normalizeOtpIdentifier(identifier);
  const code = String(submitted ?? "").trim();

  const entry = failedAttempts.get(key);
  if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
    return { ok: false, message: "Too many wrong attempts. Please try again later." };
  }

  if (code && isTestOtpIdentifier(identifier) && code === MOCK_OTP) {
    failedAttempts.delete(key);
    return { ok: true };
  }

  const expired = !expiresAt || new Date(expiresAt).getTime() < Date.now();
  if (code && stored && !expired && safeEqual(stored, code)) {
    failedAttempts.delete(key);
    return { ok: true };
  }

  const count = (entry?.lockedUntil && entry.lockedUntil <= Date.now() ? 0 : entry?.count || 0) + 1;
  failedAttempts.set(key, {
    count,
    lockedUntil: count >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : null,
  });
  return { ok: false, message: "Invalid or expired OTP" };
}

export function __resetLoginOtpAttemptsForTests() {
  failedAttempts.clear();
}
