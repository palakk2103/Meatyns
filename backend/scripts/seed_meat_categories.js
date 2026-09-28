import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://meatynsapp_db_user:zZg8qj7t7c80bcGY@cluster0.azxo6db.mongodb.net/?appName=Cluster0';

// Meatyns Fresh Meat & Seafood Catalogue
const MEATYNS_CATALOGUE = [
  {
    name: "Chicken",
    slug: "chicken",
    displayOrder: 1,
    image: "/categories/chicken.png",
    description: "Farm fresh, tender, antibiotic-residue-free fresh chicken cuts",
    subcategories: [
      { name: "Biryani Cut", slug: "chicken-biryani-cut", displayOrder: 1 },
      { name: "Chicken Curry Cut", slug: "chicken-curry-cut", displayOrder: 2 },
      { name: "Chicken Tenders", slug: "chicken-tenders", displayOrder: 3 },
      { name: "Boneless Chicken", slug: "boneless-chicken", displayOrder: 4 },
      { name: "Chicken Breast", slug: "chicken-breast", displayOrder: 5 },
      { name: "Chicken Thigh", slug: "chicken-thigh", displayOrder: 6 },
      { name: "Chicken Wings", slug: "chicken-wings", displayOrder: 7 },
      { name: "Chicken Legs", slug: "chicken-legs", displayOrder: 8 },
      { name: "Chicken Drumsticks", slug: "chicken-drumsticks", displayOrder: 9 },
      { name: "Chicken Keema / Mince", slug: "chicken-keema-mince", displayOrder: 10 },
      { name: "Chicken Liver", slug: "chicken-liver", displayOrder: 11 },
      { name: "Chicken Gizzard", slug: "chicken-gizzard", displayOrder: 12 },
      { name: "Whole Chicken", slug: "whole-chicken", displayOrder: 13 },
    ]
  },
  {
    name: "Fish & Seafood",
    slug: "fish-seafood",
    displayOrder: 2,
    image: "/categories/fish.png",
    description: "Daily fresh catch, chemical-free ocean and freshwater fish",
    subcategories: [
      { name: "Freshwater Fish", slug: "freshwater-fish", displayOrder: 1 },
      { name: "Seawater Fish", slug: "seawater-fish", displayOrder: 2 },
      { name: "Whole Fish", slug: "whole-fish", displayOrder: 3 },
      { name: "Fish Fillets", slug: "fish-fillets", displayOrder: 4 },
      { name: "Fish Steaks", slug: "fish-steaks", displayOrder: 5 },
      { name: "Fish Curry Cut", slug: "fish-curry-cut", displayOrder: 6 },
      { name: "Fish Fry Cut", slug: "fish-fry-cut", displayOrder: 7 },
      { name: "Crabs", slug: "crabs", displayOrder: 8 },
      { name: "Squid", slug: "squid", displayOrder: 9 },
      { name: "Other Seafood", slug: "other-seafood", displayOrder: 10 },
    ]
  },
  {
    name: "Mutton",
    slug: "mutton",
    displayOrder: 3,
    image: "/categories/mutton.png",
    description: "Prime pasture-raised, tender and flavorful goat and lamb meat cuts",
    subcategories: [
      { name: "Mutton Curry Cut", slug: "mutton-curry-cut", displayOrder: 1 },
      { name: "Mutton Biryani Cut", slug: "mutton-biryani-cut", displayOrder: 2 },
      { name: "Mutton Boneless", slug: "mutton-boneless", displayOrder: 3 },
      { name: "Mutton Keema / Mince", slug: "mutton-keema-mince", displayOrder: 4 },
      { name: "Mutton Chops", slug: "mutton-chops", displayOrder: 5 },
      { name: "Mutton Ribs", slug: "mutton-ribs", displayOrder: 6 },
      { name: "Goat Meat", slug: "goat-meat", displayOrder: 7 },
      { name: "Lamb", slug: "lamb", displayOrder: 8 },
      { name: "Lamb Ribs & Chops", slug: "lamb-ribs-chops", displayOrder: 9 },
      { name: "Mutton Liver", slug: "mutton-liver", displayOrder: 10 },
      { name: "Other Mutton Cuts", slug: "other-mutton-cuts", displayOrder: 11 },
    ]
  },
  {
    name: "Eggs",
    slug: "eggs",
    displayOrder: 4,
    image: "/categories/eggs.jpg",
    description: "Naturally laid, antibiotic-free farm fresh eggs",
    subcategories: [
      { name: "Classic Eggs", slug: "classic-eggs", displayOrder: 1 },
      { name: "Brown Eggs", slug: "brown-eggs", displayOrder: 2 },
      { name: "Country Eggs", slug: "country-eggs", displayOrder: 3 },
      { name: "Quail Eggs", slug: "quail-eggs", displayOrder: 4 },
      { name: "Kadaknath Eggs", slug: "kadaknath-eggs", displayOrder: 5 },
      { name: "Specialty Eggs", slug: "specialty-eggs", displayOrder: 6 },
    ]
  },
  {
    name: "Prawns",
    slug: "prawns",
    displayOrder: 5,
    image: "/categories/prawns.png",
    description: "Juicy, sweet, cleaned & deveined fresh prawns",
    subcategories: [
      { name: "Freshwater Prawns", slug: "freshwater-prawns", displayOrder: 1 },
      { name: "Seawater Prawns", slug: "seawater-prawns", displayOrder: 2 },
      { name: "Small Prawns", slug: "small-prawns", displayOrder: 3 },
      { name: "Large Prawns", slug: "large-prawns", displayOrder: 4 },
      { name: "Whole Prawns", slug: "whole-prawns", displayOrder: 5 },
      { name: "Tail-on Prawns", slug: "tail-on-prawns", displayOrder: 6 },
      { name: "Tail-off Prawns", slug: "tail-off-prawns", displayOrder: 7 },
      { name: "Cleaned & Deveined Prawns", slug: "cleaned-deveined-prawns", displayOrder: 8 },
    ]
  },
  {
    name: "Cold Cuts",
    slug: "cold-cuts",
    displayOrder: 6,
    image: "/categories/coldcuts.jpg",
    description: "Ready-to-eat smoked sausages, artisanal salamis, and tender meat slices",
    subcategories: [
      { name: "Chicken Cold Cuts", slug: "chicken-cold-cuts", displayOrder: 1 },
      { name: "Meat Slices", slug: "meat-slices", displayOrder: 2 },
      { name: "Sausages", slug: "sausages", displayOrder: 3 },
      { name: "Salami", slug: "salami", displayOrder: 4 },
      { name: "Gourmet Cold Cuts", slug: "gourmet-cold-cuts", displayOrder: 5 },
      { name: "Other Cold Cuts", slug: "other-cold-cuts", displayOrder: 6 },
    ]
  },
  {
    name: "Ready-to-Cook",
    slug: "ready-to-cook",
    displayOrder: 7,
    image: "/categories/marinades.jpg",
    description: "Gourmet marinated meats, chef-crafted kebabs and tikkas",
    subcategories: [
      { name: "Kebabs", slug: "kebabs", displayOrder: 1 },
      { name: "Tikkas", slug: "tikkas", displayOrder: 2 },
      { name: "Marinated Chicken", slug: "marinated-chicken", displayOrder: 3 },
      { name: "Marinated Mutton", slug: "marinated-mutton", displayOrder: 4 },
      { name: "Marinated Fish", slug: "marinated-fish", displayOrder: 5 },
      { name: "Marinated Prawns", slug: "marinated-prawns", displayOrder: 6 },
      { name: "Tandoori Specials", slug: "tandoori-specials", displayOrder: 7 },
      { name: "Crispy Snacks", slug: "crispy-snacks", displayOrder: 8 },
      { name: "Ready-to-Cook Meat", slug: "ready-to-cook-meat", displayOrder: 9 },
      { name: "Ready-to-Cook Seafood", slug: "ready-to-cook-seafood", displayOrder: 10 },
    ]
  },
  {
    name: "Ready-to-Eat / Spreads",
    slug: "ready-to-eat-spreads",
    displayOrder: 8,
    image: "/categories/steaks.jpg",
    description: "Meatyns freshly made meat, prawn, and egg spreads for quick meals",
    subcategories: [
      { name: "Chicken Spreads", slug: "chicken-spreads", displayOrder: 1 },
      { name: "Prawn Spreads", slug: "prawn-spreads", displayOrder: 2 },
      { name: "Egg Spreads", slug: "egg-spreads", displayOrder: 3 },
      { name: "Meat Spreads", slug: "meat-spreads", displayOrder: 4 },
      { name: "Other Ready-to-Eat", slug: "other-ready-to-eat", displayOrder: 5 },
    ]
  }
];

