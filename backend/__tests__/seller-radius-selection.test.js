/**
 * Seller-wise service radius: exactly ONE seller serves a customer.
 *  - nearest covering seller wins (A/B/C overlap)
 *  - nobody covers the customer -> nearest eligible seller (fallback)
 *  - inactive / unapproved / invalid-coordinate / product-less sellers excluded
 */
import { jest } from "@jest/globals";

let sellerRows = [];
let sellerIdsWithProducts = [];
const sellerFind = jest.fn(() => ({ select: () => ({ lean: async () => sellerRows }) }));
const productDistinct = jest.fn(async () => sellerIdsWithProducts);

jest.unstable_mockModule("../app/models/seller.js", () => ({ default: { find: sellerFind } }));
jest.unstable_mockModule("../app/models/product.js", () => ({ default: { distinct: productDistinct } }));
jest.unstable_mockModule("../app/services/cacheService.js", () => ({
  buildKey: (...p) => p.join(":"),
  getTTL: () => 1,
  delPattern: jest.fn(),
  // no caching in unit tests
  getOrSet: async (_k, fn) => fn(),
}));
jest.unstable_mockModule("../app/services/productModerationService.js", () => ({
  getApprovedOrLegacyFilter: () => ({}),
}));

const {
  selectSellerForCoordinates,
  resolveSelectedSellerForCustomer,
  getNearbySellerIdsForCustomer,
  normalizeServiceRadiusKm,
  parseCustomerCoordinates,
} = await import("../app/services/customerVisibilityService.js");

// ~1 km of latitude = 0.009 deg
const KM = 0.009;
const BASE = { lat: 16.7, lng: 74.24 };
const seller = (id, kmNorth, radius) => ({
  _id: id,
  serviceRadius: radius,
  location: { type: "Point", coordinates: [BASE.lng, BASE.lat + kmNorth * KM] },
});

describe("selectSellerForCoordinates", () => {
  test("A) inside only seller A's radius -> A", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("A", 3, 5), seller("B", 30, 8)]);
    expect(r).toMatchObject({ sellerId: "A", withinRadius: true, fallback: false });
  });

  test("B) inside only seller B's radius -> B", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("A", 30, 5), seller("B", 6, 8)]);
    expect(r).toMatchObject({ sellerId: "B", withinRadius: true });
  });

  test("C) inside A(2km/5), B(4km/8), C(7km/10) -> nearest = A only", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [
      seller("C", 7, 10), seller("B", 4, 8), seller("A", 2, 5),
    ]);
    expect(r.sellerId).toBe("A");
    expect(r.distanceKm).toBeCloseTo(2, 0);
  });

  test("nearest wins even when a farther seller has the bigger radius", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("far", 7, 100), seller("near", 3, 5)]);
    expect(r.sellerId).toBe("near");
  });

  test("a nearer seller whose radius does not cover the customer is skipped", () => {
    // near is 6km away but only serves 5km; far is 9km away and serves 10km
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("near", 6, 5), seller("far", 9, 10)]);
    expect(r).toMatchObject({ sellerId: "far", withinRadius: true, fallback: false });
  });

  test("D) outside every radius -> nearest eligible seller (fallback)", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("A", 20, 5), seller("B", 12, 5), seller("C", 40, 8)]);
    expect(r).toMatchObject({ sellerId: "B", withinRadius: false, fallback: true });
  });

  test("fallback does not override normal radius selection", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("A", 4, 5), seller("B", 30, 5)]);
    expect(r).toMatchObject({ sellerId: "A", fallback: false });
  });

  test("equal distance is deterministic (lowest id)", () => {
    const a = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("b2", 3, 5), seller("a1", 3, 5)]);
    const b = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("a1", 3, 5), seller("b2", 3, 5)]);
    expect(a.sellerId).toBe("a1");
    expect(b.sellerId).toBe("a1");
  });

  test("invalid coordinates (0,0, missing, NaN, out of range) are ignored", () => {
    const bad = [
      { _id: "z", serviceRadius: 5, location: { coordinates: [0, 0] } },
      { _id: "m", serviceRadius: 5 },
      { _id: "n", serviceRadius: 5, location: { coordinates: ["x", "y"] } },
      { _id: "o", serviceRadius: 5, location: { coordinates: [500, 500] } },
    ];
    expect(selectSellerForCoordinates(BASE.lat, BASE.lng, bad)).toBeNull();
    expect(selectSellerForCoordinates(BASE.lat, BASE.lng, [...bad, seller("ok", 50, 5)]).sellerId).toBe("ok");
  });

  test("no sellers -> null", () => {
    expect(selectSellerForCoordinates(BASE.lat, BASE.lng, [])).toBeNull();
  });
});

