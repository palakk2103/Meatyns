import dns from "dns"; dns.setServers(["8.8.8.8", "1.1.1.1"]);
import fs from "fs";
import mongoose from "mongoose"; import dotenv from "dotenv"; dotenv.config();
import Product from "../app/models/product.js";
import Category from "../app/models/category.js";
import { uploadToCloudinary } from "../app/utils/cloudinary.js";
const OUT = process.argv[2]; const APPLY = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGO_URI);
const any = await Product.findOne({ name: /Broiler Eggs/ }).select("mainImage");
const base = any.mainImage;
const T = {
  broiler: "c_crop,x_310,y_240,w_480,h_480/c_fill,w_800,h_800,q_90",
  gavran: "c_crop,x_250,y_420,w_500,h_330/c_fill,w_800,h_800,q_90",
};
const urls = {};
for (const [k, t] of Object.entries(T)) {
  const u = base.replace("/upload/", `/upload/${t}/`);
  const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
  fs.writeFileSync(`${OUT}/${k}.jpg`, buf);
  console.log(k, buf.length);
  if (APPLY) urls[k] = await uploadToCloudinary(buf, "products", { mimeType: "image/jpeg", resourceType: "image" });
}
if (APPLY) {
  const map = { broiler: ["Broiler Eggs – Pack of 6", "Broiler Eggs"], gavran: ["Gavran Eggs – Pack of 6", "Gavran Eggs"] };
  for (const [k, [pn, sn]] of Object.entries(map)) {
    const r = await Product.updateMany({ name: pn }, { $set: { mainImage: urls[k] } });
    const c = await Category.updateOne({ type: "subcategory", name: sn }, { $set: { image: urls[k] } });
    console.log(k, urls[k], r.modifiedCount, c.modifiedCount);
  }
}
process.exit(0);
