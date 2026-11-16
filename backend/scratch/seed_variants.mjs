import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
const MAP = [
  ['6abcd2a285e22d15ef2b3afb', 415, 207],
  ['6abcd31a85e22d15ef2b3bdf', 460, 230],
  ['6abcd3c185e22d15ef2b3cfb', 350, 175],
  ['6abcd42c85e22d15ef2b3dbd', 280, 140],
  ['6abcd49385e22d15ef2b3e6b', 290, 145],
];
await mongoose.connect(process.env.MONGO_URI);
for (const [id, p1, p05] of MAP) {
  const doc = await Product.findById(id);
  const before = doc.variants.map(v => [v.name, v.price, v.salePrice, v.stock]);
  const find = k => doc.variants.find(v => v.name.replace(/\s+/g,'').toLowerCase() === k);
  const old1 = find('1kg') || doc.variants.find(v => v.name.trim() === '1');
  const old05 = find('500g');
  const mk = (old, name, price) => ({ ...(old ? { _id: old._id, sku: old.sku } : {}), name, price, salePrice: price, stock: old?.stock ?? 800 });
  doc.variants = [mk(old1, '1 kg', p1), mk(old05, '500 g', p05)];
  doc.price = p1; doc.salePrice = p1;
  await doc.save();
  console.log(doc.name, '\n  before', JSON.stringify(before), '\n  after ', JSON.stringify(doc.variants.map(v => [v.name, v.price, v.salePrice, v.stock])));
}
await mongoose.disconnect();
