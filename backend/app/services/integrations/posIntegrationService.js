import Product from "../../models/product.js";
import StockHistory from "../../models/stockHistory.js";
import Seller from "../../models/seller.js";
import {
  createLowStockAlertCandidate,
  isLowStockAlertsEnabled,
} from "../lowStockAlertService.js";
import { emitNotificationEvent } from "../../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../../modules/notifications/notification.constants.js";
import logger from "../logger.js";

/**
 * Validates external POS / ERP authentication header.
 */
export function validatePosApiKey(providedKey) {
  const configuredKey = process.env.POS_INTEGRATION_API_KEY || "meatyns_pos_live_secret";
  if (!providedKey || typeof providedKey !== "string") return false;
  return providedKey.trim() === configuredKey.trim();
}

/**
 * Query current inventory levels for an external POS/ERP system.
 *
 * @param {Object} query - { sellerId, sku, search, page, limit }
 */
export async function getPosCatalogAndStock({
  sellerId = null,
  sku = null,
  search = null,
  limit = 50,
  page = 1,
} = {}) {
  const filter = { status: "active" };

  if (sellerId) {
    filter.sellerId = sellerId;
  }
  if (sku) {
    filter.sku = String(sku).trim();
  }
  if (search) {
    filter.name = { $regex: String(search).trim(), $options: "i" };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("_id name sku price salePrice stock lowStockAlert unit unitValue sellerId variants updatedAt")
      .populate("sellerId", "shopName")
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    items: products.map((p) => ({
      productId: String(p._id),
      sku: p.sku || "",
      name: p.name,
      sellingPrice: p.salePrice > 0 ? p.salePrice : p.price,
      stock: p.stock,
      unit: p.unit || "pack",
      unitValue: p.unitValue || 1,
      lowStockAlert: p.lowStockAlert || 5,
      isLowStock: p.stock <= (p.lowStockAlert || 5),
      storeId: String(p.sellerId?._id || p.sellerId || ""),
      storeName: p.sellerId?.shopName || "Store",
      variants: (p.variants || []).map((v) => ({
        sku: v.sku,
        name: v.name,
        price: v.price,
        stock: v.stock,
      })),
      lastUpdated: p.updatedAt,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

/**
 * Idempotent batch inventory sync from an external POS or ERP system.
 *
 * @param {Object} payload - { externalSyncId, sellerId, updates: [{ sku, productId, quantity, type, note }] }
 */
export async function syncPosInventoryBatch({
  externalSyncId,
  sellerId,
  updates = [],
  source = "POS_SYSTEM",
} = {}) {
  if (!externalSyncId || String(externalSyncId).trim() === "") {
    const err = new Error("externalSyncId is required for idempotent synchronization");
    err.statusCode = 400;
    throw err;
  }

  const cleanSyncId = String(externalSyncId).trim();

  // 1. Idempotency Check: verify if this sync batch has already been executed
  const existingSync = await StockHistory.findOne({
    note: { $regex: `\\[SYNC:${cleanSyncId}\\]` },
  }).lean();

  if (existingSync) {
    logger.info("POS inventory sync skipped: batch already processed", { externalSyncId: cleanSyncId });
    return {
      status: "ALREADY_PROCESSED",
      message: `Sync batch ${cleanSyncId} was already applied`,
      externalSyncId: cleanSyncId,
      processedCount: 0,
      alreadyApplied: true,
    };
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    const err = new Error("updates must be a non-empty array of items to adjust");
    err.statusCode = 400;
    throw err;
  }

  const results = [];
  let processedCount = 0;
  let failedCount = 0;

  for (const item of updates) {
    try {
      const { sku, productId, quantity, type = "Set", note = "" } = item;
      const inputQty = Number(quantity);
      if (!Number.isFinite(inputQty)) {
        throw new Error("Invalid quantity");
      }

      const productQuery = {};
      if (productId) {
        productQuery._id = productId;
      } else if (sku) {
        productQuery.sku = String(sku).trim();
      } else {
        throw new Error("Either productId or sku must be provided");
      }

      if (sellerId) {
        productQuery.sellerId = sellerId;
      }

      const product = await Product.findOne(productQuery);
      if (!product) {
        throw new Error(`Product not found for SKU/ID: ${sku || productId}`);
      }

      const previousStock = Number(product.stock || 0);
      let finalStock;
      let diffQty;

      const normType = String(type).toLowerCase();
      if (normType === "set" || normType === "set stock") {
        finalStock = Math.max(0, inputQty);
        diffQty = finalStock - previousStock;
      } else if (normType === "restock" || normType === "add") {
        finalStock = previousStock + inputQty;
        diffQty = inputQty;
      } else if (normType === "sale" || normType === "deduct") {
        finalStock = Math.max(0, previousStock - inputQty);
        diffQty = -Math.min(previousStock, inputQty);
      } else {
        finalStock = Math.max(0, inputQty);
        diffQty = finalStock - previousStock;
      }

      // Update product stock
      product.stock = finalStock;
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants.forEach((v) => {
          v.stock = finalStock;
        });
        product.markModified("variants");
      }
      await product.save();

      // Log StockHistory entry with externalSyncId tag
      const historyEntry = new StockHistory({
        product: product._id,
        seller: product.sellerId,
        type: normType === "restock" ? "Restock" : normType === "sale" ? "Sale" : "Correction",
        quantity: diffQty,
        note: `[SYNC:${cleanSyncId}] [Source:${source}] ${note || "POS Inventory Sync"}`,
      });
      await historyEntry.save();

      // Alert if low stock
      if (finalStock <= (product.lowStockAlert || 5) && (await isLowStockAlertsEnabled())) {
        const lowStockAlert = createLowStockAlertCandidate({
          product,
          previousStock,
          currentStock: finalStock,
        });
        if (lowStockAlert) {
          emitNotificationEvent(NOTIFICATION_EVENTS.LOW_STOCK_ALERT, lowStockAlert);
        }
      }

      results.push({
        sku: product.sku,
        productId: String(product._id),
        previousStock,
        newStock: finalStock,
        diffQty,
        success: true,
      });
      processedCount++;
    } catch (itemErr) {
      failedCount++;
      results.push({
        item,
        success: false,
        error: itemErr.message,
      });
    }
  }

  return {
    status: "PROCESSED",
    externalSyncId: cleanSyncId,
    processedCount,
    failedCount,
    results,
  };
}
