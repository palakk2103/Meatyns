import mongoose from "mongoose";
import FlashDeal from "../models/flashDeal.js";
import Product from "../models/product.js";
import Order from "../models/order.js";

/**
 * Get the currently active flash deal with populated product details.
 */
export async function getActiveFlashDeal({ now = new Date() } = {}) {
  const deal = await FlashDeal.findOne({
    status: "active",
    startTime: { $lte: now },
    endTime: { $gt: now },
  })
    .sort({ endTime: 1 })
    .populate({
      path: "products.productId",
      select: "_id name slug price salePrice mainImage stock status approvalStatus categoryId headerId",
    })
    .lean();

  if (!deal) return null;

  // Filter out any products that were deleted or inactive
  const validProducts = (deal.products || []).filter(
    (p) => p.productId && p.productId.status === "active"
  );

  return {
    ...deal,
    products: validProducts,
  };
}

/**
 * Get active flash deal pricing for a specific product ID if currently active.
 */
export async function getActiveDealForProduct(productId, { now = new Date() } = {}) {
  if (!productId) return null;

  const deal = await FlashDeal.findOne({
    status: "active",
    startTime: { $lte: now },
    endTime: { $gt: now },
    "products.productId": new mongoose.Types.ObjectId(String(productId)),
  })
    .sort({ endTime: 1 })
    .lean();

  if (!deal) return null;

  const matchedProduct = deal.products.find(
    (p) => String(p.productId) === String(productId)
  );

  if (!matchedProduct) return null;

  return {
    dealId: deal._id,
    dealTitle: deal.title,
    flashPrice: matchedProduct.flashPrice,
    originalPrice: matchedProduct.originalPrice,
    dealStock: matchedProduct.dealStock,
    soldCount: matchedProduct.soldCount,
    maxQtyPerCustomer: deal.maxQtyPerCustomer || 2,
    startTime: deal.startTime,
    endTime: deal.endTime,
  };
}

/**
 * Validate customer purchase limits for a flash deal product during checkout.
 * Checks non-cancelled orders for customer to prevent bypassing max per-customer limits.
 */
