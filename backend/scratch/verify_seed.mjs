import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
import Seller from '../app/models/seller.js';
await mongoose.connect(process.env.MONGO_URI);
for (const e of ['kolhapur1@meatyns.com','kolhapur5@meatyns.com','pune@meatyns.com']) {
  const s = await Seller.findOne({email:e}); const ps = await Product.find({sellerId:s._id}).sort({sku:1}).lean();
  console.log(e, s.city, ps.length); for (const p of ps) console.log('  ',p.name.slice(0,40).padEnd(40), p.variants.map(v=>v.price).join('/'));
}
await mongoose.disconnect();
