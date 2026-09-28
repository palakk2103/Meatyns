import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import Product from '../app/models/product.js';
import Category from '../app/models/category.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function mapProducts() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB:", mongoose.connection.name);

  const categories = await Category.find({ type: "header" }).lean();
  const subcategories = await Category.find({ type: "category" }).lean();

  const findCat = (name) => categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  const findSub = (catId, subName) => subcategories.find(s => String(s.parentId) === String(catId) && s.name.toLowerCase().includes(subName.toLowerCase()));

  const products = await Product.find({}).lean();
  let updatedCount = 0;

  for (const prod of products) {
    const name = prod.name.toLowerCase();
    let targetCat = null;
    let targetSub = null;

    if (name.includes("chicken")) {
      targetCat = findCat("Chicken");
      if (name.includes("curry cut")) targetSub = findSub(targetCat._id, "curry cut");
      else if (name.includes("breast")) targetSub = findSub(targetCat._id, "breast");
      else if (name.includes("thigh")) targetSub = findSub(targetCat._id, "thigh");
      else if (name.includes("drumstick") || name.includes("tangdi")) targetSub = findSub(targetCat._id, "drumstick");
      else if (name.includes("wing")) targetSub = findSub(targetCat._id, "wings");
      else if (name.includes("keema") || name.includes("mince")) targetSub = findSub(targetCat._id, "keema");
      else if (name.includes("salami") || name.includes("sausage") || name.includes("ham")) {
        targetCat = findCat("Cold Cuts");
        targetSub = findSub(targetCat._id, "cold cuts") || findSub(targetCat._id, "sausage") || findSub(targetCat._id, "salami");
      } else {
        targetSub = findSub(targetCat._id, "boneless") || findSub(targetCat._id, "curry cut");
      }
    } else if (name.includes("mutton") || name.includes("goat") || name.includes("lamb")) {
      targetCat = findCat("Mutton");
      if (name.includes("curry cut")) targetSub = findSub(targetCat._id, "curry cut");
      else if (name.includes("biryani")) targetSub = findSub(targetCat._id, "biryani");
      else if (name.includes("keema") || name.includes("mince")) targetSub = findSub(targetCat._id, "keema");
      else if (name.includes("chop") || name.includes("rib")) targetSub = findSub(targetCat._id, "chops");
      else if (name.includes("goat")) targetSub = findSub(targetCat._id, "goat");
      else if (name.includes("lamb")) targetSub = findSub(targetCat._id, "lamb");
      else targetSub = findSub(targetCat._id, "boneless") || findSub(targetCat._id, "curry cut");
    } else if (name.includes("fish") || name.includes("rohu") || name.includes("surmai") || name.includes("pomfret")) {
      targetCat = findCat("Fish & Seafood");
      if (name.includes("curry cut")) targetSub = findSub(targetCat._id, "curry cut");
      else if (name.includes("fillet")) targetSub = findSub(targetCat._id, "fillet");
      else if (name.includes("steak")) targetSub = findSub(targetCat._id, "steak");
      else targetSub = findSub(targetCat._id, "freshwater") || findSub(targetCat._id, "curry cut");
    } else if (name.includes("prawn") || name.includes("crab") || name.includes("squid")) {
      targetCat = findCat("Prawns");
      if (name.includes("tiger") || name.includes("large") || name.includes("jumbo")) targetSub = findSub(targetCat._id, "large");
      else if (name.includes("small") || name.includes("medium")) targetSub = findSub(targetCat._id, "small");
      else targetSub = findSub(targetCat._id, "cleaned") || findSub(targetCat._id, "freshwater");
    } else if (name.includes("egg")) {
      targetCat = findCat("Eggs");
      if (name.includes("brown")) targetSub = findSub(targetCat._id, "brown");
      else if (name.includes("country") || name.includes("free range")) targetSub = findSub(targetCat._id, "country");
      else targetSub = findSub(targetCat._id, "classic");
    }

    if (targetCat) {
      if (!targetSub) {
        // Fallback to first subcategory under this category
        targetSub = subcategories.find(s => String(s.parentId) === String(targetCat._id));
      }

      await Product.updateOne(
        { _id: prod._id },
        {
          $set: {
            headerId: targetCat._id,
            categoryId: targetCat._id,
            subcategoryId: targetSub ? targetSub._id : targetCat._id
          }
        }
      );
      updatedCount++;
      console.log(`Mapped "${prod.name}" -> Category: ${targetCat.name}, Sub: ${targetSub?.name}`);
    }
  }

  console.log(`\nSuccessfully mapped ${updatedCount} products to Meatyns categories!`);
  await mongoose.disconnect();
}

mapProducts();
