import { jest } from "@jest/globals";
import {
  calculateCustomerDeliveryFee,
  generateOrderPaymentBreakdown,
} from "../app/services/finance/pricingService.js";
import {
  DEFAULT_DELIVERY_CONFIG,
  normalizeFinanceSettings,
} from "../app/services/finance/financeSettingsService.js";
import {
  getAvailableDates,
  formatSlotLabel,
  formatDateToISOString,
} from "../app/services/deliverySlotService.js";

describe("Delivery Slot Management & Dynamic Delivery Pricing", () => {
  const baseDeliverySettings = normalizeFinanceSettings({
    deliveryPricingMode: "distance_based",
    customerBaseDeliveryFee: 30,
    baseDistanceCapacityKm: 1.0,
    incrementalKmSurcharge: 10,
    deliveryConfig: {
      express: {
        enabled: true,
        surcharge: 45,
        estimatedMinMinutes: 15,
        estimatedMaxMinutes: 30,
      },
      normal: {
        enabled: true,
        deliveryFee: null,
        estimatedLabel: "1–2 hours",
      },
      advance: {
        enabled: true,
        deliveryFee: null,
        maxAdvanceDays: 5,
        maxOrdersPerSlot: 8,
      },
    },
  });

  describe("Dynamic Delivery Fee Calculation", () => {
    it("calculates normal delivery fee correctly (Base + distance surcharge)", () => {
      // 2.5km distance -> 1.0 base, 1.5 extra -> ceil(1.5) = 2 extra km -> 30 + 2 * 10 = 50
      const fee = calculateCustomerDeliveryFee(2.5, baseDeliverySettings, {
        deliveryMethod: "NORMAL",
      });

      expect(fee.standardNormalFee).toBe(50);
      expect(fee.deliveryFeeCharged).toBe(50);
      expect(fee.expressSurcharge).toBe(0);
      expect(fee.deliveryMethod).toBe("NORMAL");
    });

    it("calculates express delivery fee with configured express surcharge", () => {
      // 2.5km distance -> standard fee 50 + express surcharge 45 = 95
      const fee = calculateCustomerDeliveryFee(2.5, baseDeliverySettings, {
        deliveryMethod: "EXPRESS",
      });

      expect(fee.standardNormalFee).toBe(50);
      expect(fee.expressSurcharge).toBe(45);
      expect(fee.deliveryFeeCharged).toBe(95);
      expect(fee.deliveryMethod).toBe("EXPRESS");
    });

    it("calculates advance scheduled delivery fee with default normal pricing", () => {
      const fee = calculateCustomerDeliveryFee(2.5, baseDeliverySettings, {
        deliveryMethod: "SCHEDULED",
      });

      expect(fee.standardNormalFee).toBe(50);
      expect(fee.deliveryFeeCharged).toBe(50);
      expect(fee.deliveryMethod).toBe("SCHEDULED");
    });

    it("calculates advance scheduled delivery fee with custom configured fee", () => {
      const customAdvanceSettings = normalizeFinanceSettings({
        ...baseDeliverySettings,
        deliveryConfig: {
          ...baseDeliverySettings.deliveryConfig,
          advance: {
            ...baseDeliverySettings.deliveryConfig.advance,
            deliveryFee: 65,
          },
        },
      });

      const fee = calculateCustomerDeliveryFee(2.5, customAdvanceSettings, {
        deliveryMethod: "SCHEDULED",
      });

      expect(fee.deliveryFeeCharged).toBe(65);
      expect(fee.advanceBookingFee).toBe(65);
    });

    it("handles fixed_price mode for normal, express, and advance", () => {
      const fixedSettings = normalizeFinanceSettings({
        deliveryPricingMode: "fixed_price",
        fixedDeliveryFee: 35,
        deliveryConfig: {
          express: { enabled: true, surcharge: 40 },
          normal: { enabled: true, deliveryFee: 35 },
          advance: { enabled: true, deliveryFee: null },
        },
      });

      const normal = calculateCustomerDeliveryFee(10, fixedSettings, {
        deliveryMethod: "NORMAL",
      });
      expect(normal.deliveryFeeCharged).toBe(35);

      const express = calculateCustomerDeliveryFee(10, fixedSettings, {
        deliveryMethod: "EXPRESS",
      });
      expect(express.deliveryFeeCharged).toBe(75); // 35 + 40
    });
  });

  describe("Slot Utilities & Advance Booking Window", () => {
    it("respects maxAdvanceDays parameter in getAvailableDates", () => {
      const dates = getAvailableDates(new Date(), 3);
      expect(dates).toHaveLength(3);
      expect(dates[0].label).toBe("Today");
      expect(dates[1].label).toBe("Tomorrow");
    });

    it("formats slot label to 12-hour AM/PM format", () => {
      expect(formatSlotLabel("09:00", "10:00")).toBe("9:00 AM – 10:00 AM");
      expect(formatSlotLabel("13:00", "14:00")).toBe("1:00 PM – 2:00 PM");
      expect(formatSlotLabel("20:00", "21:00")).toBe("8:00 PM – 9:00 PM");
    });

    it("formats ISO date consistently with timezone", () => {
      const iso = formatDateToISOString(new Date());
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
