import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
import { invalidate, buildKey } from "../app/services/cacheService.js";
const APPLY = process.argv.includes("--apply");
const OLD = "Pure Lamb Mince (Kheema)";
const strip = s => s.replace(/\blamb\s+/gi,"").replace(/(^|\. )([a-z])/g,(m,a,b)=>a+b.toUpperCase());
// seo keyword stays lowercase
const changes = d => {
  const set={};
  for (const f of ["name","description","metaTitle","metaDescription"]) if (/lamb/i.test(d[f]||"")) set[f]=strip(d[f]);
  if ((d.seoKeywords||[]).some(k=>/lamb/i.test(k))) set.seoKeywords=d.seoKeywords.map(k=>k.replace(/\blamb\s+/gi,""));
  return set;
};
await mongoose.connect(process.env.MONGO_URI);
const col = mongoose.connection.db.collection("products");
const docs = await col.find({name:OLD}).toArray();
console.log("matched:",docs.length);
console.log(JSON.stringify(changes(docs[0]||{}),null,1));
if (APPLY && docs.length) {
  const file=`scratch/lamb_mince_name_backup_${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify(docs.map(d=>({_id:d._id,name:d.name,description:d.description,metaTitle:d.metaTitle,metaDescription:d.metaDescription,seoKeywords:d.seoKeywords})),null,1));
  const r = await col.bulkWrite(docs.map(d=>({updateOne:{filter:{_id:d._id,name:OLD},update:{$set:{...changes(d),updatedAt:new Date()}}}})));
  const after = await col.find({_id:{$in:docs.map(d=>d._id)}}).toArray();
  console.log("backup:",file,"modified:",r.modifiedCount,"| still containing lamb:",after.filter(d=>Object.keys(changes(d)).length).length);
  for (const k of [buildKey('catalog','productList','*'),'cache:offersections:public:*','cache:search:*',...docs.map(d=>`cache:catalog:product:${d._id}`)]) await invalidate(k);
}
await mongoose.disconnect();
process.exit(0);
