import mongoose from "mongoose";
import Product from "../../models/product.js";
import Category from "../../models/category.js";
import FlashDeal from "../../models/flashDeal.js";
import {
  PRODUCT_APPROVAL_STATUS,
  resolveProductApprovalStatus,
} from "../productModerationService.js";
import {
  COMMISSION_FIXED_RULE,
  COMMISSION_TYPE,
  DELIVERY_PRICING_MODE,
  HANDLING_FEE_STRATEGY,
  HANDLING_FEE_TYPE,
  isWalletRedemptionReducesPayableEnabled,
} from "../../constants/finance.js";
import {
  addMoney,
  ceilKm,
  clampMoney,
  percentOf,
  roundCurrency,
} from "../../utils/money.js";
import { getOrCreateFinanceSettings } from "./financeSettingsService.js";
import { evaluateProductAvailability } from "../productSchedulingService.js";

function parseWeightToGramsOrUnits(name) {
  if (!name) return { value: 1, unit: "unit" };
  const cleanName = name.toLowerCase().trim();
  const match = cleanName.match(/^([\d.]+)\s*(kg|g|pack|packet|pc|pcs|unit|ltr|ml)?/);
  if (!match) return { value: 1, unit: "unit" };
  const value = parseFloat(match[1]) || 1;
  const unit = match[2] || "unit";
  if (unit === "kg") return { value: value * 1000, unit: "g" };
  if (unit === "ltr") return { value: value * 1000, unit: "ml" };
  return { value, unit };
}

