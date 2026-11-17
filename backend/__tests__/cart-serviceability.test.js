/**
 * Cart serviceability: one location -> one seller. Items owned by any other
 * seller must be reported (with names) so the UI can remove just those.
 */
import { jest } from "@jest/globals";

let sellerRows = []; // eligible (location-resolution) sellers
let sellerNames = []; // sellers looked up by id for display names
let sellerIdsWithProducts = [];
let productRows = [];

const sellerFind = jest.fn((query = {}) => ({
  select: () => ({
    lean: async () => (query._id ? sellerNames : sellerRows),
  }),
}));
const productFind = jest.fn(() => ({ select: () => ({ lean: async () => productRows }) }));

jest.unstable_mockModule("../app/models/seller.js", () => ({ default: { find: sellerFind } }));
jest.unstable_mockModule("../app/models/product.js", () => ({
  default: { find: productFind, distinct: jest.fn(async () => sellerIdsWithProducts) },
}));
jest.unstable_mockModule("../app/services/cacheService.js", () => ({
  buildKey: (...p) => p.join(":"),
  getTTL: () => 1,
  delPattern: jest.fn(),
  getOrSet: async (_k, fn) => fn(),
}));
jest.unstable_mockModule("../app/services/productModerationService.js", () => ({
  getApprovedOrLegacyFilter: () => ({}),
}));

const { findItemsOutsideSeller, evaluateCartServiceability } = await import(
  "../app/services/customerVisibilityService.js"
);

const KM = 0.009;
const BASE = { lat: 16.7, lng: 74.24 };
const seller = (id, kmNorth, radius) => ({
  _id: id,
  serviceRadius: radius,
  location: { type: "Point", coordinates: [BASE.lng, BASE.lat + kmNorth * KM] },
});

describe("findItemsOutsideSeller", () => {
  test("returns only items owned by a different seller, with names", async () => {
    sellerNames = [{ _id: "B", shopName: "Shop B" }];
    const out = await findItemsOutsideSeller(
      [
        { productId: "p1", productName: "Lollipop", sellerId: "A" },
        { productId: "p2", productName: "Breast", sellerId: "B", variantSku: "1kg" },
      ],
      "A",
    );
    expect(out).toEqual([
      { productId: "p2", variantSku: "1kg", name: "Breast", sellerId: "B", sellerName: "Shop B" },
    ]);
  });

  test("everything owned by the selected seller -> empty", async () => {
    expect(await findItemsOutsideSeller([{ productId: "p1", sellerId: "A" }], "A")).toEqual([]);
  });
});

describe("evaluateCartServiceability", () => {
  beforeEach(() => {
    sellerRows = [seller("A", 2, 5), seller("B", 30, 5)];
    sellerIdsWithProducts = ["A", "B"];
    sellerNames = [{ _id: "B", shopName: "Shop B" }];
    productRows = [
      { _id: "p1", name: "Lollipop", sellerId: "A" },
      { _id: "p2", name: "Breast", sellerId: "B" },
    ];
  });

  test("flags the product from the non-serving seller only", async () => {
    const r = await evaluateCartServiceability({
      cartItems: [{ productId: "p1" }, { productId: "p2" }],
      lat: BASE.lat,
      lng: BASE.lng,
    });
    expect(r.serviceable).toBe(false);
    expect(r.selectedSellerId).toBe("A");
    expect(r.unavailableItems.map((i) => i.productId)).toEqual(["p2"]);
    expect(r.unavailableItems[0].sellerName).toBe("Shop B");
  });

  test("fully serviceable cart", async () => {
    const r = await evaluateCartServiceability({
      cartItems: [{ productId: "p1" }],
      lat: BASE.lat,
      lng: BASE.lng,
    });
    expect(r).toMatchObject({ serviceable: true, unavailableItems: [] });
  });

  test("empty cart is serviceable", async () => {
    const r = await evaluateCartServiceability({ cartItems: [], lat: BASE.lat, lng: BASE.lng });
    expect(r.serviceable).toBe(true);
  });

  test("seller radius changed (A no longer eligible) -> its item becomes unavailable", async () => {
    sellerRows = [seller("B", 3, 5)];
    sellerIdsWithProducts = ["B"];
    sellerNames = [{ _id: "A", shopName: "Shop A" }];
    const r = await evaluateCartServiceability({
      cartItems: [{ productId: "p1" }],
      lat: BASE.lat,
      lng: BASE.lng,
    });
    expect(r.selectedSellerId).toBe("B");
    expect(r.unavailableItems.map((i) => i.productId)).toEqual(["p1"]);
  });
});
