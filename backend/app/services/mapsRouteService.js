import { Client } from "@googlemaps/google-maps-services-js";
import polyline from "@mapbox/polyline";
import { getRedisClient } from "../config/redis.js";
import { writeRoutePolyline, getRoutePolyline } from "./firebaseService.js";
import { distanceMeters } from "../utils/geoUtils.js";

const client = new Client({});

const ROUTE_CACHE_TTL_SEC = () =>
  parseInt(process.env.ROUTE_CACHE_TTL_SEC || "900", 10);
const ROUTE_CACHE_MATCH_THRESHOLD_M = () =>
  parseInt(process.env.ROUTE_CACHE_MATCH_THRESHOLD_METERS || "150", 10);

function roundCoord(n) {
  return Math.round(n * 1e5) / 1e5;
}

/** Bump when route payload shape changes (invalidates Redis entries). */
function cacheKey(origin, dest, mode) {
  return `route:v4:${roundCoord(origin.lat)},${roundCoord(origin.lng)}:${roundCoord(dest.lat)},${roundCoord(dest.lng)}:${mode}`;
}

/** Directions step polyline — tolerate string or `{ points }` shapes. */
function stepEncodedPolyline(step) {
  if (!step || typeof step !== "object") return null;
  const p = step.polyline;
  if (typeof p === "string") return p;
  if (p && typeof p.points === "string") return p.points;
  return null;
}

/**
 * `overview_polyline` is heavily simplified: decoded points can be kilometers
 * apart, so maps draw long straight "chords" across blocks (looks like a second
 * route). Prefer merging each step's polyline — full road geometry.
 * Iterates all legs (multi-waypoint routes).
 */
function mergeRouteStepPolylines(route) {
  const legs = route?.legs;
  if (!Array.isArray(legs) || legs.length === 0) return null;
  const coords = [];
  for (const leg of legs) {
    if (!leg?.steps?.length) continue;
    for (const step of leg.steps) {
      const enc = stepEncodedPolyline(step);
      if (!enc || typeof enc !== "string") continue;
      let part;
      try {
        part = polyline.decode(enc);
      } catch {
        continue;
      }
      if (!Array.isArray(part) || part.length === 0) continue;
      for (const pair of part) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        if (coords.length === 0) {
          coords.push(pair);
          continue;
        }
        const prev = coords[coords.length - 1];
        if (prev[0] === pair[0] && prev[1] === pair[1]) continue;
        coords.push(pair);
      }
    }
  }
  if (coords.length < 2) return null;
  try {
    return polyline.encode(coords);
  } catch {
    return null;
  }
}

/**
 * Returns { polyline, bounds, distanceMeters } from Directions API with Redis cache.
 */
function degradedPayload() {
  return { polyline: null, bounds: null, distanceMeters: null, duration: null, degraded: true };
}