describe("radius normalisation", () => {
  test("bad legacy values are clamped, never 'serve everywhere'", () => {
    expect(normalizeServiceRadiusKm(100000)).toBe(100);
    expect(normalizeServiceRadiusKm(undefined)).toBe(5);
    expect(normalizeServiceRadiusKm(0)).toBe(5);
    expect(normalizeServiceRadiusKm(-3)).toBe(5);
    expect(normalizeServiceRadiusKm(0.2)).toBe(1);
    expect(normalizeServiceRadiusKm(8)).toBe(8);
  });
  test("a 100000km radius seller 500km away does not beat a local seller", () => {
    const r = selectSellerForCoordinates(BASE.lat, BASE.lng, [seller("huge", 500, 100000), seller("local", 2, 5)]);
    expect(r.sellerId).toBe("local");
  });
});

describe("parseCustomerCoordinates", () => {
  test("rejects missing/blank/out-of-range", () => {
    expect(parseCustomerCoordinates({}).valid).toBe(false);
    expect(parseCustomerCoordinates({ lat: "", lng: "" }).valid).toBe(false);
    expect(parseCustomerCoordinates({ lat: 91, lng: 0 }).valid).toBe(false);
    expect(parseCustomerCoordinates({ lat: "16.7", lng: "74.2" })).toEqual({ valid: true, lat: 16.7, lng: 74.2 });
  });
});

describe("resolveSelectedSellerForCustomer (eligibility filtering)", () => {
  beforeEach(() => { sellerFind.mockClear(); productDistinct.mockClear(); });

  test("queries only active + approved sellers", async () => {
    sellerRows = [seller("A", 2, 5)];
    sellerIdsWithProducts = ["A"];
    await resolveSelectedSellerForCustomer(BASE.lat, BASE.lng);
    expect(sellerFind.mock.calls[0][0]).toMatchObject({ isActive: true, applicationStatus: "approved" });
  });

  test("a seller with no active products never captures the customer", async () => {
    sellerRows = [seller("empty", 1, 5), seller("stocked", 3, 5)];
    sellerIdsWithProducts = ["stocked"];
    expect((await resolveSelectedSellerForCustomer(BASE.lat, BASE.lng)).sellerId).toBe("stocked");
  });

  test("overlapping sellers -> exactly ONE id", async () => {
    sellerRows = [seller("A", 2, 5), seller("B", 4, 8), seller("C", 7, 10)];
    sellerIdsWithProducts = ["A", "B", "C"];
    expect(await getNearbySellerIdsForCustomer(BASE.lat, BASE.lng)).toEqual(["A"]);
  });

  test("outside every radius -> single nearest fallback, not empty", async () => {
    sellerRows = [seller("A", 25, 5), seller("B", 15, 5)];
    sellerIdsWithProducts = ["A", "B"];
    expect(await getNearbySellerIdsForCustomer(BASE.lat, BASE.lng)).toEqual(["B"]);
  });

  test("no eligible seller anywhere -> empty (graceful)", async () => {
    sellerRows = [];
    expect(await getNearbySellerIdsForCustomer(BASE.lat, BASE.lng)).toEqual([]);
    sellerRows = [seller("A", 2, 5)];
    sellerIdsWithProducts = [];
    expect(await getNearbySellerIdsForCustomer(BASE.lat, BASE.lng)).toEqual([]);
  });
});
