/**
 * Copy the full product catalogue to every approved seller that is missing
 * products (one-time backfill; new sellers/products are synced automatically).
 *
 *   node scripts/sync-catalog-to-all-sellers.js           # dry run (no writes)
 *   node scripts/sync-catalog-to-all-sellers.js --apply   # write to the DB
 */
import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { syncCatalogToAllSellers } from "../app/services/catalogSyncService.js";

dotenv.config();
// Some Windows networks refuse SRV lookups for mongodb+srv URIs.
if (process.env.MONGO_DNS_SERVERS) dns.setServers(process.env.MONGO_DNS_SERVERS.split(","));

const apply = process.argv.includes("--apply");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(apply ? "APPLY mode: writing products" : "DRY RUN: no changes will be written");

  const results = await syncCatalogToAllSellers({ dryRun: !apply });
  let total = 0;
  for (const r of results) {
    if (!r.missing.length) continue;
    total += apply ? r.created : r.missing.length;
    console.log(`\n${r.shopName} (${r.sellerId}) — missing ${r.missing.length}${apply ? `, created ${r.created}` : ""}`);
    r.missing.forEach((name) => console.log(`  - ${name}`));
  }
  console.log(`\n${apply ? "Created" : "Would create"} ${total} product(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
