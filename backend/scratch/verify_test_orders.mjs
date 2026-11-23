import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../app/models/order.js';
import Seller from '../app/models/seller.js';
await mongoose.connect(process.env.MONGO_URI);
const ids = process.argv.slice(2);
const orders = await Order.find({ orderId: { $in: ids } }).lean();
for (const o of orders) {
  const s = await Seller.findById(o.seller).select('shopName').lean();
  console.log(o.orderId, '| seller =', s?.shopName, '| address =', o.address?.address, '| status =', o.orderStatus || o.status, '| pay =', o.paymentMode, '| total =', o.pricing?.total ?? o.totalAmount ?? o.pricing?.grandTotal);
}
await mongoose.disconnect(); process.exit(0);
