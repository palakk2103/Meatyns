import crypto from "crypto";
import jwt from "jsonwebtoken";
import Customer from "../models/customer.js";
import CustomerSession from "../models/customerSession.js";

export const REFRESH_COOKIE_NAME = "mt_rt";
const COOKIE_PATH = "/api/customer";
const DAY_MS = 24 * 60 * 60 * 1000;

const refreshTtlMs = () =>
  Math.max(1, parseInt(process.env.CUSTOMER_REFRESH_TTL_DAYS || "90", 10)) * DAY_MS;

export const accessTokenExpiresIn = () =>
  String(process.env.CUSTOMER_ACCESS_TOKEN_EXPIRES_IN || "1h");

export const signCustomerAccessToken = (customer) =>
  jwt.sign(
    { id: customer._id, role: "customer" },
    String(process.env.JWT_SECRET || "").trim(),
    { expiresIn: accessTokenExpiresIn() },
  );

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

function cookieOptions(req, maxAge) {
  const isProd = process.env.NODE_ENV === "production";
  // Cross-site deployments (frontend and API on different registrable domains)
  // need SameSite=None; Secure. Same-site / local dev uses Lax.
  const configured = String(process.env.COOKIE_SAMESITE || "").toLowerCase();
  let sameSite = ["lax", "strict", "none"].includes(configured)
    ? configured
    : isProd
      ? "none"
      : "lax";
  const secure = isProd || sameSite === "none" || Boolean(req?.secure);
  if (sameSite === "none" && !secure) sameSite = "lax";
  const opts = { httpOnly: true, secure, sameSite, path: COOKIE_PATH };
  if (process.env.COOKIE_DOMAIN) opts.domain = process.env.COOKIE_DOMAIN;
  if (maxAge != null) opts.maxAge = maxAge;
  return opts;
}

export function readRefreshCookie(req) {
  const header = String(req.headers?.cookie || "");
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === REFRESH_COOKIE_NAME) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearRefreshCookie(req, res) {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(req));
}

/** Create a persistent session after a successful OTP / password login. */
export async function startCustomerSession(req, res, customer) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const ttl = refreshTtlMs();
  await CustomerSession.create({
    customer: customer._id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttl),
    userAgent: String(req.headers?.["user-agent"] || "").slice(0, 300),
    ipAddress: String(req.ip || ""),
  });
  res.cookie(REFRESH_COOKIE_NAME, raw, cookieOptions(req, ttl));
}

/**
 * Exchange a valid refresh cookie for a fresh access token.
 * The refresh token is intentionally NOT rotated per call so that several
 * tabs refreshing at once cannot invalidate each other; expiry slides forward
 * on use and logout revokes the session server-side.
 * Returns { token, customer } or throws an error with statusCode.
 */
export async function refreshCustomerSession(req, res) {
  const raw = readRefreshCookie(req);
  const fail = (message) => {
    clearRefreshCookie(req, res);
    const err = new Error(message);
    err.statusCode = 401;
    return err;
  };
  if (!raw) throw fail("No active session");

  const session = await CustomerSession.findOne({ tokenHash: hashToken(raw) }).select(
    "+tokenHash",
  );
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw fail("Session expired or revoked");
  }

  const customer = await Customer.findById(session.customer);
  if (!customer || customer.isActive === false) {
    session.revokedAt = new Date();
    await session.save();
    throw fail("Account unavailable");
  }

  const ttl = refreshTtlMs();
  session.lastUsedAt = new Date();
  session.expiresAt = new Date(Date.now() + ttl);
  await session.save();
  res.cookie(REFRESH_COOKIE_NAME, raw, cookieOptions(req, ttl));

  return { token: signCustomerAccessToken(customer), customer };
}

/** Revoke the session behind the cookie (idempotent) and clear the cookie. */
export async function endCustomerSession(req, res) {
  const raw = readRefreshCookie(req);
  if (raw) {
    await CustomerSession.updateOne(
      { tokenHash: hashToken(raw), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
  clearRefreshCookie(req, res);
}
