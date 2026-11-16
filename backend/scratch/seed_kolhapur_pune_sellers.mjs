import dns from 'dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../app/models/product.js';
import Seller from '../app/models/seller.js';

const SOURCE_SELLER = '6a61c24736109852f8dac028';
const TEMP_PASSWORD = 'Meatyns@123';
const DRY = process.argv.includes('--dry');

const SELLERS = [
  { key:'k1', shop:'Meatyns Kolhapur - Hockey Stadium', addr:'Sharda Vihar Apartment, Hockey Stadium, Kolhapur', locality:'Hockey Stadium', city:'Kolhapur', state:'Maharashtra', coords:[74.2433,16.7046] },
  { key:'k2', shop:'Meatyns Kolhapur - Line Bazar', addr:'Line Bazar Chowk, Kasaba Bawada, Kolhapur', locality:'Kasaba Bawada', city:'Kolhapur', state:'Maharashtra', coords:[74.2600,16.7150] },
  { key:'k3', shop:'Meatyns Kolhapur - New Vashi Naka', addr:'New Vashi Naka, Apate Nagar, Radhanagari Road, Kolhapur', locality:'Apate Nagar', city:'Kolhapur', state:'Maharashtra', coords:[74.2650,16.7000] },
  { key:'k4', shop:'Meatyns Kolhapur - Phulewadi', addr:'Kasbekar Landmark, Near Temblai Mandir, Phulewadi, Kolhapur', locality:'Phulewadi', city:'Kolhapur', state:'Maharashtra', coords:[74.2400,16.6900] },
  { key:'k5', shop:'Meatyns Kolhapur - Rajarampuri', addr:'Manik Chembers, Janta Bazar Chowk, Rajarampuri, Kolhapur', locality:'Rajarampuri', city:'Kolhapur', state:'Maharashtra', coords:[74.2360,16.6980] },
  { key:'pune', shop:'Meatyns Pune - Baner', addr:'Shop No. 7, Regent Plaza, Baner Pashan Link Road, Baner, Pune', locality:'Baner', city:'Pune', state:'Maharashtra', pincode:'411045', coords:[73.7868,18.5590], pune:true },
].map((s,i)=>({ ...s, email: s.key==='pune' ? 'pune@meatyns.com' : `kolhapur${i+1}@meatyns.com`, phone:`900000000${i+1}` }));

// Pune-only prices by source SKU: [1kg, 500g]
const PUNE = {
  'meaty-001':[1050,525],     // Meatyns Special Mutton
  'meaty-001-1':[930,465],    // Meatyns Regular
  'goatc-001':[930,465],      // Goat Curry Cut
  'mutto-001':[830,415],      // Mutton Liver
  'premi-001':[980,490],      // Premium Goat Shoulder Curry Cut
  'mutto-001-1':[1000,500],   // Chops
  'mutto-001-2':[1000,500],   // Mutton Paya whole
  'mutto-001-3':[1000,500],   // Mutton Paya small pieces
};

await mongoose.connect(process.env.MONGO_URI);
const src = await Seller.findById(SOURCE_SELLER).lean();
const srcProducts = await Product.find({ sellerId: SOURCE_SELLER }).lean();
console.log('DB', mongoose.connection.name, '| source products', srcProducts.length, DRY?'(DRY RUN)':'');

for (const s of SELLERS) {
  let seller = await Seller.findOne({ email: s.email });
  if (seller) console.log('seller exists', s.email);
  else if (!DRY) {
    seller = await Seller.create({
      name: s.shop, email: s.email, phone: s.phone, password: TEMP_PASSWORD, shopName: s.shop,
      address: s.addr, locality: s.locality, city: s.city, state: s.state, pincode: s.pincode,
      role:'seller', isVerified:true, emailVerified:true, phoneVerified:true, applicationStatus:'approved',
      isActive:true, isOnline:true, isManualOverride:true, serviceRadius: src.serviceRadius,
      location:{ type:'Point', coordinates:s.coords }, storeHours:{ enabled:false, schedule:[] },
    });
    console.log('created seller', s.email, String(seller._id));
  } else console.log('would create seller', s.email);

  for (const p of srcProducts) {
    const slug = `${p.slug}-${s.key}`, sku = `${p.sku}-${s.key}`;
    if (await Product.exists({ slug })) { continue; }
    const { _id, createdAt, updatedAt, __v, ...rest } = p;
    const prices = s.pune ? PUNE[p.sku] : null;
    const variants = (p.variants||[]).map(v => {
      const { _id:_vid, ...vr } = v;
      const name = v.name.replace(/\s+/g,'').toLowerCase();
      if (prices) { const pr = name==='1kg' ? prices[0] : name==='500g' ? prices[1] : v.price; vr.price = pr; vr.salePrice = pr; }
      if (vr.sku) vr.sku = sku;
      return vr;
    });
    const doc = { ...rest, slug, sku, variants, sellerId: seller?._id, isFeatured:false };
    if (prices) { doc.price = prices[0]; doc.salePrice = prices[0]; }
    if (!DRY) await Product.create(doc);
  }
  console.log(`  ${s.key}: products ${DRY?'planned':'now'} ${DRY?srcProducts.length:await Product.countDocuments({sellerId:seller._id})}`);
}
await mongoose.disconnect();
