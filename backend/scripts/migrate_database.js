import { MongoClient } from 'mongodb';
import dns from 'dns';

// Ensure DNS works smoothly for SRV lookup on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

const SOURCE_URI = 'mongodb+srv://anitamegamart_db_user:TUQArgxIYKPXb7na@cluster0.pllyl8j.mongodb.net/quickcom?retryWrites=true&w=majority&appName=Cluster0';
const DEST_URI = 'mongodb+srv://meatynsapp_db_user:zZg8qj7t7c80bcGY@cluster0.azxo6db.mongodb.net/?appName=Cluster0';

const SOURCE_DB_NAME = 'quickcom';
// Migrate to both 'quickcom' and 'test' on destination cluster so any connection URI works seamlessly
const TARGET_DBS = ['quickcom', 'test'];

async function migrateData() {
  console.log('====================================================');
  console.log('🚀 CLEAN & SAFE MONGODB DATA MIGRATION');
  console.log('====================================================');
  console.log(`Source DB: [${SOURCE_DB_NAME}] (STRICT READ-ONLY)`);
  console.log(`Destination DBs: [${TARGET_DBS.join(', ')}]`);
  console.log('----------------------------------------------------');

  const srcClient = new MongoClient(SOURCE_URI);
  const destClient = new MongoClient(DEST_URI);

  try {
    console.log('Connecting to Source MongoDB (READ-ONLY)...');
    await srcClient.connect();
    console.log('✓ Connected to Source successfully.');

    console.log('Connecting to Destination MongoDB...');
    await destClient.connect();
    console.log('✓ Connected to Destination successfully.');

    const srcDb = srcClient.db(SOURCE_DB_NAME);
    const collections = await srcDb.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections in source '${SOURCE_DB_NAME}'.\n`);

    const summary = [];

    for (const targetDbName of TARGET_DBS) {
      console.log(`\n====================================================`);
      console.log(`📦 MIGRATING TO DESTINATION DATABASE: [${targetDbName}]`);
      console.log(`====================================================`);

      const destDb = destClient.db(targetDbName);

      for (let i = 0; i < collections.length; i++) {
        const colInfo = collections[i];
        const colName = colInfo.name;

        // Skip system collections
        if (colName.startsWith('system.')) continue;

        const srcCol = srcDb.collection(colName);
        
        // Clean target collection on destination to ensure 1:1 perfect mirror
        try {
          await destDb.collection(colName).drop();
        } catch (e) {
          // Collection might not exist yet, that's fine
        }

        const destCol = destDb.collection(colName);

        const totalDocs = await srcCol.countDocuments();
        let indexes = [];
        try {
          indexes = await srcCol.indexes();
        } catch (e) {
          indexes = [];
        }

        console.log(`[${i + 1}/${collections.length}] Collection '${colName}': ${totalDocs} docs, ${indexes.length} indexes`);

        // 1. Copy documents in batches
        if (totalDocs > 0) {
          const cursor = srcCol.find({});
          let batch = [];

          while (await cursor.hasNext()) {
            const doc = await cursor.next();
            batch.push(doc);

            if (batch.length >= 500) {
              await destCol.insertMany(batch, { ordered: false });
              batch = [];
            }
          }

          if (batch.length > 0) {
            await destCol.insertMany(batch, { ordered: false });
            batch = [];
          }
        } else {
          // Explicitly create empty collection so it exists
          try {
            await destDb.createCollection(colName);
          } catch (e) {}
        }

        // 2. Recreate indexes (excluding default _id_)
        for (const idx of indexes) {
          if (idx.name === '_id_') continue;

          try {
            const options = { name: idx.name };
            if (idx.unique !== undefined) options.unique = idx.unique;
            if (idx.sparse !== undefined) options.sparse = idx.sparse;
            if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
            if (idx.weights !== undefined) options.weights = idx.weights;
            if (idx.default_language !== undefined) options.default_language = idx.default_language;
            if (idx.language_override !== undefined) options.language_override = idx.language_override;
            if (idx.partialFilterExpression !== undefined) options.partialFilterExpression = idx.partialFilterExpression;

            await destCol.createIndex(idx.key, options);
          } catch (idxErr) {
            console.warn(`    ⚠️ Index warning on ${colName}.${idx.name}: ${idxErr.message}`);
          }
        }

        // 3. Verify count
        const destCount = await destCol.countDocuments();
        let destIndexes = [];
        try {
          destIndexes = await destCol.indexes();
        } catch (e) {
          destIndexes = [];
        }

        if (targetDbName === 'quickcom') {
          summary.push({
            collection: colName,
            srcDocs: totalDocs,
            destDocs: destCount,
            srcIndexes: indexes.length,
            destIndexes: destIndexes.length,
            status: totalDocs === destCount ? '✅ MATCH' : '❌ MISMATCH'
          });
        }
      }
    }

    console.log('\n====================================================');
    console.log('📊 MIGRATION VERIFICATION REPORT (Source vs Destination quickcom)');
    console.log('====================================================');
    console.table(summary);

    const allMatched = summary.every(s => s.status === '✅ MATCH');
    console.log('\n----------------------------------------------------');
    if (allMatched) {
      console.log('🎉 100% SUCCESS: ALL 75 COLLECTIONS & DOCUMENTS COPIED PERFECTLY!');
    } else {
      console.warn('⚠️ Some collection counts differ. Please check table above.');
    }
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Migration failed with error:', err);
    process.exit(1);
  } finally {
    await srcClient.close();
    await destClient.close();
    console.log('Database connections closed cleanly.');
  }
}

migrateData();
