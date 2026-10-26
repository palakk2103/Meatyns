import mongoose from "mongoose";
import Subscription from "../models/subscription.js";
import Product from "../models/product.js";
import Order from "../models/order.js";
import { evaluateProductAvailability } from "./productSchedulingService.js";
import { getApprovedOrLegacyFilter } from "./productModerationService.js";
import { placeOrderAtomic } from "./orderPlacementService.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Calculates the next delivery date given frequency and preferred day of week.
 */
export function calculateNextDeliveryDate(
  frequency = "weekly",
  preferredDayName = "Sunday",
  fromDate = new Date()
) {
  const targetDayIndex = DAY_NAMES.findIndex(
    (d) => d.toLowerCase() === String(preferredDayName).toLowerCase()
  );
  const normalizedTargetDay = targetDayIndex >= 0 ? targetDayIndex : 0;

  const next = new Date(fromDate);
  next.setHours(0, 0, 0, 0);

  // Find next occurrence of the preferred day of week
  let daysToAdd = (normalizedTargetDay - next.getDay() + 7) % 7;
  if (daysToAdd === 0) {
    // If it's today, schedule for the next interval according to frequency
    daysToAdd = frequency === "monthly" ? 28 : frequency === "bi-weekly" ? 14 : 7;
  } else {
    // If scheduling further out for bi-weekly/monthly intervals after first day
    if (frequency === "bi-weekly" && daysToAdd < 7) {
      // Keep next occurrence
    }
  }

  next.setDate(next.getDate() + daysToAdd);
  return next;
}

/**
 * Advances a subscription's nextOrderDate based on its frequency.
 */
export function advanceSubscriptionDate(frequency, currentDate) {
  const next = new Date(currentDate);
  if (frequency === "monthly") {
    next.setDate(next.getDate() + 28); // 4 weeks
  } else if (frequency === "bi-weekly") {
    next.setDate(next.getDate() + 14); // 2 weeks
  } else {
    next.setDate(next.getDate() + 7); // 1 week
  }
  return next;
}

/**
 * Creates a new customer subscription.
 */
export async function createSubscription({
  customerId,
  title,
  items,
  frequency = "weekly",
  deliveryDayOfWeek = "Sunday",
  deliveryTimeSlot = "07:00 AM - 10:00 AM",
  deliveryAddress,
  paymentPreference = "COD",
}) {
  if (!customerId) throw new Error("Customer ID is required");
  if (!items || !items.length) throw new Error("At least one product item is required");
  if (!deliveryAddress || !deliveryAddress.fullAddress) {
    throw new Error("Delivery address is required");
  }

  // Validate each product item
  const validatedItems = [];
  for (const item of items) {
    const product = await Product.findOne({
      _id: item.productId,
      status: "active",
      ...getApprovedOrLegacyFilter(),
    })
      .select("_id name price salePrice stock unit unitValue")
      .lean();

    if (!product) {
      throw new Error(`Product ${item.productId} is unavailable or inactive`);
    }

    validatedItems.push({
      productId: product._id,
      quantity: Number(item.quantity) || 1,
      unit: product.unit || "pack",
      unitValue: product.unitValue || 1,
    });
  }

  const startDate = new Date();
  const nextOrderDate = calculateNextDeliveryDate(
    frequency,
    deliveryDayOfWeek,
    startDate
  );

  const subscription = await Subscription.create({
    customerId,
    title: title || `${frequency.toUpperCase()} Meat Box`,
    items: validatedItems,
    frequency,
    deliveryDayOfWeek,
    deliveryTimeSlot,
    deliveryAddress,
    paymentPreference,
    status: "active",
    startDate,
    nextOrderDate,
  });

  return subscription;
}

/**
 * Updates subscription preferences or items.
 */
export async function updateSubscription(subscriptionId, customerId, updates = {}) {
  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    customerId,
  });

  if (!subscription) {
    throw new Error("Subscription not found or unauthorized");
  }

  if (subscription.status === "cancelled") {
    throw new Error("Cannot modify a cancelled subscription");
  }

  if (updates.title) subscription.title = updates.title;
  if (updates.deliveryTimeSlot) subscription.deliveryTimeSlot = updates.deliveryTimeSlot;
  if (updates.paymentPreference) subscription.paymentPreference = updates.paymentPreference;
  if (updates.deliveryAddress) subscription.deliveryAddress = updates.deliveryAddress;

  if (updates.frequency || updates.deliveryDayOfWeek) {
    subscription.frequency = updates.frequency || subscription.frequency;
    subscription.deliveryDayOfWeek =
      updates.deliveryDayOfWeek || subscription.deliveryDayOfWeek;
    subscription.nextOrderDate = calculateNextDeliveryDate(
      subscription.frequency,
      subscription.deliveryDayOfWeek,
      new Date()
    );
  }

  if (Array.isArray(updates.items) && updates.items.length > 0) {
    const validatedItems = [];
    for (const item of updates.items) {
      const product = await Product.findOne({
        _id: item.productId,
        status: "active",
        ...getApprovedOrLegacyFilter(),
      })
        .select("_id unit unitValue")
        .lean();
      if (!product) throw new Error(`Product ${item.productId} is inactive or invalid`);
      validatedItems.push({
        productId: product._id,
        quantity: Number(item.quantity) || 1,
        unit: product.unit || "pack",
        unitValue: product.unitValue || 1,
      });
    }
    subscription.items = validatedItems;
  }

  await subscription.save();
  return subscription;
}

