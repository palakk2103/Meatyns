import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function replaceBranding(val) {
  if (typeof val === 'string') {
    // Replace standalone or hyphenated or prefixed licious with Meatyns
    // preserve delicious and malicious
    return val
      .replace(/\bLicious\b/g, 'Meatyns')
      .replace(/\blicious\b/g, 'meatyns')
      .replace(/licious-/gi, 'meatyns-')
      .replace(/-licious/gi, '-meatyns')
      .replace(/Licious /gi, 'Meatyns ')
      .replace(/ licious /gi, ' meatyns ');
  } else if (Array.isArray(val)) {
    return val.map(replaceBranding);
  } else if (val !== null && typeof val === 'object' && !(val instanceof mongoose.Types.ObjectId) && !(val instanceof Date)) {
    const updated = {};
    for (const [k, v] of Object.entries(val)) {
      updated[k] = replaceBranding(v);
    }
    return updated;
  }
  return val;
}

async function cleanAllCollections() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB:', mongoose.connection.name);
  const collections = await mongoose.connection.db.listCollections().toArray();
  
  for (const col of collections) {
    const name = col.name;
    const items = await mongoose.connection.db.collection(name).find({}).toArray();

    for (const item of items) {
      const rawStr = JSON.stringify(item).toLowerCase();
      const cleaned = rawStr.replace(/delicious/g, '').replace(/malicious/g, '');
      if (cleaned.includes('licious')) {
        console.log(`Found item to sanitize in ${name}: ID ${item._id}`);
        const updatedDoc = replaceBranding(item);
        delete updatedDoc._id; // avoid immutable field error
        await mongoose.connection.db.collection(name).updateOne(
          { _id: item._id },
          { $set: updatedDoc }
        );
        console.log(` -> Successfully sanitized item ID ${item._id}`);
      }
    }
  }

  console.log('Finished sanitizing database branding.');
  await mongoose.disconnect();
}

cleanAllCollections().catch(err => {
  console.error(err);
  process.exit(1);
});
