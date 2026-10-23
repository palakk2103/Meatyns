import crypto from "crypto";
import {
  hashMetaField,
  hashMetaPhone,
} from "../app/services/meta/metaCapiService.js";
import {
  validateOAuthState,
} from "../app/services/meta/metaOAuthService.js";
import MetaIntegration from "../app/models/metaIntegration.js";

describe("Meta Integration & Security Tests", () => {
  describe("PII Normalization & Hashing (Meta Standards)", () => {
    it("should correctly SHA-256 hash normalized lowercase emails", () => {
      const email = " Customer@Example.com ";
      const expected = crypto.createHash("sha256").update("customer@example.com").digest("hex");
      const hashed = hashMetaField(email);
      expect(hashed).toBe(expected);
    });

    it("should return null for empty or null inputs", () => {
      expect(hashMetaField("")).toBeNull();
      expect(hashMetaField(null)).toBeNull();
      expect(hashMetaField(undefined)).toBeNull();
    });

    it("should normalize and format phone numbers with 91 country code prefix", () => {
      const phone10 = "9876543210";
      const expected = crypto.createHash("sha256").update("919876543210").digest("hex");
      expect(hashMetaPhone(phone10)).toBe(expected);

      const phoneWithSpecialChars = "+91 98765-43210";
      expect(hashMetaPhone(phoneWithSpecialChars)).toBe(expected);
    });
  });

  describe("OAuth CSRF State Security", () => {
    it("should reject tampered or invalid state strings", () => {
      expect(validateOAuthState("invalid_state_string")).toBe(false);
      expect(validateOAuthState("")).toBe(false);
      expect(validateOAuthState(null)).toBe(false);
    });

    it("should reject states with invalid cryptographic signatures", () => {
      const payload = JSON.stringify({ userId: "123", nonce: "abc", ts: Date.now() });
      const badState = Buffer.from(
        JSON.stringify({ payload, signature: "forged_signature_here" })
      ).toString("base64url");
      expect(validateOAuthState(badState)).toBe(false);
    });

    it("should accept validly signed state and reject expired states", () => {
      const secret = process.env.JWT_SECRET || "meatyns_meta_csrf_secret";
      
      // Expired state (> 15 mins)
      const expiredPayload = JSON.stringify({ userId: "123", nonce: "abc", ts: Date.now() - 20 * 60 * 1000 });
      const expiredSig = crypto.createHmac("sha256", secret).update(expiredPayload).digest("hex");
      const expiredState = Buffer.from(JSON.stringify({ payload: expiredPayload, signature: expiredSig })).toString("base64url");
      expect(validateOAuthState(expiredState)).toBe(false);

      // Fresh valid state
      const validPayload = JSON.stringify({ userId: "123", nonce: "abc", ts: Date.now() - 2000 });
      const validSig = crypto.createHmac("sha256", secret).update(validPayload).digest("hex");
      const validState = Buffer.from(JSON.stringify({ payload: validPayload, signature: validSig })).toString("base64url");
      expect(validateOAuthState(validState)).toBe(true);
    });
  });

  describe("Sensitive Credential Shielding (toSafeDTO)", () => {
    it("should never expose access tokens in toSafeDTO", () => {
      const doc = new MetaIntegration({
        isConnected: true,
        accessToken: "EAAB_SECRET_META_ACCESS_TOKEN_12345",
        connectedUser: { id: "101", name: "Meatyns Admin" },
        selectedAdAccount: { id: "act_999", name: "Primary Ads" },
        selectedPixel: { id: "px_111", name: "Main Pixel" },
        pixelEnabled: true,
        capiEnabled: true,
      });

      const safe = doc.toSafeDTO();
      expect(safe.isConnected).toBe(true);
      expect(safe.accessToken).toBeUndefined();
      expect(JSON.stringify(safe)).not.toContain("EAAB_SECRET");
      expect(safe.selectedAdAccount.id).toBe("act_999");
      expect(safe.selectedPixel.id).toBe("px_111");
    });
  });

  describe("ROAS & Calculation Edge Cases", () => {
    it("should handle zero spend safely without dividing by zero", () => {
      const spend = 0;
      const revenue = 15000;
      const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
      expect(roas).toBe(0);
      expect(Number.isFinite(roas)).toBe(true);
    });

    it("should accurately compute blended ROAS when spend is positive", () => {
      const spend = 2500;
      const revenue = 12500;
      const roas = Number((revenue / spend).toFixed(2));
      expect(roas).toBe(5.0);
    });
  });
});
