import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const sections = await mongoose.connection.db.collection('offersections').find({}).toArray();
  for (const s of sections) {
    console.log('--- SECTION:', s.title, s._id);
    console.log('productIds in section:', s.productIds);
    const prods = await mongoose.connection.db.collection('products').find({ _id: { $in: s.productIds || [] } }).toArray();
    console.log('Found prods count in DB:', prods.length);
    prods.forEach(p => console.log('Prod:', p._id, p.name, 'status:', p.status, 'approvalStatus:', p.approvalStatus, 'sellerId:', p.sellerId));
  }
  const allProds = await mongoose.connection.db.collection('products').find({ status: 'active' }).limit(10).toArray();
  console.log('\n--- Sample Active Products in DB:');
  allProds.forEach(p => console.log('Active prod:', p._id, p.name, 'sellerId:', p.sellerId, 'categoryId:', p.categoryId));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
