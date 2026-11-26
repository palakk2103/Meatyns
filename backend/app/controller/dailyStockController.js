import { sortByDisplayOrder } from "../utils/productDisplayOrder.js";
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
const IST_SHIFT_MS = 5.5 * 60 * 60 * 1000;

const round = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

const istToday = () => new Date(Date.now() + IST_SHIFT_MS).toISOString().slice(0, 10);

const isValidDate = (s) => {
  if (!DATE_RE.test(String(s || ""))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // Round-trip so impossible dates such as 2026-02-31 (which JS rolls over) are rejected.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const dayStart = (s) => new Date(`${s}T00:00:00${IST_OFFSET}`);

/** Every IST date string from..to inclusive. */
const eachDay = (from, to) => {
  const out = [];
  for (let t = dayStart(from).getTime(); t <= dayStart(to).getTime(); t += DAY_MS) {
    out.push(new Date(t + IST_SHIFT_MS).toISOString().slice(0, 10));
  }
  return out;
};

/** Parses ?from&to, defaulting to the last 7 days (IST). */
const resolveRange = (query) => {
  const today = istToday();
  const to = query.to || today;
  const from = query.from || new Date(dayStart(to).getTime() - 6 * DAY_MS + IST_SHIFT_MS).toISOString().slice(0, 10);
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

/* ---------------- row maths + running stock ---------------- */

// Figures that are summed over days. Opening/closing are NOT summed (see buildReport).
const ACTIVITY_KEYS = [
  "receivedPieces", "receivedKg",
  "soldPieces", "soldKg",
  "onlineSoldPieces", "onlineSoldKg",
  // Estimated animals behind the kg sold online (kg / product's average kg per animal).
  "onlineSoldEstPieces",
  "manualSoldPieces", "manualSoldKg",
  "wastagePieces", "wastageKg",
  // Stock added/removed by a starting-stock entry (first day or correction).
  "adjustPieces", "adjustKg",
  // Sold from a product that has no stock entry yet: counted as sold, but not deducted from stock.
  "untrackedSoldPieces", "untrackedSoldKg",
];
const STOCK_KEYS = ["openingPieces", "openingKg", "balancePieces", "balanceKg"];
const TOTAL_KEYS = [...ACTIVITY_KEYS, ...STOCK_KEYS];

const emptyTotals = () => Object.fromEntries(TOTAL_KEYS.map((k) => [k, 0]));

const addActivity = (t, r) => {
  for (const k of ACTIVITY_KEYS) t[k] += r[k] || 0;
};

const finalise = (t) => {
  for (const k of TOTAL_KEYS) t[k] = round(t[k]);
  return t;
};

/**
 * One report row from a stored entry (or null), the online sales figure and the
 * opening stock. balance = opening + received − sold − wastage (the closing stock).
 */
const buildRow = (entry, online, opening = { p: 0, k: 0 }) => {
  const e = entry || {};
  const onlineSoldPieces = online?.pieces || 0;
  const onlineSoldKg = online?.kg || 0;
  const manualSoldPieces = e.manualSoldPieces || 0;
  const manualSoldKg = e.manualSoldKg || 0;
  const row = {
    openingPieces: opening.p,
    openingKg: opening.k,
    receivedPieces: e.receivedPieces || 0,
    receivedKg: e.receivedKg || 0,
    onlineSoldPieces, onlineSoldKg,
    manualSoldPieces, manualSoldKg,
    soldPieces: onlineSoldPieces + manualSoldPieces,
    soldKg: onlineSoldKg + manualSoldKg,
    wastagePieces: e.wastagePieces || 0,
    wastageKg: e.wastageKg || 0,
  };
  row.balancePieces = round(row.openingPieces + row.receivedPieces - row.soldPieces - row.wastagePieces);
  row.balanceKg = round(row.openingKg + row.receivedKg - row.soldKg - row.wastageKg);
  return row;
};

/**
 * Walks ONE seller+product day by day and carries the stock forward.
 *
 * - Stock tracking starts on the first day an entry exists for the product.
 *   Sales before that day still count as "sold" but never affect stock.
 * - Opening stock of a day = previous closing stock, unless that day's entry
 *   sets a starting stock (first day / correction).
 * - Days without any activity change nothing (stock carries over).
 *
 * entries: Map<date, entry>   sales: Map<date, {pieces, kg}>
 * Returns an ascending array of { date, tracked, row }.
 */
export const walkStock = ({ entries, sales, to }) => {
  const trackStart = [...entries.keys()].sort()[0] || null;
  const dates = [...new Set([...entries.keys(), ...sales.keys()])].filter((d) => d <= to).sort();
  let running = { p: 0, k: 0 };
  const records = [];
  for (const date of dates) {
    const entry = entries.get(date) || null;
    const tracked = trackStart !== null && date >= trackStart;
    let opening = { p: 0, k: 0 };
    if (tracked) {
      opening = {
        p: entry?.startStockPieces ?? running.p,
        k: entry?.startStockKg ?? running.k,
      };
    }
    const row = buildRow(entry, sales.get(date), opening);
    // How much a starting-stock entry moved the running figure (0 when carrying forward).
    row.adjustPieces = tracked ? round(opening.p - running.p) : 0;
    row.adjustKg = tracked ? round(opening.k - running.k) : 0;
    row.untrackedSoldPieces = tracked ? 0 : row.soldPieces;
    row.untrackedSoldKg = tracked ? 0 : row.soldKg;
    if (tracked) {
      running = { p: row.balancePieces, k: row.balanceKg };
    } else {
      // Not tracked yet: show the sales, but no stock figure.
      row.balancePieces = 0;
      row.balanceKg = 0;
    }
    records.push({ date, tracked, row, entry });
  }
  return records;
};

/** Closing stock at the end of `date` (carried over if nothing happened that day). */
export const stockAtEnd = (records, date) => {
  let last = null;
  for (const r of records) {
    if (r.date > date) break;
    last = r;
  }
  return last && last.tracked ? { p: last.row.balancePieces, k: last.row.balanceKg } : { p: 0, k: 0 };
};

/** Opening stock at the start of `date`. */
export const stockAtStart = (records, date) => {
  const rec = records.find((r) => r.date === date);
  if (rec) return rec.tracked ? { p: rec.row.openingPieces, k: rec.row.openingKg } : { p: 0, k: 0 };
  return stockAtEnd(records, date);
};

/**
 * Core report builder shared by the seller and admin endpoints.
 * sellerId = null → platform wide.
 */
const buildReport = async ({ from, to, sellerId }) => {
  const entryFilter = { date: { $lte: to } };
  if (sellerId) entryFilter.seller = new mongoose.Types.ObjectId(String(sellerId));
  const entries = await DailyStockEntry.find(entryFilter).lean();

  // Stock is carried forward from the first entry of each product, so orders are
  // needed from the earliest entry onwards (not just the visible range).
  let earliest = from;
  for (const e of entries) if (e.date < earliest) earliest = e.date;
  const sales = await getOrderSales({ from: earliest, to, sellerId });

  const entriesByPair = new Map();
  for (const e of entries) {
    const pair = `${e.seller}|${e.product}`;
    if (!entriesByPair.has(pair)) entriesByPair.set(pair, new Map());
    entriesByPair.get(pair).set(e.date, e);
  }
  const salesByPair = new Map();
  for (const [key, val] of sales) {
    const [seller, product, date] = key.split("|");
    const pair = `${seller}|${product}`;
    if (!salesByPair.has(pair)) salesByPair.set(pair, new Map());
    salesByPair.get(pair).set(date, val);
  }

  const range = eachDay(from, to);
  const pairs = new Set([...entriesByPair.keys(), ...salesByPair.keys()]);

  const perPair = [];
  for (const pair of pairs) {
    const records = walkStock({
      entries: entriesByPair.get(pair) || new Map(),
      sales: salesByPair.get(pair) || new Map(),
      to,
    });
    const [seller, product] = pair.split("|");
    const inRange = records.filter((r) => r.date >= from && r.date <= to);
    const openingAtFrom = stockAtStart(records, from);
    const closingAtTo = stockAtEnd(records, to);
    const holdsStock = closingAtTo.p !== 0 || closingAtTo.k !== 0 || openingAtFrom.p !== 0 || openingAtFrom.k !== 0;
    if (inRange.length === 0 && !holdsStock) continue; // old, finished history
    perPair.push({ seller, product, records, inRange, openingAtFrom, closingAtTo, hasEntries: entriesByPair.has(pair) });
  }

  const sellerIds = new Set(perPair.map((p) => p.seller));
  const productIds = new Set(perPair.map((p) => p.product));
  const [sellers, products] = await Promise.all([
    Seller.find({ _id: { $in: [...sellerIds] } }).select("name shopName").lean(),
    Product.find({ _id: { $in: [...productIds] } }).select("name unit unitValue stock avgKgPerAnimal").lean(),
  ]);
  const sellerName = new Map(sellers.map((s) => [String(s._id), s.shopName || s.name || "Seller"]));
  const productInfo = new Map(products.map((p) => [String(p._id), p]));
  const names = (seller, product) => ({
    sellerName: sellerName.get(seller) || "Unknown seller",
    productName: productInfo.get(product)?.name || "Deleted product",
    productUnit: productInfo.get(product)?.unit || null,
    avgKgPerAnimal: productInfo.get(product)?.avgKgPerAnimal || null,
    // The product's own stock number (Products / Stock page). It already drops with every
    // order, so it is the "what is left" figure for products without a carcass entry.
    productStock: productInfo.get(product)?.stock ?? null,
  });

  // Lines: one per product per day that had activity in the range.
  const lines = [];
  for (const p of perPair) {
    for (const r of p.inRange) {
      lines.push({
        seller: p.seller,
        product: p.product,
        date: r.date,
        tracked: r.tracked,
        ...names(p.seller, p.product),
        ...r.row,
        onlineSoldEstPieces: names(p.seller, p.product).avgKgPerAnimal
          ? round(r.row.onlineSoldKg / names(p.seller, p.product).avgKgPerAnimal)
          : 0,
        startStockPieces: r.entry?.startStockPieces ?? null,
        startStockKg: r.entry?.startStockKg ?? null,
        note: r.entry?.note || "",
      });
    }
  }
  lines.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.productName.localeCompare(b.productName)));

  // Per-day totals: activity from the lines, stock figures carried per product.
  const dayMap = new Map(range.map((d) => [d, emptyTotals()]));
  for (const l of lines) addActivity(dayMap.get(l.date), l);
  for (const day of range) {
    const t = dayMap.get(day);
    for (const p of perPair) {
      const o = stockAtStart(p.records, day);
      const c = stockAtEnd(p.records, day);
      t.openingPieces += o.p; t.openingKg += o.k;
      t.balancePieces += c.p; t.balanceKg += c.k;
    }
  }

  // Grand total + per seller: activity over the range, stock at both ends.
  const grand = emptyTotals();
  const sellerTotals = new Map();
  for (const l of lines) {
    addActivity(grand, l);
    if (!sellerTotals.has(l.seller)) sellerTotals.set(l.seller, { sellerId: l.seller, sellerName: l.sellerName, ...emptyTotals() });
    addActivity(sellerTotals.get(l.seller), l);
  }
  for (const p of perPair) {
    if (!sellerTotals.has(p.seller)) {
      sellerTotals.set(p.seller, { sellerId: p.seller, sellerName: names(p.seller, p.product).sellerName, ...emptyTotals() });
    }
    const st = sellerTotals.get(p.seller);
    for (const t of [grand, st]) {
      t.openingPieces += p.openingAtFrom.p; t.openingKg += p.openingAtFrom.k;
      t.balancePieces += p.closingAtTo.p; t.balanceKg += p.closingAtTo.k;
    }
  }

  // Stock on hand at the end of the range, per product.
  const stock = perPair
    // Products with a carcass entry show their carcass balance; products without one are
    // listed too so the product's own remaining stock is visible next to what was sold.
    .filter((p) => p.closingAtTo.p !== 0 || p.closingAtTo.k !== 0 || !p.hasEntries)
    .map((p) => ({
      carcassTracked: p.hasEntries,
      seller: p.seller,
      product: p.product,
      ...names(p.seller, p.product),
      balancePieces: round(p.closingAtTo.p),
      balanceKg: round(p.closingAtTo.k),
    }))
    .sort((a, b) => a.sellerName.localeCompare(b.sellerName) || a.productName.localeCompare(b.productName));

  const days = [...dayMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, t]) => ({ date, ...finalise(t) }));
  const bySeller = [...sellerTotals.values()]
    .map((s) => finalise(s))
    .sort((a, b) => b.soldPieces + b.soldKg - (a.soldPieces + a.soldKg));

  return { from, to, totals: finalise(grand), days, bySeller, lines, stock };
};

