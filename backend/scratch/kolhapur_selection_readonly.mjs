import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Seller from '../app/models/seller.js';
import Product from '../app/models/product.js';
import { resolveSelectedSellerForCustomer } from '../app/services/customerVisibilityService.js';
import { distanceMeters } from '../app/utils/geoUtils.js';

// READ-ONLY: no writes to the DB.
await mongoose.connect(process.env.MONGO_URI);
const sellers = await Seller.find({ city: /kolhapur/i })
  .select('shopName email city isActive applicationStatus isOnline serviceRadius location').lean();
console.log('Kolhapur sellers:', sellers.length);
const info = [];
for (const s of sellers) {
  const pc = await Product.countDocuments({ sellerId: s._id, status: 'active' });
  const [lng, lat] = s.location?.coordinates || [];
  console.log(`- ${s.shopName} | ${s.email} | active=${s.isActive} app=${s.applicationStatus} online=${s.isOnline} radius=${s.serviceRadius}km | products=${pc} | lat=${lat} lng=${lng}`);
  info.push({ ...s, pc, lat, lng });
}
const dirs = { N:[1,0], E:[0,1], S:[-1,0], W:[0,-1] };
let pass = 0, fail = 0;
const eligible = info.filter(o => o.isActive && o.applicationStatus === 'approved' && o.pc > 0 && Number.isFinite(o.lat));
for (const s of info) {
  if (!Number.isFinite(s.lat)) continue;
  for (const d of [200, 800, 2000]) for (const [name,[dy,dx]] of Object.entries(dirs)) {
    const lat = s.lat + (dy*d)/111320;
    const lng = s.lng + (dx*d)/(111320*Math.cos(s.lat*Math.PI/180));
    const r = await resolveSelectedSellerForCustomer(lat, lng);
    const exp = eligible
      .map(o => ({ o, dist: distanceMeters(lat, lng, o.lat, o.lng)/1000 }))
      .filter(x => x.dist <= (x.o.serviceRadius || 5))
      .sort((a,b) => a.dist - b.dist)[0];
    const got = info.find(o => String(o._id) === r?.sellerId);
    const ok = String(exp?.o._id || '') === String(r?.sellerId || '');
    ok ? pass++ : fail++;
    console.log(`${ok?'OK  ':'FAIL'} ${s.shopName} ${name}${d}m -> got ${got?.shopName||'NONE'} (${r?.distanceKm?.toFixed(2)}km) expected ${exp?.o.shopName||'NONE'}`);
  }
}
console.log({ pass, fail });
await mongoose.disconnect(); process.exit(0);
