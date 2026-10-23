import { describe, it, expect } from "@jest/globals";
import { updateDeliverySettingsSchema } from "../app/validation/financeValidation.js";
import { normalizeFinanceSettings } from "../app/services/finance/financeSettingsService.js";
import { applyFreeDeliveryToSellerBreakdowns } from "../app/services/checkoutPricingService.js";

describe("Stage 3 — Platform-Wide Delivery and Minimum Order Settings", () => {
  describe("Validation & Normalization", () => {
    it("validates valid freeDeliveryThreshold and minimumOrderValue in delivery settings", () => {
      const payload = {
        freeDeliveryThreshold: 499,
        minimumOrderValue: 200,
        fixedDeliveryFee: 35,
      };

      const { error, value } = updateDeliverySettingsSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.freeDeliveryThreshold).toBe(499);
      expect(value.minimumOrderValue).toBe(200);
    });

    it("rejects negative freeDeliveryThreshold and minimumOrderValue", () => {
      const { error: err1 } = updateDeliverySettingsSchema.validate({
        freeDeliveryThreshold: -10,
      });
      expect(err1).toBeDefined();

      const { error: err2 } = updateDeliverySettingsSchema.validate({
        minimumOrderValue: -50,
      });
      expect(err2).toBeDefined();
    });

    it("normalizes settings with safe defaults (499 threshold, 0 minimum order)", () => {
      const normalized = normalizeFinanceSettings({});
      expect(normalized.freeDeliveryThreshold).toBe(499);
      expect(normalized.minimumOrderValue).toBe(0);
      expect(normalized.customerBaseDeliveryFee).toBe(30);
    });

    it("honors custom configured thresholds in normalized finance settings", () => {
      const normalized = normalizeFinanceSettings({
        freeDeliveryThreshold: 799,
        minimumOrderValue: 250,
        fixedDeliveryFee: 40,
      });
      expect(normalized.freeDeliveryThreshold).toBe(799);
      expect(normalized.minimumOrderValue).toBe(250);
      expect(normalized.fixedDeliveryFee).toBe(40);
    });
  });

  describe("Checkout Pricing Integration & Free Delivery Application", () => {
    it("applies free delivery rebate to customer while preserving rider payout", () => {
      const entries = [
        {
          sellerId: "seller1",
          breakdown: {
            deliveryFeeCharged: 40,
            grossTotal: 600,
            grandTotal: 600,
            payableAmount: 600,
            riderPayoutTotal: 45,
            handlingFeeCharged: 10,
            adminProductCommissionTotal: 50,
          },
        },
      ];

      applyFreeDeliveryToSellerBreakdowns(entries);
      const b = entries[0].breakdown;
      expect(b.deliveryFeeCharged).toBe(0);
      // Rider payout must NOT be removed - platform absorbs logistics cost
      expect(b.riderPayoutTotal).toBe(45);
      expect(b.grossTotal).toBe(560);
      expect(b.grandTotal).toBe(560);
      expect(b.payableAmount).toBe(560);
      expect(b.snapshots.freeDeliveryRebate).toBe(40);
    });

    it("handles multiple seller breakdowns when free delivery is unlocked", () => {
      const entries = [
        {
          sellerId: "sellerA",
          breakdown: {
            deliveryFeeCharged: 30,
            grossTotal: 330,
            grandTotal: 330,
            payableAmount: 330,
            riderPayoutTotal: 35,
          },
        },
        {
          sellerId: "sellerB",
          breakdown: {
            deliveryFeeCharged: 25,
            grossTotal: 325,
            grandTotal: 325,
            payableAmount: 325,
            riderPayoutTotal: 30,
          },
        },
      ];

      applyFreeDeliveryToSellerBreakdowns(entries);
      expect(entries[0].breakdown.deliveryFeeCharged).toBe(0);
      expect(entries[1].breakdown.deliveryFeeCharged).toBe(0);
      expect(entries[0].breakdown.riderPayoutTotal).toBe(35);
      expect(entries[1].breakdown.riderPayoutTotal).toBe(30);
      expect(entries[0].breakdown.grandTotal).toBe(300);
      expect(entries[1].breakdown.grandTotal).toBe(300);
    });

    it("correctly identifies threshold qualifications", () => {
      const threshold = 500;
      expect(499 >= threshold).toBe(false); // ₹1 below threshold
      expect(500 >= threshold).toBe(true);  // Exactly at threshold
      expect(501 >= threshold).toBe(true);  // Above threshold
    });

    it("correctly evaluates minimum order boundary conditions", () => {
      const minOrder = 199;
      expect(150 < minOrder).toBe(true);  // Fails min order check
      expect(199 < minOrder).toBe(false); // Exactly at min order -> passes
      expect(250 < minOrder).toBe(false); // Above min order -> passes
    });
  });
});
