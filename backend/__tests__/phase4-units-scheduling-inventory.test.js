import { describe, it, expect } from "@jest/globals";
import {
  createProductSchema,
  updateProductSchema,
} from "../app/validation/productValidation.js";
import {
  evaluateProductAvailability,
} from "../app/services/productSchedulingService.js";
import {
  validatePosApiKey,
  syncPosInventoryBatch,
} from "../app/services/integrations/posIntegrationService.js";

describe("Phase 4 — Flexible Units, Scheduling, Hierarchy & POS Integration", () => {
  describe("Module B: Flexible Product Units & Quantities Validation", () => {
    const baseValidProduct = {
      name: "Farm Fresh Mutton Curry Cut",
      price: 650,
      stock: 40,
      category: "507f1f77bcf86cd799439011",
    };

    it("accepts valid unit fields with gram/kg configurations", () => {
      const payload = {
        ...baseValidProduct,
        unit: "kg",
        unitValue: 1,
        orderIncrement: 0.25,
        minOrderQty: 0.25,
        maxOrderQty: 10,
      };

      const { error, value } = createProductSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.unit).toBe("kg");
      expect(value.unitValue).toBe(1);
      expect(value.orderIncrement).toBe(0.25);
      expect(value.minOrderQty).toBe(0.25);
      expect(value.maxOrderQty).toBe(10);
    });

    it("accepts piece and pack unit configurations with integer increments", () => {
      const payload = {
        ...baseValidProduct,
        name: "Whole Spring Chicken",
        unit: "pc",
        unitValue: 1,
        orderIncrement: 1,
        minOrderQty: 1,
        maxOrderQty: 5,
      };

      const { error, value } = createProductSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.unit).toBe("pc");
      expect(value.orderIncrement).toBe(1);
    });

    it("permits legacy products without newly introduced unit fields (backward compatibility)", () => {
      const legacyPayload = {
        ...baseValidProduct,
      };

      const { error, value } = createProductSchema.validate(legacyPayload);
      expect(error).toBeUndefined();
      expect(value.unit).toBeUndefined();
      expect(value.orderIncrement).toBeUndefined();
    });

    it("rejects unsupported unit strings", () => {
      const invalidPayload = {
        ...baseValidProduct,
        unit: "arbitrary_barrel",
      };

      const { error } = createProductSchema.validate(invalidPayload);
      expect(error).toBeDefined();
      expect(error.message).toContain("unit");
    });

    it("rejects negative orderIncrement or minOrderQty", () => {
      const invalidPayload = {
        ...baseValidProduct,
        orderIncrement: -0.5,
      };

      const { error } = createProductSchema.validate(invalidPayload);
      expect(error).toBeDefined();
      expect(error.message).toContain("orderIncrement");
    });

    it("supports partial update of unit configurations via updateProductSchema", () => {
      const updatePayload = {
        unit: "g",
        unitValue: 500,
        orderIncrement: 1,
      };

      const { error, value } = updateProductSchema.validate(updatePayload);
      expect(error).toBeUndefined();
      expect(value.unit).toBe("g");
      expect(value.unitValue).toBe(500);
    });
  });

  describe("Module C: Product Availability & Scheduling Service", () => {
    it("returns available=true for products where scheduling is disabled or missing", () => {
      const productNoSchedule = {
        name: "Standard Chicken Breast",
        isScheduled: false,
      };
      const result1 = evaluateProductAvailability(productNoSchedule);
      expect(result1.available).toBe(true);

      const productMissingSchedule = {
        name: "Standard Chicken Wings",
      };
      const result2 = evaluateProductAvailability(productMissingSchedule);
      expect(result2.available).toBe(true);
    });

    it("enforces day-of-week restriction safely", () => {
      // Pass a reference date that is a Wednesday (2026-10-21)
      const wednesdayDate = new Date("2026-10-21T10:00:00Z");
      const productOnlySunday = {
        name: "Sunday Special Biryani Cut",
        isScheduled: true,
        scheduleDays: ["Sunday"], // Only Sundays
        availableFromTime: "06:00",
        availableToTime: "22:00",
      };

      const result = evaluateProductAvailability(productOnlySunday, wednesdayDate);
      expect(result.available).toBe(false);
      expect(result.isAvailable).toBe(false);
      expect(result.reason).toBe("DAY_NOT_ALLOWED");
      expect(result.message).toContain("Available on Sunday");
    });

    it("enforces time-of-day windows in Asia/Kolkata timezone", () => {
      // 04:00 UTC = 09:30 AM IST
      const morningDate = new Date("2026-10-21T04:00:00Z");

      const morningProduct = {
        name: "Early Morning Catch Fish",
        isScheduled: true,
        scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        availableFromTime: "06:00",
        availableToTime: "11:00",
      };

      const morningResult = evaluateProductAvailability(morningProduct, morningDate);
      expect(morningResult.available).toBe(true);
      expect(morningResult.isAvailable).toBe(true);

      const afternoonProduct = {
        name: "Evening Fresh Mutton",
        isScheduled: true,
        scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        availableFromTime: "16:00",
        availableToTime: "21:00",
      };

      const afternoonResult = evaluateProductAvailability(afternoonProduct, morningDate);
      expect(afternoonResult.available).toBe(false);
      expect(afternoonResult.isAvailable).toBe(false);
      expect(afternoonResult.reason).toBe("TIME_NOT_ALLOWED");
      expect(afternoonResult.message).toContain("Available today from 16:00 to 21:00");
    });

    it("enforces seasonal date ranges", () => {
      const testDate = new Date("2026-10-21T10:00:00Z");

      const expiredProduct = {
        name: "Summer Mango Marinade Mutton",
        isScheduled: true,
        scheduleStartDate: new Date("2026-05-01"),
        scheduleEndDate: new Date("2026-06-30"),
      };

      const expiredResult = evaluateProductAvailability(expiredProduct, testDate);
      expect(expiredResult.available).toBe(false);
      expect(expiredResult.isAvailable).toBe(false);
      expect(expiredResult.reason).toBe("END_DATE_EXPIRED");
      expect(expiredResult.message).toBe("Availability period has ended");

      const activeProduct = {
        name: "Diwali Festive Special Cut",
        isScheduled: true,
        scheduleStartDate: new Date("2026-10-01"),
        scheduleEndDate: new Date("2026-10-31"),
      };

      const activeResult = evaluateProductAvailability(activeProduct, testDate);
      expect(activeResult.available).toBe(true);
    });
  });

  describe("Module B: Precision-Safe Fractional Pricing Calculations", () => {
    it("avoids binary floating-point drift on fractional quantities", () => {
      // Standard JS pitfall: 0.1 + 0.2 !== 0.3
      const pricePerKg = 499.5;
      const quantityKg = 0.3; // 300 grams
      const rawPrice = pricePerKg * quantityKg; // 149.85000000000002
      const roundedSubtotal = Math.round(rawPrice * 100) / 100;
      expect(roundedSubtotal).toBe(149.85);

      // 3 items of 0.25 kg
      const lineQty = Number((0.25 * 3).toFixed(3));
      expect(lineQty).toBe(0.75);
      const total = Math.round(pricePerKg * lineQty * 100) / 100;
      expect(total).toBe(374.63);
    });
  });

  describe("Module F: POS/ERP Integration Readiness & Security", () => {
    it("validates POS API key correctly", () => {
      const originalKey = process.env.POS_INTEGRATION_API_KEY;
      try {
        process.env.POS_INTEGRATION_API_KEY = "meatyns_test_pos_secret_key_443";
        expect(validatePosApiKey("meatyns_test_pos_secret_key_443")).toBe(true);
        expect(validatePosApiKey("wrong_key")).toBe(false);
        expect(validatePosApiKey("")).toBe(false);
        expect(validatePosApiKey(null)).toBe(false);
      } finally {
        if (originalKey !== undefined) {
          process.env.POS_INTEGRATION_API_KEY = originalKey;
        } else {
          delete process.env.POS_INTEGRATION_API_KEY;
        }
      }
    });

    it("rejects batch sync when externalSyncId is missing", async () => {
      await expect(
        syncPosInventoryBatch({ updates: [] })
      ).rejects.toThrow("externalSyncId is required");
    });
  });
});
