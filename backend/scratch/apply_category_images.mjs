import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
import Category from '../app/models/category.js';
import { invalidate, buildKey } from '../app/services/cacheService.js';
await mongoose.connect(process.env.MONGO_URI);
// category id -> product name whose (new) photo it should use
const MAP = {
  '6abb9cede8545df2f6c15a7d': 'Meatyns Special Mutton ( Liver & Fat less )',
  '6abb9d10e8545df2f6c15a85': 'Goat Curry Cut',
  '6abb9d44e8545df2f6c15a90': 'Mutton Liver',
  '6abba197e8545df2f6c15aaf': 'Meatyns Regular (Liver & Fat Add)',
  '6abba278e8545df2f6c15acc': 'Mutton Chops( Ribcage & T-Bone Steak )',
  '6abba2ade8545df2f6c15ada': 'Mutton Paya ( Whole ) Pack Of 4',
  '6abba2dae8545df2f6c15ae2': 'Mutton Paya with small pieces',
  '6abba2fee8545df2f6c15af6': 'Goat Boneless ( Full Boneless )',
  '6abccea68bb4a6318f3e9b4c': 'Chicken Curry Cut',
};
const cats = await Category.find({ _id: { $in: Object.keys(MAP) } }).select('name image').lean();
const livers = await Product.find({ name: /^\s*chicken liver\s*$/i }).select('name status mainImage galleryImages').lean();
fs.writeFileSync(`scratch/category_image_backup_${Date.now()}.json`, JSON.stringify({ categories: cats, chickenLiver: livers }, null, 2));
for (const c of cats) {
  const p = await Product.findOne({ name: MAP[String(c._id)], status: 'active' }).select('mainImage').lean();
  if (!p?.mainImage) { console.log('SKIP (no image)', c.name); continue; }
  await Category.updateOne({ _id: c._id }, { $set: { image: p.mainImage } });
  console.log('image updated:', c.name);
}
const ids = livers.filter(l => !l.mainImage && !(l.galleryImages||[]).length).map(l => l._id);
const r = await Product.updateMany({ _id: { $in: ids } }, { $set: { status: 'inactive' } });
console.log('chicken liver found', livers.length, 'without image', ids.length, 'hidden', r.modifiedCount);
console.log('active chicken liver left:', await Product.countDocuments({ name: /chicken liver/i, status: 'active' }));
for (const k of ['cache:catalog:categories:*', buildKey('catalog','productList','*'), 'cache:offersections:public:*', 'cache:search:*', 'cache:sellers:nearby:*', ...ids.map(i => `cache:catalog:product:${i}`)]) await invalidate(k);
await mongoose.disconnect();
process.exit(0);
