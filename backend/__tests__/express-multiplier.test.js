import { calculateCustomerDeliveryFee } from "../app/services/finance/pricingService.js";

const settings = (mult) => ({
  deliveryConfig: { express: mult === undefined ? {} : { feeMultiplier: mult } },
  cityDeliverySlabs: [{ city: "Kolhapur", enabled: true, slabs: [{ fromKm: 0, toKm: 1, fee: 30 }, { fromKm: 1, toKm: 3, fee: 45 }] }],
});
const fee = (m, km, method) =>
  calculateCustomerDeliveryFee(km, settings(m), { deliveryMethod: method, sellerCity: "Kolhapur" }).deliveryFeeCharged;

describe("Express fee multiplier is admin-driven", () => {
  test("Normal uses the city slab", () => expect(fee(undefined, 0.5, "NORMAL")).toBe(30));
  test("default is 2x", () => expect(fee(undefined, 0.5, "EXPRESS")).toBe(60));
  test("3x", () => expect(fee(3, 2, "EXPRESS")).toBe(135));
  test("1x = same as Normal", () => expect(fee(1, 0.5, "EXPRESS")).toBe(30));
});