export async function validateCustomerDealLimit({
  customerId,
  productId,
  requestedQty,
  session = null,
  now = new Date(),
}) {
  const dealInfo = await getActiveDealForProduct(productId, { now });
  if (!dealInfo) {
    return { isFlashDeal: false };
  }

  const maxLimit = dealInfo.maxQtyPerCustomer || 2;
  const requested = Number(requestedQty) || 1;

  if (requested > maxLimit) {
    const err = new Error(
      `Purchase limit exceeded for flash deal on this item (Max ${maxLimit} per order).`
    );
    err.statusCode = 400;
    throw err;
  }

  if (customerId) {
    // Check previous orders placed during this deal window
    const orderQuery = Order.find({
      customer: customerId,
      status: { $nin: ["cancelled", "payment_failed"] },
      createdAt: { $gte: dealInfo.startTime, $lte: dealInfo.endTime },
      "items.product": new mongoose.Types.ObjectId(String(productId)),
    }).select("items");

    if (session) orderQuery.session(session);
    const pastOrders = await orderQuery.lean();

    let pastPurchasedQty = 0;
    for (const ord of pastOrders) {
      for (const item of ord.items || []) {
        if (String(item.product) === String(productId)) {
          pastPurchasedQty += Number(item.quantity || 0);
        }
      }
    }

    if (pastPurchasedQty + requested > maxLimit) {
      const remainingAllowed = Math.max(0, maxLimit - pastPurchasedQty);
      const err = new Error(
        `You have already purchased ${pastPurchasedQty} of this flash deal item. Limit is ${maxLimit} per customer (${remainingAllowed} remaining).`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  return {
    isFlashDeal: true,
    dealInfo,
  };
}

/**
 * Admin: List flash deals with pagination, search, and status filter
 */
export async function listFlashDeals({
  page = 1,
  limit = 20,
  status = "all",
  search = "",
} = {}) {
  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (search && search.trim()) {
    query.title = { $regex: search.trim(), $options: "i" };
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const [deals, total] = await Promise.all([
    FlashDeal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .populate("products.productId", "name slug price salePrice mainImage stock")
      .populate("createdBy", "name email")
      .lean(),
    FlashDeal.countDocuments(query),
  ]);

  return {
    items: deals,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1,
  };
}

/**
 * Admin: Create a new flash deal
 */
export async function createFlashDeal(data, adminId) {
  const {
    title,
    description,
    discountType = "percentage",
    discountValue = 0,
    products = [],
    startTime,
    endTime,
    status = "active",
    maxQtyPerCustomer = 2,
    totalDealCap,
  } = data;

  if (!title || !title.trim()) {
    const err = new Error("Deal title is required");
    err.statusCode = 400;
    throw err;
  }

  if (!startTime || !endTime) {
    const err = new Error("Start time and end time are required");
    err.statusCode = 400;
    throw err;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error("Invalid start or end time format");
    err.statusCode = 400;
    throw err;
  }

  if (end <= start) {
    const err = new Error("End time must be strictly after start time");
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(products) || products.length === 0) {
    const err = new Error("At least one product must be selected for the deal");
    err.statusCode = 400;
    throw err;
  }

  // Verify products exist and prepare items
  const productIds = products.map((p) => p.productId || p._id || p.id).filter(Boolean);
  const existingProducts = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(existingProducts.map((p) => [String(p._id), p]));

  const validatedProducts = [];
  for (const item of products) {
    const pId = String(item.productId || item._id || item.id);
    const prod = productMap.get(pId);
    if (!prod) {
      const err = new Error(`Product not found with ID: ${pId}`);
      err.statusCode = 400;
      throw err;
    }

    const regPrice = Number(prod.price || 0);
    let flashPrice = Number(item.flashPrice);

    if (!Number.isFinite(flashPrice) || flashPrice <= 0) {
      // Calculate based on discountValue if not explicit
      if (discountType === "percentage" && discountValue > 0) {
        flashPrice = Math.max(1, Math.round(regPrice * (1 - discountValue / 100)));
      } else if (discountType === "fixed" && discountValue > 0) {
        flashPrice = Math.max(1, Math.round(regPrice - discountValue));
      } else {
        flashPrice = Number(prod.salePrice || prod.price);
      }
    }

    if (flashPrice >= regPrice && regPrice > 0) {
      const err = new Error(
        `Flash price (₹${flashPrice}) must be lower than regular price (₹${regPrice}) for ${prod.name}`
      );
      err.statusCode = 400;
      throw err;
    }

    validatedProducts.push({
      productId: prod._id,
      flashPrice,
      originalPrice: regPrice,
      dealStock: Number(item.dealStock) || 50,
      soldCount: 0,
    });
  }

  const deal = await FlashDeal.create({
    title: title.trim(),
    description: description ? description.trim() : "",
    discountType,
    discountValue: Number(discountValue) || 0,
    products: validatedProducts,
    startTime: start,
    endTime: end,
    status,
    maxQtyPerCustomer: Math.max(1, Number(maxQtyPerCustomer) || 2),
    totalDealCap: totalDealCap ? Number(totalDealCap) : undefined,
    createdBy: adminId || null,
  });

  return deal;
}

/**
 * Admin: Update flash deal
 */
export async function updateFlashDeal(dealId, data) {
  const deal = await FlashDeal.findById(dealId);
  if (!deal) {
    const err = new Error("Flash deal not found");
    err.statusCode = 404;
    throw err;
  }

  if (data.title !== undefined) deal.title = String(data.title).trim();
  if (data.description !== undefined) deal.description = String(data.description).trim();
  if (data.status !== undefined) deal.status = data.status;
  if (data.maxQtyPerCustomer !== undefined) deal.maxQtyPerCustomer = Math.max(1, Number(data.maxQtyPerCustomer) || 2);
  if (data.discountType !== undefined) deal.discountType = data.discountType;
  if (data.discountValue !== undefined) deal.discountValue = Number(data.discountValue) || 0;

  if (data.startTime) {
    const start = new Date(data.startTime);
    if (!isNaN(start.getTime())) deal.startTime = start;
  }

  if (data.endTime) {
    const end = new Date(data.endTime);
    if (!isNaN(end.getTime())) deal.endTime = end;
  }

  if (deal.endTime <= deal.startTime) {
    const err = new Error("End time must be strictly after start time");
    err.statusCode = 400;
    throw err;
  }

  if (Array.isArray(data.products) && data.products.length > 0) {
    const productIds = data.products.map((p) => p.productId || p._id || p.id).filter(Boolean);
    const existingProducts = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(existingProducts.map((p) => [String(p._id), p]));

    const validated = [];
    for (const item of data.products) {
      const pId = String(item.productId || item._id || item.id);
      const prod = productMap.get(pId);
      if (!prod) continue;

      const regPrice = Number(prod.price || 0);
      const flashPrice = Number(item.flashPrice || prod.salePrice || prod.price);

      validated.push({
        productId: prod._id,
        flashPrice,
        originalPrice: regPrice,
        dealStock: Number(item.dealStock) || 50,
        soldCount: Number(item.soldCount) || 0,
      });
    }
    if (validated.length > 0) {
      deal.products = validated;
    }
  }

  await deal.save();
  return deal;
}

/**
 * Admin: Toggle flash deal active/inactive status
 */
export async function toggleFlashDealStatus(dealId, newStatus) {
  const deal = await FlashDeal.findById(dealId);
  if (!deal) {
    const err = new Error("Flash deal not found");
    err.statusCode = 404;
    throw err;
  }

  const validStatuses = ["draft", "active", "inactive", "expired"];
  if (!validStatuses.includes(newStatus)) {
    const err = new Error(`Invalid status: ${newStatus}`);
    err.statusCode = 400;
    throw err;
  }

  deal.status = newStatus;
  await deal.save();
  return deal;
}
