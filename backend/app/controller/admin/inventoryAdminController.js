import Product from "../../models/product.js";
import Seller from "../../models/seller.js";
import StockHistory from "../../models/stockHistory.js";
import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { buildSearchRegex } from "../../utils/regex.js";
import { emitNotificationEvent } from "../../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../../modules/notifications/notification.constants.js";
import {
  createLowStockAlertCandidate,
  isLowStockAlertsEnabled,
} from "../../services/lowStockAlertService.js";

/**
 * GET /api/admin/inventory
 * List product stock levels across all stores or filtered by a specific store/seller.
 * Supports pagination, text search, low-stock filter, and store filter.
 */
export const getAdminInventory = async (req, res) => {
  try {
    const { page, limit, sellerId, search, lowStockOnly, status } = req.query;
    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit, 20);

    const filter = {};

    if (sellerId && sellerId !== "all") {
      filter.sellerId = sellerId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const searchRegex = buildSearchRegex(String(search).trim());
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
      ];
    }

    if (String(lowStockOnly) === "true") {
      filter.$expr = { $lte: ["$stock", "$lowStockAlert"] };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(
          "_id name sku price salePrice stock lowStockAlert unit unitValue orderIncrement minOrderQty maxOrderQty isScheduled availableFromTime availableToTime sellerId mainImage status approvalStatus variants"
        )
        .populate("sellerId", "shopName name email phone isActive location")
        .sort({ stock: 1, updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Summary statistics
    const [totalStockCount, lowStockCount, outOfStockCount] = await Promise.all([
      Product.countDocuments(sellerId && sellerId !== "all" ? { sellerId } : {}),
      Product.countDocuments({
        ...(sellerId && sellerId !== "all" ? { sellerId } : {}),
        $expr: { $lte: ["$stock", "$lowStockAlert"] },
      }),
      Product.countDocuments({
        ...(sellerId && sellerId !== "all" ? { sellerId } : {}),
        stock: { $lte: 0 },
      }),
    ]);

    return handleResponse(res, 200, "Inventory fetched successfully", {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      stats: {
        totalProducts: totalStockCount,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
      },
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/admin/inventory/adjust
 * Authorized administrator manual stock adjustment for any store.
 * Creates an auditable StockHistory entry and emits low stock alert if threshold crossed.
 */
export const adjustAdminStock = async (req, res) => {
  try {
    const { productId, sellerId, type, quantity, note, variantSku } = req.body;
    const adminUser = req.user;

    if (!productId) {
      return handleResponse(res, 400, "Product ID is required");
    }

    const query = { _id: productId };
    if (sellerId) {
      query.sellerId = sellerId;
    }

    const product = await Product.findOne(query);
    if (!product) {
      return handleResponse(res, 404, "Product not found");
    }

    const inputQty = Number(quantity);
    if (!Number.isFinite(inputQty)) {
      return handleResponse(res, 400, "Valid numeric quantity is required");
    }

    const previousStock = Number(product.stock || 0);
    let finalStock;
    let diffQty;

    const normalizedType = String(type || "Correction").trim();

    if (normalizedType === "Set Stock" || normalizedType === "Set") {
      finalStock = Math.max(0, inputQty);
      diffQty = finalStock - previousStock;
    } else if (normalizedType === "Restock") {
      finalStock = previousStock + inputQty;
      diffQty = inputQty;
    } else {
      finalStock = previousStock - inputQty;
      diffQty = -inputQty;
    }

    if (finalStock < 0) {
      return handleResponse(res, 400, "Stock cannot be negative");
    }

    const normalizedVariantSku = String(variantSku || "").trim();

    // 1. Update Product Stock (and specific variant if provided)
    product.stock = finalStock;
    if (normalizedVariantSku && Array.isArray(product.variants)) {
      const vIndex = product.variants.findIndex(
        (v) => String(v?.sku || "").trim() === normalizedVariantSku
      );
      if (vIndex > -1) {
        product.variants[vIndex].stock = finalStock;
        product.markModified("variants");
      }
    } else if (Array.isArray(product.variants) && product.variants.length > 0) {
      product.variants.forEach((v) => {
        v.stock = finalStock;
      });
      product.markModified("variants");
    }

    await product.save();

    // 2. Create Stock History Entry with Admin audit attribution
    const adminAuthor = adminUser?.name || adminUser?.email || "Admin";
    const historyEntry = new StockHistory({
      product: product._id,
      seller: product.sellerId,
      type: normalizedType === "Set" ? "Set Stock" : normalizedType,
      quantity: diffQty,
      note: `[Admin: ${adminAuthor}] ${note || `Manual stock adjustment (${normalizedType})`}${
        normalizedVariantSku ? ` [Variant: ${normalizedVariantSku}]` : ""
      }`,
    });

    await historyEntry.save();

    // 3. Emit Low Stock Alert if stock dropped below alert threshold
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

    return handleResponse(res, 200, "Store stock adjusted successfully", {
      newStock: product.stock,
      productId: product._id,
      historyEntry,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/admin/inventory/history
 * Comprehensive stock history audit log view across all stores.
 */
export const getAdminStockHistory = async (req, res) => {
  try {
    const { page, limit, sellerId, productId, type } = req.query;
    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit, 25);

    const filter = {};
    if (sellerId && sellerId !== "all") {
      filter.seller = sellerId;
    }
    if (productId && productId !== "all") {
      filter.product = productId;
    }
    if (type && type !== "all") {
      filter.type = type;
    }

    const [history, total] = await Promise.all([
      StockHistory.find(filter)
        .populate("product", "name sku mainImage unit")
        .populate("seller", "shopName name email")
        .populate("order", "orderId totalAmount")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockHistory.countDocuments(filter),
    ]);

    return handleResponse(res, 200, "Stock history fetched successfully", {
      history: history.map((item) => ({
        id: item._id,
        product: item.product,
        seller: item.seller,
        order: item.order,
        type: item.type,
        quantity: item.quantity,
        note: item.note,
        createdAt: item.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
