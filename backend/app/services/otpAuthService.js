import crypto from "crypto";
import mongoose from "mongoose";
import Customer from "../models/customer.js";
import DeviceClaim from "../models/deviceClaim.js";
import Transaction from "../models/transaction.js";
import { sendSmsIndiaHubOtp } from "./smsIndiaHubService.js";
import { generateSecureOtp, MOCK_OTP } from "../utils/otp.js";
import { getRedisClient } from "../config/redis.js";
import { isValidE164Phone, maskPhone, normalizePhoneNumber } from "../utils/phone.js";
import { creditWallet } from "./finance/walletService.js";
import { OWNER_TYPE, LEDGER_TRANSACTION_TYPE } from "../constants/finance.js";

const OTP_EXPIRY_MINUTES = () => parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
const OTP_RESEND_COOLDOWN_SECONDS = () =>
  parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || "60", 10);
const OTP_MAX_FAILED_ATTEMPTS = () =>
  parseInt(process.env.OTP_MAX_FAILED_ATTEMPTS || "5", 10);
const OTP_LOCKOUT_MINUTES = () =>
  parseInt(process.env.OTP_LOCKOUT_MINUTES || "15", 10);
const OTP_SEND_LIMIT_WINDOW_SECONDS = () =>
  parseInt(process.env.OTP_SEND_LIMIT_WINDOW_SECONDS || "900", 10);
const OTP_SEND_LIMIT_PER_WINDOW = () =>
  parseInt(process.env.OTP_SEND_LIMIT_PER_WINDOW || "5", 10);
const OTP_VERIFY_LIMIT_WINDOW_SECONDS = () =>
  parseInt(process.env.OTP_VERIFY_LIMIT_WINDOW_SECONDS || "900", 10);
const OTP_VERIFY_LIMIT_PER_WINDOW = () =>
  parseInt(process.env.OTP_VERIFY_LIMIT_PER_WINDOW || "20", 10);
// Only this number may authenticate with the mock OTP; it never triggers an SMS.
// Configurable via CUSTOMER_MOCK_OTP_PHONE (backend env only). Set to "none" to disable.
const DEFAULT_MOCK_OTP_PHONE = "8770620342";
function getMockOtpPhone() {
  const configured = String(process.env.CUSTOMER_MOCK_OTP_PHONE ?? DEFAULT_MOCK_OTP_PHONE).trim();
  if (!configured || configured.toLowerCase() === "none") return null;
  const normalized = normalizePhoneNumber(configured);
  return isValidE164Phone(normalized) ? normalized : null;
}
export function isMockOtpPhone(phone) {
  const mock = getMockOtpPhone();
  return Boolean(mock) && normalizePhoneNumber(phone) === mock;
}

function otpHashSecret() {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_HASH_SECRET or JWT_SECRET must be configured in production");
    }
    return "unsafe-dev-secret";
  }
  return secret;
}

function hashOtp(phone, otp) {
  return crypto
    .createHmac("sha256", otpHashSecret())
    .update(`${phone}:${otp}`)
    .digest("hex");
}

async function incrementWindowCounter(redisKey, { limit, windowSeconds }) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const [count] = await Promise.all([
        redis.incr(redisKey),
        redis.expire(redisKey, windowSeconds),
      ]);
      return Number(count) <= limit;
    } catch {
      // fallback below
    }
  }

  if (!globalThis.__OTP_WINDOW_COUNTER__) {
    globalThis.__OTP_WINDOW_COUNTER__ = new Map();
  }
  const now = Date.now();
  const map = globalThis.__OTP_WINDOW_COUNTER__;
  const entry = map.get(redisKey);
  if (!entry || entry.expiresAt <= now) {
    map.set(redisKey, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });
    return true;
  }
  entry.count += 1;
  map.set(redisKey, entry);
  return entry.count <= limit;
}

function otpAuditLog(event, meta) {
  console.log(
    JSON.stringify({
      level: "info",
      ts: new Date().toISOString(),
      event,
      ...meta,
    }),
  );
}

async function dispatchCustomerOtpSms({ phone, otp }) {
  return sendSmsIndiaHubOtp({ phone, otp });
}


export function normalizeAndValidatePhone(rawPhone) {
  const phone = normalizePhoneNumber(rawPhone);
  if (!isValidE164Phone(phone)) {
    const err = new Error("Invalid phone number format");
    err.statusCode = 400;
    throw err;
  }
  return phone;
}

