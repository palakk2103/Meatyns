import mongoose from 'mongoose'; import dotenv from 'dotenv'; dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const db=mongoose.connection.db;
console.log(JSON.stringify(await db.collection('gallerycategories').find().toArray(),null,1));
const g=await db.collection('galleries').find().toArray();
console.log(JSON.stringify(g.map(x=>({_id:x._id,title:x.title,slug:x.slug,cat:x.category,pub:x.isPublished,n:x.images.length,img:x.images.slice(0,2),cover:x.coverImage,city:x.city})),null,1));
process.exit(0);
