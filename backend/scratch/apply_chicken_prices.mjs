import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
const APPLY = process.argv.includes("--apply");
const oid = (s) => new mongoose.Types.ObjectId(s);
const PUNE = "6afab055ec0941919e8d7a75";
const STORES = ["6a61c24736109852f8dac028" /* test */,"6afab050ec0941919e8d790f","6afab051ec0941919e8d795d","6afab052ec0941919e8d79a6","6afab053ec0941919e8d79eb","6afab054ec0941919e8d7a30"];
// DB product name -> [1kg, 500g] from the client's chicken price sheet
const SHEET = {
  "Gavran Whole Carcass":[460,230],
  "Chicken Curry Cut":[270,135],
  "Chicken Breast Boneless":[415,207],
  "Chicken Legpiece":[350,175],
  "Chicken Wings":[280,140],
  "Chicken Lollipop":[290,145],
  "Chicken Drumsticks":[320,160],
  "Chicken Liver":[160,80],
};
const NEW = "Chicken Liver", TEMPLATE = "Chicken Drumsticks", STOCK = 800;
// 250 g / 750 g are pro-rata of the 1 kg price, paise dropped (as the sheet does for 207.5 -> 207)
const pricesFor = ([kg,half]) => ({"1 kg":kg,"750 g":Math.floor(kg*3/4),"500 g":half,"250 g":Math.floor(kg/4)});
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const sellerIds = STORES.map(oid);
const docs = await col.find({sellerId:{$in:sellerIds}, name:{$in:Object.keys(SHEET)}}).toArray();
const errors=[], updates=[], inserts=[], changes=[];
if (STORES.includes(PUNE)) errors.push("Pune in targets");
for (const s of STORES) for (const n of Object.keys(SHEET)) {
  const m = docs.filter(d=>String(d.sellerId)===s && d.name===n).length;
  if (n===NEW ? m!==0 : m!==1) errors.push(`${s} ${n}: ${m} matches`);
}
for (const d of docs) {
  const want = pricesFor(SHEET[d.name]);
  const names = (d.variants||[]).map(v=>v.name);
  if (names.join("|")!=="1 kg|750 g|500 g|250 g") errors.push(`${d.name}: variants ${names}`);
  const set = {price:want["1 kg"], salePrice:want["1 kg"]};
  d.variants.forEach((v,i)=>{set[`variants.${i}.price`]=want[v.name]; set[`variants.${i}.salePrice`]=want[v.name];});
  // Drumsticks were empty placeholders (price 0, stock 0): give them the same stock as the other cuts
  if (d.price===0 && d.stock===0) { set.stock=STOCK; d.variants.forEach((_,i)=>set[`variants.${i}.stock`]=STOCK); }
  const diff = Object.entries(set).some(([k,v])=>k.split(".").reduce((o,p)=>o?.[p],d)!==v);
  if (diff) { changes.push(`${d.sellerId} ${d.name}: ${d.variants.map(v=>v.salePrice)} -> ${d.variants.map(v=>want[v.name])}`); updates.push({id:d._id,sellerId:d.sellerId,set}); }
}
for (const s of STORES) {
  const t = docs.find(d=>String(d.sellerId)===s && d.name===TEMPLATE); if (!t) continue;
  const want = pricesFor(SHEET[NEW]), sku = `chicken-liver-${s.slice(-6)}`;
  if (await col.findOne({$or:[{slug:sku},{sku}]})) errors.push(`slug/sku taken ${sku}`);
  const desc = "Fresh chicken liver, cleaned and perfect for fry, masala and curries.";
  inserts.push({...t, _id:new mongoose.Types.ObjectId(), name:NEW, slug:sku, sku,
    description:desc, metaTitle:"Chicken Liver | Fresh Chicken | Meatyns",
    metaDescription:`Buy Chicken Liver online from Meatyns. ${desc}`, seoKeywords:["chicken liver, fresh chicken liver"],
    price:want["1 kg"], salePrice:want["1 kg"], stock:STOCK, mainImage:"", galleryImages:[],
    variants:["1 kg","750 g","500 g","250 g"].map((n,i)=>({_id:new mongoose.Types.ObjectId(),name:n,price:want[n],salePrice:want[n],stock:STOCK,sku:i?`${sku}-${n.replace(" ","")}`:sku,tieredPricing:[]})),
    createdAt:new Date(), updatedAt:new Date(), __v:0});
}
for (const [n,p] of Object.entries(SHEET)) console.log(n.padEnd(26), JSON.stringify(pricesFor(p)));
console.log(changes.join("\n"));
console.log("updates:",updates.length,"inserts:",inserts.length,"errors:",errors);
if (APPLY && !errors.length) {
  const file=`scratch/chicken_price_backup_${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify({before:docs, insertedIds:inserts.map(d=>d._id)},null,1));
  const puneSnap = async()=>JSON.stringify(await col.find({sellerId:oid(PUNE)}).sort({_id:1}).toArray());
  const pune = await puneSnap();
  const r = await col.bulkWrite([...updates.map(u=>({updateOne:{filter:{_id:u.id,sellerId:u.sellerId},update:{$set:{...u.set,updatedAt:new Date()}}}})), ...inserts.map(document=>({insertOne:{document}}))]);
  console.log("backup:",file,"modified:",r.modifiedCount,"inserted:",r.insertedCount);
  const after = await col.find({sellerId:{$in:sellerIds}, name:{$in:Object.keys(SHEET)}}).toArray();
  const bad = after.filter(d=>{const w=pricesFor(SHEET[d.name]); return d.price!==w["1 kg"]||d.salePrice!==w["1 kg"]||d.variants.some(v=>v.price!==w[v.name]||v.salePrice!==w[v.name]);});
  console.log("verified docs:",after.length,"expected:",STORES.length*Object.keys(SHEET).length,"wrong prices:",bad.length,"| Pune unchanged:",pune===await puneSnap());
}
await mongoose.disconnect();
