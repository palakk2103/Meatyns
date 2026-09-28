import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkBranding() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB:', mongoose.connection.name);
  const collections = await mongoose.connection.db.listCollections().toArray();
  
  let foundTotal = 0;
  for (const col of collections) {
    const name = col.name;
    const items = await mongoose.connection.db.collection(name).find({}).toArray();

    const matches = items.filter(it => {
      const str = JSON.stringify(it).toLowerCase();
      // Remove legitimate words: delicious, malicious
      const cleaned = str.replace(/delicious/g, '').replace(/malicious/g, '');
      return cleaned.includes('licious');
    });

    if (matches.length > 0) {
      console.log(`Found ${matches.length} brand matches in collection: ${name}`);
      matches.forEach(it => {
        console.log(` - ID: ${it._id}, name/title: ${it.name || it.title || ''}`);
      });
      foundTotal += matches.length;
    }
  }

  console.log(`Finished check. Total external brand references found: ${foundTotal}`);
  await mongoose.disconnect();
}

checkBranding().catch(err => {
  console.error(err);
  process.exit(1);
});
