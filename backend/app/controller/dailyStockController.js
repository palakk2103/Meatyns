import mongoose from "mongoose";
import DailyStockEntry from "../models/dailyStockEntry.js";
import Order from "../models/order.js";
import Product from "../models/product.js";
import Seller from "../models/seller.js";
import handleResponse from "../utils/helper.js";

const IST_OFFSET = "+05:30";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 93;
const DAY_MS = 24 * 60 * 60 * 1000;

const round = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

const istToday = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const isValidDate = (s) => {
  if (!DATE_RE.test(String(s || ""))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // Round-trip so impossible dates such as 2026-02-31 (which JS rolls over) are rejected.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const dayStart = (s) => new Date(`${s}T00:00:00${IST_OFFSET}`);

/** Parses ?from&to, defaulting to the last 7 days (IST). */
const resolveRange = (query) => {
  const today = istToday();
  const to = query.to || today;
  const from = query.from || new Date(dayStart(to).getTime() - 6 * DAY_MS + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!isValidDate(from) || !isValidDate(to)) return { error: "from/to must be YYYY-MM-DD" };
  if (from > to) return { error: "'from' must not be after 'to'" };
  const days = Math.round((dayStart(to) - dayStart(from)) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) return { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days` };
  return { from, to };
};

/** Converts one order line into { pieces, kg } using the unit stored on the line. */
const toPiecesAndKg = (quantity, unit, unitValue) => {
  const q = Number(quantity) || 0;
  const uv = Number(unitValue) > 0 ? Number(unitValue) : 1;
  const u = String(unit || "").toLowerCase();
  if (u === "kg") return { pieces: 0, kg: q * uv };
  if (u === "g") return { pieces: 0, kg: (q * uv) / 1000 };
  return { pieces: q, kg: 0 };
};

/**
 * Online sales per seller/product/day, derived from non-cancelled orders.
 * Returns a Map keyed `${seller}|${product}|${date}`.
 */
const getOrderSales = async ({ from, to, sellerId }) => {
  const match = {
    createdAt: { $gte: dayStart(from), $lt: new Date(dayStart(to).getTime() + DAY_MS) },
    status: { $ne: "cancelled" },
    seller: { $ne: null },
  };
  if (sellerId) match.seller = new mongoose.Types.ObjectId(String(sellerId));

  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: "$items" },
    { $match: { "items.status": { $nin: ["UNAVAILABLE", "CANCELLED", "RETURNED"] } } },
    {
      $group: {
        _id: {
          seller: "$seller",
          product: "$items.product",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
          unit: "$items.unit",
          unitValue: "$items.unitValue",
        },
        quantity: { $sum: "$items.quantity" },
      },
    },
  ]);

  const map = new Map();
  for (const r of rows) {
    const key = `${r._id.seller}|${r._id.product}|${r._id.date}`;
    const { pieces, kg } = toPiecesAndKg(r.quantity, r._id.unit, r._id.unitValue);
    const cur = map.get(key) || { pieces: 0, kg: 0 };
    cur.pieces += pieces;
    cur.kg += kg;
    map.set(key, cur);
  }
  return map;
};

const emptyTotals = () => ({
  receivedPieces: 0, receivedKg: 0,
  soldPieces: 0, soldKg: 0,
  onlineSoldPieces: 0, onlineSoldKg: 0,
  manualSoldPieces: 0, manualSoldKg: 0,
  wastagePieces: 0, wastageKg: 0,
  balancePieces: 0, balanceKg: 0,
});

const addInto = (t, r) => {
  for (const k of Object.keys(emptyTotals())) t[k] += r[k] || 0;
};

const TOTAL_KEYS = Object.keys(emptyTotals());

const finalise = (t) => {
  for (const k of TOTAL_KEYS) t[k] = round(t[k]);
  return t;
};

/** Builds one report row from a stored entry (or null) and the online sales figure. */
const buildRow = (entry, online) => {
  const e = entry || {};
  const onlineSoldPieces = online?.pieces || 0;
  const onlineSoldKg = online?.kg || 0;
  const manualSoldPieces = e.manualSoldPieces || 0;
  const manualSoldKg = e.manualSoldKg || 0;
  const row = {
    receivedPieces: e.receivedPieces || 0,
    receivedKg: e.receivedKg || 0,
    onlineSoldPieces, onlineSoldKg,
    manualSoldPieces, manualSoldKg,
    soldPieces: onlineSoldPieces + manualSoldPieces,
    soldKg: onlineSoldKg + manualSoldKg,
    wastagePieces: e.wastagePieces || 0,
    wastageKg: e.wastageKg || 0,
  };
  row.balancePieces = row.receivedPieces - row.soldPieces - row.wastagePieces;
  row.balanceKg = row.receivedKg - row.soldKg - row.wastageKg;
  return row;
};

/**
 * Core report builder shared by the seller and admin endpoints.
 * sellerId = null → platform wide.
 */
const buildReport = async ({ from, to, sellerId }) => {
  const entryFilter = { date: { $gte: from, $lte: to } };
  if (sellerId) entryFilter.seller = new mongoose.Types.ObjectId(String(sellerId));

  const [entries, sales] = await Promise.all([
    DailyStockEntry.find(entryFilter).lean(),
    getOrderSales({ from, to, sellerId }),
  ]);

  const entryMap = new Map(entries.map((e) => [`${e.seller}|${e.product}|${e.date}`, e]));
  const keys = new Set([...entryMap.keys(), ...sales.keys()]);

  const sellerIds = new Set();
  const productIds = new Set();
  const lines = [];
  for (const key of keys) {
    const [seller, product, date] = key.split("|");
    sellerIds.add(seller);
    productIds.add(product);
    lines.push({ seller, product, date, ...buildRow(entryMap.get(key), sales.get(key)), note: entryMap.get(key)?.note || "" });
  }

  const [sellers, products] = await Promise.all([
    Seller.find({ _id: { $in: [...sellerIds] } }).select("name shopName").lean(),
    Product.find({ _id: { $in: [...productIds] } }).select("name unit").lean(),
  ]);
  const sellerName = new Map(sellers.map((s) => [String(s._id), s.shopName || s.name || "Seller"]));
  const productInfo = new Map(products.map((p) => [String(p._id), p]));

  const named = lines.map((l) => ({
    ...l,
    sellerName: sellerName.get(l.seller) || "Unknown seller",
    productName: productInfo.get(l.product)?.name || "Deleted product",
    productUnit: productInfo.get(l.product)?.unit || null,
  }));

  // Per-day totals (every day in range present, even if empty).
  const dayMap = new Map();
  for (let t = dayStart(from).getTime(); t <= dayStart(to).getTime(); t += DAY_MS) {
    dayMap.set(new Date(t + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10), emptyTotals());
  }
  const sellerTotals = new Map();
  const grand = emptyTotals();
  for (const l of named) {
    addInto(dayMap.get(l.date) || (dayMap.set(l.date, emptyTotals()), dayMap.get(l.date)), l);
    if (!sellerTotals.has(l.seller)) sellerTotals.set(l.seller, { sellerId: l.seller, sellerName: l.sellerName, ...emptyTotals() });
    addInto(sellerTotals.get(l.seller), l);
    addInto(grand, l);
  }

  const days = [...dayMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, t]) => ({ date, ...finalise(t) }));
  const bySeller = [...sellerTotals.values()]
    .map((s) => finalise(s))
    .sort((a, b) => b.soldPieces + b.soldKg - (a.soldPieces + a.soldKg));

  named.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.productName.localeCompare(b.productName)));
  for (const l of named) {
    for (const k of Object.keys(emptyTotals())) l[k] = round(l[k]);
  }

  return { from, to, totals: finalise(grand), days, bySeller, lines: named };
};

/* ---------------- shared input parsing ---------------- */

const FIELDS = [
  "receivedPieces", "receivedKg",
  "manualSoldPieces", "manualSoldKg",
  "wastagePieces", "wastageKg",
];

/** Returns { error } or { set } where set only contains fields actually supplied. */
const parseEntryBody = (body = {}) => {
  if (!isValidDate(body.date)) return { error: "date is required (YYYY-MM-DD)" };
  if (body.date > istToday()) return { error: "Cannot record stock for a future date" };
  if (!mongoose.isValidObjectId(body.productId)) return { error: "productId is required" };

  const set = {};
  for (const f of FIELDS) {
    if (body[f] === undefined || body[f] === null || body[f] === "") continue;
    const n = Number(body[f]);
    if (!Number.isFinite(n) || n < 0) return { error: `${f} must be a number ≥ 0` };
    if (n > 1_000_000) return { error: `${f} is too large` };
    set[f] = round(n);
  }
  if (body.note !== undefined) set.note = String(body.note).slice(0, 500);
  if (Object.keys(set).length === 0) return { error: "Provide at least one quantity to save" };
  return { set };
};

const upsertEntry = async ({ sellerId, productId, date, set, role, userId }) => {
  return DailyStockEntry.findOneAndUpdate(
    { seller: sellerId, product: productId, date },
    { $set: { ...set, updatedByRole: role, updatedById: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
};

/* ---------------- seller endpoints ---------------- */

export const getSellerDailyStock = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    if (range.error) return handleResponse(res, 400, range.error);
    const report = await buildReport({ ...range, sellerId: req.user.id });
    return handleResponse(res, 200, "Daily stock report fetched", report);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const saveSellerDailyStock = async (req, res) => {
  try {
    const parsed = parseEntryBody(req.body);
    if (parsed.error) return handleResponse(res, 400, parsed.error);

    const product = await Product.findOne({ _id: req.body.productId, sellerId: req.user.id }).select("_id").lean();
    if (!product) return handleResponse(res, 404, "Product not found or unauthorized");

    const entry = await upsertEntry({
      sellerId: req.user.id,
      productId: product._id,
      date: req.body.date,
      set: parsed.set,
      role: "seller",
      userId: req.user.id,
    });
    return handleResponse(res, 200, "Daily stock saved", entry);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/** Seller's products for the entry form. */
export const getSellerDailyStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.id })
      .select("name unit sku")
      .sort({ name: 1 })
      .limit(1000)
      .lean();
    return handleResponse(res, 200, "Products fetched", products);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ---------------- admin endpoints ---------------- */

export const getAdminDailyStock = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    if (range.error) return handleResponse(res, 400, range.error);
    const sellerId = req.query.sellerId || null;
    if (sellerId && !mongoose.isValidObjectId(sellerId)) return handleResponse(res, 400, "Invalid sellerId");
    const report = await buildReport({ ...range, sellerId });
    return handleResponse(res, 200, "Daily stock report fetched", report);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/** Admin can enter / correct a figure on behalf of any seller. */
export const saveAdminDailyStock = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.body?.sellerId)) return handleResponse(res, 400, "sellerId is required");
    const parsed = parseEntryBody(req.body);
    if (parsed.error) return handleResponse(res, 400, parsed.error);

    const product = await Product.findOne({ _id: req.body.productId, sellerId: req.body.sellerId }).select("_id").lean();
    if (!product) return handleResponse(res, 404, "Product not found for this seller");

    const entry = await upsertEntry({
      sellerId: req.body.sellerId,
      productId: product._id,
      date: req.body.date,
      set: parsed.set,
      role: "admin",
      userId: req.user.id,
    });
    return handleResponse(res, 200, "Daily stock saved", entry);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const listAdminDailyStockSellers = async (_req, res) => {
  try {
    const sellers = await Seller.find({}).select("name shopName").sort({ shopName: 1, name: 1 }).limit(1000).lean();
    return handleResponse(
      res,
      200,
      "Sellers fetched",
      sellers.map((s) => ({ _id: s._id, name: s.shopName || s.name })),
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// Exported for unit tests.
export const __test = { toPiecesAndKg, resolveRange, parseEntryBody, buildRow };
