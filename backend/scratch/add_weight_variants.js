// Usage: node scratch/add_weight_variants.js [--apply] [--report=<path>]
// Adds 250 g / 750 g variants derived from each product's existing 1 kg & 500 g prices.
import dotenv from 'dotenv'; import mongoose from 'mongoose'; import dns from 'node:dns'; import fs from 'node:fs';
import Product from '../app/models/product.js';
import { invalidate, buildKey } from '../app/services/cacheService.js';
import { enqueueProductIndex } from '../app/services/searchSyncService.js';
dotenv.config(); dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const APPLY = process.argv.includes('--apply');
const reportPath = (process.argv.find(a => a.startsWith('--report=')) || '').slice(9);
const r2 = (n) => Math.floor((n + 1e-9) / 5) * 5; // floor to nearest Rs 5

const grams = (name) => {
  const m = String(name || '').toLowerCase().trim().match(/^([\d.]+)\s*(kg|g)\b/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * (m[2] === 'kg' ? 1000 : 1));
};
const LABEL = { 250: '250 g', 500: '500 g', 750: '750 g', 1000: '1 kg' };
const SKU_SUFFIX = { 250: '250g', 500: '500g', 750: '750g', 1000: '1kg' };

await mongoose.connect(process.env.MONGO_URI);
const products = await Product.find({});
const report = { applied: APPLY, total: products.length, updated: [], unchanged: [], skipped: [] };
const backup = [];

for (const p of products) {
  const vs = (p.variants || []).map(v => v.toObject());
  const byG = new Map();
  for (const v of vs) { const g = grams(v.name); if (g && !byG.has(g)) byG.set(g, v); }
  const v1k = byG.get(1000), v500 = byG.get(500);
  const info = { id: String(p._id), name: p.name };
  const ref1k = Number(v1k?.price || 0), ref500 = Number(v500?.price || 0);
  if (!v1k || !v500 || ref1k <= 0 || ref500 <= 0) {
    report.skipped.push({ ...info, reason: 'No 1 kg + 500 g reference price', variants: vs.map(v => `${v.name}=${v.price}`) });
    continue;
  }
  const sale1k = Number(v1k.salePrice || 0), sale500 = Number(v500.salePrice || 0);
  const baseSku = (p.sku && String(p.sku).trim()) || `p${String(p._id).slice(-8)}`;
  const stock = Number(p.stock || 0);
  const make = (g, mult) => ({
    name: LABEL[g], price: r2(ref1k * mult), salePrice: sale1k > 0 ? r2(sale1k * mult) : 0,
    stock, sku: `${baseSku}-${SKU_SUFFIX[g]}`,
  });
  // Existing 250/750 variants are kept, re-priced to floor-to-Rs5 of the 1 kg price when different.
  const fixDec = (g, mult) => { const v = byG.get(g); if (!v) return make(g, mult);
    const m = make(g, mult);
    if (Number(v.price) === m.price && Number(v.salePrice || 0) === m.salePrice) return v; return { ...v, price: m.price, salePrice: m.salePrice }; };
  const wanted = { 1000: v1k, 500: v500, 250: fixDec(250, 0.25), 750: fixDec(750, 0.75) };
  const created = [250, 750].filter(g => !byG.has(g));

  // Final order: 1 kg stays first (backend/frontend treat variants[0] as the base), then descending.
  const used = new Set(); const fixedSku = [];
  const finalVariants = [1000, 750, 500, 250].map(g => {
    const v = { ...wanted[g] };
    let sku = String(v.sku || '').trim();
    if (!sku || used.has(sku)) { fixedSku.push(`${LABEL[g]}: ${sku || '(none)'} -> ${baseSku}-${SKU_SUFFIX[g]}`); sku = `${baseSku}-${SKU_SUFFIX[g]}`; }
    used.add(sku); v.sku = sku;
    return v;
  });
  // keep any other (non-weight) variants untouched at the end
  const others = vs.filter(v => ![250, 500, 750, 1000].includes(grams(v.name)));
  const next = [...finalVariants, ...others];

  const priceFixed = [250, 750].some(g => byG.has(g) && wanted[g] !== byG.get(g));
  const unchanged = created.length === 0 && fixedSku.length === 0 && !priceFixed &&
    JSON.stringify(vs.map(v => v.sku)) === JSON.stringify(next.map(v => v.sku));
  if (unchanged) { report.unchanged.push(info); continue; }

  report.updated.push({ ...info, price1kg: ref1k, created: created.map(g => `${LABEL[g]}=${wanted[g].price}`),
    prices: finalVariants.map(v => `${v.name}=${v.price}`), skuFixes: fixedSku });
  if (APPLY) {
    backup.push({ id: String(p._id), variants: vs });
    p.variants = next;                 // top-level price/stock/images/etc. untouched
    await p.save();
    try { await enqueueProductIndex(String(p._id)); await invalidate(`cache:catalog:product:${p._id}`); } catch (e) { console.log('index/cache warn', e.message); }
  }
}
if (APPLY) {
  for (const k of [buildKey('catalog', 'productList', '*'), 'cache:catalog:categories:*', 'cache:offersections:public:*', 'cache:search:*', 'cache:sellers:nearby:*']) {
    try { await invalidate(k); } catch (e) { console.log('cache warn', k, e.message); }
  }
  if (reportPath) fs.writeFileSync(reportPath.replace(/\.json$/, '.backup.json'), JSON.stringify(backup, null, 1));
}
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ applied: APPLY, total: report.total, updated: report.updated.length, unchanged: report.unchanged.length, skipped: report.skipped.length }));
await mongoose.disconnect(); process.exit(0);