function toObjectIdString(value) {
  if (!value || value === "undefined" || value === "null") return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function normalizeLineQuantity(quantity) {
  const q = Number(quantity || 0);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return Number(q.toFixed(3));
}

function normalizeLinePrice(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? clampMoney(amount, 0) : 0;
}

export function resolveTieredUnitPrice(baseUnitPrice, tiers, quantity) {
  const normBase = normalizeLinePrice(baseUnitPrice);
  const q = Number(quantity || 0);
  if (!Array.isArray(tiers) || tiers.length === 0 || q <= 0) {
    return { unitPrice: normBase, appliedTier: null };
  }

  const eligible = tiers
    .filter((t) => t && Number(t.minQty) > 0 && Number(t.minQty) <= q)
    .sort((a, b) => Number(b.minQty) - Number(a.minQty));

  if (eligible.length === 0) {
    return { unitPrice: normBase, appliedTier: null };
  }

  const bestTier = eligible[0];
  let tieredPrice = normBase;

  const fixedUnitPrice = Number(bestTier.fixedUnitPrice || 0);
  const discountPct = Number(bestTier.discountPercentage || 0);

  if (fixedUnitPrice > 0) {
    tieredPrice = normalizeLinePrice(fixedUnitPrice);
  } else if (discountPct > 0) {
    const clampedPct = Math.min(Math.max(discountPct, 0), 100);
    tieredPrice = roundCurrency(normBase * (1 - clampedPct / 100));
  }

  tieredPrice = clampMoney(tieredPrice, 0, normBase);

  return {
    unitPrice: tieredPrice,
    appliedTier: {
      minQty: Number(bestTier.minQty),
      discountPercentage: discountPct,
      fixedUnitPrice,
    },
  };
}

function resolveCommissionConfig(category) {
  if (!category) {
    return {
      type: COMMISSION_TYPE.PERCENTAGE,
      value: 0,
      fixedRule: COMMISSION_FIXED_RULE.PER_QTY,
    };
  }

  const type = category.adminCommissionType || COMMISSION_TYPE.PERCENTAGE;

  // Backward-compat: admin UI still writes legacy `adminCommission` while newer
  // pricing reads `adminCommissionValue`. Because `adminCommissionValue` has a
  // schema default of 0 and updates can bypass save hooks, we treat a zero
  // `adminCommissionValue` as "unset" when legacy is non-zero.
  const legacyAdminCommission = Number(category.adminCommission ?? 0);
  const primaryAdminCommission = Number(category.adminCommissionValue);
  const resolvedRaw =
    category.adminCommissionValue == null ||
    (!Number.isFinite(primaryAdminCommission) ||
      (primaryAdminCommission === 0 && legacyAdminCommission > 0))
      ? legacyAdminCommission
      : primaryAdminCommission;
  const value = Number(resolvedRaw ?? 0);
  const fixedRule =
    category.adminCommissionFixedRule || COMMISSION_FIXED_RULE.PER_QTY;

  return {
    type,
    value: Number.isFinite(value) ? Math.max(value, 0) : 0,
    fixedRule,
  };
}

function resolveHandlingConfig(category) {
  if (!category) {
    return { type: HANDLING_FEE_TYPE.NONE, value: 0 };
  }

  const type =
    category.handlingFeeType ||
    (Number(category.handlingFees || 0) > 0
      ? HANDLING_FEE_TYPE.FIXED
      : HANDLING_FEE_TYPE.NONE);

  // Backward-compat: admin UI writes legacy `handlingFees` while pricing reads
  // `handlingFeeValue`. Since `handlingFeeValue` defaults to 0, treat it as
  // unset when legacy is non-zero.
  const legacyHandlingFees = Number(category.handlingFees ?? 0);
  const primaryHandlingValue = Number(category.handlingFeeValue);
  const resolvedRaw =
    category.handlingFeeValue == null ||
    (!Number.isFinite(primaryHandlingValue) ||
      (primaryHandlingValue === 0 && legacyHandlingFees > 0))
      ? legacyHandlingFees
      : primaryHandlingValue;
  const value = Number(resolvedRaw ?? 0);

  return {
    type,
    value: Number.isFinite(value) ? Math.max(value, 0) : 0,
  };
}

export function calculateProductSubtotal(items = []) {
  return roundCurrency(
    items.reduce((sum, item) => {
      const quantity = normalizeLineQuantity(item.quantity);
      const unitPrice = normalizeLinePrice(item.price);
      return sum + unitPrice * quantity;
    }, 0),
  );
}

export function calculateCategoryCommission(item, categoryConfig) {
  const quantity = normalizeLineQuantity(item.quantity);
  const itemSubtotal = roundCurrency(normalizeLinePrice(item.price) * quantity);
  const { type, value, fixedRule } = resolveCommissionConfig(categoryConfig);

  let adminCommission = 0;
  if (type === COMMISSION_TYPE.PERCENTAGE) {
    adminCommission = percentOf(itemSubtotal, value);
  } else {
    const fixedBase =
      fixedRule === COMMISSION_FIXED_RULE.PER_ITEM ? value : value * quantity;
    adminCommission = roundCurrency(fixedBase);
  }

  adminCommission = clampMoney(adminCommission, 0, itemSubtotal);
  const sellerPayout = roundCurrency(itemSubtotal - adminCommission);

  return {
    itemSubtotal,
    adminCommission,
    sellerPayout,
    appliedCommissionType: type,
    appliedCommissionValue: value,
    appliedFixedRule: fixedRule,
  };
}

function calculateHandlingForCategory({ type, value }, categorySubtotal) {
  if (type === HANDLING_FEE_TYPE.NONE) return 0;
  if (type === HANDLING_FEE_TYPE.PERCENTAGE) {
    return percentOf(categorySubtotal, value);
  }
  return roundCurrency(value);
}

export function calculateHandlingFee(cartItems, options = {}) {
  const {
    handlingFeeStrategy = HANDLING_FEE_STRATEGY.HIGHEST_CATEGORY_FEE,
    categoryById = new Map(),
  } = options;

  const categorySubtotalMap = new Map();
  for (const item of cartItems) {
    const headerId = toObjectIdString(item.headerCategoryId);
    const itemSubtotal = roundCurrency(normalizeLinePrice(item.price) * normalizeLineQuantity(item.quantity));
    categorySubtotalMap.set(headerId, addMoney(categorySubtotalMap.get(headerId) || 0, itemSubtotal));
  }

  const categoryFees = [];
  for (const [headerId, subtotal] of categorySubtotalMap.entries()) {
    const category = categoryById.get(headerId);
    const handling = resolveHandlingConfig(category);
    const fee = calculateHandlingForCategory(handling, subtotal);
    categoryFees.push({
      headerCategoryId: headerId || null,
      categoryName: category?.name || "Unknown",
      subtotal,
      handlingFeeType: handling.type,
      handlingFeeValue: handling.value,
      computedFee: roundCurrency(fee),
    });
  }

  let totalHandlingFee = 0;
  let handlingCategoryUsed = null;

  if (categoryFees.length === 0) {
    totalHandlingFee = 0;
  } else if (handlingFeeStrategy === HANDLING_FEE_STRATEGY.SUM_OF_CATEGORY_FEES) {
    totalHandlingFee = categoryFees.reduce((sum, row) => addMoney(sum, row.computedFee), 0);
  } else if (handlingFeeStrategy === HANDLING_FEE_STRATEGY.PER_ITEM_FEE) {
    totalHandlingFee = cartItems.reduce((sum, item) => {
      const headerId = toObjectIdString(item.headerCategoryId);
      const category = categoryById.get(headerId);
      const handling = resolveHandlingConfig(category);
      const quantity = normalizeLineQuantity(item.quantity);
      const itemSubtotal = roundCurrency(normalizeLinePrice(item.price) * quantity);
      const perLine =
        handling.type === HANDLING_FEE_TYPE.FIXED
          ? roundCurrency(handling.value * quantity)
          : calculateHandlingForCategory(handling, itemSubtotal);
      return addMoney(sum, perLine);
    }, 0);
  } else {
    const maxCategory = categoryFees.reduce((best, row) =>
      row.computedFee > (best?.computedFee || 0) ? row : best,
    );
    totalHandlingFee = roundCurrency(maxCategory?.computedFee || 0);
    handlingCategoryUsed = maxCategory || null;
  }

  if (!handlingCategoryUsed && categoryFees.length > 0) {
    handlingCategoryUsed = categoryFees
      .slice()
      .sort((a, b) => b.computedFee - a.computedFee)[0];
  }

  return {
    handlingFeeCharged: roundCurrency(totalHandlingFee),
    handlingFeeStrategy,
    handlingCategoryUsed,
    categoryFees,
  };
}

export function calculateCustomerDeliveryFee(distanceKm, deliverySettings, options = {}) {
  const deliveryMethod = typeof options === "string" ? options : (options?.deliveryMethod || "NORMAL");
  const zone = typeof options === "object" ? options?.zone : null;
  const mode =
    deliverySettings?.deliveryPricingMode || DELIVERY_PRICING_MODE.DISTANCE_BASED;
  const actualDistance = Number(distanceKm || 0);
  const normalizedDistance = Number.isFinite(actualDistance)
    ? Math.max(actualDistance, 0)
    : 0;

  const deliveryConfig = deliverySettings?.deliveryConfig || {};
  const expressConfig = deliveryConfig?.express || {};
  const normalConfig = deliveryConfig?.normal || {};
  const advanceConfig = deliveryConfig?.advance || {};

  let baseFee = 0;
  let extraFee = 0;
  let roundedExtraKm = 0;
  let distanceKmRounded = normalizedDistance;

  // Zone delivery fee override (TASK-P1.4 / DEL-002)
  const hasZoneFeeOverride = zone?.deliveryFee != null && Number.isFinite(Number(zone.deliveryFee));

  if (hasZoneFeeOverride) {
    baseFee = roundCurrency(Number(zone.deliveryFee));
    extraFee = 0;
    distanceKmRounded = roundCurrency(normalizedDistance);
  } else if (mode === DELIVERY_PRICING_MODE.FIXED_PRICE) {
    const configuredFixed = normalConfig?.deliveryFee != null && Number.isFinite(Number(normalConfig.deliveryFee))
      ? Number(normalConfig.deliveryFee)
      : (deliverySettings?.fixedDeliveryFee ?? deliverySettings?.customerBaseDeliveryFee ?? 0);
    baseFee = roundCurrency(configuredFixed);
    distanceKmRounded = roundCurrency(normalizedDistance);
  } else {
    const configuredBase = normalConfig?.deliveryFee != null && Number.isFinite(Number(normalConfig.deliveryFee))
      ? Number(normalConfig.deliveryFee)
      : (deliverySettings?.customerBaseDeliveryFee ?? 0);
    baseFee = roundCurrency(configuredBase);
    const baseDistance = Math.max(Number(deliverySettings?.baseDistanceCapacityKm || 0), 0);
    const surcharge = roundCurrency(deliverySettings?.incrementalKmSurcharge ?? 0);

    if (normalizedDistance <= baseDistance) {
      distanceKmRounded = roundCurrency(baseDistance);
    } else {
      const extraKm = normalizedDistance - baseDistance;
      roundedExtraKm = ceilKm(extraKm);
      extraFee = roundCurrency(roundedExtraKm * surcharge);
      distanceKmRounded = roundCurrency(baseDistance + roundedExtraKm);
    }
  }

  const standardNormalFee = addMoney(baseFee, extraFee);
  let methodSurcharge = 0;
  let expressSurcharge = 0;
  let advanceBookingFee = 0;
  let finalDeliveryFee = standardNormalFee;

  if (deliveryMethod === "EXPRESS") {
    expressSurcharge = roundCurrency(Number(expressConfig?.surcharge ?? 40));
    methodSurcharge = expressSurcharge;
    finalDeliveryFee = addMoney(standardNormalFee, expressSurcharge);
  } else if (deliveryMethod === "SCHEDULED") {
    if (advanceConfig?.deliveryFee != null && Number.isFinite(Number(advanceConfig.deliveryFee))) {
      advanceBookingFee = roundCurrency(Number(advanceConfig.deliveryFee));
      finalDeliveryFee = advanceBookingFee;
    } else {
      finalDeliveryFee = standardNormalFee;
    }
  }

  // Zone surcharge (if zone has a peak or locality surcharge)
  const zoneSurcharge = Number(zone?.surcharge || 0);
  if (zoneSurcharge > 0) {
    finalDeliveryFee = addMoney(finalDeliveryFee, zoneSurcharge);
  }

  return {
    deliveryFeeCharged: finalDeliveryFee,
    distanceKmActual: normalizedDistance,
    distanceKmRounded,
    roundedExtraKm,
    mode,
    baseFee,
    extraFee,
    standardNormalFee,
    deliveryMethod,
    expressSurcharge,
    advanceBookingFee,
    methodSurcharge,
    zoneFeeOverride: hasZoneFeeOverride ? Number(zone.deliveryFee) : null,
    zoneSurcharge,
    matchedZoneId: zone?._id || null,
    matchedZoneName: zone?.name || null,
    breakdown: {
      standardNormalFee,
      expressSurcharge,
      advanceBookingFee,
      finalDeliveryFee,
      zoneFeeOverride: hasZoneFeeOverride ? Number(zone.deliveryFee) : null,
      zoneSurcharge,
    },
  };
}

export function calculateRiderPayout(distanceKm, deliverySettings) {
  const mode =
    deliverySettings.deliveryPricingMode || DELIVERY_PRICING_MODE.DISTANCE_BASED;
  const actualDistance = Number(distanceKm || 0);
  const normalizedDistance = Number.isFinite(actualDistance)
    ? Math.max(actualDistance, 0)
    : 0;

  const riderBase = roundCurrency(deliverySettings.riderBasePayout ?? deliverySettings.customerBaseDeliveryFee ?? 0);
  const baseDistance = Math.max(Number(deliverySettings.baseDistanceCapacityKm || 0), 0);
  const perExtraKm = roundCurrency(deliverySettings.deliveryPartnerRatePerKm ?? 0);

  if (mode === DELIVERY_PRICING_MODE.FIXED_PRICE || normalizedDistance <= baseDistance) {
    return {
      riderPayoutBase: riderBase,
      riderPayoutDistance: 0,
      riderPayoutBonus: 0,
      riderPayoutTotal: riderBase,
      roundedExtraKm: 0,
    };
  }

  const extraKm = normalizedDistance - baseDistance;
  const roundedExtraKm = ceilKm(extraKm);
  const riderDistance = roundCurrency(roundedExtraKm * perExtraKm);
  const riderTotal = addMoney(riderBase, riderDistance);

  return {
    riderPayoutBase: riderBase,
    riderPayoutDistance: riderDistance,
    riderPayoutBonus: 0,
    riderPayoutTotal: riderTotal,
    roundedExtraKm,
  };
}

export async function hydrateOrderItems(
  orderItems = [],
  { session = null, enforceServerPricing = true } = {},
) {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return [];
  }

  const productIds = orderItems
    .map((item) => item.product || item.productId || item._id || item.id)
    .filter(Boolean);

  const productQuery = Product.find({ _id: { $in: productIds } })
    .select(
      "_id name salePrice price mainImage headerId categoryId subcategoryId sellerId status approvalStatus variants unit unitValue orderIncrement minOrderQty maxOrderQty isScheduled scheduleDays availableFromTime availableToTime scheduleStartDate scheduleEndDate tieredPricing"
    )
    .lean();
  if (session) productQuery.session(session);
  const products = await productQuery;

  // Verify that parent categories for these products are active
  const categoryIdsToCheck = Array.from(
    new Set(
      products
        .flatMap((p) => [p.headerId, p.categoryId, p.subcategoryId])
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map((id) => String(id))
    )
  );
  let inactiveCategoryIds = new Set();
  if (categoryIdsToCheck.length > 0) {
    const categoriesFound = await Category.find({ _id: { $in: categoryIdsToCheck } })
      .select("_id status name")
      .lean();
    for (const c of categoriesFound) {
      if (c.status === "inactive") {
        inactiveCategoryIds.add(String(c._id));
      }
    }
  }

  const validProductObjIds = productIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  const now = new Date();
  const dealQuery = FlashDeal.find({
    status: "active",
    startTime: { $lte: now },
    endTime: { $gt: now },
    "products.productId": { $in: validProductObjIds },
  }).lean();
  if (session) dealQuery.session(session);
  const activeDeals = await dealQuery;

  const dealProductMap = new Map();
  for (const deal of activeDeals || []) {
    for (const dp of deal.products || []) {
      const pIdStr = String(dp.productId);
      if (!dealProductMap.has(pIdStr)) {
        dealProductMap.set(pIdStr, dp);
      }
    }
  }

  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return orderItems.map((item) => {
    const productId = String(item.product || item.productId || item._id || item.id);
    const product = productMap.get(productId);
    if (!product) {
      throw new Error(`Product not found for line item: ${productId}`);
    }
    if (product.status !== "active") {
      throw new Error(`Product is not available for purchase: ${product.name}`);
    }
    if (resolveProductApprovalStatus(product) !== PRODUCT_APPROVAL_STATUS.APPROVED) {
      throw new Error(`Product is not approved for purchase: ${product.name}`);
    }

    const pHeader = String(product.headerId || "");
    const pCat = String(product.categoryId || "");
    const pSub = String(product.subcategoryId || "");
    if (
      (pHeader && inactiveCategoryIds.has(pHeader)) ||
      (pCat && inactiveCategoryIds.has(pCat)) ||
      (pSub && inactiveCategoryIds.has(pSub))
    ) {
      const err = new Error(`Product "${product.name}" belongs to an inactive category and is unavailable for purchase`);
      err.statusCode = 400;
      throw err;
    }

    const scheduleCheck = evaluateProductAvailability(product);
    if (!scheduleCheck.isAvailable) {
      const err = new Error(`Product "${product.name}" is currently unavailable: ${scheduleCheck.message}`);
      err.statusCode = 400;
      throw err;
    }

    const rawVariantSku = String(item.variantSku || item.variantSlot || "").trim();
    let resolvedVariant = null;
    if (rawVariantSku) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      resolvedVariant =
        variants.find((v) => String(v?.sku || "").trim() === rawVariantSku) ||
        variants.find((v) => String(v?.name || "").trim() === rawVariantSku) ||
        null;
      if (!resolvedVariant) {
        const err = new Error(`Invalid variant for product: ${product.name}`);
        err.statusCode = 400;
        throw err;
      }
    }

    const quantity = normalizeLineQuantity(item.quantity);
    let price = product.price;
    let salePrice = product.salePrice || 0;

    if (resolvedVariant) {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const baseVariant = variants[0];
      const vPrice = Number(resolvedVariant.price || 0);
      const vSalePrice = Number(resolvedVariant.salePrice || 0);

      price = vPrice || product.price;
      salePrice = vSalePrice || product.salePrice || 0;

      if (baseVariant && resolvedVariant.sku !== baseVariant.sku) {
        if (price === Number(product.price) || price === 0) {
          const baseW = parseWeightToGramsOrUnits(baseVariant.name);
          const selW = parseWeightToGramsOrUnits(resolvedVariant.name);
          if (baseW.unit === selW.unit && baseW.value > 0) {
            const ratio = selW.value / baseW.value;
            const basePrice = Number(baseVariant.price || product.price || 0);
            const baseSalePrice = Number(baseVariant.salePrice || product.salePrice || 0);
            price = Math.round(basePrice * ratio);
            if (baseSalePrice > 0) {
              salePrice = Math.round(baseSalePrice * ratio);
            } else {
              salePrice = 0;
            }
          }
        }
      }
    }

    const standardUnitPrice = normalizeLinePrice(
      salePrice > 0 && salePrice < price ? salePrice : price
    );

    const candidateTiers =
      Array.isArray(resolvedVariant?.tieredPricing) && resolvedVariant.tieredPricing.length > 0
        ? resolvedVariant.tieredPricing
        : (Array.isArray(product.tieredPricing) ? product.tieredPricing : []);

    const { unitPrice: tieredUnitPrice, appliedTier } = resolveTieredUnitPrice(
      standardUnitPrice,
      candidateTiers,
      quantity
    );

    let serverUnitPrice = tieredUnitPrice;
    const activeDealItem = dealProductMap.get(productId);
    if (
      activeDealItem &&
      Number(activeDealItem.flashPrice) > 0 &&
      Number(activeDealItem.flashPrice) < standardUnitPrice
    ) {
      serverUnitPrice = normalizeLinePrice(activeDealItem.flashPrice);
    }

    const inferredUnitPrice = enforceServerPricing
      ? serverUnitPrice
      : normalizeLinePrice(item.price) || serverUnitPrice;

    const rawHeader = product.headerId || product.categoryId || "";
    const validHeaderStr =
      rawHeader &&
      String(rawHeader).trim() !== "" &&
      String(rawHeader) !== "undefined" &&
      String(rawHeader) !== "null"
        ? String(rawHeader)
        : "";

    return {
      productId,
      productName: item.name || product.name,
      quantity,
      price: inferredUnitPrice,
      image: item.image || product.mainImage,
      headerCategoryId: validHeaderStr,
      sellerId: String(product.sellerId || ""),
      variantSku: rawVariantSku || "",
      variantName: resolvedVariant ? String(resolvedVariant?.name || "").trim() : "",
      unit: product.unit || "pack",
      unitValue: product.unitValue || 1,
      appliedTier: appliedTier || null,
      basePrice: standardUnitPrice,
    };
  });
}

