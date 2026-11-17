import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import fs from "fs";
import mongoose from "mongoose"; import dotenv from "dotenv"; dotenv.config();
import Product from "../app/models/product.js";
import Category from "../app/models/category.js";
import { uploadToCloudinary } from "../app/utils/cloudinary.js";
await mongoose.connect(process.env.MONGO_URI);
const orig = await uploadToCloudinary(fs.readFileSync("C:/Users/HP/AppData/Local/Temp/claude/5032b8cf2a4015e7/8931e6d3-b8a6-41d0-9b21-1d94567a3d1d/scratchpad/sixpack.jpg"), "products", { mimeType: "image/jpeg", resourceType: "image", optimize: false });
const padded = orig.replace("/upload/", "/upload/c_pad,w_800,h_800,b_white/");
const buf = Buffer.from(await (await fetch(padded)).arrayBuffer());
const url = await uploadToCloudinary(buf, "products", { mimeType: "image/jpeg", resourceType: "image" });
console.log("broiler image", url);
console.log("products", (await Product.updateMany({ name: "Broiler Eggs – Pack of 6" }, { $set: { mainImage: url } })).modifiedCount);
console.log("subcat", (await Category.updateOne({ type: "subcategory", name: "Broiler Eggs" }, { $set: { image: url } })).modifiedCount);
console.log("cat", (await Category.updateOne({ type: "category", name: "Eggs" }, { $set: { image: url } })).modifiedCount);
const order = ["Mutton","Chicken","Fish & Seafood","Eggs","Prawns","Cold Cuts","Ready-to-Cook","Ready-to-Eat / Spreads"];
for (let i = 0; i < order.length; i++) {
  const r = await Category.updateOne({ type: "header", name: order[i] }, { $set: { displayOrder: i + 1 } });
  console.log(order[i], i + 1, r.matchedCount);
}
const hs = await Category.find({ type: "header" }).sort({ displayOrder: 1, name: 1 }).select("name displayOrder").lean();
console.log(hs.map(h => h.displayOrder + ":" + h.name).join(" | "));
process.exit(0);
