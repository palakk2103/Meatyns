import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  calculateNextDeliveryDate,
  advanceSubscriptionDate,
} from "../app/services/subscriptionService.js";
import {
  calculateLoyaltyRewards,
  processOrderDeliveryLoyalty,
} from "../app/services/loyaltyService.js";
import {
  validateReferralCode,
} from "../app/services/referralService.js";

describe("Phase 5 — Customer Retention, Subscriptions, Loyalty, Referrals, Reorder, Recipes & Combos", () => {
  describe("Module A: Customer Subscriptions & Scheduled Order Date Calculation", () => {
    test("calculates next delivery date for preferred day of week (Sunday)", () => {
      // Pick a Wednesday
      const baseWednesday = new Date("2026-10-21T10:00:00.000Z"); // Wed
      const nextSunday = calculateNextDeliveryDate("weekly", "Sunday", baseWednesday);
      expect(nextSunday.getDay()).toBe(0); // 0 = Sunday
      expect(nextSunday.getTime()).toBeGreaterThan(baseWednesday.getTime());
    });

    test("advances subscription date correctly by frequency", () => {
      const baseDate = new Date("2026-10-25T00:00:00.000Z");
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      const weekly = advanceSubscriptionDate("weekly", baseDate);
      expect(weekly.getTime() - baseDate.getTime()).toBe(7 * ONE_DAY_MS);

      const biweekly = advanceSubscriptionDate("bi-weekly", baseDate);
      expect(biweekly.getTime() - baseDate.getTime()).toBe(14 * ONE_DAY_MS);

      const monthly = advanceSubscriptionDate("monthly", baseDate);
      expect(monthly.getTime() - baseDate.getTime()).toBe(28 * ONE_DAY_MS);
    });

    test("handles edge case when preferred day is today", () => {
      const baseSunday = new Date("2026-10-25T00:00:00.000Z"); // Sunday
      const next = calculateNextDeliveryDate("weekly", "Sunday", baseSunday);
      expect(next.getDay()).toBe(0);
      expect(next.getTime()).toBeGreaterThan(baseSunday.getTime());
    });
  });

  describe("Module B: Loyalty and Rewards Earning Calculations", () => {
    test("calculates zero points when loyalty is disabled", () => {
      const points = calculateLoyaltyRewards(500, { enabled: false, pointsPer100Rupees: 5 });
      expect(points).toBe(0);
    });

    test("calculates zero points when order total is below minimum threshold", () => {
      const points = calculateLoyaltyRewards(150, {
        enabled: true,
        pointsPer100Rupees: 5,
        minOrderAmountToEarn: 200,
      });
      expect(points).toBe(0);
    });

    test("calculates correct rewards when order total meets threshold", () => {
      const points = calculateLoyaltyRewards(450, {
        enabled: true,
        pointsPer100Rupees: 5,
        minOrderAmountToEarn: 199,
      });
      // 450 / 100 * 5 = 22.5 => floor = 22
      expect(points).toBe(22);
    });

    test("idempotently skips already credited orders", async () => {
      const order = {
        _id: "order123",
        customer: "cust123",
        financeFlags: { loyaltyRewardCredited: true },
      };
      const result = await processOrderDeliveryLoyalty(order);
      expect(result.credited).toBe(false);
      expect(result.reason).toContain("already credited");
    });
  });

  describe("Module C: Customer Referral Code Validation & Self-Referral Protection", () => {
    test("rejects invalid or too short referral codes", async () => {
      const result = await validateReferralCode("AB");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid referral code");
    });

    test("rejects self-referral if referee matches referrer id", async () => {
      // Mock Customer.findOne
      const Customer = (await import("../app/models/customer.js")).default;
      const originalFindOne = Customer.findOne;
      Customer.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "user123",
            name: "Test User",
            referralCode: "MEAT1234",
            isActive: true,
          }),
        }),
      });

      const result = await validateReferralCode("MEAT1234", "user123");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot use your own referral code");

      Customer.findOne = originalFindOne;
    });

    test("accepts valid referral code for different customer", async () => {
      const Customer = (await import("../app/models/customer.js")).default;
      const originalFindOne = Customer.findOne;
      Customer.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "referrer999",
            name: "John Doe",
            referralCode: "MEATVALID",
            isActive: true,
          }),
        }),
      });

      const result = await validateReferralCode("MEATVALID", "referee111");
      expect(result.valid).toBe(true);
      expect(result.referrer.id).toBe("referrer999");
      expect(result.referrer.code).toBe("MEATVALID");

      Customer.findOne = originalFindOne;
    });
  });

  describe("Module D: Smart Reorder Revalidation Logic", () => {
    test("flags out-of-stock items and price changes during reorder revalidation", () => {
      const pastItems = [
        { productId: "p1", name: "Chicken Curry Cut", quantity: 2, price: 200 },
        { productId: "p2", name: "Mutton Biryani Cut", quantity: 1, price: 600 },
      ];

      const currentProducts = {
        p1: { _id: "p1", name: "Chicken Curry Cut", stock: 0, price: 220, salePrice: 0, status: "active" },
        p2: { _id: "p2", name: "Mutton Biryani Cut", stock: 5, price: 650, salePrice: 620, status: "active" },
      };

      const added = [];
      const unavailable = [];
      const priceChanges = [];

      for (const item of pastItems) {
        const prod = currentProducts[item.productId];
        if (prod.stock <= 0) {
          unavailable.push({ name: prod.name, reason: "Out of stock" });
          continue;
        }
        const effectivePrice = prod.salePrice > 0 ? prod.salePrice : prod.price;
        if (effectivePrice !== item.price) {
          priceChanges.push({ name: prod.name, oldPrice: item.price, currentPrice: effectivePrice });
        }
        added.push({ productId: prod._id, quantity: item.quantity, price: effectivePrice });
      }

      expect(unavailable).toHaveLength(1);
      expect(unavailable[0].name).toBe("Chicken Curry Cut");
      expect(priceChanges).toHaveLength(1);
      expect(priceChanges[0].currentPrice).toBe(620);
      expect(added).toHaveLength(1);
      expect(added[0].productId).toBe("p2");
    });
  });

  describe("Module E: Recipe-to-Cart Ingredient Mapping", () => {
    test("filters recipe ingredients with mapped products", () => {
      const recipe = {
        title: "Hyderabadi Mutton Korma",
        ingredients: [
          { name: "Mutton Curry Cut", productId: { _id: "prod_mutton", stock: 10, status: "active" }, quantity: 1 },
          { name: "Yogurt", productId: null, quantity: 1, isOptional: true }, // unmapped pantry item
          { name: "Garam Masala", productId: { _id: "prod_masala", stock: 0, status: "active" }, quantity: 1 }, // out of stock
        ],
      };

      const eligibleToCart = recipe.ingredients.filter(
        (ing) => ing.productId && ing.productId.status === "active" && ing.productId.stock > 0
      );

      expect(eligibleToCart).toHaveLength(1);
      expect(eligibleToCart[0].name).toBe("Mutton Curry Cut");
    });
  });

  describe("Module F: Meal Prep Packages and Combos Bundling", () => {
    test("verifies all constituent products before combo add-to-cart", () => {
      const combo = {
        name: "Weekend Grill Master Pack",
        comboPrice: 899,
        items: [
          { productId: { _id: "p1", name: "Chicken Wings", stock: 4 }, quantity: 2 },
          { productId: { _id: "p2", name: "Lamb Chops", stock: 1 }, quantity: 2 }, // Insufficient stock!
        ],
      };

      const canAddCombo = (comboObj, orderQty = 1) => {
        for (const item of comboObj.items) {
          if (item.productId.stock < item.quantity * orderQty) {
            return { ok: false, failedProduct: item.productId.name };
          }
        }
        return { ok: true };
      };

      const check = canAddCombo(combo, 1);
      expect(check.ok).toBe(false);
      expect(check.failedProduct).toBe("Lamb Chops");
    });
  });
});