export async function generateOrderPaymentBreakdown({
  items = [],
  preHydratedItems = null,
  distanceKm = 0,
  discountTotal = 0,
  taxTotal = 0,
  tipTotal = 0,
  // Audit Phase 4 (C-1): per-seller proportionate wallet redemption. The
  // checkout-group-level walletAmount is split by subtotal-ratio in
  // `buildCheckoutPricingSnapshot` before reaching this function. When the
  // `WALLET_REDEMPTION_REDUCES_PAYABLE` env flag is on, this amount is
  // subtracted from `grandTotal` so that the customer is asked to pay
  // (online or COD) only the post-wallet amount. When the flag is off the
  // value is still persisted (for visibility) but `grandTotal` keeps the
  // legacy pre-wallet value so existing flows are bit-for-bit unchanged.
  walletAmount = 0,
  deliverySettings,
  deliveryMethod = "NORMAL",
  handlingFeeStrategy,
  session = null,
  zone = null,
}) {
  const normalizedItems = Array.isArray(preHydratedItems) && preHydratedItems.length > 0
    ? preHydratedItems
    : await hydrateOrderItems(items, { session, enforceServerPricing: true });
  if (normalizedItems.length === 0) {
    throw new Error("Cart is empty");
  }

  const sellerIds = Array.from(new Set(normalizedItems.map((item) => item.sellerId)));
  if (sellerIds.length > 1) {
    throw new Error("Multi-seller checkout is not supported in current flow");
  }

  const headerIds = Array.from(
    new Set(
      normalizedItems
        .map((item) => toObjectIdString(item.headerCategoryId))
        .filter((id) => id && id !== "undefined" && id !== "null"),
    ),
  );

  const categoryQuery = headerIds.length > 0
    ? Category.find({ _id: { $in: headerIds } })
        .select(
          "_id name adminCommission adminCommissionType adminCommissionValue adminCommissionFixedRule handlingFees handlingFeeType handlingFeeValue",
        )
        .lean()
    : null;
  if (session && categoryQuery) categoryQuery.session(session);
  const categories = categoryQuery ? await categoryQuery : [];
  const categoryById = new Map(categories.map((category) => [String(category._id), category]));

  const effectiveSettings =
    deliverySettings || (await getOrCreateFinanceSettings());
  const effectiveHandlingStrategy =
    handlingFeeStrategy || effectiveSettings.handlingFeeStrategy;

  let productSubtotal = 0;
  let sellerPayoutTotal = 0;
  let adminProductCommissionTotal = 0;

  const lineItems = normalizedItems.map((item) => {
    const category = categoryById.get(String(item.headerCategoryId));
    const commission = calculateCategoryCommission(item, category);
    productSubtotal = addMoney(productSubtotal, commission.itemSubtotal);
    sellerPayoutTotal = addMoney(sellerPayoutTotal, commission.sellerPayout);
    adminProductCommissionTotal = addMoney(
      adminProductCommissionTotal,
      commission.adminCommission,
    );

    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
      itemSubtotal: commission.itemSubtotal,
      sellerPayout: commission.sellerPayout,
      adminProductCommission: commission.adminCommission,
      headerCategoryId: item.headerCategoryId,
      headerCategoryName: category?.name || "Unknown",
      appliedCommissionType: commission.appliedCommissionType,
      appliedCommissionValue: commission.appliedCommissionValue,
      appliedCommissionFixedRule: commission.appliedFixedRule,
    };
  });

  const handling = calculateHandlingFee(normalizedItems, {
    handlingFeeStrategy: effectiveHandlingStrategy,
    categoryById,
  });
  const delivery = calculateCustomerDeliveryFee(distanceKm, effectiveSettings, { deliveryMethod, zone });
  const rider = calculateRiderPayout(distanceKm, effectiveSettings);

  const normalizedDiscount = roundCurrency(discountTotal || 0);
  const normalizedTax = roundCurrency(taxTotal || 0);
  const normalizedTip = roundCurrency(tipTotal || 0);
  const normalizedWallet = roundCurrency(walletAmount || 0);

  const grossTotal = roundCurrency(
    productSubtotal +
      delivery.deliveryFeeCharged +
      handling.handlingFeeCharged -
      normalizedDiscount +
      normalizedTax +
      normalizedTip,
  );

  // Audit Phase 4 (C-1): subtract wallet redemption only when the flag is on.
  // The wallet amount is clamped to [0, grossTotal] so a malformed input
  // cannot drive grandTotal negative. We keep `grossTotal` for the new
  // `payableAmount` field below — clients that want the pre-wallet number
  // can still read `grossTotal` while migrating UIs.
  const walletAllocation = isWalletRedemptionReducesPayableEnabled()
    ? Math.min(normalizedWallet, grossTotal)
    : 0;
  const grandTotal = roundCurrency(grossTotal - walletAllocation);

  const riderTipAmount = normalizedTip;
  const riderPayoutTotal = roundCurrency(
    rider.riderPayoutBase +
      rider.riderPayoutDistance +
      rider.riderPayoutBonus +
      riderTipAmount,
  );

  const platformLogisticsMargin = roundCurrency(
    delivery.deliveryFeeCharged +
      handling.handlingFeeCharged -
      (rider.riderPayoutBase + rider.riderPayoutDistance + rider.riderPayoutBonus),
  );
  const platformTotalEarning = roundCurrency(
    adminProductCommissionTotal + platformLogisticsMargin,
  );

  const snapshots = {
    deliverySettings: {
      ...effectiveSettings,
    },
    categoryCommissionSettings: categories.map((category) => ({
      headerCategoryId: String(category._id),
      headerCategoryName: category.name,
      adminCommissionType:
        category.adminCommissionType || COMMISSION_TYPE.PERCENTAGE,
      adminCommissionValue: resolveCommissionConfig(category).value,
      adminCommissionFixedRule:
        category.adminCommissionFixedRule || COMMISSION_FIXED_RULE.PER_QTY,
      handlingFeeType:
        category.handlingFeeType || HANDLING_FEE_TYPE.FIXED,
      handlingFeeValue: resolveHandlingConfig(category).value,
    })),
    handlingFeeStrategy: effectiveHandlingStrategy,
    handlingCategoryUsed: handling.handlingCategoryUsed,
    deliveryMethod,
    deliveryFeeBreakdown: delivery.breakdown || {},
  };

  return {
    sellerId: sellerIds[0],
    lineItems,
    currency: "INR",
    productSubtotal,
    deliveryFeeCharged: delivery.deliveryFeeCharged,
    handlingFeeCharged: handling.handlingFeeCharged,
    tipTotal: normalizedTip,
    discountTotal: normalizedDiscount,
    taxTotal: normalizedTax,
    // Audit Phase 4 (C-1):
    //   - `grossTotal`: pre-wallet customer-payable amount. New field —
    //     legacy callers ignore it.
    //   - `grandTotal`: post-wallet amount when the flag is on (the actual
    //     amount gateway charges / rider collects); equals `grossTotal`
    //     when the flag is off (legacy behaviour preserved).
    //   - `walletAmount`: per-seller proportionate wallet redemption.
    //   - `payableAmount`: alias of `grandTotal` for the post-C-1 world,
    //     surfaced separately so the frontend can stop subtracting
    //     `walletAmount` from `grandTotal` once the flag is on.
    grossTotal,
    grandTotal,
    walletAmount: walletAllocation,
    payableAmount: grandTotal,
    sellerPayoutTotal,
    adminProductCommissionTotal,
    riderPayoutBase: rider.riderPayoutBase,
    riderPayoutDistance: rider.riderPayoutDistance,
    riderPayoutBonus: rider.riderPayoutBonus,
    riderTipAmount,
    riderPayoutTotal,
    platformLogisticsMargin,
    platformTotalEarning,
    codCollectedAmount: 0,
    codRemittedAmount: 0,
    codPendingAmount: 0,
    distanceKmActual: delivery.distanceKmActual,
    distanceKmRounded: delivery.distanceKmRounded,
    snapshots,
  };
}