/* ---------------- shared input parsing ---------------- */

const FIELDS = [
  "receivedPieces", "receivedKg",
  "manualSoldPieces", "manualSoldKg",
  "wastagePieces", "wastageKg",
];
// Optional: a number sets the starting stock, null/"" removes it (carry forward again).
const START_FIELDS = ["startStockPieces", "startStockKg"];

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
  for (const f of START_FIELDS) {
    if (body[f] === undefined) continue;
    if (body[f] === null || body[f] === "") {
      set[f] = null;
      continue;
    }
    const n = Number(body[f]);
    if (!Number.isFinite(n) || n < 0) return { error: `${f} must be a number ≥ 0` };
    if (n > 1_000_000) return { error: `${f} is too large` };
    set[f] = round(n);
  }
  if (body.note !== undefined) set.note = String(body.note).slice(0, 500);
  if (Object.keys(set).length === 0) return { error: "Provide at least one quantity to save" };
  return { set };
};

/** Optional per-product average kg per animal: undefined = leave, null = clear, number > 0 = set. */
const parseAvgKg = (body = {}) => {
  const v = body.avgKgPerAnimal;
  if (v === undefined) return { value: undefined };
  if (v === null || v === "") return { value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000) return { error: "avgKgPerAnimal must be a number greater than 0" };
  return { value: round(n) };
};