/**
 * Pauses an active subscription.
 */
export async function pauseSubscription(subscriptionId, customerId) {
  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    customerId,
  });

  if (!subscription) throw new Error("Subscription not found");
  if (subscription.status === "cancelled") {
    throw new Error("Cannot pause a cancelled subscription");
  }

  subscription.status = "paused";
  subscription.pausedAt = new Date();
  await subscription.save();
  return subscription;
}

/**
 * Resumes a paused subscription and recalculates the next delivery date.
 */
export async function resumeSubscription(subscriptionId, customerId) {
  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    customerId,
  });

  if (!subscription) throw new Error("Subscription not found");
  if (subscription.status === "cancelled") {
    throw new Error("Cannot resume a cancelled subscription");
  }

  subscription.status = "active";
  subscription.resumedAt = new Date();
  subscription.nextOrderDate = calculateNextDeliveryDate(
    subscription.frequency,
    subscription.deliveryDayOfWeek,
    new Date()
  );

  await subscription.save();
  return subscription;
}

/**
 * Cancels a subscription.
 */
export async function cancelSubscription(subscriptionId, customerId, reason = "") {
  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    customerId,
  });

  if (!subscription) throw new Error("Subscription not found");

  subscription.status = "cancelled";
  subscription.cancellationReason = reason || "Customer requested cancellation";
  await subscription.save();
  return subscription;
}

/**
 * Idempotent batch processor to generate scheduled orders for active subscriptions due today.
 */
export async function processDueSubscriptionOrders(targetDate = new Date()) {
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dueSubscriptions = await Subscription.find({
    status: "active",
    nextOrderDate: { $lte: endOfDay },
  }).populate("items.productId");

  const results = {
    processed: 0,
    ordersGenerated: 0,
    skipped: 0,
    errors: [],
  };

  for (const sub of dueSubscriptions) {
    results.processed += 1;
    const dateKey = sub.nextOrderDate.toISOString().slice(0, 10);
    const idempotencyKey = `SUB-ORDER-${sub._id}-${dateKey}`;

    // Prevent duplicate scheduled order generation
    const existingOrder = await Order.findOne({
      "metadata.subscriptionId": String(sub._id),
      "metadata.subscriptionDateKey": dateKey,
    }).select("_id orderId");

    if (existingOrder) {
      results.skipped += 1;
      // Advance nextOrderDate so it doesn't poll forever
      sub.nextOrderDate = advanceSubscriptionDate(sub.frequency, sub.nextOrderDate);
      await sub.save();
      continue;
    }

    try {
      // Validate all items
      let hasStockIssue = false;
      const orderItems = [];

      for (const item of sub.items) {
        const product = item.productId;
        if (!product || product.status !== "active") {
          hasStockIssue = true;
          break;
        }

        const scheduleCheck = evaluateProductAvailability(product);
        if (!scheduleCheck.isAvailable) {
          hasStockIssue = true;
          break;
        }

        if (product.stock < item.quantity) {
          hasStockIssue = true;
          break;
        }

        orderItems.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.salePrice > 0 ? product.salePrice : product.price,
          unit: item.unit || product.unit || "pack",
          unitValue: item.unitValue || product.unitValue || 1,
          sellerId: product.sellerId,
        });
      }

      if (hasStockIssue || orderItems.length === 0) {
        results.errors.push({
          subscriptionId: sub._id,
          reason: "Item unavailable, scheduled closed or insufficient stock",
        });
        // Still advance nextOrderDate to avoid deadlock
        sub.nextOrderDate = advanceSubscriptionDate(sub.frequency, sub.nextOrderDate);
        await sub.save();
        continue;
      }

      // Generate the scheduled order safely
      const scheduledOrder = await placeOrderAtomic({
        customerId: sub.customerId,
        items: orderItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantSku: "",
        })),
        address: sub.deliveryAddress,
        paymentMode: sub.paymentPreference || "COD",
        timeSlot: sub.deliveryTimeSlot,
        deliveryMethod: "SCHEDULED",
        scheduledDate: dateKey,
        idempotencyKey,
      });

      if (scheduledOrder) {
        results.ordersGenerated += 1;
        sub.lastOrderDate = new Date();
        sub.lastGeneratedOrderId = scheduledOrder._id;
        sub.nextOrderDate = advanceSubscriptionDate(sub.frequency, sub.nextOrderDate);
        await sub.save();
      }
    } catch (err) {
      results.errors.push({
        subscriptionId: sub._id,
        error: err.message,
      });
      // Advance so one failing order does not block execution forever
      sub.nextOrderDate = advanceSubscriptionDate(sub.frequency, sub.nextOrderDate);
      await sub.save();
    }
  }

  return results;
}
