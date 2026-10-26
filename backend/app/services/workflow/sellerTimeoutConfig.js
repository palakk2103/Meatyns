import Setting from "../../models/setting.js";
import { DEFAULT_SELLER_TIMEOUT_MS } from "../../constants/orderWorkflow.js";

/**
 * Resolves the active seller acceptance timeout in milliseconds:
 * 1. Checks persisted Admin Setting (`sellerAcceptanceTimeoutMs`)
 * 2. If present, positive and within valid bounds [10000ms, 1800000ms], returns it
 * 3. Otherwise falls back to DEFAULT_SELLER_TIMEOUT_MS() (env SELLER_TIMEOUT_MS or 60000)
 *
 * @param {Object} [options]
 * @param {import("mongoose").ClientSession} [options.session]
 * @param {string|null} [options.tenantId]
 * @returns {Promise<number>} Timeout in milliseconds
 */
export async function getEffectiveSellerTimeoutMs({ session, tenantId = null } = {}) {
  try {
    const filter = tenantId
      ? { tenantId }
      : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
    const query = Setting.findOne(filter).select("sellerAcceptanceTimeoutMs").lean();
    if (session) query.session(session);

    const setting = await query.exec();
    const candidate = Number(setting?.sellerAcceptanceTimeoutMs);

    if (Number.isFinite(candidate) && candidate >= 10000 && candidate <= 1800000) {
      return candidate;
    }
  } catch {
    // Fallback gracefully on query error or during test isolation
  }

  return DEFAULT_SELLER_TIMEOUT_MS();
}

export default getEffectiveSellerTimeoutMs;
