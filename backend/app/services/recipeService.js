import mongoose from "mongoose";
import Recipe from "../models/recipe.js";
import Product from "../models/product.js";
import Cart from "../models/cart.js";
import { evaluateProductAvailability } from "./productSchedulingService.js";
import { getApprovedOrLegacyFilter } from "./productModerationService.js";

/**
 * Lists public active recipes with optional category, search, and pagination.
 */
export async function listRecipes({
  page = 1,
  limit = 20,
  category = null,
  difficulty = null,
  search = null,
  includeInactive = false,
} = {}) {
  const query = {};
  if (!includeInactive) {
    query.status = "active";
  }
  if (category) {
    query.category = new RegExp(category, "i");
  }
  if (difficulty) {
    query.difficulty = difficulty;
  }
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [items, total] = await Promise.all([
    Recipe.find(query)
      .populate("ingredients.productId", "name price salePrice mainImage stock status unit unitValue")
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Recipe.countDocuments(query),
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
 * Gets a single recipe by its slug or ObjectId.
 */
export async function getRecipeBySlugOrId(slugOrId) {
  let query = { slug: String(slugOrId).toLowerCase().trim() };
  if (mongoose.isValidObjectId(slugOrId)) {
    query = {
      $or: [{ _id: slugOrId }, { slug: String(slugOrId).toLowerCase().trim() }],
    };
  }

  const recipe = await Recipe.findOne(query)
    .populate({
      path: "ingredients.productId",
      select: "name price salePrice mainImage stock status unit unitValue isScheduled scheduleDays availableFromTime availableToTime",
      match: { status: "active", ...getApprovedOrLegacyFilter() },
    })
    .lean();

  return recipe;
}

/**
 * Adds selected recipe ingredients directly into the customer's cart.
 * Preserves existing cart items; validates stock and availability.
 */
export async function addRecipeIngredientsToCart({
  recipeId,
  customerId,
  selectedProductIds = [], // Array of product ObjectIds selected by customer
}) {
  const recipe = await Recipe.findById(recipeId)
    .populate("ingredients.productId")
    .lean();

  if (!recipe) throw new Error("Recipe not found");

  let cart = await Cart.findOne({ customerId });
  if (!cart) {
    cart = await Cart.create({ customerId, items: [] });
  }

  const addedItems = [];
  const skippedItems = [];

  // Filter ingredients that have a mapped product
  const mappedIngredients = recipe.ingredients.filter(
    (ing) => ing.productId && ing.productId._id
  );

  for (const ing of mappedIngredients) {
    const product = ing.productId;
    const pIdStr = String(product._id);

    // If customer passed explicit selection list, only add selected items
    if (
      Array.isArray(selectedProductIds) &&
      selectedProductIds.length > 0 &&
      !selectedProductIds.some((id) => String(id) === pIdStr)
    ) {
      continue;
    }

    if (product.status !== "active") {
      skippedItems.push({ name: ing.name, reason: "Product inactive" });
      continue;
    }

    const scheduleCheck = evaluateProductAvailability(product);
    if (!scheduleCheck.isAvailable) {
      skippedItems.push({
        name: ing.name,
        reason: `Currently unavailable (${scheduleCheck.message})`,
      });
      continue;
    }

    const qtyToAdd = Math.max(0.01, Number(ing.quantity) || 1);
    if (product.stock < qtyToAdd) {
      skippedItems.push({ name: ing.name, reason: "Out of stock" });
      continue;
    }

    // Check if item already exists in cart
    const existingIndex = cart.items.findIndex(
      (item) => String(item.productId) === pIdStr
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += qtyToAdd;
    } else {
      cart.items.push({
        productId: product._id,
        quantity: qtyToAdd,
        unit: product.unit || "pack",
        unitValue: product.unitValue || 1,
      });
    }

    addedItems.push({
      productId: product._id,
      name: product.name,
      quantity: qtyToAdd,
      price: product.salePrice > 0 ? product.salePrice : product.price,
    });
  }

  if (addedItems.length > 0) {
    await cart.save();
  }

  return {
    cart,
    addedItems,
    skippedItems,
    message: `Added ${addedItems.length} ingredients to cart.${
      skippedItems.length ? ` (${skippedItems.length} items unavailable)` : ""
    }`,
  };
}
