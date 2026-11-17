import Seller from "../models/seller.js";
import Product from "../models/product.js";
import { distanceMeters } from "../utils/geoUtils.js";
import * as cache from "./cacheService.js";
import { getApprovedOrLegacyFilter } from "./productModerationService.js";

const MAX_SELLER_SEARCH_DISTANCE_M = 10000000;

export const DEFAULT_SERVICE_RADIUS_KM = 5;
export const MIN_SERVICE_RADIUS_KM = 1;
export const MAX_SERVICE_RADIUS_KM = 100;

export function parseCustomerCoordinates(query = {}) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (
    query.lat === undefined || query.lat === null || query.lat === "" ||
    query.lng === undefined || query.lng === null || query.lng === ""
  ) {
    return { valid: false, lat: null, lng: null };
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, lat: null, lng: null };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }

  return { valid: true, lat, lng };
}

/**
 * A seller's configured radius in km, bounded to the range the seller/admin
 * forms allow (1-100). Legacy/bad values (e.g. 100000) are clamped, never
 * treated as "serves the whole country".
 */
export function normalizeServiceRadiusKm(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SERVICE_RADIUS_KM;
  return Math.min(Math.max(n, MIN_SERVICE_RADIUS_KM), MAX_SERVICE_RADIUS_KM);
}

/**
 * Pure selection rule (no I/O) so it is unit-testable.
 *  1. Sellers whose radius covers the customer -> pick the nearest.
 *  2. Nobody covers the customer -> fall back to the nearest eligible seller.
 *  Ties break on seller id for a deterministic result.
 * `sellers` must already be eligible (active, approved, has products).
 */
export function selectSellerForCoordinates(lat, lng, sellers = []) {
  const candidates = [];
  for (const seller of sellers) {
    const coords = seller?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [sellerLng, sellerLat] = coords.map(Number);
    if (!Number.isFinite(sellerLat) || !Number.isFinite(sellerLng)) continue;
    if (sellerLng === 0 && sellerLat === 0) continue; // unset location
    if (Math.abs(sellerLat) > 90 || Math.abs(sellerLng) > 180) continue;

    candidates.push({
      id: String(seller._id),
      distanceKm: distanceMeters(lat, lng, sellerLat, sellerLng) / 1000,
      radiusKm: normalizeServiceRadiusKm(seller.serviceRadius),
    });
  }
  if (!candidates.length) return null;

  const byDistance = (a, b) =>
    a.distanceKm - b.distanceKm || a.id.localeCompare(b.id);

  const covering = candidates.filter((c) => c.distanceKm <= c.radiusKm).sort(byDistance);
  if (covering.length) {
    const c = covering[0];
    return { sellerId: c.id, distanceKm: c.distanceKm, withinRadius: true, fallback: false };
  }
  const nearest = candidates.sort(byDistance)[0];
  return {
    sellerId: nearest.id,
    distanceKm: nearest.distanceKm,
    withinRadius: false,
    fallback: true,
  };
}

/** Round lat/lng to 4 decimals (~11m) so nearby requests share a cache bucket. */
function buildSelectedSellerKey(lat, lng) {
  return cache.buildKey(
    "sellers",
    "selected",
    `${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}`,
  );
}

/** Drop cached selections (call when a seller's location/radius/status changes). */
export async function invalidateSellerSelectionCache() {
  try {
    await cache.delPattern(cache.buildKey("sellers", "selected", "*"));
  } catch (err) {
    console.warn("[customerVisibility] selection cache invalidation failed:", err.message);
  }
}

/**
 * Single source of truth: which ONE seller serves a customer at (lat, lng).
 * Returns { sellerId, distanceKm, withinRadius, fallback } or null when no
 * eligible seller exists at all.
 */
