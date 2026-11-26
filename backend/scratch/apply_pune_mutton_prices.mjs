import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
import { invalidate, buildKey } from "../app/services/cacheService.js";
const APPLY = process.argv.includes("--apply");
const PUNE = "6afab055ec0941919e8d7a75";
// DB product name -> 1kg price from the Pune price sheet (500g = half)
const SHEET = {
  "Meatyns Special Mutton ( Liver & Fat less )":1050,
  "Meatyns Regular (Liver & Fat Add)":930,
  "Goat Curry Cut":930,
  "Premium Goat Curry Cut (Long Shoulder, Boneless & Goat Shank)":980,
  "Mutton Chops( Ribcage & T-Bone Steak )":1000,
  "Sunday Family Pack":960,
  "Mutton Ran":1300,
  "Goat Boneless ( Full Boneless )":1450,
  "Pure Lamb Mince (Kheema)":1300,
  "Premium Goat Rib Bone Pieces":830,
  "Mutton Liver":830,
  "Mutton Kidney (Small Pack)":830,
  "Mutton Kapura (Medium)":800,
  "Mutton Heart":800,
  "Mutton Paya ( Whole ) Pack Of 4":1000,
  "Mutton Paya with small pieces":1000,
};
// 750g / 250g: proportional, rounded down to Rs 5 (same as the already-priced Pune items)
const down5 = n => Math.floor(n/5)*5;
const pricesFor = kg => ({"1 kg":kg,"750 g":down5(kg*3/4),"500 g":kg/2,"250 g":down5(kg/4)});
const wrong = d => { const w=pricesFor(SHEET[d.name]); return d.price!==w["1 kg"]||d.salePrice!==w["1 kg"]||d.variants.some(v=>v.price!==w[v.name]||v.salePrice!==w[v.name]); };
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const sellerId = new mongoose.Types.ObjectId(PUNE);
const docs = await col.find({sellerId, name:{$in:Object.keys(SHEET)}}).toArray();
const errors=[];
for (const n of Object.keys(SHEET)) { const c=docs.filter(d=>d.name===n).length; if(c!==1) errors.push(`${n}: ${c} matches`); }
for (const d of docs) if ((d.variants||[]).map(v=>v.name).join("|")!=="1 kg|750 g|500 g|250 g") errors.push(`${d.name}: unexpected variants`);
const targets = errors.length ? [] : docs.filter(wrong);
console.log("matched:",docs.length,"errors:",errors,"to change:",targets.length);
for (const d of targets) console.log(d.name.padEnd(36),"old",JSON.stringify(d.variants.map(v=>[v.price,v.salePrice]))," new",JSON.stringify(Object.values(pricesFor(SHEET[d.name]))));
if (APPLY && targets.length) {
  const file=`scratch/pune_mutton_price_backup_${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify(targets.map(d=>({_id:d._id,sellerId:d.sellerId,name:d.name,price:d.price,salePrice:d.salePrice,variants:d.variants})),null,1));
  const r = await col.bulkWrite(targets.map(d=>{
    const w=pricesFor(SHEET[d.name]); const set={price:w["1 kg"],salePrice:w["1 kg"],updatedAt:new Date()};
    d.variants.forEach((v,i)=>{set[`variants.${i}.price`]=w[v.name]; set[`variants.${i}.salePrice`]=w[v.name];});
    return {updateOne:{filter:{_id:d._id,sellerId},update:{$set:set}}};
  }));
  const after = await col.find({_id:{$in:docs.map(d=>d._id)}}).toArray();
  console.log("backup:",file,"modified:",r.modifiedCount,"| wrong after (of 16):",after.filter(wrong).length);
  for (const k of [buildKey('catalog','productList','*'),'cache:offersections:public:*','cache:search:*',...targets.map(d=>`cache:catalog:product:${d._id}`)]) await invalidate(k);
}
await mongoose.disconnect();
process.exit(0);
