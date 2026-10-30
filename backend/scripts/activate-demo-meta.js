import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import { connectDemoMetaIntegration } from "../app/services/meta/metaOAuthService.js";

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB Atlas");
  const res = await connectDemoMetaIntegration();
  console.log("SUCCESSFULLY_ACTIVATED_META_DEMO:", res);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
