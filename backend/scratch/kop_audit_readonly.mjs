import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose"; import fs from "fs";
await mongoose.connect(process.env.MONGO_URI);
const db=mongoose.connection.db;
const sellers=await db.collection("sellers").find({}).project({shopName:1,name:1,city:1,address:1,isActive:1,isVerified:1,applicationStatus:1}).toArray();
const counts=await db.collection("products").aggregate([{$group:{_id:"$sellerId",n:{$sum:1},a:{$sum:{$cond:[{$eq:["$status","active"]},1,0]}}}}]).toArray();
for(const s of sellers){const c=counts.find(c=>String(c._id)===String(s._id));console.log(String(s._id),s.shopName,"|",s.city||"",String(s.address||"").slice(0,60),"|",s.isActive,s.applicationStatus,"| prods",c?.n||0,"active",c?.a||0)}
const prods=await db.collection("products").find({}).toArray();
fs.writeFileSync(process.argv[2],JSON.stringify(prods));
const cats=await db.collection("categories").find({}).toArray();
fs.writeFileSync(process.argv[3],JSON.stringify(cats));
await mongoose.disconnect();
