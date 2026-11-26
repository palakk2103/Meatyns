import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
const STORES = ["6a61c24736109852f8dac028","6afab050ec0941919e8d790f","6afab051ec0941919e8d795d","6afab052ec0941919e8d79a6","6afab053ec0941919e8d79eb","6afab054ec0941919e8d7a30"];
const NAMES = ["Goat Boneless ( Full Boneless )","Mutton Heart","Mutton Kapura (Medium)","Mutton Kidney (Small Pack)","Mutton Ran","Premium Goat Rib Bone Pieces","Pure Lamb Mince (Kheema)","Sunday Family Pack"];
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const docs = await col.find({sellerId:{$in:STORES.map(s=>new mongoose.Types.ObjectId(s))}, name:{$in:NAMES}}).toArray();
const zero = docs.filter(d=>d.stock===0 && d.variants?.length===4 && d.variants.every(v=>v.stock===0));
console.log("found:",docs.length,"all-zero:",zero.length);
if (docs.length===48 && zero.length===48) {
  fs.writeFileSync(`scratch/mutton_stock_backup_${Date.now()}.json`, JSON.stringify(zero.map(d=>({_id:d._id,sellerId:d.sellerId,name:d.name,stock:d.stock,variants:d.variants})),null,1));
  const r = await col.bulkWrite(zero.map(d=>({updateOne:{filter:{_id:d._id,sellerId:d.sellerId,stock:0},update:{$set:{stock:800,"variants.$[].stock":800,updatedAt:new Date()}}}})));
  const ok = (await col.find({_id:{$in:zero.map(d=>d._id)}}).toArray()).filter(d=>d.stock===800&&d.variants.every(v=>v.stock===800&&v.price>0)&&d.status==="active");
  console.log("modified:",r.modifiedCount,"verified (800 stock, priced, active):",ok.length, "approval:",[...new Set(ok.map(d=>d.approvalStatus))], "with image:", ok.filter(d=>d.mainImage).length);
}
await mongoose.disconnect();
