import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import crypto from "crypto";
await mongoose.connect(process.env.MONGO_URI);
const db=mongoose.connection.db;
const shops=new Map((await db.collection("sellers").find({}).project({shopName:1,city:1,isActive:1}).toArray()).map(s=>[String(s._id),s]));
const docs=await db.collection("products").find({name:/^\s*meatyns regular/i}).toArray();
const hash=new Map();
for(const u of new Set(docs.map(d=>d.mainImage))){for(let i=0;i<6;i++){try{hash.set(u,crypto.createHash("md5").update(Buffer.from(await (await fetch(u)).arrayBuffer())).digest("hex"));break}catch(e){console.log("retry",e.message)}}}
for(const d of docs){const s=shops.get(String(d.sellerId));console.log(s?.shopName,"|",s?.city,"| sellerActive",s?.isActive,"|",d.status,"|",d.mainImage.split("/").pop(),hash.get(d.mainImage),"| gallery",d.galleryImages?.length||0)}
await mongoose.disconnect();