async function seedCategories() {
  try {
    console.log("Connecting to Meatyns Database...");
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const categoriesCol = db.collection("categories");
    console.log("Connected successfully to DB:", mongoose.connection.name);

    let totalHeadersCreated = 0;
    let totalHeadersUpdated = 0;
    let totalSubsCreated = 0;
    let totalSubsUpdated = 0;

    for (const cat of MEATYNS_CATALOGUE) {
      // Find or create main category
      let headerDoc = await categoriesCol.findOne({
        $or: [{ slug: cat.slug }, { name: cat.name }]
      });

      let headerId;
      if (headerDoc) {
        headerId = headerDoc._id;
        await categoriesCol.updateOne(
          { _id: headerId },
          {
            $set: {
              name: cat.name,
              slug: cat.slug,
              type: "header",
              parentId: null,
              status: "active",
              displayOrder: cat.displayOrder,
              image: cat.image,
              description: cat.description,
              updatedAt: new Date()
            }
          }
        );
        totalHeadersUpdated++;
        console.log(`[Meatyns] Updated category: "${cat.name}" (Order: ${cat.displayOrder})`);
      } else {
        headerId = new mongoose.Types.ObjectId();
        await categoriesCol.insertOne({
          _id: headerId,
          name: cat.name,
          slug: cat.slug,
          type: "header",
          parentId: null,
          status: "active",
          displayOrder: cat.displayOrder,
          image: cat.image,
          description: cat.description,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        totalHeadersCreated++;
        console.log(`[Meatyns] Created category: "${cat.name}" (Order: ${cat.displayOrder})`);
      }

      // Seed / update subcategories under this category
      if (Array.isArray(cat.subcategories)) {
        for (const sub of cat.subcategories) {
          const existingSub = await categoriesCol.findOne({
            $or: [
              { slug: sub.slug },
              { name: sub.name, parentId: headerId }
            ]
          });

          if (existingSub) {
            await categoriesCol.updateOne(
              { _id: existingSub._id },
              {
                $set: {
                  name: sub.name,
                  slug: sub.slug,
                  type: "category",
                  parentId: headerId,
                  status: "active",
                  displayOrder: sub.displayOrder,
                  updatedAt: new Date()
                }
              }
            );
            totalSubsUpdated++;
          } else {
            await categoriesCol.insertOne({
              _id: new mongoose.Types.ObjectId(),
              name: sub.name,
              slug: sub.slug,
              type: "category",
              parentId: headerId,
              status: "active",
              displayOrder: sub.displayOrder,
              image: cat.image,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            totalSubsCreated++;
            console.log(`  + Subcategory: "${sub.name}" under ${cat.name}`);
          }
        }
      }
    }

    const totalActiveCategories = await categoriesCol.countDocuments({ status: "active" });
    console.log("\n==============================================");
    console.log(`Meatyns Catalogue Seed Summary:`);
    console.log(`  Categories Created: ${totalHeadersCreated}, Updated: ${totalHeadersUpdated}`);
    console.log(`  Subcategories Created: ${totalSubsCreated}, Updated: ${totalSubsUpdated}`);
    console.log(`  Total Active Catalogue Items: ${totalActiveCategories}`);
    console.log("==============================================\n");

    await mongoose.disconnect();
    console.log("Database disconnected. Seed complete!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed Meatyns categories:", error);
    process.exit(1);
  }
}

seedCategories();
