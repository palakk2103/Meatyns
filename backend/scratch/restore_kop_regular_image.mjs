import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose";
import { invalidate, buildKey } from "../app/services/cacheService.js";
// The client confirmed the earlier photo is the right one: restore it on the Kolhapur stores only.
const KOLHAPUR=["6afab050ec0941919e8d790f","6afab051ec0941919e8d795d","6afab052ec0941919e8d79a6","6afab053ec0941919e8d79eb","6afab054ec0941919e8d7a30"];
const NAME="Meatyns Regular (Liver & Fat Add)";
const FROM="https://res.cloudinary.com/szohobky/image/upload/v1795692962/products/l3zyh5ntt0jsed3yjmae.png";
const TO="https://res.cloudinary.com/szohobky/image/upload/v1795677921/products/f1qqzljhyl72hyaevtzd.png";
await mongoose.connect(process.env.MONGO_URI);
const col=mongoose.connection.db.collection("products");
const ids=KOLHAPUR.map(s=>new mongoose.Types.ObjectId(s));
const docs=await col.find({sellerId:{$in:ids},name:NAME,mainImage:FROM}).toArray();
if(docs.length!==5) throw new Error(`unexpected state: ${docs.length} docs`);
const r=await col.updateMany({_id:{$in:docs.map(d=>d._id)},sellerId:{$in:ids},mainImage:FROM},{$set:{mainImage:TO,updatedAt:new Date()}});
const all=await col.find({name:/^\s*meatyns regular/i}).toArray();
console.log("modified:",r.modifiedCount,"| Meatyns Regular docs:",all.length,"| using linked photo:",all.filter(d=>d.mainImage===TO).length);
for(const k of [buildKey("catalog","productList","*"),"cache:offersections:public:*","cache:search:*",...docs.map(d=>`cache:catalog:product:${d._id}`)]) await invalidate(k);
await mongoose.disconnect(); process.exit(0);
