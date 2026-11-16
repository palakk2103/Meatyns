import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Seller from '../app/models/seller.js';
import { resolveSelectedSellerForCustomer } from '../app/services/customerVisibilityService.js';
await mongoose.connect(process.env.MONGO_URI);
const EMAILS = ['kolhapur1','kolhapur2','kolhapur3','kolhapur4','kolhapur5','pune'].map(e=>e+'@meatyns.com');
if (process.argv.includes('--fix')) {
  const r = await Seller.updateMany({ email: { $in: EMAILS }, serviceRadius: { $gt: 100 } }, { $set: { serviceRadius: 10 } });
  console.log('radius fixed:', r.modifiedCount);
}
const all = await Seller.find({ isActive: true, applicationStatus: 'approved' }).select('shopName email serviceRadius location').lean();
const name = Object.fromEntries(all.map(s => [String(s._id), s.shopName + ' (' + s.email + ', r=' + s.serviceRadius + ')']));
const pts = {
  'Kolhapur Rajarampuri': [16.6980, 74.2360], 'Kolhapur Line Bazar': [16.7150, 74.2600],
  'Kolhapur far suburb (12km out)': [16.80, 74.30], 'Pune Baner': [18.5590, 73.7868], 'Pune Wakad (9km)': [18.5990, 73.7600],
  'Indore': [22.7196, 75.8577], 'Mumbai (outside all)': [19.0760, 72.8777],
};
for (const [k,[lat,lng]] of Object.entries(pts)) { const r = await resolveSelectedSellerForCustomer(lat,lng); console.log(k.padEnd(34), '->', r ? name[r.sellerId] + ` | ${r.distanceKm.toFixed(1)}km within=${r.withinRadius}` : 'none'); }
await mongoose.disconnect();
