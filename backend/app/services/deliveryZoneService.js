import DeliveryZone from "../models/deliveryZone.js";
import Order from "../models/order.js";
import { validateAndNormalizePolygon, isPointInPolygon } from "../utils/polygonValidator.js";

/**
 * Normalizes customer coordinates into { lat, lng } numbers.
 */
export function normalizeCustomerLocation(loc) {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude ?? (Array.isArray(loc) ? loc[1] : null));
  const lng = Number(loc.lng ?? loc.longitude ?? (Array.isArray(loc) ? loc[0] : null));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/**
 * Resolves whether a given customer location falls within an active polygon delivery zone.
 * 
 * Rules:
 * 1. If NO active delivery zones exist in the system, returns { isServiceable: true, fallbackToRadius: true }.
 *    This preserves 100% backward compatibility for environments before zones are drawn.
 * 2. If active delivery zones DO exist, customer location MUST fall within at least one active zone.
 * 3. Overlapping zones are resolved deterministically:
 *    - Highest priority (DESC)
 *    - Lowest deliveryFee override (ASC)
 *    - Most recently updated (DESC)
 * 
 * @param {{ lat: number, lng: number }} location 
 * @returns {Promise<{ isServiceable: boolean, reason: string | null, zone: object | null, fallbackToRadius: boolean }>}
 */
export async function resolveDeliveryZoneForLocation(location) {
  const normLoc = normalizeCustomerLocation(location);
  if (!normLoc) {
    return {
      isServiceable: false,
      reason: "Delivery location coordinates are missing or invalid.",
      zone: null,
      fallbackToRadius: false,
    };
  }

  // 1. Check if any active zones exist in database
  const activeZonesCount = await DeliveryZone.countDocuments({
    isActive: true,
    isDeleted: { $ne: true },
  }).exec();

  if (activeZonesCount === 0) {
    // Backward compatibility mode: fallback to seller radius check
    return {
      isServiceable: true,
      reason: null,
      zone: null,
      fallbackToRadius: true,
    };
  }

  // 2. Query MongoDB 2dsphere $geoIntersects
  let matchingZones = [];
  try {
    matchingZones = await DeliveryZone.find({
      isActive: true,
      isDeleted: { $ne: true },
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [normLoc.lng, normLoc.lat], // GeoJSON format: [lng, lat]
          },
        },
      },
    })
      .sort({ priority: -1, deliveryFee: 1, updatedAt: -1 })
      .lean()
      .exec();
  } catch (mongoErr) {
    // Fallback to in-memory point-in-polygon verification if spatial index unavailable (e.g. in test envs)
    const allActive = await DeliveryZone.find({
      isActive: true,
      isDeleted: { $ne: true },
    })
      .sort({ priority: -1, deliveryFee: 1, updatedAt: -1 })
      .lean()
      .exec();

    matchingZones = allActive.filter((zone) =>
      isPointInPolygon([normLoc.lng, normLoc.lat], zone.polygon?.coordinates)
    );
  }

  if (matchingZones.length > 0) {
    const selectedZone = matchingZones[0];
    return {
      isServiceable: true,
      reason: null,
      zone: selectedZone,
      fallbackToRadius: false,
    };
  }

  // Active zones exist, but customer location is outside all of them
  return {
    isServiceable: false,
    reason: "Your delivery address is outside our serviceable delivery zones.",
    zone: null,
    fallbackToRadius: false,
  };
}

/**
 * Admin: Create a new delivery zone.
 */
