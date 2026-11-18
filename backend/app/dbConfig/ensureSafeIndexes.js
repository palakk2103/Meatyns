import mongoose from "mongoose";

/**
 * Collections whose documents must NEVER be removed automatically by a
 * MongoDB TTL index. A stale `expiresAt_1` TTL index left over from an old
 * schema on `orders` silently deleted cancelled (and paid) orders, which then
 * vanished from the admin, seller and customer panels.
 */
const PROTECTED_COLLECTIONS = ["orders", "payments", "checkoutgroups"];

// TTL indexes that are intentional and must be kept.
const ALLOWED_TTL_INDEXES = {
  checkoutgroups: ["placement.idempotencyKeyExpiry_1"],
};

export async function dropUnsafeTtlIndexes({ logger = console } = {}) {
  const db = mongoose.connection.db;
  if (!db) return [];
  const dropped = [];
  for (const name of PROTECTED_COLLECTIONS) {
    let indexes = [];
    try {
      indexes = await db.collection(name).indexes();
    } catch {
      continue; // collection may not exist yet
    }
    const allowed = ALLOWED_TTL_INDEXES[name] || [];
    for (const index of indexes) {
      if (index.expireAfterSeconds === undefined) continue;
      if (allowed.includes(index.name)) continue;
      try {
        await db.collection(name).dropIndex(index.name);
        dropped.push(`${name}.${index.name}`);
        logger.warn?.(`[DB] Dropped unsafe TTL index ${name}.${index.name} (it auto-deletes records)`);
      } catch (error) {
        logger.error?.(`[DB] Failed to drop TTL index ${name}.${index.name}: ${error.message}`);
      }
    }
  }
  return dropped;
}
