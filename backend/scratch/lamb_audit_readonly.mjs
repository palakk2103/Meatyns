import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import "dotenv/config"; import mongoose from "mongoose";
await mongoose.connect(process.env.MONGO_URI);
const docs = await mongoose.connection.db.collection("products").find({name:/lamb mince/i}).toArray();
console.log("count",docs.length);
for (const d of docs) {
  const hits={};
  const walk=(v,p)=>{ if(typeof v==="string"){ if(/lamb/i.test(v)) hits[p]=v; } else if(v&&typeof v==="object"&&(Array.isArray(v)||v.constructor===Object)) for(const [k,x] of Object.entries(v)) walk(x,p?`${p}.${k}`:k); };
  walk(d,"");
  console.log(String(d._id),String(d.sellerId),d.status,JSON.stringify(hits,null,1));
}
await mongoose.disconnect();
