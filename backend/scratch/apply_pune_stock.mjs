import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
import { invalidate, buildKey } from "../app/services/cacheService.js";
const NAMES = ["Goat Boneless ( Full Boneless )","Mutton Heart","Mutton Kapura (Medium)","Mutton Kidney (Small Pack)","Mutton Ran","Premium Goat Rib Bone Pieces","Pure Lamb Mince (Kheema)","Sunday Family Pack"];
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const sellerId = new mongoose.Types.ObjectId("6afab055ec0941919e8d7a75"); // Pune only
const docs = await col.find({sellerId, name:{$in:NAMES}}).toArray();
const zero = docs.filter(d=>d.stock===0 && d.variants?.length===4 && d.variants.every(v=>v.stock===0 && v.price>0));
const giz = await col.find({sellerId, name:"Chicken Gizzard"}).toArray();
console.log("found:",docs.length,"all-zero:",zero.length,"gizzard:",giz.length,giz.map(g=>g.status));
if (docs.length===8 && zero.length===8 && giz.length===1) {
  const file=`scratch/pune_stock_backup_${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify([...zero,...giz].map(d=>({_id:d._id,sellerId:d.sellerId,name:d.name,status:d.status,stock:d.stock,variants:d.variants})),null,1));
  const r = await col.bulkWrite(zero.map(d=>({updateOne:{filter:{_id:d._id,sellerId,stock:0},update:{$set:{stock:800,"variants.$[].stock":800,updatedAt:new Date()}}}})));
  const g = await col.updateOne({_id:giz[0]._id,sellerId},{$set:{status:"inactive",updatedAt:new Date()}});
  const mutton = await col.find({sellerId,name:{$not:/chicken|egg|gavran/i}}).toArray();
  console.log("backup:",file,"stock modified:",r.modifiedCount,"gizzard modified:",g.modifiedCount);
  console.log("Pune mutton in stock:",mutton.filter(d=>d.stock>0&&d.variants.every(v=>v.stock>0&&v.price>0)).length,"/",mutton.length,"| gizzard:",(await col.findOne({_id:giz[0]._id})).status);
  console.log("Pune active with price 0:",await col.countDocuments({sellerId,status:"active",price:0}));
  console.log("Gizzard elsewhere:",(await col.find({name:"Chicken Gizzard",sellerId:{$ne:sellerId}}).toArray()).map(x=>x.status).join(","));
  for (const k of [buildKey('catalog','productList','*'),'cache:offersections:public:*','cache:search:*',...[...zero,...giz].map(d=>`cache:catalog:product:${d._id}`)]) await invalidate(k);
}
await mongoose.disconnect();
process.exit(0);