export async function resolveSelectedSellerForCustomer(lat, lng) {
  const fetchFn = async () => {
    const sellers = await Seller.find({
      isActive: true,
      applicationStatus: "approved",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: MAX_SELLER_SEARCH_DISTANCE_M,
        },
      },
    })
      .select("_id location serviceRadius")
      .lean();

    if (!sellers.length) return null;

    // A seller with nothing to sell must not capture the customer.
    const sellerIdsWithProducts = new Set(
      (
        await Product.distinct("sellerId", {
          sellerId: { $in: sellers.map((s) => s._id) },
          status: "active",
          ...getApprovedOrLegacyFilter(),
        })
      ).map(String),
    );

    return selectSellerForCoordinates(
      lat,
      lng,
      sellers.filter((s) => sellerIdsWithProducts.has(String(s._id))),
    );
  };

  return cache.getOrSet(
    buildSelectedSellerKey(lat, lng),
    fetchFn,
    cache.getTTL("nearbySellers"),
  );
}

/**
 * Business rule: ONE delivery location is served by exactly ONE seller, and an
 * order can only contain that seller's products. Given line items shaped like
 * `{ productId, variantSku, productName, sellerId }`, returns the ones the
 * selected seller does NOT own, enriched with seller names so the UI can say
 * exactly which product is unavailable and who it belongs to.
 */
export async function findItemsOutsideSeller(items = [], selectedSellerId = null) {
  const selectedId = selectedSellerId ? String(selectedSellerId) : null;
  const foreign = (items || []).filter(
    (item) => String(item?.sellerId || "") !== selectedId,
  );
  if (!foreign.length) return [];

  const sellerIds = Array.from(new Set(foreign.map((i) => String(i.sellerId || "")).filter(Boolean)));
  const sellerDocs = sellerIds.length
    ? await Seller.find({ _id: { $in: sellerIds } }).select("_id shopName").lean()
    : [];
  const nameById = new Map(sellerDocs.map((s) => [String(s._id), s.shopName || "Another store"]));

  return foreign.map((item) => ({
    productId: String(item.productId || ""),
    variantSku: String(item.variantSku || ""),
    name: item.productName || item.name || "Item",
    sellerId: String(item.sellerId || ""),
    sellerName: nameById.get(String(item.sellerId || "")) || "Another store",
  }));
}

/**
 * Light-weight serviceability check of a stored cart against a delivery
 * location. Reuses `resolveSelectedSellerForCustomer` (same rule checkout
 * enforces) so the cart page and checkout can never disagree.
 * `cartItems` are `{ productId, variantSku }`.
 */
export async function evaluateCartServiceability({ cartItems = [], lat, lng }) {
  const selected = await resolveSelectedSellerForCustomer(lat, lng);
  if (!cartItems.length) {
    return { selectedSellerId: selected?.sellerId || null, serviceable: true, unavailableItems: [] };
  }
  const products = await Product.find({
    _id: { $in: cartItems.map((i) => i.productId) },
  })
    .select("_id name sellerId")
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = cartItems.map((i) => {
    const p = byId.get(String(i.productId));
    return {
      productId: String(i.productId),
      variantSku: i.variantSku || "",
      productName: p?.name,
      sellerId: p ? String(p.sellerId || "") : "",
    };
  });
  // No eligible outlet at all -> nothing is deliverable here.
  const unavailableItems = selected
    ? await findItemsOutsideSeller(lines, selected.sellerId)
    : await findItemsOutsideSeller(lines, null);
  return {
    selectedSellerId: selected?.sellerId || null,
    serviceable: unavailableItems.length === 0,
    unavailableItems,
  };
}

/**
 * Backward-compatible: returns an array, now containing at most ONE seller id
 * (the selected one). Empty only when no eligible seller exists anywhere.
 */
export async function getNearbySellerIdsForCustomer(lat, lng) {
  const selected = await resolveSelectedSellerForCustomer(lat, lng);
  return selected ? [selected.sellerId] : [];
}

/** Helper to get the single selected outlet id for customer coordinates. */
export async function getNearestSellerForCustomer(lat, lng) {
  const selected = await resolveSelectedSellerForCustomer(lat, lng);
  return selected ? selected.sellerId : null;
}
