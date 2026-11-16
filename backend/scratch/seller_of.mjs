import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
import Seller from '../app/models/seller.js';
await mongoose.connect(process.env.MONGO_URI);
const ps = await Product.find({_id:{$in:['6abcd2a285e22d15ef2b3afb','6abcd31a85e22d15ef2b3bdf','6abcd3c185e22d15ef2b3cfb','6abcd42c85e22d15ef2b3dbd','6abcd49385e22d15ef2b3e6b']}}).select('name sellerId').lean();
for (const p of ps) { const s = await Seller.findById(p.sellerId).select('name shopName email phone').lean(); console.log(p.name,'->',JSON.stringify(s)); }
await mongoose.disconnect();
