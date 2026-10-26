import { jest } from "@jest/globals";
import { isMockOtpPermitted, useRealSMS, generateOTP } from "../app/utils/otp.js";
import { validateDependencies } from "../app/core/startup.js";
import { generateMetaOAuthUrl } from "../app/services/meta/metaOAuthService.js";

describe("Sprint 1: Production Security Hardening & Secret Safeguards", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("OTP Production Restrictions", () => {
    it("strictly rejects mock OTP in production when USE_MOCK_OTP is false", () => {
      process.env.NODE_ENV = "production";
      process.env.USE_MOCK_OTP = "false";
      expect(isMockOtpPermitted()).toBe(false);
    });

    it("enforces real SMS in production when USE_MOCK_OTP is false", () => {
      process.env.NODE_ENV = "production";
      process.env.USE_MOCK_OTP = "false";
      expect(useRealSMS()).toBe(true);
    });

    it("generates random numeric OTP in production when USE_MOCK_OTP is false", () => {
      process.env.NODE_ENV = "production";
      process.env.USE_MOCK_OTP = "false";
      const generated = generateOTP();
      expect(generated).toMatch(/^\d{4}$/);
      expect(isMockOtpPermitted()).toBe(false);
    });

    it("permits mock OTP in production when USE_MOCK_OTP is explicitly enabled (App Store review)", () => {
      process.env.NODE_ENV = "production";
      process.env.USE_MOCK_OTP = "true";
      expect(isMockOtpPermitted()).toBe(true);
      expect(useRealSMS()).toBe(false);
      expect(generateOTP()).toBe("1234");
    });
  });

  describe("Startup Production Secret & Environment Hardening", () => {
    it("fails validation if JWT_SECRET is a placeholder or insecure default in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.MONGO_URI = "mongodb://localhost:27017/test";
      process.env.JWT_SECRET = "your-secret-key";

      const res = await validateDependencies();
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes("insecure default detected"))).toBe(true);
    });

    it("fails validation if JWT_SECRET is too short (< 32 characters) in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.MONGO_URI = "mongodb://localhost:27017/test";
      process.env.JWT_SECRET = "short-secret-12345";

      const res = await validateDependencies();
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes("at least 32 characters in production"))).toBe(true);
    });

    it("warns but does not fail fatal validation if USE_MOCK_OTP is enabled in production (App Store review)", async () => {
      process.env.NODE_ENV = "production";
      process.env.MONGO_URI = "mongodb://localhost:27017/test";
      process.env.JWT_SECRET = "a-very-long-production-cryptographic-secret-key-32chars";
      process.env.USE_MOCK_OTP = "true";
      const res = await validateDependencies();
      expect(res.checks.mockOtp.status).toBe("WARN");
      expect(res.errors.some(e => e.includes("USE_MOCK_OTP and ALLOW_MOCK_DELIVERY_OTP cannot be enabled in production"))).toBe(false);
    });

    it("fails validation if CORS_ALLOWED_ORIGINS contains wildcard in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.MONGO_URI = "mongodb://localhost:27017/test";
      process.env.JWT_SECRET = "a-very-long-production-cryptographic-secret-key-32chars";
      process.env.USE_MOCK_OTP = "false";
      process.env.CORS_ALLOWED_ORIGINS = "https://meatyns.com,*";

      const res = await validateDependencies();
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes("CORS_ALLOWED_ORIGINS cannot contain wildcard"))).toBe(true);
    });

    it("fails validation if RAZORPAY_KEY_ID is set without RAZORPAY_WEBHOOK_SECRET in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.MONGO_URI = "mongodb://localhost:27017/test";
      process.env.JWT_SECRET = "a-very-long-production-cryptographic-secret-key-32chars";
      process.env.USE_MOCK_OTP = "false";
      process.env.RAZORPAY_KEY_ID = "rzp_live_testkey123";
      delete process.env.RAZORPAY_WEBHOOK_SECRET;

      const res = await validateDependencies();
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes("RAZORPAY_WEBHOOK_SECRET is required"))).toBe(true);
    });
  });

  describe("Meta OAuth CSRF Secret Hardening", () => {
    it("fails safely in production if JWT_SECRET is missing for OAuth state signing", async () => {
      process.env.NODE_ENV = "production";
      process.env.META_APP_ID = "1234567890";
      delete process.env.JWT_SECRET;

      await expect(
        generateMetaOAuthUrl("admin-1")
      ).rejects.toThrow(/JWT_SECRET must be configured in production/);
    });
  });
});
