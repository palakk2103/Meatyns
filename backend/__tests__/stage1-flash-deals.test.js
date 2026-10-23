import { describe, test, expect, jest, afterEach } from "@jest/globals";
import mongoose from "mongoose";
import FlashDeal from "../app/models/flashDeal.js";
import Product from "../app/models/product.js";
import Order from "../app/models/order.js";
import {
  getActiveFlashDeal,
  getActiveDealForProduct,
  validateCustomerDealLimit,
  createFlashDeal,
  updateFlashDeal,
  toggleFlashDealStatus,
} from "../app/services/flashDealService.js";
import { hydrateOrderItems } from "../app/services/finance/pricingService.js";

describe("Stage 1 — Database-Backed Flash Deals", () => {
  const mockProductId = new mongoose.Types.ObjectId();
  const mockCustomerId = new mongoose.Types.ObjectId();

  describe("A. Data Model & Date Validations", () => {
    test("rejects deal when endTime <= startTime", async () => {
      const start = new Date(Date.now() + 10000);
      const end = new Date(Date.now()); // Earlier than start

      const deal = new FlashDeal({
        title: "Invalid Timing Deal",
        startTime: start,
        endTime: end,
        products: [{ productId: mockProductId, flashPrice: 199 }],
      });

      let validationError = null;
      try {
        await deal.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).not.toBeNull();
      expect(validationError.errors?.endTime?.message).toMatch(
        /End time must be strictly after start time/i
      );
    });

    test("rejects deal when products array is empty", async () => {
      const start = new Date();
      const end = new Date(Date.now() + 3600000);

      const deal = new FlashDeal({
        title: "No Products Deal",
        startTime: start,
        endTime: end,
        products: [],
      });

      let validationError = null;
      try {
        await deal.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).not.toBeNull();
      expect(validationError.errors?.products?.message).toMatch(
        /At least one product is required/i
      );
    });

    test("defaults maxQtyPerCustomer to 2 and status to active", () => {
      const deal = new FlashDeal({
        title: "Default Limits Deal",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        products: [{ productId: mockProductId, flashPrice: 150 }],
      });

      expect(deal.maxQtyPerCustomer).toBe(2);
      expect(deal.status).toBe("active");
    });
  });

  describe("B. Flash Deal Service & Active State Querying", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("getActiveFlashDeal returns populated deal when within start and end window", async () => {
      const now = new Date("2026-10-23T12:00:00Z");
      const activeDealDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: "Lunch Hour Meat Flash",
        startTime: new Date("2026-10-23T11:00:00Z"),
        endTime: new Date("2026-10-23T13:00:00Z"),
        status: "active",
        maxQtyPerCustomer: 2,
        products: [
          {
            productId: {
              _id: mockProductId,
              name: "Chicken Breast",
              price: 300,
              salePrice: 280,
              status: "active",
            },
            flashPrice: 199,
            dealStock: 25,
            soldCount: 5,
          },
        ],
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(activeDealDoc),
      };
      jest.spyOn(FlashDeal, "findOne").mockReturnValue(mockQuery);

      const result = await getActiveFlashDeal({ now });
      expect(result).not.toBeNull();
      expect(result.title).toBe("Lunch Hour Meat Flash");
      expect(result.products[0].flashPrice).toBe(199);
      expect(result.products[0].productId.name).toBe("Chicken Breast");
    });

    test("getActiveDealForProduct returns null if deal is expired", async () => {
      const now = new Date("2026-10-23T15:00:00Z");
      // Mongoose findOne returns null when no matching active deal
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(FlashDeal, "findOne").mockReturnValue(mockQuery);

      const result = await getActiveDealForProduct(mockProductId, { now });
      expect(result).toBeNull();
    });
  });

  describe("C. Purchase Limit & Abuse Prevention", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("rejects checkout when requested quantity exceeds deal maxQtyPerCustomer", async () => {
      const dealDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: "Strict Limit Deal",
        startTime: new Date(Date.now() - 10000),
        endTime: new Date(Date.now() + 10000),
        maxQtyPerCustomer: 2,
        products: [
          {
            productId: mockProductId,
            flashPrice: 140,
            originalPrice: 200,
          },
        ],
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(dealDoc),
      };
      jest.spyOn(FlashDeal, "findOne").mockReturnValue(mockQuery);

      await expect(
        validateCustomerDealLimit({
          customerId: mockCustomerId,
          productId: mockProductId,
          requestedQty: 3, // Exceeds limit 2
        })
      ).rejects.toThrow(/Purchase limit exceeded for flash deal on this item \(Max 2 per order\)/i);
    });

    test("rejects checkout when previous customer orders already reached limit", async () => {
      const dealDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: "Strict Limit Deal",
        startTime: new Date(Date.now() - 100000),
        endTime: new Date(Date.now() + 100000),
        maxQtyPerCustomer: 2,
        products: [
          {
            productId: mockProductId,
            flashPrice: 140,
            originalPrice: 200,
          },
        ],
      };

      const mockDealQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(dealDoc),
      };
      jest.spyOn(FlashDeal, "findOne").mockReturnValue(mockDealQuery);

      // Customer previously ordered 2 units
      const pastOrders = [
        {
          items: [{ product: mockProductId, quantity: 2 }],
        },
      ];
      const mockOrderQuery = {
        select: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(pastOrders),
      };
      jest.spyOn(Order, "find").mockReturnValue(mockOrderQuery);

      await expect(
        validateCustomerDealLimit({
          customerId: mockCustomerId,
          productId: mockProductId,
          requestedQty: 1, // 2 + 1 > 2
        })
      ).rejects.toThrow(/You have already purchased 2 of this flash deal item/i);
    });

    test("allows checkout when customer is within allowed limit", async () => {
      const dealDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: "Strict Limit Deal",
        startTime: new Date(Date.now() - 100000),
        endTime: new Date(Date.now() + 100000),
        maxQtyPerCustomer: 3,
        products: [
          {
            productId: mockProductId,
            flashPrice: 140,
            originalPrice: 200,
          },
        ],
      };

      const mockDealQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(dealDoc),
      };
      jest.spyOn(FlashDeal, "findOne").mockReturnValue(mockDealQuery);

      // Past orders = 1
      const pastOrders = [
        {
          items: [{ product: mockProductId, quantity: 1 }],
        },
      ];
      const mockOrderQuery = {
        select: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(pastOrders),
      };
      jest.spyOn(Order, "find").mockReturnValue(mockOrderQuery);

      const result = await validateCustomerDealLimit({
        customerId: mockCustomerId,
        productId: mockProductId,
        requestedQty: 1, // 1 + 1 <= 3
      });

      expect(result.isFlashDeal).toBe(true);
    });
  });

  describe("D. Authoritative Pricing Enforcement", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("hydrateOrderItems uses active flash deal price over regular price", async () => {
      const mockProduct = {
        _id: mockProductId,
        name: "Premium Goat Curry Cut",
        price: 650,
        salePrice: 600,
        status: "active",
        approvalStatus: "approved",
      };

      const mockProductQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockProduct]),
      };
      jest.spyOn(Product, "find").mockReturnValue(mockProductQuery);

      const activeDeal = {
        status: "active",
        products: [
          {
            productId: mockProductId,
            flashPrice: 499, // Flash deal is lower than salePrice 600
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
          quantity: 1,
          price: 999, // Customer client attempts to submit tampered price
        },
      ];

      const hydrated = await hydrateOrderItems(orderItemsInput, {
        enforceServerPricing: true,
      });

      expect(hydrated.length).toBe(1);
      // Authoritative flash price is strictly applied
      expect(hydrated[0].price).toBe(499);
      expect(hydrated[0].productName).toBe("Premium Goat Curry Cut");
    });
  });
});
