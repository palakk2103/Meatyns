import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config'; import mongoose from 'mongoose';
import Order from '../app/models/order.js';
import { resolveWorkflowStatus } from '../app/services/orderWorkflowService.js';
await mongoose.connect(process.env.MONGO_URI);
const o=await Order.findOne({orderId:'ORD-01M83F52P34RKWHA2PZ0A7HJ7E'}).lean();
console.log({v:o.workflowVersion,ws:o.workflowStatus,status:o.status,pm:o.paymentMode,ps:o.paymentStatus,resolved:resolveWorkflowStatus(o)});
await mongoose.disconnect();process.exit(0);
