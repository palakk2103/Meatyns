import dotenv from "dotenv";
import Cart from "../models/cart.js";
import Order from "../models/order.js";
import Setting from "../models/setting.js";
import NotificationPreference from "../modules/notifications/preference.model.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS, NOTIFICATION_ROLES } from "../modules/notifications/notification.constants.js";
import logger from "../services/logger.js";

dotenv.config();

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ABANDONED_CART_JOB_INTERVAL_MS = parseInt(
  process.env.ABANDONED_CART_JOB_INTERVAL_MS || `${DEFAULT_INTERVAL_MS}`,
  10
);

/**
 * Core processor for scanning and recovering abandoned carts.
 */
export const processAbandonedCarts = async () => {
  const startTime = Date.now();

  try {
    // 1. Fetch platform settings
    const settings = await Setting.findOne().lean();
    const isEnabled = settings?.abandonedCartEnabled !== false;
    if (!isEnabled) {
      return { processed: 0, sent: 0, skipped: 0, reason: "disabled_by_settings" };
    }

    const intervalMinutes = Math.max(5, Number(settings?.abandonedCartIntervalMinutes) || 60);
    const maxReminders = Math.max(1, Number(settings?.abandonedCartMaxReminders) || 2);
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - intervalMinutes * 60 * 1000);

    // 2. Find non-empty carts updated before cutoff with remaining reminders
    const candidateCarts = await Cart.find({
      "items.0": { $exists: true },
      updatedAt: { $lte: cutoffTime },
      reminderCount: { $lt: maxReminders },
    })
      .populate("customerId", "_id name phone email isActive")
      .lean();

    let processedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;

    for (const cart of candidateCarts) {
      processedCount++;
      const customer = cart.customerId;

      // Ensure customer exists and is active
      if (!customer || customer.isActive === false) {
        skippedCount++;
        continue;
      }

      const customerId = customer._id;

      // Check if an order has already been completed by customer after cart.updatedAt
      const recentOrder = await Order.findOne({
        customer: customerId,
        createdAt: { $gte: cart.updatedAt },
        status: { $nin: ["cancelled", "payment_failed"] },
      })
        .select("_id")
        .lean();

      if (recentOrder) {
        // Customer converted; mark cart as fulfilled/handled to prevent reminders
        await Cart.updateOne(
          { _id: cart._id },
          { $set: { reminderCount: maxReminders, abandonedNotified: true } }
        );
        skippedCount++;
        continue;
      }

      // Check customer promotional notification preferences
      const preference = await NotificationPreference.findOne({
        userId: customerId,
        role: NOTIFICATION_ROLES.CUSTOMER,
      }).lean();

      // If customer explicitly disabled promotions, respect opt-out
      if (preference && preference.promotions === false) {
        skippedCount++;
        continue;
      }

      // Deduplication safeguard: do not send if last reminder was within 80% of interval
      if (cart.lastReminderSentAt) {
        const timeSinceLastMs = now.getTime() - new Date(cart.lastReminderSentAt).getTime();
        if (timeSinceLastMs < intervalMinutes * 60 * 1000 * 0.8) {
          skippedCount++;
          continue;
        }
      }

      const nextReminderCount = (cart.reminderCount || 0) + 1;
      const itemCount = (cart.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

      try {
        // Dispatch event via existing notification pipeline
        emitNotificationEvent(NOTIFICATION_EVENTS.ABANDONED_CART_REMINDER, {
          customerId,
          userId: customerId,
          cartId: cart._id,
          itemCount,
          reminderStage: nextReminderCount,
          title: "Your Meatyns cart is waiting! 🥩",
          message: `You left ${itemCount} delicious item${itemCount > 1 ? "s" : ""} in your cart. Complete your order now!`,
        });

        // Persist reminder dispatch state
        await Cart.updateOne(
          { _id: cart._id },
          {
            $set: {
              reminderCount: nextReminderCount,
              lastReminderSentAt: now,
              abandonedNotified: true,
            },
          }
        );

        sentCount++;
      } catch (sendErr) {
        logger.error("Failed to enqueue abandoned cart reminder", {
          cartId: cart._id,
          customerId,
          error: sendErr.message,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    if (processedCount > 0) {
      logger.info("Abandoned cart job completed", {
        jobName: "abandonedCartJob",
        processedCount,
        sentCount,
        skippedCount,
        durationMs,
      });
    }

    return { processed: processedCount, sent: sentCount, skipped: skippedCount, durationMs };
  } catch (error) {
    logger.error("Error running abandonedCartJob", {
      jobName: "abandonedCartJob",
      error: error.message,
    });
    throw error;
  }
};

export const getAbandonedCartJobInterval = () => ABANDONED_CART_JOB_INTERVAL_MS;

export const getAbandonedCartJobHandler = () => processAbandonedCarts;

export const isAbandonedCartJobEnabled = () =>
  String(process.env.ABANDONED_CART_JOB_ENABLED || "true").toLowerCase() !== "false";
