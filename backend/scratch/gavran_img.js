import dns from "dns"; dns.setServers(["8.8.8.8","1.1.1.1"]);
import fs from "fs";
import mongoose from "mongoose"; import dotenv from "dotenv"; dotenv.config();
import Product from "../app/models/product.js";
import Category from "../app/models/category.js";
import { uploadToCloudinary } from "../app/utils/cloudinary.js";
await mongoose.connect(process.env.MONGO_URI);
const orig = await uploadToCloudinary(fs.readFileSync("C:/Users/HP/AppData/Local/Temp/claude/5032b8cf2a4015e7/8931e6d3-b8a6-41d0-9b21-1d94567a3d1d/scratchpad/browneggs.jpg"), "products", { mimeType: "image/jpeg", resourceType: "image", optimize: false });
const buf = Buffer.from(await (await fetch(orig.replace("/upload/", "/upload/c_fill,w_800,h_800,g_auto,q_90/"))).arrayBuffer());
const url = await uploadToCloudinary(buf, "products", { mimeType: "image/jpeg", resourceType: "image" });
console.log(url);
console.log((await Product.updateMany({ name: "Gavran Eggs – Pack of 6" }, { $set: { mainImage: url } })).modifiedCount,
 (await Category.updateOne({ type: "subcategory", name: "Gavran Eggs" }, { $set: { image: url } })).modifiedCount);
process.exit(0);
