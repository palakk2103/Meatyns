import { processDueSubscriptionOrders } from "../services/subscriptionService.js";
import logger from "../services/logger.js";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const SUBSCRIPTION_ORDER_JOB_INTERVAL_MS = () =>
  parseInt(
    process.env.SUBSCRIPTION_ORDER_JOB_INTERVAL_MS || `${DEFAULT_INTERVAL_MS}`,
    10
  );

/**
 * Scheduled job handler to process due subscription orders.
 * Generates automated scheduled orders for subscriptions due on or before today.
 */
export const subscriptionOrderJobHandler = async () => {
  const startTime = Date.now();

  try {
    const results = await processDueSubscriptionOrders(new Date());
    const duration = Date.now() - startTime;

    if (results.processed > 0 || results.ordersGenerated > 0 || results.errors.length > 0) {
      logger.info("Subscription order batch job completed", {
        jobName: "subscriptionOrderJob",
        duration,
        processed: results.processed,
        ordersGenerated: results.ordersGenerated,
        skipped: results.skipped,
        errorCount: results.errors.length,
      });
    }
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Subscription order batch job failed", {
      jobName: "subscriptionOrderJob",
      duration,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get the job handler function for distributed scheduler registration
 * @returns {Function}
 */
export const getSubscriptionOrderJobHandler = () => subscriptionOrderJobHandler;

/**
 * Get the job interval in milliseconds
 * @returns {number}
 */
export const getSubscriptionOrderJobInterval = () =>
  SUBSCRIPTION_ORDER_JOB_INTERVAL_MS();

/**
 * Check if subscription order automated job is enabled
 * @returns {boolean}
 */
export const isSubscriptionOrderJobEnabled = () =>
  process.env.SUBSCRIPTION_ORDER_JOB_ENABLED !== "false";