export async function issueCustomerOtp({
  name = "",
  rawPhone,
  flow,
  ipAddress = "unknown",
}) {
  const phone = normalizeAndValidatePhone(rawPhone);
  const now = new Date();

  const sendAllowed = await incrementWindowCounter(`otp:send:phone:${phone}`, {
    limit: OTP_SEND_LIMIT_PER_WINDOW(),
    windowSeconds: OTP_SEND_LIMIT_WINDOW_SECONDS(),
  });
  if (!sendAllowed) {
    const err = new Error("Too many OTP requests. Try again later.");
    err.statusCode = 429;
    throw err;
  }

  let customer = await Customer.findOne({ phone }).select(
    "+otpHash +otpExpiresAt +otpFailedAttempts +otpLockedUntil +otpLastSentAt +otpSessionVersion +otp +otpExpiry",
  );

  // If customer doesn't exist, seamlessly create customer for unified phone auth
  if (!customer) {
    customer = await Customer.create({
      name: name || "Customer",
      phone,
      isVerified: false,
    });
    customer = await Customer.findById(customer._id).select(
      "+otpHash +otpExpiresAt +otpFailedAttempts +otpLockedUntil +otpLastSentAt +otpSessionVersion +otp +otpExpiry",
    );
  }

  if (customer.otpLockedUntil && customer.otpLockedUntil > now) {
    const err = new Error("OTP verification is temporarily locked for this number");
    err.statusCode = 423;
    throw err;
  }

  const lastSentAt = customer.otpLastSentAt ? new Date(customer.otpLastSentAt) : null;
  const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS() * 1000;
  if (lastSentAt && now.getTime() - lastSentAt.getTime() < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now.getTime() - lastSentAt.getTime())) / 1000);
    const err = new Error(`Please wait ${waitSec}s before requesting another OTP`);
    err.statusCode = 429;
    throw err;
  }

  const isMock = isMockOtpPhone(phone);
  const otp = isMock ? MOCK_OTP : generateSecureOtp(4);
  const previous = {
    otpHash: customer.otpHash,
    otpExpiresAt: customer.otpExpiresAt,
    otpLastSentAt: customer.otpLastSentAt,
    otpSessionVersion: customer.otpSessionVersion,
  };
  customer.otpHash = hashOtp(phone, otp);
  customer.otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES() * 60 * 1000);
  customer.otpFailedAttempts = 0;
  customer.otpLockedUntil = null;
  customer.otpLastSentAt = now;
  customer.otpSessionVersion = (customer.otpSessionVersion || 0) + 1;

  // Backward compatibility with legacy fields; raw OTP is intentionally not stored.
  customer.otp = undefined;
  customer.otpExpiry = undefined;

  await customer.save();

  if (isMock) {
    otpAuditLog("customer_otp_mock_number", {
      phone: maskPhone(phone),
      flow,
      ipAddress,
      mode: "mock",
    });
  } else {
    try {
      await dispatchCustomerOtpSms({ phone, otp });
      otpAuditLog("customer_otp_sms_dispatched", {
        phone: maskPhone(phone),
        flow,
        ipAddress,
        mode: "real",
      });
    } catch (smsErr) {
      // Do not leave a usable challenge behind, and do not report success.
      customer.otpHash = previous.otpHash;
      customer.otpExpiresAt = previous.otpExpiresAt;
      customer.otpLastSentAt = previous.otpLastSentAt;
      customer.otpSessionVersion = previous.otpSessionVersion;
      await customer.save().catch(() => {});
      otpAuditLog("customer_otp_sms_failed", {
        phone: maskPhone(phone),
        flow,
        ipAddress,
        reason: smsErr.message,
      });
      const err = new Error("Failed to send OTP. Please try again later.");
      err.statusCode = 502;
      throw err;
    }
  }

  return { sent: true, phone };
}

