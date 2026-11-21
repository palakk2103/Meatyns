import { calculateCustomerDeliveryFee } from "../app/services/finance/pricingService.js";
import { normalizeFinanceSettings } from "../app/services/finance/financeSettingsService.js";
import { applyFreeDeliveryToSellerBreakdowns } from "../app/services/checkoutPricingService.js";

/**
 * City-wise distance slabs (e.g. Kolhapur 0-1km ₹30, 1-3km ₹45, 3-5km ₹70)
 * apply to NORMAL + SCHEDULED delivery only, matched on the outlet's city.
 */
describe("City delivery slabs (Normal + Scheduled)", () => {
  const settings = normalizeFinanceSettings({
    deliveryPricingMode: "distance_based",
    customerBaseDeliveryFee: 20,
    baseDistanceCapacityKm: 0.5,
    incrementalKmSurcharge: 10,
    deliveryConfig: { express: { surcharge: 150 } },
    cityDeliverySlabs: [
      {
        city: "Kolhapur",
        slabs: [
          { fromKm: 3, toKm: 5, fee: 70 },
          { fromKm: 0, toKm: 1, fee: 30 },
          { fromKm: 1, toKm: 3, fee: 45 },
        ],
      },
    ],
  });

  const fee = (km, deliveryMethod, sellerCity = "Kolhapur") =>
    calculateCustomerDeliveryFee(km, settings, { deliveryMethod, sellerCity });

  it.each([
    [0.4, 30],
    [1, 30],
    [1.01, 45],
    [3, 45],
    [3.2, 70],
    [5, 70],
  ])("normal delivery at %s km in Kolhapur costs ₹%s", (km, expected) => {
    const res = fee(km, "NORMAL");
    expect(res.deliveryFeeCharged).toBe(expected);
    expect(res.citySlabApplied).toBe(true);
  });

  it("scheduled delivery uses the same city slabs", () => {
    expect(fee(2, "SCHEDULED").deliveryFeeCharged).toBe(45);
  });

  it("city match is case/space-insensitive", () => {
    expect(fee(0.5, "NORMAL", "  kolhapur ").deliveryFeeCharged).toBe(30);
  });

  it.each([
    [0.4, 60],
    [1, 60],
    [1.41, 90],
    [3, 90],
    [3.2, 140],
    [5, 140],
  ])("express delivery at %s km in Kolhapur costs double the slab: ₹%s", (km, expected) => {
    const res = fee(km, "EXPRESS");
    expect(res.deliveryFeeCharged).toBe(expected);
    expect(res.expressSurcharge).toBe(expected / 2);
  });

  it("express beyond the last slab is double the standard fee", () => {
    // standard: 20 + ceil(6.2 - 0.5)=6km * 10 = 80 -> express 160
    expect(fee(6.2, "EXPRESS").deliveryFeeCharged).toBe(160);
  });

  it("other cities keep the standard fee", () => {
    const res = fee(2, "NORMAL", "Indore");
    expect(res.deliveryFeeCharged).toBe(40);
    expect(res.citySlabApplied).toBe(false);
  });

  it("beyond the last slab falls back to the standard fee", () => {
    // 20 + ceil(6.2 - 0.5)=6km * 10 = 80
    const res = fee(6.2, "NORMAL");
    expect(res.deliveryFeeCharged).toBe(80);
    expect(res.citySlabApplied).toBe(false);
  });

  it("disabled city rule is ignored", () => {
    const off = normalizeFinanceSettings({
      ...settings,
      cityDeliverySlabs: [{ city: "Kolhapur", enabled: false, slabs: [{ fromKm: 0, toKm: 5, fee: 99 }] }],
    });
    const res = calculateCustomerDeliveryFee(1, off, { deliveryMethod: "NORMAL", sellerCity: "Kolhapur" });
    expect(res.deliveryFeeCharged).not.toBe(99);
  });

  describe("free-delivery threshold", () => {
    const entry = (deliveryFeeBreakdown) => ({
      breakdown: {
        deliveryFeeCharged: deliveryFeeBreakdown.finalDeliveryFee,
        grossTotal: 500 + deliveryFeeBreakdown.finalDeliveryFee,
        grandTotal: 500 + deliveryFeeBreakdown.finalDeliveryFee,
        snapshots: { deliveryFeeBreakdown },
      },
    });

    it("keeps the city slab charge when only the order-value threshold applies", () => {
      const e = entry(fee(2, "NORMAL").breakdown);
      applyFreeDeliveryToSellerBreakdowns([e], { keepCitySlabFees: true });
      expect(e.breakdown.deliveryFeeCharged).toBe(45);
      expect(e.breakdown.grandTotal).toBe(545);
    });

    it("a free-delivery coupon still waives it", () => {
      const e = entry(fee(2, "NORMAL").breakdown);
      applyFreeDeliveryToSellerBreakdowns([e], { keepCitySlabFees: false });
      expect(e.breakdown.deliveryFeeCharged).toBe(0);
    });
  });
});
