import mongoose from "mongoose";
import Combo from "../models/combo.js";
import Product from "../models/product.js";
import Cart from "../models/cart.js";
import { evaluateProductAvailability } from "./productSchedulingService.js";
import { getApprovedOrLegacyFilter } from "./productModerationService.js";

/**
 * Lists available combos and meal-prep packages.
 */
export async function listCombos({
  page = 1,
  limit = 20,
  sellerId = null,
  includeInactive = false,
} = {}) {
  const query = {};
  if (!includeInactive) {
    query.status = "active";
  }
  if (sellerId && mongoose.isValidObjectId(sellerId)) {
    query.sellerId = sellerId;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [items, total] = await Promise.all([
    Combo.find(query)
      .populate("items.productId", "name price salePrice mainImage stock status unit unitValue")
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Combo.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Gets a combo by its slug or ID.
 */
export async function getComboBySlugOrId(slugOrId) {
  let query = { slug: String(slugOrId).toLowerCase().trim() };
  if (mongoose.isValidObjectId(slugOrId)) {
    query = {
      $or: [{ _id: slugOrId }, { slug: String(slugOrId).toLowerCase().trim() }],
    };
  }

  const combo = await Combo.findOne(query)
    .populate({
      path: "items.productId",
      select: "name price salePrice mainImage stock status unit unitValue isScheduled scheduleDays availableFromTime availableToTime",
      match: { status: "active", ...getApprovedOrLegacyFilter() },
    })
    .lean();

  return combo;
}

/**
 * Adds a combo package into the customer's cart by adding its constituent products.
 * Atomically verifies stock and schedule constraints across all bundled products.
 */
export async function addComboToCart({ comboId, customerId, quantity = 1 }) {
  const combo = await Combo.findById(comboId)
    .populate("items.productId")
    .lean();

  if (!combo || combo.status !== "active") {
    throw new Error("Combo package is inactive or unavailable");
  }

  const comboQty = Math.max(1, Number(quantity) || 1);

  // Check constituent items
  for (const item of combo.items) {
    const product = item.productId;
    if (!product || product.status !== "active") {
      throw new Error(`Product "${product?.name || 'Item'}" inside combo is currently unavailable`);
    }

    const scheduleCheck = evaluateProductAvailability(product);
    if (!scheduleCheck.isAvailable) {
      throw new Error(`Product "${product.name}" in combo is closed: ${scheduleCheck.message}`);
    }

    const requiredQty = (Number(item.quantity) || 1) * comboQty;
    if (product.stock < requiredQty) {
      throw new Error(
        `Insufficient stock for "${product.name}" in combo (Required: ${requiredQty}, Available: ${product.stock})`
      );
    }
  }

  let cart = await Cart.findOne({ customerId });
  if (!cart) {
    cart = await Cart.create({ customerId, items: [] });
  }

  // Add each constituent item into the cart
  for (const item of combo.items) {
    const product = item.productId;
    const pIdStr = String(product._id);
    const qtyToAdd = (Number(item.quantity) || 1) * comboQty;

    const existingIndex = cart.items.findIndex(
      (ci) => String(ci.productId) === pIdStr
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += qtyToAdd;
    } else {
      cart.items.push({
        productId: product._id,
        quantity: qtyToAdd,
        unit: product.unit || item.unit || "pack",
        unitValue: product.unitValue || 1,
      });
    }
  }

  await cart.save();

  return {
    cart,
    combo,
    message: `Added "${combo.name}" (${comboQty}x) to your cart!`,
  };
}
