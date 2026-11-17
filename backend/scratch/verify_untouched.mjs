import dotenv from 'dotenv'; import mongoose from 'mongoose'; import dns from 'node:dns'; import fs from 'node:fs';
import Product from '../app/models/product.js';
dotenv.config(); dns.setServers(['8.8.8.8','1.1.1.1']);
await mongoose.connect(process.env.MONGO_URI);
const bk = JSON.parse(fs.readFileSync('C:/Users/HP/AppData/Local/Temp/claude/5032b8cf2a4015e7/64a96e91-5c96-46c6-b117-52685b885088/scratchpad/applied.backup.json','utf8'));
let priceDiff=0, nameDiff=0, skuChanged=0, skuKept=0, stockDiff=0;
for (const b of bk) {
  const p = await Product.findById(b.id).lean();
  for (const ov of b.variants) {
    const nv = p.variants.find(v => v.name === ov.name);
    if (!nv) { nameDiff++; continue; }
    if (nv.price !== ov.price || (nv.salePrice||0) !== (ov.salePrice||0)) priceDiff++;
    if ((nv.stock||0) !== (ov.stock||0)) { stockDiff++; console.log("STOCK", p.name, ov.name, ov.stock, "->", nv.stock); }
    if ((nv.sku||'') === (ov.sku||'')) skuKept++; else skuChanged++;
  }
}
console.log({ products: bk.length, priceDiff, stockDiff, nameDiff, skuKept, skuChanged });
process.exit(0);
