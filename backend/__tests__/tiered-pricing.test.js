import { jest } from "@jest/globals";
import mongoose from "mongoose";
import Product from "../app/models/product.js";
import FlashDeal from "../app/models/flashDeal.js";
import Category from "../app/models/category.js";
import {
  resolveTieredUnitPrice,
  hydrateOrderItems,
  calculateProductSubtotal,
} from "../app/services/finance/pricingService.js";

describe("Product-Level Tiered Volume Pricing (HD-004)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("resolveTieredUnitPrice Unit Logic", () => {
    const basePrice = 200;
    const sampleTiers = [
      { minQty: 2, discountPercentage: 5, fixedUnitPrice: 0 },
      { minQty: 4, discountPercentage: 10, fixedUnitPrice: 0 },
      { minQty: 10, discountPercentage: 20, fixedUnitPrice: 0 },
    ];

    test("returns base price when quantity does not meet any tier threshold", () => {
      const result = resolveTieredUnitPrice(basePrice, sampleTiers, 1);
      expect(result.unitPrice).toBe(200);
      expect(result.appliedTier).toBeNull();
    });

    test("applies tier 1 (5% off) when quantity is between 2 and 3", () => {
      const result = resolveTieredUnitPrice(basePrice, sampleTiers, 2);
      expect(result.unitPrice).toBe(190); // 200 - 5% = 190
      expect(result.appliedTier).toEqual({
        minQty: 2,
        discountPercentage: 5,
        fixedUnitPrice: 0,
      });

      const result3 = resolveTieredUnitPrice(basePrice, sampleTiers, 3);
      expect(result3.unitPrice).toBe(190);
    });

    test("applies tier 2 (10% off) when quantity reaches 4", () => {
      const result = resolveTieredUnitPrice(basePrice, sampleTiers, 4);
      expect(result.unitPrice).toBe(180); // 200 - 10% = 180
      expect(result.appliedTier.minQty).toBe(4);
    });

    test("applies highest tier (20% off) when quantity is 10+", () => {
      const result = resolveTieredUnitPrice(basePrice, sampleTiers, 12);
      expect(result.unitPrice).toBe(160); // 200 - 20% = 160
      expect(result.appliedTier.minQty).toBe(10);
    });

    test("supports fixedUnitPrice override over discountPercentage", () => {
      const fixedTiers = [
        { minQty: 2, discountPercentage: 0, fixedUnitPrice: 175 },
        { minQty: 5, discountPercentage: 0, fixedUnitPrice: 150 },
      ];

      const res2 = resolveTieredUnitPrice(basePrice, fixedTiers, 3);
      expect(res2.unitPrice).toBe(175);
      expect(res2.appliedTier.fixedUnitPrice).toBe(175);

      const res5 = resolveTieredUnitPrice(basePrice, fixedTiers, 5);
      expect(res5.unitPrice).toBe(150);
    });

    test("safely handles empty tiers, non-array inputs, and non-positive quantities", () => {
      expect(resolveTieredUnitPrice(basePrice, [], 5).unitPrice).toBe(200);
      expect(resolveTieredUnitPrice(basePrice, null, 5).unitPrice).toBe(200);
      expect(resolveTieredUnitPrice(basePrice, sampleTiers, 0).unitPrice).toBe(200);
      expect(resolveTieredUnitPrice(basePrice, sampleTiers, -2).unitPrice).toBe(200);
    });

    test("clamps discount to prevent negative or greater-than-base prices", () => {
      const extremeTiers = [
        { minQty: 2, discountPercentage: 150, fixedUnitPrice: 0 },
      ];
      const res = resolveTieredUnitPrice(basePrice, extremeTiers, 2);
      expect(res.unitPrice).toBe(0); // Clamped at 0, no negative price

      const overpricedTier = [
        { minQty: 2, discountPercentage: 0, fixedUnitPrice: 300 },
      ];
      const resOver = resolveTieredUnitPrice(basePrice, overpricedTier, 2);
      expect(resOver.unitPrice).toBe(200); // Clamped at normBase
    });

    test("supports fractional meat weight quantities (e.g. 1.5kg, 2.5kg)", () => {
      const fractionalTiers = [
        { minQty: 1.5, discountPercentage: 8, fixedUnitPrice: 0 },
        { minQty: 3.0, discountPercentage: 15, fixedUnitPrice: 0 },
      ];
      const res1 = resolveTieredUnitPrice(basePrice, fractionalTiers, 1.4);
      expect(res1.unitPrice).toBe(200);

      const res2 = resolveTieredUnitPrice(basePrice, fractionalTiers, 1.5);
      expect(res2.unitPrice).toBe(184); // 200 * 0.92 = 184
    });
  });

  describe("hydrateOrderItems with Tiered Volume Pricing", () => {
    const mockProductId = new mongoose.Types.ObjectId().toString();

    test("authoritatively applies tiered volume pricing to hydrated order items", async () => {
      const mockProduct = {
        _id: mockProductId,
        name: "Farm Fresh Chicken Breast",
        price: 300,
        salePrice: 280,
        status: "active",
        approvalStatus: "approved",
        variants: [],
        tieredPricing: [
          { minQty: 2, discountPercentage: 10, fixedUnitPrice: 0 },
          { minQty: 4, discountPercentage: 15, fixedUnitPrice: 0 },
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockProduct]),
      };
      jest.spyOn(Product, "find").mockReturnValue(mockQuery);

      const mockDealQuery = {
        lean: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(FlashDeal, "find").mockReturnValue(mockDealQuery);

      // Customer buys 3 units (meets tier 1: 10% off the standard unit price 280 => 252)
      const orderItemsInput = [
        {
          productId: mockProductId,
          quantity: 3,
          price: 999, // Tampered client price must be ignored
        },
      ];

      const hydrated = await hydrateOrderItems(orderItemsInput, {
        enforceServerPricing: true,
      });

      expect(hydrated.length).toBe(1);
      expect(hydrated[0].price).toBe(252); // 280 * 0.90 = 252
      expect(hydrated[0].quantity).toBe(3);
      expect(hydrated[0].basePrice).toBe(280);
      expect(hydrated[0].appliedTier).toEqual({
        minQty: 2,
        discountPercentage: 10,
        fixedUnitPrice: 0,
      });

      const subtotal = calculateProductSubtotal(hydrated);
      expect(subtotal).toBe(756); // 252 * 3 = 756
    });

    test("variant-level tiered pricing takes precedence over product-level tiers", async () => {
      const mockProduct = {
        _id: mockProductId,
        name: "Goat Curry Cut",
        price: 500,
        salePrice: 500,
        status: "active",
        approvalStatus: "approved",
        tieredPricing: [
          { minQty: 2, discountPercentage: 5, fixedUnitPrice: 0 },
        ],
        variants: [
          {
            sku: "GOAT-1KG",
            name: "1kg Pack",
            price: 500,
            salePrice: 480,
            tieredPricing: [
              { minQty: 2, discountPercentage: 12, fixedUnitPrice: 0 },
            ],
          },
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockProduct]),
      };
      jest.spyOn(Product, "find").mockReturnValue(mockQuery);

      const mockDealQuery = {
        lean: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(FlashDeal, "find").mockReturnValue(mockDealQuery);

      const orderItemsInput = [
        {
          productId: mockProductId,
          variantSku: "GOAT-1KG",
          quantity: 2,
        },
      ];

      const hydrated = await hydrateOrderItems(orderItemsInput, {
        enforceServerPricing: true,
      });

      // Variant standard price 480 with 12% variant tier => 480 * 0.88 = 422.4
      expect(hydrated[0].price).toBe(422.4);
      expect(hydrated[0].appliedTier.discountPercentage).toBe(12);
    });

    test("flash deal priority: active flash deal overrides tiered volume pricing", async () => {
      const mockProduct = {
        _id: mockProductId,
        name: "Mutton Biryani Cut",
        price: 600,
        salePrice: 550,
        status: "active",
        approvalStatus: "approved",
        tieredPricing: [
          { minQty: 2, discountPercentage: 10, fixedUnitPrice: 0 }, // Would be 550 * 0.9 = 495
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockProduct]),
      };
      jest.spyOn(Product, "find").mockReturnValue(mockQuery);

      const activeDeal = {
        status: "active",
        products: [
          {
            productId: mockProductId,
            flashPrice: 449, // Exclusive Flash Deal is lower than tiered price
          },
        ],
      };

      const mockDealQuery = {
        lean: jest.fn().mockResolvedValue([activeDeal]),
      };
      jest.spyOn(FlashDeal, "find").mockReturnValue(mockDealQuery);

      const orderItemsInput = [
        {
          productId: mockProductId,
          quantity: 2,
        },
      ];

      const hydrated = await hydrateOrderItems(orderItemsInput, {
        enforceServerPricing: true,
      });

      // Flash deal has priority and is strictly applied
      expect(hydrated[0].price).toBe(449);
    });
  });
});
