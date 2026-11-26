import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
const STORES = ["6a61c24736109852f8dac028","6afab050ec0941919e8d790f","6afab051ec0941919e8d795d","6afab052ec0941919e8d79a6","6afab053ec0941919e8d79eb","6afab054ec0941919e8d7a30"];
const NAMES = ["Meatyns Special Mutton ( Liver & Fat less )","Meatyns Regular (Liver & Fat Add)","Goat Curry Cut","Mutton Liver","Premium Goat Rib Bone Pieces","Pure Lamb Mince (Kheema)","Mutton Kidney (Small Pack)","Mutton Kapura (Medium)","Sunday Family Pack","Mutton Chops( Ribcage & T-Bone Steak )","Mutton Heart","Goat Boneless ( Full Boneless )","Mutton Ran","Mutton Paya ( Whole ) Pack Of 4","Mutton Paya with small pieces"];
const APPLY = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const docs = await col.find({sellerId:{$in:STORES.map(s=>new mongoose.Types.ObjectId(s))}, name:{$in:NAMES}}).toArray();
const frac = n => !Number.isInteger(n);
const ops=[], changes=new Map(), touched=[];
for (const d of docs) {
  const set={}, filter={_id:d._id,sellerId:d.sellerId};
  d.variants.forEach((v,i)=>{ for (const k of ["price","salePrice"]) if (frac(v[k])) { set[`variants.${i}.${k}`]=Math.round(v[k]); filter[`variants.${i}.${k}`]=v[k]; changes.set(v[k],Math.round(v[k])); } });
  if (Object.keys(set).length) { set.updatedAt=new Date(); ops.push({updateOne:{filter,update:{$set:set}}}); touched.push(d); }
}
console.log("docs:",docs.length,"to change:",ops.length,[...changes].sort((a,b)=>a[0]-b[0]).map(c=>c.join("->")).join(", "));
if (APPLY && docs.length===90) {
  fs.writeFileSync(`scratch/mutton_round_backup_${Date.now()}.json`, JSON.stringify(touched.map(d=>({_id:d._id,name:d.name,variants:d.variants})),null,1));
  const r=await col.bulkWrite(ops);
  const after=await col.find({_id:{$in:docs.map(d=>d._id)}}).toArray();
  console.log("modified:",r.modifiedCount,"decimal prices left:",after.reduce((n,d)=>n+[d,...d.variants].filter(v=>frac(v.price)||frac(v.salePrice)).length,0));
}
await mongoose.disconnect();