function hasValidPoint(point) {
  return (
    point &&
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

function isRouteCacheCompatible(cached, origin, dest, phase, mode) {
  if (!cached?.polyline) return false;
  if ((cached.phase || "pickup") !== phase) return false;
  if ((cached.mode || "driving") !== mode) return false;
  if (!hasValidPoint(origin) || !hasValidPoint(dest)) return false;
  if (!hasValidPoint(cached.origin) || !hasValidPoint(cached.destination)) {
    return false;
  }

  const originDrift = distanceMeters(
    origin.lat,
    origin.lng,
    cached.origin.lat,
    cached.origin.lng,
  );
  const destDrift = distanceMeters(
    dest.lat,
    dest.lng,
    cached.destination.lat,
    cached.destination.lng,
  );

  const threshold = Math.max(25, ROUTE_CACHE_MATCH_THRESHOLD_M());
  return originDrift <= threshold && destDrift <= threshold;
}

/**
 * The ONE distance used to price a delivery (delivery option cards, bill and
 * placed order must all agree): road distance from the shop to the customer,
 * never shorter than the straight line, which is also the fallback.
 */
export async function getDeliveryDistanceKm(shop, customer) {
  const aerialKm = distanceMeters(shop.lat, shop.lng, customer.lat, customer.lng) / 1000;
  const roadMeters = await getRoadDistanceMeters(shop, customer);
  return Number(Math.max(roadMeters ? roadMeters / 1000 : 0, aerialKm).toFixed(3));
}

/**
 * Driving (road) distance in meters between two points, for delivery pricing.
 * Cached in Redis (coords rounded to ~1 m). Returns null on any failure so the
 * caller can fall back to the straight-line distance.
 */
export async function getRoadDistanceMeters(origin, dest) {
  if (!hasValidPoint(origin) || !hasValidPoint(dest)) return null;

  const redis = getRedisClient();
  const key = `roaddist:v1:${roundCoord(origin.lat)},${roundCoord(origin.lng)}:${roundCoord(dest.lat)},${roundCoord(dest.lng)}`;
  if (redis) {
    try {
      const cached = await redis.get(key);
      const n = Number(cached);
      if (cached && Number.isFinite(n) && n > 0) return n;
    } catch {
      /* ignore */
    }
  }

  // Provider chain: Google Routes API (when enabled on the key) -> OSRM
  // (free, OpenStreetMap roads). A failed provider is skipped for a while.
  let meters = await googleRoutesDistanceMeters(origin, dest);
  if (meters == null) meters = await osrmDistanceMeters(origin, dest);
  if (meters == null) return null;

  if (redis) {
    try {
      await redis.set(key, String(meters), "EX", 24 * 60 * 60);
    } catch {
      /* ignore */
    }
  }
  return meters;
}

let googleRoutesDisabledUntil = 0;

async function googleRoutesDistanceMeters(origin, dest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (!apiKey || Date.now() < googleRoutesDisabledUntil) return null;
  try {
    const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: "DRIVE",
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) {
      // API not enabled / key restricted: don't retry on every checkout.
      googleRoutesDisabledUntil = Date.now() + 10 * 60 * 1000;
      return null;
    }
    const data = await resp.json();
    const m = data?.routes?.[0]?.distanceMeters;
    return Number.isFinite(m) && m > 0 ? m : null;
  } catch {
    return null;
  }
}

async function osrmDistanceMeters(origin, dest) {
  const base = (process.env.OSRM_BASE_URL || "https://router.project-osrm.org").replace(/\/$/, "");
  try {
    const resp = await fetch(
      `${base}/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const m = data?.routes?.[0]?.distance;
    return data?.code === "Ok" && Number.isFinite(m) && m > 0 ? m : null;
  } catch {
    return null;
  }
}

/**
 * Returns { polyline, bounds, distanceMeters, degraded } from Directions API with Redis + Firebase cache.
 * Requires GOOGLE_MAPS_API_KEY and Directions API enabled in Google Cloud (billing on).
 * Does not cache failed or empty routes so fixing the key takes effect immediately.
 * 
 * @param {Object} origin - { lat, lng }
 * @param {Object} dest - { lat, lng }
 * @param {string} mode - "driving" | "walking" | "bicycling" | "transit"
 * @param {string} orderId - Optional order ID for Firebase caching
 * @param {string} phase - "pickup" | "delivery"
 */
export async function getCachedRoute(origin, dest, mode = "driving", orderId = null, phase = "pickup") {
  // Try Firebase cache first if orderId is provided
  if (orderId) {
    try {
      const firebaseRoute = await getRoutePolyline(orderId);
      const cachedPhase = firebaseRoute?.phase || "pickup";
      if (isRouteCacheCompatible(firebaseRoute, origin, dest, phase, mode)) {
        return {
          polyline: firebaseRoute.polyline,
          bounds: firebaseRoute.bounds,
          distanceMeters: firebaseRoute.distance,
          duration: firebaseRoute.duration,
          degraded: false,
          source: 'firebase',
          phase: cachedPhase,
        };
      }
    } catch {
      /* ignore firebase cache errors */
    }
  }

  // Try Redis cache
  const redis = getRedisClient();
  const key = cacheKey(origin, dest, mode);
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.polyline && !parsed.degraded) {
          return { ...parsed, source: 'redis', phase };
        }
      }
    } catch {
      /* ignore */
    }
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (!apiKey) {
    return degradedPayload();
  }

  try {
    const resp = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${dest.lat},${dest.lng}`,
        mode,
        key: apiKey,
      },
      timeout: 10000,
    });

    const status = resp.data?.status;
    if (status && status !== "OK") {
      return degradedPayload();
    }

    const route = resp.data.routes?.[0];
    const leg = route?.legs?.[0];
    const mergedFromSteps = mergeRouteStepPolylines(route);
    const polyline =
      mergedFromSteps || route?.overview_polyline?.points || null;
    const distanceMeters = leg?.distance?.value ?? null;
    const duration = leg?.duration?.value ?? null;

    if (!polyline) {
      return degradedPayload();
    }

    const payload = {
      polyline,
      bounds: route?.bounds || null,
      distanceMeters,
      duration,
      degraded: false,
      source: 'api',
      phase,
    };

    // Cache in Redis
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(payload), "EX", ROUTE_CACHE_TTL_SEC());
      } catch {
        /* ignore */
      }
    }

    // Cache in Firebase if orderId is provided
    if (orderId) {
      try {
        await writeRoutePolyline(orderId, {
          polyline,
          phase,
          origin,
          destination: dest,
          mode,
          bounds: route?.bounds || null,
          distance: distanceMeters,
          duration,
        });
      } catch {
        /* ignore firebase write errors */
      }
    }

    return payload;
  } catch {
    return degradedPayload();
  }
}
