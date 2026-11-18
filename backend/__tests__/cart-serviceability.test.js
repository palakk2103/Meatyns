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
let outletCatalogue = []; // products of the selected seller (remap lookup)
const productFind = jest.fn((query = {}) => ({
  select: () => ({ lean: async () => (query.sellerId ? outletCatalogue : productRows) }),
}));

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

const { findItemsOutsideSeller, evaluateCartServiceability, remapCartItemsToSeller } = await import(
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

describe("remapCartItemsToSeller (same product at the serving outlet)", () => {
  const makeCart = (items) => ({ items, save: jest.fn(async () => {}) });

  beforeEach(() => {
    productRows = [
      { _id: "meatyns-goat", name: "Goat Curry Cut", sellerId: "MEATYNS", variants: [{ sku: "M-500", name: "500 g" }] },
      { _id: "raj-goat", name: "Goat Curry Cut", sellerId: "RAJ", variants: [{ sku: "R-500", name: "500 g" }] },
      { _id: "meatyns-fish", name: "Rohu Fish", sellerId: "MEATYNS", variants: [] },
    ];
    outletCatalogue = [
      { _id: "jag-goat", name: "goat  curry cut ", variants: [{ sku: "J-500", name: "500 G" }, { sku: "J-1kg", name: "1 kg" }] },
    ];
  });

  test("swaps lines from other outlets to the serving outlet and merges duplicates", async () => {
    const cart = makeCart([
      { productId: "meatyns-goat", variantSku: "M-500", quantity: 1 },
      { productId: "raj-goat", variantSku: "R-500", quantity: 2 },
    ]);
    const swapped = await remapCartItemsToSeller(cart, "JAG");
    expect(swapped).toBe(2);
    expect(cart.items).toEqual([{ productId: "jag-goat", variantSku: "J-500", quantity: 3 }]);
    expect(cart.save).toHaveBeenCalledTimes(1);
  });

  test("leaves items the serving outlet does not sell untouched", async () => {
    const cart = makeCart([{ productId: "meatyns-fish", variantSku: "", quantity: 1 }]);
    expect(await remapCartItemsToSeller(cart, "JAG")).toBe(0);
    expect(cart.items[0].productId).toBe("meatyns-fish");
    expect(cart.save).not.toHaveBeenCalled();
  });

  test("does not swap when the weight variant is not sold at the serving outlet", async () => {
    productRows[0].variants = [{ sku: "M-2kg", name: "2 kg" }];
    const cart = makeCart([{ productId: "meatyns-goat", variantSku: "M-2kg", quantity: 1 }]);
    expect(await remapCartItemsToSeller(cart, "JAG")).toBe(0);
  });
});
