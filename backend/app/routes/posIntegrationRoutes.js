import express from "express";
import {
  validatePosApiKey,
  getPosCatalogAndStock,
  syncPosInventoryBatch,
} from "../services/integrations/posIntegrationService.js";
import handleResponse from "../utils/helper.js";

const router = express.Router();

/**
 * Middleware: Verify POS API Key from header `x-pos-api-key`
 */
function requirePosApiKey(req, res, next) {
  const providedKey = req.headers["x-pos-api-key"] || req.query.apiKey;
  if (!validatePosApiKey(providedKey)) {
    return handleResponse(res, 401, "Unauthorized: Invalid or missing POS API Key");
  }
  next();
}

/**
 * GET /api/v1/integrations/pos/inventory
 * Inquire product catalog, SKU mapping, and stock levels.
 */
router.get("/inventory", requirePosApiKey, async (req, res) => {
  try {
    const { sellerId, sku, search, limit, page } = req.query;
    const data = await getPosCatalogAndStock({ sellerId, sku, search, limit, page });
    return handleResponse(res, 200, "POS inventory catalog fetched successfully", data);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
});

/**
 * POST /api/v1/integrations/pos/inventory/sync
 * Idempotent batch stock sync from POS / ERP system.
 */
router.post("/inventory/sync", requirePosApiKey, async (req, res) => {
  try {
    const { externalSyncId, sellerId, updates, source } = req.body;
    const result = await syncPosInventoryBatch({ externalSyncId, sellerId, updates, source });
    return handleResponse(res, 200, "POS inventory sync processed", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
});

export default router;