const saveAvgKg = async (productId, value) => {
  if (value === undefined) return;
  await Product.updateOne({ _id: productId }, { $set: { avgKgPerAnimal: value } });
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
    const avg = parseAvgKg(req.body);
    if (avg.error) return handleResponse(res, 400, avg.error);

    const product = await Product.findOne({ _id: req.body.productId, sellerId: req.user.id }).select("_id").lean();
    if (!product) return handleResponse(res, 404, "Product not found or unauthorized");
    await saveAvgKg(product._id, avg.value);

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
      .select("name sellerId unit sku avgKgPerAnimal")
      .sort({ name: 1 })
      .limit(1000)
      .lean();
    return handleResponse(res, 200, "Products fetched", sortByDisplayOrder(products));
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
    const avg = parseAvgKg(req.body);
    if (avg.error) return handleResponse(res, 400, avg.error);

    const product = await Product.findOne({ _id: req.body.productId, sellerId: req.body.sellerId }).select("_id").lean();
    if (!product) return handleResponse(res, 404, "Product not found for this seller");
    await saveAvgKg(product._id, avg.value);

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

/** Products of one seller, for the admin entry form. */
export const getAdminDailyStockProducts = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.query.sellerId)) return handleResponse(res, 400, "sellerId is required");
    const products = await Product.find({ sellerId: req.query.sellerId })
      .select("name sellerId unit sku avgKgPerAnimal")
      .sort({ name: 1 })
      .limit(1000)
      .lean();
    return handleResponse(res, 200, "Products fetched", sortByDisplayOrder(products));
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const listAdminDailyStockSellers = async (_req, res) => {
  try {
    const sellers = await Seller.find({}).select("name shopName email").sort({ shopName: 1, name: 1 }).limit(1000).lean();
    return handleResponse(
      res,
      200,
      "Sellers fetched",
      // Several stores can share a name, so include the email to tell them apart.
      sellers.map((s) => ({ _id: s._id, name: s.shopName || s.name, email: s.email || "" })),
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// Exported for unit tests.
export const __test = { parseAvgKg, toPiecesAndKg, resolveRange, parseEntryBody, buildRow, walkStock, stockAtEnd, stockAtStart };