export async function createDeliveryZone(zoneData, adminUser = null) {
  const name = String(zoneData.name || "").trim();
  if (!name || name.length < 2) {
    const err = new Error("Zone name is required (minimum 2 characters).");
    err.statusCode = 400;
    throw err;
  }

  const existing = await DeliveryZone.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
    isDeleted: { $ne: true },
  }).lean();

  if (existing) {
    const err = new Error(`A delivery zone named '${name}' already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const { valid, error: validationError, normalizedCoordinates } = validateAndNormalizePolygon(
    zoneData.polygon?.coordinates || zoneData.coordinates
  );

  if (!valid) {
    const err = new Error(`Invalid polygon geometry: ${validationError}`);
    err.statusCode = 400;
    throw err;
  }

  const zone = new DeliveryZone({
    name,
    description: String(zoneData.description || "").trim(),
    polygon: {
      type: "Polygon",
      coordinates: normalizedCoordinates,
    },
    isActive: zoneData.isActive !== false,
    priority: Number(zoneData.priority || 0),
    deliveryFee: zoneData.deliveryFee != null && zoneData.deliveryFee !== ""
      ? Math.max(0, Number(zoneData.deliveryFee))
      : null,
    minOrderValue: zoneData.minOrderValue != null && zoneData.minOrderValue !== ""
      ? Math.max(0, Number(zoneData.minOrderValue))
      : null,
    expressAvailable: zoneData.expressAvailable !== false,
    surcharge: Math.max(0, Number(zoneData.surcharge || 0)),
    createdBy: adminUser?._id || adminUser?.id || null,
    updatedBy: adminUser?._id || adminUser?.id || null,
  });

  await zone.save();
  return zone.toObject();
}

/**
 * Admin: Update an existing delivery zone.
 */
export async function updateDeliveryZone(id, zoneData, adminUser = null) {
  const zone = await DeliveryZone.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!zone) {
    const err = new Error("Delivery zone not found.");
    err.statusCode = 404;
    throw err;
  }

  if (zoneData.name) {
    const name = String(zoneData.name).trim();
    if (name.length < 2) {
      const err = new Error("Zone name must be at least 2 characters.");
      err.statusCode = 400;
      throw err;
    }
    const duplicate = await DeliveryZone.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name}$`, "i") },
      isDeleted: { $ne: true },
    }).lean();

    if (duplicate) {
      const err = new Error(`Another delivery zone named '${name}' already exists.`);
      err.statusCode = 409;
      throw err;
    }
    zone.name = name;
  }

  if (zoneData.description !== undefined) {
    zone.description = String(zoneData.description || "").trim();
  }

  if (zoneData.polygon?.coordinates || zoneData.coordinates) {
    const coords = zoneData.polygon?.coordinates || zoneData.coordinates;
    const { valid, error: validationError, normalizedCoordinates } = validateAndNormalizePolygon(coords);
    if (!valid) {
      const err = new Error(`Invalid polygon geometry: ${validationError}`);
      err.statusCode = 400;
      throw err;
    }
    zone.polygon = {
      type: "Polygon",
      coordinates: normalizedCoordinates,
    };
  }

  if (zoneData.isActive !== undefined) {
    zone.isActive = Boolean(zoneData.isActive);
  }

  if (zoneData.priority !== undefined) {
    zone.priority = Number(zoneData.priority || 0);
  }

  if (zoneData.deliveryFee !== undefined) {
    zone.deliveryFee = zoneData.deliveryFee != null && zoneData.deliveryFee !== ""
      ? Math.max(0, Number(zoneData.deliveryFee))
      : null;
  }

  if (zoneData.minOrderValue !== undefined) {
    zone.minOrderValue = zoneData.minOrderValue != null && zoneData.minOrderValue !== ""
      ? Math.max(0, Number(zoneData.minOrderValue))
      : null;
  }

  if (zoneData.expressAvailable !== undefined) {
    zone.expressAvailable = Boolean(zoneData.expressAvailable);
  }

  if (zoneData.surcharge !== undefined) {
    zone.surcharge = Math.max(0, Number(zoneData.surcharge || 0));
  }

  zone.updatedBy = adminUser?._id || adminUser?.id || null;
  await zone.save();
  return zone.toObject();
}

/**
 * Admin: List delivery zones with pagination & filtering.
 */
export async function listDeliveryZones({ search = "", status = "all", page = 1, limit = 50 } = {}) {
  const query = { isDeleted: { $ne: true } };

  if (search) {
    query.name = { $regex: String(search).trim(), $options: "i" };
  }

  if (status === "active") {
    query.isActive = true;
  } else if (status === "inactive") {
    query.isActive = false;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [zones, total] = await Promise.all([
    DeliveryZone.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean(),
    DeliveryZone.countDocuments(query),
  ]);

  return {
    zones,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)) || 1,
  };
}

/**
 * Admin: Get single zone by ID.
 */
export async function getDeliveryZoneById(id) {
  const zone = await DeliveryZone.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .lean();

  if (!zone) {
    const err = new Error("Delivery zone not found.");
    err.statusCode = 404;
    throw err;
  }
  return zone;
}

/**
 * Admin: Toggle active/inactive status.
 */
export async function toggleDeliveryZoneStatus(id, isActive, adminUser = null) {
  const zone = await DeliveryZone.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!zone) {
    const err = new Error("Delivery zone not found.");
    err.statusCode = 404;
    throw err;
  }

  zone.isActive = Boolean(isActive);
  zone.updatedBy = adminUser?._id || adminUser?.id || null;
  await zone.save();
  return zone.toObject();
}

/**
 * Admin: Delete delivery zone.
 * Uses soft delete to prevent breaking historical records if orders are attached.
 */
export async function deleteDeliveryZone(id, adminUser = null) {
  const zone = await DeliveryZone.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!zone) {
    const err = new Error("Delivery zone not found.");
    err.statusCode = 404;
    throw err;
  }

  // Soft delete to protect data integrity and historical orders
  zone.isDeleted = true;
  zone.isActive = false;
  zone.updatedBy = adminUser?._id || adminUser?.id || null;
  await zone.save();

  return { success: true, message: `Delivery zone '${zone.name}' has been deleted.` };
}
