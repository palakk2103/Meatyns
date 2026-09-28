import Seller from "../models/seller.js";
import { calculateDistance } from "../utils/helper.js";
import { buildKey, getOrSet, getTTL } from "./cacheService.js";

const MAX_SELLER_SEARCH_DISTANCE_M = 10000000;

export function parseCustomerCoordinates(query = {}) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, lat: null, lng: null };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }

  return { valid: true, lat, lng };
}

/**
 * Round lat/lng to 4 decimal places (~11m precision) for cache key.
 * This groups nearby requests into the same cache bucket.
 */
function buildNearbySellersKey(lat, lng) {
  const rLat = Number(lat).toFixed(4);
  const rLng = Number(lng).toFixed(4);
  return buildKey("sellers", "nearby", `${rLat}:${rLng}`);
}

export async function getNearbySellerIdsForCustomer(lat, lng) {
  const fetchFn = async () => {
    // 1. Fetch active approved sellers matching 2dsphere near query
    const geoSellers = await Seller.find({
      isActive: true,
      applicationStatus: { $ne: "rejected" },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: MAX_SELLER_SEARCH_DISTANCE_M,
        },
      },
    })
      .select("_id location serviceRadius isOnline isActive storeHours")
      .lean();

    const matchedSellers = [];

    for (const seller of geoSellers) {
      const coords = seller?.location?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const [sellerLng, sellerLat] = coords;
      if (!Number.isFinite(sellerLat) || !Number.isFinite(sellerLng)) continue;

      // Skip invalid [0, 0] coordinates
      if (sellerLng === 0 && sellerLat === 0) continue;

      const distanceKm = calculateDistance(lat, lng, sellerLat, sellerLng);
      const effectiveRadius = Math.max(Number(seller.serviceRadius) || 5, 1);

      if (distanceKm <= effectiveRadius) {
        matchedSellers.push({
          id: String(seller._id),
          distanceKm,
          isOnline: seller.isOnline !== false,
        });
      }
    }

    // Sort sellers: 
    // 1. Online stores first
    // 2. Closest distance first (nearest outlet)
    matchedSellers.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return a.distanceKm - b.distanceKm;
    });

    return matchedSellers.map((s) => s.id);
  };

  return getOrSet(buildNearbySellersKey(lat, lng), fetchFn, getTTL("nearbySellers"));
}

/**
 * Helper to get the single nearest active outlet for customer coordinates
 */
export async function getNearestSellerForCustomer(lat, lng) {
  const nearbyIds = await getNearbySellerIdsForCustomer(lat, lng);
  return nearbyIds.length > 0 ? nearbyIds[0] : null;
}