export async function verifyCustomerOtpCode({
  rawPhone,
  otp,
  ipAddress = "unknown",
  deviceId,
  fingerprint,
  userAgent,
}) {
  const phone = normalizeAndValidatePhone(rawPhone);
  const code = String(otp || "").trim();
  if (!/^\d{4,8}$/.test(code)) {
    const err = new Error("Invalid OTP format");
    err.statusCode = 400;
    throw err;
  }

  const verifyAllowed = await incrementWindowCounter(`otp:verify:phone:${phone}`, {
    limit: OTP_VERIFY_LIMIT_PER_WINDOW(),
    windowSeconds: OTP_VERIFY_LIMIT_WINDOW_SECONDS(),
  });
  if (!verifyAllowed) {
    const err = new Error("Too many OTP verification attempts. Try again later.");
    err.statusCode = 429;
    throw err;
  }

  let customer = await Customer.findOne({ phone }).select(
    "+otpHash +otpExpiresAt +otpFailedAttempts +otpLockedUntil +otpSessionVersion +otp +otpExpiry",
  );
  const isMock = isMockOtpPhone(phone);
  if (!customer) {
    if (isMock && code === MOCK_OTP) {
      customer = await Customer.create({
        name: "Customer",
        phone,
        isVerified: true,
      });
      customer = await Customer.findById(customer._id).select(
        "+otpHash +otpExpiresAt +otpFailedAttempts +otpLockedUntil +otpSessionVersion +otp +otpExpiry",
      );
    } else {
      const err = new Error("Invalid or expired OTP");
      err.statusCode = 400;
      throw err;
    }
  }

  const now = new Date();
  if (customer.otpLockedUntil && customer.otpLockedUntil > now) {
    if (!(isMock && code === MOCK_OTP)) {
      const err = new Error("Too many failed attempts. Please try again later.");
      err.statusCode = 423;
      throw err;
    }
  }

  if (!customer.otpHash || !customer.otpExpiresAt || customer.otpExpiresAt <= now) {
    if (!(isMock && code === MOCK_OTP)) {
      const err = new Error("Invalid or expired OTP");
      err.statusCode = 400;
      throw err;
    }
  }

  const isValid = isMock
    ? code === MOCK_OTP
    : hashOtp(phone, code) === customer.otpHash;
  if (!isValid) {
    customer.otpFailedAttempts = (customer.otpFailedAttempts || 0) + 1;

    if (customer.otpFailedAttempts >= OTP_MAX_FAILED_ATTEMPTS()) {
      customer.otpLockedUntil = new Date(
        now.getTime() + OTP_LOCKOUT_MINUTES() * 60 * 1000,
      );
    }

    await customer.save();
    otpAuditLog("customer_otp_verify_failed", {
      phone: maskPhone(phone),
      ipAddress,
      failedAttempts: customer.otpFailedAttempts,
      lockedUntil: customer.otpLockedUntil || null,
    });

    const err = new Error("Invalid or expired OTP");
    err.statusCode = customer.otpLockedUntil ? 423 : 400;
    throw err;
  }

  const wasVerified = customer.isVerified;

  customer.isVerified = true;
  customer.otpHash = undefined;
  customer.otpExpiresAt = undefined;
  customer.otpFailedAttempts = 0;
  customer.otpLockedUntil = undefined;
  customer.otpSessionVersion = (customer.otpSessionVersion || 0) + 1;
  customer.otp = undefined;
  customer.otpExpiry = undefined;
  customer.lastLogin = now;

  await customer.save();

  otpAuditLog("customer_otp_verify_success", {
    phone: maskPhone(phone),
    ipAddress,
  });

  if (!wasVerified) {
    await handleWelcomeBonus(customer, { deviceId, fingerprint, ipAddress, userAgent });
  }

  return customer;
}

async function handleWelcomeBonus(customer, { deviceId, fingerprint, ipAddress, userAgent }) {
  if (!deviceId) {
    console.warn(`[WelcomeBonus] No deviceId provided for user ${customer._id}. Welcome bonus skipped to ensure device uniqueness.`);
    return;
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Check if the device has already claimed the bonus
    const existingClaim = await DeviceClaim.findOne({ deviceId }).session(session);
    if (existingClaim) {
      console.log(`[WelcomeBonus] Device ${deviceId} has already claimed a bonus. User ${customer._id} is ineligible.`);
      await session.commitTransaction();
      return;
    }

    // 1. Credit wallet canonical available balance
    await creditWallet({
      ownerType: OWNER_TYPE.CUSTOMER,
      ownerId: customer._id,
      amount: 100,
      bucket: "available",
      session,
      ledgerType: LEDGER_TRANSACTION_TYPE.WELCOME_BONUS,
      ledgerReference: `WELCOME-${customer._id}`,
      ledgerDescription: "Welcome bonus credited on registration",
      idempotencyKey: `WELCOME-${customer._id}`,
      metadata: { reason: "welcome_bonus", deviceId },
    });

    // 2. Create legacy transaction log
    await Transaction.create(
      [
        {
          user: customer._id,
          userModel: "User",
          type: "Bonus",
          amount: 100,
          status: "Settled",
          reference: `WELCOME-${customer._id}`,
          date: new Date(),
          meta: { description: "Welcome bonus credited on registration", deviceId },
        },
      ],
      { session }
    );

    // 3. Register the device claim
    await DeviceClaim.create(
      [
        {
          deviceId,
          user: customer._id,
          ipAddress,
          userAgent,
          fingerprint,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    console.log(`[WelcomeBonus] Successfully credited Welcome Bonus to User ${customer._id} for Device ${deviceId}`);
  } catch (error) {
    await session.abortTransaction();
    console.error(`[WelcomeBonus] Error crediting welcome bonus for user ${customer._id}:`, error);
  } finally {
    session.endSession();
  }
}

export function sanitizeCustomer(customerDoc) {
  if (!customerDoc) return null;
  const obj = customerDoc.toObject ? customerDoc.toObject() : { ...customerDoc };
  delete obj.password;
  delete obj.__v;
  delete obj.updatedAt;
  delete obj.otp;
  delete obj.otpHash;
  delete obj.otpExpiry;
  delete obj.otpExpiresAt;
  delete obj.otpFailedAttempts;
  delete obj.otpLockedUntil;
  delete obj.otpLastSentAt;
  delete obj.otpSessionVersion;
  return obj;
}
