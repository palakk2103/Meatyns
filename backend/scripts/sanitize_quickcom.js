import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function replaceBranding(val) {
  if (typeof val === 'string') {
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

async function checkAndSanitizeQuickcom() {
  await mongoose.connect(process.env.MONGO_URI);
  const client = mongoose.connection.client;
  const qcDb = client.db('quickcom');
  console.log('Inspecting quickcom database for external branding...');
  
  const collections = await qcDb.listCollections().toArray();
  for (const col of collections) {
    const name = col.name;
    const items = await qcDb.collection(name).find({}).toArray();

    for (const item of items) {
      const rawStr = JSON.stringify(item).toLowerCase();
      const cleaned = rawStr.replace(/delicious/g, '').replace(/malicious/g, '');
      if (cleaned.includes('licious')) {
        console.log(`Found item in quickcom.${name}: ID ${item._id}`);
        const updatedDoc = replaceBranding(item);
        delete updatedDoc._id;
        await qcDb.collection(name).updateOne(
          { _id: item._id },
          { $set: updatedDoc }
        );
        console.log(` -> Sanitized quickcom.${name} ID ${item._id}`);
      }
    }
  }

  console.log('Quickcom check and sanitize complete.');
  await mongoose.disconnect();
}

checkAndSanitizeQuickcom().catch(console.error);
