import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
import Seller from '../app/models/seller.js';
await mongoose.connect(process.env.MONGO_URI);
console.log('DB:', mongoose.connection.name);
const sellers = await Seller.find({}).select('name shopName email phone city address applicationStatus isActive isVerified location').lean();
for (const s of sellers) {
  const n = await Product.countDocuments({ sellerId: s._id });
  console.log(JSON.stringify({id:String(s._id),name:s.name,shop:s.shopName,email:s.email,phone:s.phone,city:s.city,addr:s.address,st:s.applicationStatus,act:s.isActive,ver:s.isVerified,loc:s.location?.coordinates,products:n}));
}
const ps = await Product.find({}).select('name sku slug price salePrice stock unit unitValue weight sellerId variants headerId categoryId subcategoryId status').lean();
console.log('total products', ps.length);
for (const p of ps) console.log(JSON.stringify({id:String(p._id),name:p.name,sku:p.sku,seller:String(p.sellerId),price:p.price,stock:p.stock,unit:p.unit,w:p.weight,st:p.status,v:(p.variants||[]).map(v=>[v.name,v.price,v.stock])}));
await mongoose.disconnect();
