import dns from "dns"; dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Category from "../app/models/category.js";
import Product from "../app/models/product.js";
import Seller from "../app/models/seller.js";

const APPLY = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGO_URI);

const header = await Category.findOne({ type: "header", name: "Eggs" });
if (!header) throw new Error("Eggs header missing");

async function ensureCat(name, type, parentId, extra = {}) {
  let c = await Category.findOne({ type, name, parentId });
  if (c) return { c, created: false };
  if (!APPLY) return { c: { _id: new mongoose.Types.ObjectId(), name }, created: true };
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), n = 0, s = slug;
  while (await Category.exists({ slug: s })) s = `${slug}-${++n}`;
  c = await Category.create({ name, slug: s, type, parentId, status: "active", ...extra });
  return { c, created: true };
}

const cat = await ensureCat("Eggs", "category", header._id, { description: "Fresh eggs" });
const defs = [
  {
    key: "broiler", subName: "Broiler Eggs", skuPrefix: "broil",
    name: "Broiler Eggs – Pack of 6",
    description: "Enjoy everyday freshness with Meatyns Broiler Eggs, conveniently available in a pack of 6. A versatile kitchen essential, these eggs are suitable for breakfast, lunch, dinner and your favourite recipes. Use them to prepare omelettes, boiled eggs, egg bhurji, sandwiches, baking recipes and more.\n\nConveniently packed for everyday use, Meatyns Broiler Eggs make it easier to add eggs to your daily meals.\n\nPack Size: 6 Eggs",
    metaTitle: "Buy Broiler Eggs Pack of 6 Online | Meatyns",
    metaDescription: "Order Broiler Eggs – Pack of 6 from Meatyns. A convenient everyday choice for breakfast, cooking and baking. Order online today!",
    seoKeywords: ["Broiler Eggs", "Broiler Eggs Pack of 6", "Buy Eggs Online", "Fresh Eggs Online", "Chicken Eggs Pack of 6", "Eggs for Daily Consumption", "Eggs Online in Kolhapur", "Meatyns Eggs"],
  },
  {
    key: "gavran", subName: "Gavran Eggs", skuPrefix: "gavra",
    name: "Gavran Eggs – Pack of 6",
    description: "Bring a traditional touch to your everyday meals with Meatyns Gavran Eggs, available in a convenient pack of 6. Known for their traditional appeal, Gavran eggs are a popular choice for preparing delicious breakfasts and homemade recipes.\n\nEnjoy them boiled, in omelettes, egg bhurji, curries or your favourite egg-based dishes. Conveniently packed for your kitchen, Meatyns Gavran Eggs are a great addition to your everyday meal planning.\n\nPack Size: 6 Eggs",
    metaTitle: "Buy Gavran Eggs Pack of 6 Online | Meatyns",
    metaDescription: "Looking for Gavran Eggs? Order Meatyns Gavran Eggs in a convenient pack of 6 for your favourite homemade recipes. Order online today!",
    seoKeywords: ["Gavran Eggs", "Gavran Eggs Pack of 6", "Buy Gavran Eggs Online", "Desi Eggs Pack of 6", "Country Eggs Online", "Gavran Eggs Online", "Eggs Online in Kolhapur", "Meatyns Gavran Eggs"],
  },
];
console.log(`Category 'Eggs' under header: ${cat.created ? "CREATE" : "exists"}`);

const sellers = await Seller.find({}).sort({ createdAt: 1 }).select("_id email shopName").lean();
const primaryId = "6a61c24736109852f8dac028";
const codeFor = (s, i) => {
  if (String(s._id) === primaryId) return "";
  const m = /^kolhapur(\d)@/.exec(s.email); if (m) return `k${m[1]}`;
  if (/^pune@/.test(s.email)) return "pune";
  return String(s._id).slice(-6);
};

for (const d of defs) {
  const sub = await ensureCat(d.subName, "subcategory", cat.c._id);
  console.log(`Subcategory '${d.subName}': ${sub.created ? "CREATE" : "exists"}`);
  const baseSlug = d.name.toLowerCase().replace(/–/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let idx = 0;
  for (const s of sellers) {
    idx++;
    const code = codeFor(s, idx);
    const slug = code ? `${baseSlug}-${code}` : baseSlug;
    const sku = `${d.skuPrefix}-001${code ? "-" + code : ""}`;
    const existing = await Product.findOne({ sellerId: s._id, subcategoryId: sub.c._id, name: d.name });
    if (existing || await Product.exists({ slug })) { console.log(`  skip ${s.email} (exists)`); continue; }
    const doc = {
      name: d.name, slug, sku,
      description: d.description, metaTitle: d.metaTitle, metaDescription: d.metaDescription, seoKeywords: d.seoKeywords,
      price: 0, salePrice: 0, stock: 0, lowStockAlert: 5,
      weight: "6 Eggs", unit: "pack", unitValue: 1,
      headerId: header._id, categoryId: cat.c._id, subcategoryId: sub.c._id, sellerId: s._id,
      status: "inactive",           // hidden from customers until prices are set
      approvalStatus: "approved", lastSubmittedByRole: "seller",
      variants: [{ name: "Pack of 6", price: 0, salePrice: 0, stock: 0, sku, tieredPricing: [] }],
    };
    if (APPLY) await Product.create(doc);
    console.log(`  ${APPLY ? "created" : "would create"} ${slug} -> ${s.email}`);
  }
}
await mongoose.disconnect();
