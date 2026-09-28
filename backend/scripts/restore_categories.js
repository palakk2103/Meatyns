import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = 'mongodb+srv://meatynsapp_db_user:zZg8qj7t7c80bcGY@cluster0.azxo6db.mongodb.net/?appName=Cluster0';

async function restore() {
  console.log('Connecting to MongoDB cluster...');
  await mongoose.connect(MONGO_URI);

  const client = mongoose.connection.client;
  const quickcomDb = client.db('quickcom');
  const testDb = client.db('test');

  const srcCol = quickcomDb.collection('categories');
  const destCol = testDb.collection('categories');

  const countInQuickcom = await srcCol.countDocuments();
  console.log(`Source quickcom.categories has ${countInQuickcom} documents.`);

  if (countInQuickcom === 0) {
    console.error('Source has 0 categories! Aborting.');
    process.exit(1);
  }

  // Get source indexes
  const srcIndexes = await srcCol.indexes();

  // Clear dest categories
  console.log('Clearing test.categories...');
  await destCol.deleteMany({});

  // Copy in batches
  console.log(`Copying ${countInQuickcom} categories from quickcom to test...`);
  const cursor = srcCol.find({});
  let batch = [];
  let copied = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    batch.push(doc);

    if (batch.length >= 200) {
      await destCol.insertMany(batch, { ordered: false });
      copied += batch.length;
      console.log(`Copied ${copied}/${countInQuickcom}...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await destCol.insertMany(batch, { ordered: false });
    copied += batch.length;
  }
  console.log(`✓ Copied ${copied} categories successfully.`);

  // Recreate indexes
  console.log('Recreating indexes...');
  for (const idx of srcIndexes) {
    if (idx.name === '_id_') continue;
    try {
      const opts = { name: idx.name };
      if (idx.unique !== undefined) opts.unique = idx.unique;
      if (idx.sparse !== undefined) opts.sparse = idx.sparse;
      await destCol.createIndex(idx.key, opts);
    } catch (e) {
      console.warn(`Index ${idx.name} note:`, e.message);
    }
  }

  // Verify
  const testCount = await destCol.countDocuments();
  console.log(`✓ Verification: test.categories now has ${testCount} documents.`);

  // Check header categories count
  const headerCount = await destCol.countDocuments({ type: 'header' });
  console.log(`✓ Header categories in test: ${headerCount}`);

  // Check if "Fresh Meat & Seafood" exists
  let meatHeader = await destCol.findOne({
    type: 'header',
    name: { $regex: /meat|seafood|chicken/i }
  });

  if (!meatHeader) {
    console.log('Creating primary "Fresh Meat & Seafood" header for Meatyns...');
    const now = new Date();
    const headerId = new mongoose.Types.ObjectId();
    meatHeader = {
      _id: headerId,
      name: 'Fresh Meat & Seafood',
      slug: 'fresh-meat-seafood',
      type: 'header',
      status: 'active',
      parentId: null,
      headerColor: '#FFF1F2',
      headerFontColor: '#991B1B',
      headerIconColor: '#DC2626',
      image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=400&h=400',
      createdAt: now,
      updatedAt: now,
      __v: 0
    };
    await destCol.insertOne(meatHeader);

    // Create subcategories under Fresh Meat & Seafood
    const meatCategories = [
      {
        name: 'Fresh Chicken',
        slug: 'fresh-chicken',
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=400&h=400',
        subcategories: ['Chicken Curry Cut', 'Chicken Breast Boneless', 'Chicken Drumsticks', 'Chicken Thighs', 'Chicken Keema', 'Whole Chicken']
      },
      {
        name: 'Tender Mutton',
        slug: 'tender-mutton',
        image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=400&h=400',
        subcategories: ['Mutton Curry Cut', 'Mutton Chops', 'Mutton Boneless', 'Mutton Keema', 'Mutton Biryani Cut', 'Mutton Liver']
      },
      {
        name: 'Fish & Seafood',
        slug: 'fish-seafood',
        image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&q=80&w=400&h=400',
        subcategories: ['Fresh Rohu Fish', 'Catla Fish', 'Surmai (King Fish)', 'Pomfret', 'Prawns (Medium)', 'Tiger Prawns (Jumbo)']
      },
      {
        name: 'Eggs & Poultry',
        slug: 'eggs-poultry',
        image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=400&h=400',
        subcategories: ['Classic White Eggs (6 pcs)', 'Classic White Eggs (30 pcs)', 'Farm Fresh Brown Eggs', 'Country Free Range Eggs']
      }
    ];

    for (const cat of meatCategories) {
      const catId = new mongoose.Types.ObjectId();
      await destCol.insertOne({
        _id: catId,
        name: cat.name,
        slug: cat.slug,
        type: 'category',
        status: 'active',
        parentId: headerId,
        image: cat.image,
        createdAt: now,
        updatedAt: now,
        __v: 0
      });

      for (const subName of cat.subcategories) {
        await destCol.insertOne({
          _id: new mongoose.Types.ObjectId(),
          name: subName,
          slug: subName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          type: 'subcategory',
          status: 'active',
          parentId: catId,
          image: cat.image,
          createdAt: now,
          updatedAt: now,
          __v: 0
        });
      }
    }
    console.log('✓ Successfully created Meatyns Meat & Seafood categories & subcategories!');
  }

  const finalTotal = await destCol.countDocuments();
  const finalHeaders = await destCol.countDocuments({ type: 'header' });
  console.log(`🎉 ALL DONE! Total categories in test: ${finalTotal}, Header categories: ${finalHeaders}`);

  process.exit(0);
}

restore().catch((err) => {
  console.error('Fatal error during restore:', err);
  process.exit(1);
});
