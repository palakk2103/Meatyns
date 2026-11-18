import Product from "../models/product.js";
import Seller from "../models/seller.js";
import { buildKey, invalidate, delPattern } from "./cacheService.js";
import { enqueueProductIndex } from "./searchSyncService.js";
import logger from "./logger.js";

/**
 * Business rule: every approved store sells the full Meatyns catalogue.
 *
 * Products are stored per seller (each store keeps its own stock/prices), so
 * "the catalogue" is the set of distinct product names that exist as active,
 * approved products. A store is missing a product when it has no product with
 * that name (case-insensitive). Missing products are copied from a template:
 * the most recently updated active + approved copy of that product.
 */

const normalizeName = (name) => String(name || "").trim().toLowerCase();

// Fields that must never be copied from the template.
const OMIT_FIELDS = new Set(["_id", "__v", "createdAt", "updatedAt", "sellerId", "slug", "sku"]);

const sellerSuffix = (sellerId) => String(sellerId).slice(-6);

async function uniqueValue(field, base) {
  let value = base;
  let count = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ [field]: value })) {
    count += 1;
    value = `${base}-${count}`;
  }
  return value;
}

async function uniqueVariantSku(base, taken) {
  let value = base;
  let count = 0;
  // eslint-disable-next-line no-await-in-loop
  while (taken.has(value) || (await Product.exists({ $or: [{ sku: value }, { "variants.sku": value }] }))) {
    count += 1;
    value = `${base}-${count}`;
  }
  taken.add(value);
  return value;
}

// New slug/SKUs = template value + this store's suffix (made unique).
async function buildCopy(template, sellerId) {
  const suffix = sellerSuffix(sellerId);
  const copy = {};
  for (const [key, value] of Object.entries(template)) {
    if (!OMIT_FIELDS.has(key)) copy[key] = value;
  }
  copy.sellerId = sellerId;
  copy.slug = await uniqueValue("slug", `${template.slug}-${suffix}`);
  copy.sku = await uniqueValue("sku", `${template.sku || template.slug}-${suffix}`);

  const taken = new Set([copy.sku]);
  if (Array.isArray(template.variants)) {
    copy.variants = [];
    for (const variant of template.variants) {
      const { _id, ...rest } = variant || {};
      // The first variant usually shares the product SKU.
      const sku =
        variant?.sku && variant.sku === template.sku
          ? copy.sku
          : await uniqueVariantSku(`${variant?.sku || copy.sku}-${suffix}`, taken);
      copy.variants.push({ ...rest, sku });
    }
  }
  return copy;
}

/** Latest active+approved copy of every catalogue product, keyed by name. */
async function loadCatalogTemplates() {
  const products = await Product.find({ status: "active", approvalStatus: "approved" })
    .sort({ updatedAt: -1 })
    .lean();
  const templates = new Map();
  for (const p of products) {
    const key = normalizeName(p.name);
    if (key && !templates.has(key)) templates.set(key, p);
  }
  return templates;
}

async function invalidateCatalogCaches() {
  try {
    await invalidate(buildKey("catalog", "productList", "*"));
    await invalidate("cache:offersections:public:*");
    await invalidate("cache:search:*");
    await invalidate("cache:sellers:nearby:*");
    await delPattern(buildKey("sellers", "selected", "*"));
  } catch (err) {
    logger.warn?.("[catalogSync] cache invalidation failed", { error: err?.message });
  }
}

async function insertCopies(copies) {
  if (!copies.length) return [];
  const created = await Product.insertMany(copies, { ordered: false });
  for (const doc of created) {
    try {
      await enqueueProductIndex(String(doc._id));
    } catch {
      // search indexing is best-effort
    }
  }
  return created;
}

/**
 * Copy every catalogue product the seller is missing.
 * @returns {{ sellerId, missing: string[], created: number }}
 */
export async function syncCatalogToSeller(sellerId, { dryRun = false, templates = null } = {}) {
  const catalog = templates || (await loadCatalogTemplates());
  const owned = await Product.find({ sellerId }).select("name").lean();
  const ownedNames = new Set(owned.map((p) => normalizeName(p.name)));

  const missing = [];
  for (const [key, template] of catalog) {
    if (!ownedNames.has(key)) missing.push(template);
  }

  if (dryRun || !missing.length) {
    return { sellerId: String(sellerId), missing: missing.map((t) => t.name), created: 0 };
  }

  const copies = [];
  for (const template of missing) {
    // eslint-disable-next-line no-await-in-loop
    copies.push(await buildCopy(template, sellerId));
  }
  const created = await insertCopies(copies);
  if (!templates) await invalidateCatalogCaches();
  return { sellerId: String(sellerId), missing: missing.map((t) => t.name), created: created.length };
}

/** Copy the full catalogue to every approved seller that is missing products. */
export async function syncCatalogToAllSellers({ dryRun = false } = {}) {
  const templates = await loadCatalogTemplates();
  const sellers = await Seller.find({ applicationStatus: "approved" }).select("_id shopName").lean();
  const results = [];
  for (const seller of sellers) {
    // eslint-disable-next-line no-await-in-loop
    const res = await syncCatalogToSeller(seller._id, { dryRun, templates });
    results.push({ ...res, shopName: seller.shopName });
  }
  if (!dryRun) await invalidateCatalogCaches();
  return results;
}

/**
 * A newly created (approved, active) product is copied to every other
 * approved seller that doesn't already have a product with that name.
 */
export async function syncProductToAllSellers(productId) {
  const template = await Product.findById(productId).lean();
  if (!template || template.status !== "active" || template.approvalStatus !== "approved") {
    return { created: 0 };
  }
  const key = normalizeName(template.name);
  const sellers = await Seller.find({
    applicationStatus: "approved",
    _id: { $ne: template.sellerId },
  })
    .select("_id")
    .lean();

  const copies = [];
  for (const seller of sellers) {
    // eslint-disable-next-line no-await-in-loop
    const owned = await Product.find({ sellerId: seller._id }).select("name").lean();
    if (owned.some((p) => normalizeName(p.name) === key)) continue;
    // eslint-disable-next-line no-await-in-loop
    copies.push(await buildCopy(template, seller._id));
  }
  const created = await insertCopies(copies);
  if (created.length) await invalidateCatalogCaches();
  return { created: created.length };
}
