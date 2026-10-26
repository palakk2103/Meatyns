import handleResponse from "../utils/helper.js";
import { validateBody as validateWithJoi } from "../middleware/validate.js";
import {
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  checkDeliveryZoneSchema,
} from "../validation/deliveryZoneValidation.js";
import {
  createDeliveryZone,
  updateDeliveryZone,
  listDeliveryZones,
  getDeliveryZoneById,
  toggleDeliveryZoneStatus,
  deleteDeliveryZone,
  resolveDeliveryZoneForLocation,
} from "../services/deliveryZoneService.js";

/**
 * Admin: List delivery zones with search and status filter
 */
export const getDeliveryZonesController = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await listDeliveryZones({ search, status, page, limit });
    return handleResponse(res, 200, "Delivery zones retrieved successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Get single zone details
 */
export const getDeliveryZoneDetailController = async (req, res) => {
  try {
    const zone = await getDeliveryZoneById(req.params.id);
    return handleResponse(res, 200, "Delivery zone retrieved successfully", zone);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Create a new delivery zone
 */
export const createDeliveryZoneController = async (req, res) => {
  try {
    const validated = validateWithJoi(createDeliveryZoneSchema, req.body || {});
    const created = await createDeliveryZone(validated, req.user);
    return handleResponse(res, 201, "Delivery zone created successfully", created);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Update an existing delivery zone
 */
export const updateDeliveryZoneController = async (req, res) => {
  try {
    const validated = validateWithJoi(updateDeliveryZoneSchema, req.body || {});
    const updated = await updateDeliveryZone(req.params.id, validated, req.user);
    return handleResponse(res, 200, "Delivery zone updated successfully", updated);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Toggle active/inactive status
 */
export const toggleDeliveryZoneStatusController = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return handleResponse(res, 400, "isActive boolean property is required");
    }
    const updated = await toggleDeliveryZoneStatus(req.params.id, isActive, req.user);
    return handleResponse(res, 200, `Zone ${isActive ? "activated" : "deactivated"} successfully`, updated);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Delete delivery zone
 */
export const deleteDeliveryZoneController = async (req, res) => {
  try {
    const result = await deleteDeliveryZone(req.params.id, req.user);
    return handleResponse(res, 200, result.message, result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Public/Customer: Check if a given latitude/longitude is within active delivery zones
 */
export const checkLocationZoneController = async (req, res) => {
  try {
    const raw = {
      lat: req.body?.lat ?? req.query?.lat,
      lng: req.body?.lng ?? req.query?.lng,
    };
    const validated = validateWithJoi(checkDeliveryZoneSchema, raw);
    const result = await resolveDeliveryZoneForLocation(validated);
    return handleResponse(res, 200, "Location serviceability evaluated", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
