import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
const MAP = [  ['6abba3b3e8545df2f6c15be1', 930, 465],  ['6abba536e8545df2f6c15e4a', 850, 425],  ['6abba405e8545df2f6c15c70', 860, 430],  ['6abba47ae8545df2f6c15d17', 790, 395],  ['6abba4d1e8545df2f6c15db7', 790, 395],  ['6abba5b9e8545df2f6c15f1e', 880, 440],  ['6abba637e8545df2f6c16003', 900, 450],  ['6abba68ee8545df2f6c16097', 950, 475],];
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
