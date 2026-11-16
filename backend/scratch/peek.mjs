import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
import Seller from '../app/models/seller.js';
await mongoose.connect(process.env.MONGO_URI);
console.log(JSON.stringify(await Seller.findById('6a61c24736109852f8dac028').lean(),null,1));
console.log(JSON.stringify(await Product.findOne({sku:'goatc-001'}).lean(),null,1));
await mongoose.disconnect();
