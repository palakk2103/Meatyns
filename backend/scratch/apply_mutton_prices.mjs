import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
const APPLY = process.argv.includes("--apply");
const STORES = ["6a61c24736109852f8dac028" /* test */,"6afab050ec0941919e8d790f","6afab051ec0941919e8d795d","6afab052ec0941919e8d79a6","6afab053ec0941919e8d79eb","6afab054ec0941919e8d7a30"];
// DB product name -> [1kg, 500g] from price sheet dated 14-10-2026
const SHEET = {
 "Meatyns Special Mutton ( Liver & Fat less )":[930,465],
 "Meatyns Regular (Liver & Fat Add)":[850,425],
 "Goat Curry Cut":[860,430],
 "Mutton Liver":[790,395],
 "Premium Goat Rib Bone Pieces":[790,395],
 "Pure Lamb Mince (Kheema)":[1250,625],
 "Mutton Kidney (Small Pack)":[790,395],
 "Mutton Kapura (Medium)":[760,380],
 "Sunday Family Pack":[880,440],
 "Mutton Chops( Ribcage & T-Bone Steak )":[880,440],
 "Mutton Heart":[750,375],
 "Goat Boneless ( Full Boneless )":[1450,725],
 "Mutton Ran":[1300,650],
 "Mutton Paya ( Whole ) Pack Of 4":[900,450],
 "Mutton Paya with small pieces":[950,475],
};
const pricesFor=([kg,half])=>({"1 kg":kg,"750 g":kg*3/4,"500 g":half,"250 g":kg/4});
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const sellerIds = STORES.map(s=>new mongoose.Types.ObjectId(s));
const docs = await col.find({sellerId:{$in:sellerIds}, name:{$in:Object.keys(SHEET)}}).toArray();
const errors=[]; const ops=[];
for (const s of sellerIds) for (const n of Object.keys(SHEET)) { const c=docs.filter(d=>String(d.sellerId)===String(s)&&d.name===n).length; if(c!==1) errors.push(`${s} ${n}: ${c} matches`); }
for (const d of docs) {
  const want=pricesFor(SHEET[d.name]);
  const names=(d.variants||[]).map(v=>v.name);
  if (names.join("|")!=="1 kg|750 g|500 g|250 g") errors.push(`${d.name}: unexpected variants ${names}`);
  const set={price:want["1 kg"],salePrice:want["1 kg"],updatedAt:new Date()};
  d.variants.forEach((v,i)=>{set[`variants.${i}.price`]=want[v.name]; set[`variants.${i}.salePrice`]=want[v.name];});
  ops.push({updateOne:{filter:{_id:d._id,sellerId:d.sellerId},update:{$set:set}}});
}
console.log("docs:",docs.length,"expected:",STORES.length*Object.keys(SHEET).length,"errors:",errors);
for (const [n,p] of Object.entries(SHEET)) console.log(n.padEnd(42), JSON.stringify(pricesFor(p)));
if (APPLY && !errors.length) {
  const file=`scratch/mutton_price_backup_${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify(docs.map(d=>({_id:d._id,sellerId:d.sellerId,name:d.name,price:d.price,salePrice:d.salePrice,variants:d.variants})),null,1));
  const snapshot = async () => (await col.find({}).toArray()).map(d=>{ const {updatedAt,price,salePrice,variants,...rest}=d; return [String(d._id), JSON.stringify([rest,(variants||[]).map(({price,salePrice,...v})=>v)]), JSON.stringify([price,salePrice,(variants||[]).map(v=>[v.price,v.salePrice])])]; });
  const before=new Map((await snapshot()).map(r=>[r[0],r]));
  const r=await col.bulkWrite(ops);
  console.log("backup:",file,"matched:",r.matchedCount,"modified:",r.modifiedCount);
  // verify
  const targetIds=new Set(docs.map(d=>String(d._id)));
  let nonPrice=0, outside=0;
  for (const [id,rest,pr] of await snapshot()) { const b=before.get(id); if(!b) continue; if(b[1]!==rest) nonPrice++; if(!targetIds.has(id)&&b[2]!==pr) outside++; }
  let bad=0;
  for (const d of await col.find({_id:{$in:docs.map(d=>d._id)}}).toArray()) { const w=pricesFor(SHEET[d.name]); if(d.price!==w["1 kg"]||d.salePrice!==w["1 kg"]||d.variants.some(v=>v.price!==w[v.name]||v.salePrice!==w[v.name])) bad++; }
  console.log("wrong prices:",bad,"| docs with non-price changes (live traffic could affect):",nonPrice,"| price changes outside targets:",outside);
}
await mongoose.disconnect();
