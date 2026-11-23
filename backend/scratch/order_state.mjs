import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config'; import mongoose from 'mongoose';
import Order from '../app/models/order.js';
await mongoose.connect(process.env.MONGO_URI);
for (const o of await Order.find({orderId:{$in:process.argv.slice(2)}}).lean()) console.log(o.orderId,'status',o.orderStatus||o.status,'workflow',o.workflowStatus,'pay',o.paymentStatus,o.paymentMode);
await mongoose.disconnect(); process.exit(0);
