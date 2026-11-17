import dns from "dns"; dns.setServers(["8.8.8.8", "1.1.1.1"]);
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Product from "../app/models/product.js";
import { uploadToCloudinary } from "../app/utils/cloudinary.js";
import { invalidate, buildKey } from "../app/services/cacheService.js";
import { enqueueProductIndex } from "../app/services/searchSyncService.js";

await mongoose.connect(process.env.MONGO_URI);
const img = await uploadToCloudinary(fs.readFileSync("../frontend/public/categories/eggs.jpg"), "products", { mimeType: "image/jpeg", resourceType: "image" });
console.log("image:", img);
const PRICES = { "Broiler Eggs – Pack of 6": 54, "Gavran Eggs – Pack of 6": 90 };
for (const [name, price] of Object.entries(PRICES)) {
  const prods = await Product.find({ name });
  for (const p of prods) {
    p.price = price; p.salePrice = price; p.stock = 100; p.mainImage = img; p.status = "active";
    p.variants[0].price = price; p.variants[0].salePrice = price; p.variants[0].stock = 100;
    await p.save();
    try { await enqueueProductIndex(String(p._id)); await invalidate(`cache:catalog:product:${p._id}`); } catch (e) { console.log("index/cache warn:", e.message); }
  }
  console.log(name, "updated", prods.length);
}
for (const k of [buildKey("catalog", "productList", "*"), "cache:catalog:categories:*", "cache:offersections:public:*", "cache:search:*", "cache:sellers:nearby:*"]) {
  try { await invalidate(k); } catch (e) { console.log("cache warn", k, e.message); }
}
console.log("done");
await mongoose.disconnect(); process.exit(0);
