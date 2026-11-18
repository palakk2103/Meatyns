import dns from 'node:dns'; dns.setServers(['8.8.8.8','1.1.1.1']);
import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
import mongoose from 'mongoose'; import dotenv from 'dotenv'; dotenv.config();
import { getUploadsDir, getPublicBaseUrl } from '../app/services/localImageStorage.js';
const SRC = process.argv[2];
const galleries = [
  { title: 'Meatyns Store Grand Opening', slug: 'meatyns-store-grand-opening', cat: 'openings-and-inaugurations', featured: true, order: 1,
    short: 'Ribbons, balloons and a brand-new Meatyns store opening its doors to the community.',
    desc: 'A look back at the grand opening of our Meatyns store — from the ribbon-decorated entrance and festive balloon arches to the signature goat-cut wall art and the team ready to serve fresh, hygienic meat.',
    imgs: [['0603','The Meatyns storefront'],['0600','Ribbon-cutting at the entrance'],['0601','Guests arriving for the opening'],['0605','Balloon arches at the entrance'],['0607','Signature goat-cut glass art'],['0609','Our feature brick wall'],['0610','Customer seating area'],['0613','The Goat Farm display'],['0611','Our team ready to serve'],['0626','Authentic meat awaits!']] },
  { title: 'Inside the Meatyns Store', slug: 'inside-the-meatyns-store', cat: 'memorable-moments', featured: false, order: 2,
    short: 'Fresh-cut displays, clean counters and a welcoming space — a tour of our store.',
    desc: 'Step inside a Meatyns store: chilled display counters stocked with fresh cuts, a dedicated order pick-up counter, and a clean, bright space designed around hygiene and quality.',
    imgs: [['0631','Store interior'],['0614','Order counter'],['0618','Your order is here'],['0621','Fresh mutton on display'],['0622','Fresh chicken, cut daily'],['0624','Chilled display counter'],['0625','Ready-to-cook selection'],['0628','Pick-up counter'],['0636','Meatyns brand wall'],['0638','Our preparation area'],['0637','Find us online'],['0634','Vibe to meat you']] },
  { title: 'Opening Day Celebrations', slug: 'opening-day-celebrations', cat: 'events-and-programs', featured: false, order: 3,
    short: 'Balloon arches, ribbons and festive colours on opening day.',
    desc: 'The store dressed up in Meatyns orange and white for opening day — balloon arches, a ribbon at the door and a warm welcome for every guest.',
    imgs: [['0606','Balloon arch at the entrance'],['0602','Guests at the store front'],['0604','Ready for the ribbon cutting'],['0608','A festive entrance'],['0620','Goat Farm décor with balloons']] },
  { title: 'Fresh Cuts on Display', slug: 'fresh-cuts-on-display', cat: 'memorable-moments', featured: false, order: 4,
    short: 'Hygienically handled, freshly cut meat in chilled display counters.',
    desc: 'Every Meatyns store showcases fresh mutton and chicken in chilled glass counters, cut and cleaned daily so you can see exactly what you are buying.',
    imgs: [['0621','Fresh mutton cuts'],['0622','Whole chicken, cleaned and ready'],['0624','Chilled display counter'],['0625','Ready-to-cook packs'],['0635','Cold storage, always fresh']] },
  { title: 'Our Order & Pick-up Counter', slug: 'our-order-pickup-counter', cat: 'memorable-moments', featured: false, order: 5,
    short: 'Order, pay and pick up — quick and easy at the Meatyns counter.',
    desc: 'Our wooden-finish order counter, where every fresh order is packed and handed over with care.',
    imgs: [['0629','Pick-up counter'],['0615','Order counter close-up'],['0616','Ready for customers'],['0619','Your order is here'],['0630','Counter and display'],['0633','Your order is here signage']] },
  { title: 'Behind the Counter', slug: 'behind-the-counter', cat: 'achievements-and-milestones', featured: false, order: 6,
    short: 'The people and the prep area that bring fresh meat to your table.',
    desc: 'A peek behind the counter at our clean preparation area and the team that cuts, cleans and packs every order.',
    imgs: [['0639','Our preparation area'],['0623','Store and staff'],['0632','Bright, clean interiors'],['0627','Authentic meat awaits!']] },
];
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
const db = mongoose.connection.db;
const now = new Date(); const dp = `${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}`;
const dir = path.join(getUploadsDir(), 'gallery', dp); fs.mkdirSync(dir, { recursive: true });
for (const g of galleries) {
  if (await db.collection('galleries').findOne({ slug: g.slug })) { console.log('exists, skipping', g.slug); continue; }
  const cat = await db.collection('gallerycategories').findOne({ slug: g.cat });
  const images = g.imgs.map(([n, cap], i) => {
    const name = `${Date.now()+i}-${crypto.randomUUID()}.jpg`;
    fs.copyFileSync(path.join(SRC, `DSC_${n}.jpg`), path.join(dir, name));
    return { _id: new mongoose.Types.ObjectId(), url: `${getPublicBaseUrl()}/uploads/gallery/${dp}/${name}`, caption: cap, altText: cap, order: i };
  });
  await db.collection('galleries').insertOne({
    title: g.title, slug: g.slug, category: cat._id, franchiseName: '', location: '', city: '', state: '',
    eventDate: new Date('2026-03-15'), shortDescription: g.short, description: g.desc, images, coverImage: images[0].url,
    isFeatured: g.featured, showOnHomepage: true, isPublished: true, displayOrder: g.order,
    createdBy: null, updatedBy: null, createdAt: now, updatedAt: now, __v: 0 });
  console.log('created', g.slug, images.length, 'images');
}
const r = await db.collection('gallerysettings').updateMany({ homepageItemLimit: { $lt: 8 } }, { $set: { homepageItemLimit: 8 } });
console.log('homepage limit raised on', r.modifiedCount, 'settings doc(s)');
await mongoose.disconnect();
