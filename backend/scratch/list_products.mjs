import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
await mongoose.connect(process.env.MONGO_URI);
const ps = await Product.find({}).select('name price salePrice unit unitValue weight stock variants status').lean();
for (const p of ps) console.log(JSON.stringify({id:String(p._id),name:p.name,price:p.price,sale:p.salePrice,unit:p.unit,uv:p.unitValue,w:p.weight,stock:p.stock,status:p.status,variants:(p.variants||[]).map(v=>[v.name,v.price,v.salePrice,v.stock])}));
console.log('total',ps.length);
await mongoose.disconnect();
