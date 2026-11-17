import dotenv from 'dotenv'; import mongoose from 'mongoose'; import dns from 'node:dns';
import Product from '../app/models/product.js';
dotenv.config(); dns.setServers(['8.8.8.8','8.8.4.4','1.1.1.1']);
await mongoose.connect(process.env.MONGO_URI);
const ps = await Product.find({}).select('name price salePrice stock unit unitValue weight variants status sellerId').lean();
console.log('TOTAL', ps.length);
const shapes = {};
for (const p of ps) {
  const k = `${p.unit}|${(p.variants||[]).length}`;
  shapes[k] = (shapes[k]||0)+1;
}
console.log(shapes);
for (const p of ps) console.log(JSON.stringify({id:String(p._id),n:p.name,pr:p.price,sp:p.salePrice,st:p.stock,u:p.unit,uv:p.unitValue,w:p.weight,v:(p.variants||[]).map(v=>[v.name,v.price,v.salePrice,v.stock,v.sku])}));
process.exit(0);
