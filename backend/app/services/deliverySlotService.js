import Seller from "../models/seller.js";
import Product from "../models/product.js";
import Order from "../models/order.js";
import { distanceMeters } from "../utils/geoUtils.js";
import { getSellerCurrentOpenStatus } from "./storeStatusService.js";
import {
  DELIVERY_METHODS,
  DELIVERY_SLOT_CONFIG,
} from "../constants/deliverySlots.js";
import { getOrCreateFinanceSettings } from "./finance/financeSettingsService.js";
import { calculateCustomerDeliveryFee } from "./finance/pricingService.js";
import { resolveDeliveryZoneForLocation } from "./deliveryZoneService.js";
import logger from "./logger.js";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Format a Date to YYYY-MM-DD in IST/project timezone
 */
export function formatDateToISOString(date = new Date()) {
  const tzOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(date.getTime() + tzOffset);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in minutes from midnight in local IST
 */
export function getCurrentLocalMinutes(date = new Date()) {
  const tzOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + tzOffset);
  return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
}

/**
 * Converts "14:00" to minutes from midnight (840)
 */
function timeStrToMinutes(timeStr = "") {
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts 24-hr time string "14:00" to readable 12-hr format "2:00 PM"
 */
export function formatTo12Hour(timeStr = "") {
  const [hStr, mStr] = String(timeStr).split(":");
  let hour = parseInt(hStr, 10);
  const minute = mStr ? mStr.padStart(2, "0") : "00";
  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

/**
 * Build a human-friendly label for a 1-hour slot: "2:00 PM – 3:00 PM"
 */
export function formatSlotLabel(startTime, endTime) {
  return `${formatTo12Hour(startTime)} – ${formatTo12Hour(endTime)}`;
}

/**
 * Resolve sellers from items or sellerId
 */
export async function resolveSellersForCheckout({ sellerId, items = [] }) {
  if (sellerId) {
    const seller = await Seller.findById(sellerId).lean();
    return seller ? [seller] : [];
  }

  const productIds = (items || [])
    .map((item) => item.product || item.productId || item.id)
    .filter(Boolean);

  if (productIds.length > 0) {
    const products = await Product.find({ _id: { $in: productIds } })
      .select("sellerId")
      .lean();
    const sellerIds = [
      ...new Set(
        products.map((p) => p.sellerId?.toString()).filter(Boolean)
      ),
    ];
    if (sellerIds.length > 0) {
      return await Seller.find({ _id: { $in: sellerIds } }).lean();
    }
  }

  // Fallback: return default active approved seller if any
  const defaultSeller = await Seller.findOne({
    applicationStatus: "approved",
    isActive: true,
  }).lean();
  return defaultSeller ? [defaultSeller] : [];
}

/**
 * Calculate distance between customer and seller in km
 */
export function getDistanceKm(customerLocation, seller) {
  if (!customerLocation?.lat || !customerLocation?.lng) return 1.5;
  const sellerCoords = seller?.location?.coordinates;
  if (!Array.isArray(sellerCoords) || sellerCoords.length < 2) return 1.5;

  const [sellerLng, sellerLat] = sellerCoords;
  const distMeters = distanceMeters(
    Number(customerLocation.lat),
    Number(customerLocation.lng),
    Number(sellerLat),
    Number(sellerLng)
  );
  return Number((distMeters / 1000).toFixed(2));
}

/**
 * Generate 7 days starting from today in local time
 */
/**
 * Generate advance dates starting from today in local time
 */
export function getAvailableDates(now = new Date(), maxDays = null) {
  const dates = [];
  const tzOffset = 5.5 * 60 * 60 * 1000;
  const totalDays = Number.isFinite(Number(maxDays)) && Number(maxDays) > 0
    ? Number(maxDays)
    : DELIVERY_SLOT_CONFIG.MAXIMUM_ADVANCE_DAYS;

  for (let i = 0; i < totalDays; i++) {
    const dayDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000 + tzOffset);
    const year = dayDate.getUTCFullYear();
    const monthIndex = dayDate.getUTCMonth();
    const month = String(monthIndex + 1).padStart(2, "0");
    const dayOfMonth = dayDate.getUTCDate();
    const dayStr = String(dayOfMonth).padStart(2, "0");
    const dateISO = `${year}-${month}-${dayStr}`;
    const dayOfWeek = DAYS_OF_WEEK[dayDate.getUTCDay()];

    let displayLabel = `${dayOfMonth} ${MONTH_NAMES[monthIndex]}`;
    if (i === 0) displayLabel = "Today";
    else if (i === 1) displayLabel = "Tomorrow";

    dates.push({
      date: dateISO,
      label: displayLabel,
      dayName: dayOfWeek,
      formattedDate: `${dayOfMonth} ${MONTH_NAMES[monthIndex]} ${year}`,
      isToday: i === 0,
    });
  }
  return dates;
}

/**
 * Generate slots for a specific date and seller, checking operating hours, admin overrides, and capacity
 */
export async function getSlotsForDate({
  seller,
  dateISO,
  isToday = false,
  now = new Date(),
  advanceConfig = {},
  slotOverrides = [],
}) {
  const targetDate = new Date(`${dateISO}T00:00:00.000Z`);
  const dayName = DAYS_OF_WEEK[targetDate.getUTCDay()];

  // Check configured operating days
  const operatingDays = advanceConfig.operatingDays;
  if (Array.isArray(operatingDays) && operatingDays.length > 0 && !operatingDays.includes(dayName)) {
    return [];
  }

  let openTimeStr = advanceConfig.openTime || DELIVERY_SLOT_CONFIG.DEFAULT_STORE_OPEN_TIME;
  let closeTimeStr = advanceConfig.closeTime || DELIVERY_SLOT_CONFIG.DEFAULT_STORE_CLOSE_TIME;
  let isStoreOpenOnDay = true;

  if (
    seller?.storeHours?.enabled &&
    Array.isArray(seller.storeHours.schedule)
  ) {
    const daySchedule = seller.storeHours.schedule.find(
      (s) => s.day === dayName
    );
    if (daySchedule) {
      if (daySchedule.isOpen === false) {
        isStoreOpenOnDay = false;
      }
      if (daySchedule.openTime) openTimeStr = daySchedule.openTime.trim();
      if (daySchedule.closeTime) closeTimeStr = daySchedule.closeTime.trim();
    }
  }

  if (!isStoreOpenOnDay) {
    return [];
  }

  const openMinutes = timeStrToMinutes(openTimeStr);
  const closeMinutes = timeStrToMinutes(closeTimeStr);
  const slotDuration = Number(advanceConfig.slotDurationMinutes) || DELIVERY_SLOT_CONFIG.SLOT_DURATION_MINUTES;
  const currentMinutes = getCurrentLocalMinutes(now);
  const minAdvanceMinutes = advanceConfig.minAdvanceMinutes != null
    ? Number(advanceConfig.minAdvanceMinutes)
    : DELIVERY_SLOT_CONFIG.MINIMUM_ADVANCE_MINUTES;

  const rawSlots = [];
  for (let m = openMinutes; m + slotDuration <= closeMinutes; m += slotDuration) {
    const startH = String(Math.floor(m / 60)).padStart(2, "0");
    const startM = String(m % 60).padStart(2, "0");
    const endH = String(Math.floor((m + slotDuration) / 60)).padStart(2, "0");
    const endM = String((m + slotDuration) % 60).padStart(2, "0");

    const startTime = `${startH}:${startM}`;
    const endTime = `${endH}:${endM}`;
    const slotId = `${dateISO}_${startH}-${startM}_${endH}-${endM}`;
    const label = formatSlotLabel(startTime, endTime);

    // Is slot in the past?
    let isPast = false;
    if (isToday) {
      if (m < currentMinutes + minAdvanceMinutes) {
        isPast = true;
      }
    }

    rawSlots.push({
      slotId,
      date: dateISO,
      startTime,
      endTime,
      label,
      isPast,
    });
  }

  if (rawSlots.length === 0) {
    return [];
  }

  // Count active bookings per slot for capacity check
  const sellerId = seller?._id;
  const slotCounts = await Order.aggregate([
    {
      $match: {
        seller: sellerId,
        scheduledDate: dateISO,
        status: { $nin: ["cancelled"] },
      },
    },
    {
      $group: {
        _id: "$scheduledStartTime",
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map();
  for (const item of slotCounts) {
    countMap.set(item._id, item.totalOrders);
  }

  const defaultCapacity = Number(advanceConfig.maxOrdersPerSlot) || DELIVERY_SLOT_CONFIG.DEFAULT_MAX_ORDERS_PER_SLOT;

  return rawSlots.map((slot) => {
    const booked = countMap.get(slot.startTime) || 0;

    // Check specific slot overrides (by slotId or startTime)
    const override = (slotOverrides || []).find(
      (o) => o.slotId === slot.slotId || (o.startTime === slot.startTime && (!o.date || o.date === slot.date))
    );

    const slotCapacity = override?.capacity != null && Number.isFinite(Number(override.capacity))
      ? Number(override.capacity)
      : defaultCapacity;

    const isManuallyDisabled = override?.enabled === false;
    const isFull = booked >= slotCapacity;
    const available = !slot.isPast && !isFull && !isManuallyDisabled;

    return {
      slotId: slot.slotId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.label,
      available,
      isFull,
      isPast: slot.isPast,
      isManuallyDisabled,
      capacity: slotCapacity,
      bookedCount: booked,
    };
  });
}

/**
 * Main function: Get full delivery options and slots for customer
 */
export async function getDeliveryOptionsAndSlots({
  customerLocation = null,
  address = null,
  items = [],
  sellerId = null,
  selectedDate = null,
}) {
  const financeSettings = await getOrCreateFinanceSettings();
  const deliveryConfig = financeSettings?.deliveryConfig || {};
  const expressConfig = deliveryConfig?.express || {};
  const normalConfig = deliveryConfig?.normal || {};
  const advanceConfig = deliveryConfig?.advance || {};
  const slotOverrides = deliveryConfig?.slotOverrides || [];

  const loc = customerLocation || address?.location || null;
  const sellers = await resolveSellersForCheckout({ sellerId, items });
  const primarySeller = sellers[0] || null;

  const now = new Date();
  const todayISO = formatDateToISOString(now);
  const activeDate = selectedDate || todayISO;

  // 1. Serviceability & Distance check
  let isServiceable = true;
  let distanceKm = 2.0;
  let unserviceableReason = null;
  let matchedZone = null;

  if (loc?.lat && loc?.lng) {
    const zoneResolution = await resolveDeliveryZoneForLocation(loc);
    if (!zoneResolution.isServiceable) {
      isServiceable = false;
      unserviceableReason = zoneResolution.reason || "Address is outside our serviceable delivery zones.";
    } else {
      matchedZone = zoneResolution.zone;
      if (primarySeller) {
        distanceKm = getDistanceKm(loc, primarySeller);
        const radius = Number(primarySeller.serviceRadius || 10);
        if (zoneResolution.fallbackToRadius && distanceKm > radius) {
          isServiceable = false;
          unserviceableReason = `Address is outside store service radius (${distanceKm}km vs max ${radius}km).`;
        }
      }
    }
  } else if (primarySeller) {
    distanceKm = getDistanceKm(loc, primarySeller);
    const radius = Number(primarySeller.serviceRadius || 10);
    if (loc?.lat && loc?.lng && distanceKm > radius) {
      isServiceable = false;
      unserviceableReason = `Address is outside store service radius (${distanceKm}km vs max ${radius}km).`;
    }
  }

  // Calculate pricing for each delivery method with matchedZone
  const expressPricing = calculateCustomerDeliveryFee(distanceKm, financeSettings, { deliveryMethod: DELIVERY_METHODS.EXPRESS, zone: matchedZone });
  const normalPricing = calculateCustomerDeliveryFee(distanceKm, financeSettings, { deliveryMethod: DELIVERY_METHODS.NORMAL, zone: matchedZone });
  const advancePricing = calculateCustomerDeliveryFee(distanceKm, financeSettings, { deliveryMethod: DELIVERY_METHODS.SCHEDULED, zone: matchedZone });

  // 2. Express Delivery Calculation
  const isCurrentlyOpen = primarySeller
    ? getSellerCurrentOpenStatus(primarySeller, now)
    : true;

  const dynamicEtaMins = Math.round(
    DELIVERY_SLOT_CONFIG.EXPRESS_BASE_PREP_MINUTES +
      distanceKm * DELIVERY_SLOT_CONFIG.EXPRESS_TRAVEL_MINUTES_PER_KM
  );
  const minEta = Math.max(expressConfig.estimatedMinMinutes || 15, dynamicEtaMins - 5);
  const maxEta = Math.max(expressConfig.estimatedMaxMinutes || 30, dynamicEtaMins + 5);
  const expressEtaLabel = `${minEta}–${maxEta} mins`;

  const isExpressEnabled = expressConfig.enabled !== false && (matchedZone ? matchedZone.expressAvailable !== false : true);
  const expressAvailable = isServiceable && (expressConfig.operatingHoursOnly ? isCurrentlyOpen : true) && isExpressEnabled;

  const expressOption = {
    method: DELIVERY_METHODS.EXPRESS,
    title: "Express Delivery",
    tagline: "Deliver as soon as possible",
    available: expressAvailable,
    enabled: isExpressEnabled,
    estimatedMinutes: dynamicEtaMins,
    estimatedLabel: expressEtaLabel,
    deliveryFee: expressPricing.deliveryFeeCharged,
    baseDeliveryFee: expressPricing.standardNormalFee,
    surcharge: expressPricing.expressSurcharge,
    disabledReason: !isExpressEnabled
      ? "Express delivery is currently disabled."
      : !isServiceable
      ? unserviceableReason
      : !isCurrentlyOpen && expressConfig.operatingHoursOnly
      ? "Store is currently closed for Express delivery."
      : null,
  };

  // 3. Normal Delivery Calculation
  const isNormalEnabled = normalConfig.enabled !== false;
  const normalAvailable = isServiceable && isNormalEnabled;

  const normalOption = {
    method: DELIVERY_METHODS.NORMAL,
    title: "Normal Delivery",
    tagline: "Delivery within 1–2 hours",
    available: normalAvailable,
    enabled: isNormalEnabled,
    estimatedLabel: normalConfig.estimatedLabel || "1–2 hours",
    minMinutes: normalConfig.minMinutes || DELIVERY_SLOT_CONFIG.NORMAL_MIN_MINUTES,
    maxMinutes: normalConfig.maxMinutes || DELIVERY_SLOT_CONFIG.NORMAL_MAX_MINUTES,
    deliveryFee: normalPricing.deliveryFeeCharged,
    disabledReason: !isNormalEnabled
      ? "Normal delivery is currently disabled."
      : !isServiceable
      ? unserviceableReason
      : null,
  };

  // 4. Scheduled Delivery Dates & Slots
  const isAdvanceEnabled = advanceConfig.enabled !== false;
  const availableDates = isAdvanceEnabled
    ? getAvailableDates(now, advanceConfig.maxAdvanceDays)
    : [];
  const isTargetToday = activeDate === todayISO;

  let slots = [];
  if (primarySeller && isServiceable && isAdvanceEnabled) {
    slots = await getSlotsForDate({
      seller: primarySeller,
      dateISO: activeDate,
      isToday: isTargetToday,
      now,
      advanceConfig,
      slotOverrides,
    });
  }

  const scheduledOption = {
    method: DELIVERY_METHODS.SCHEDULED,
    title: "Schedule Delivery",
    tagline: "Choose date and time slot",
    available: isServiceable && isAdvanceEnabled,
    enabled: isAdvanceEnabled,
    deliveryFee: advancePricing.deliveryFeeCharged,
    maxAdvanceDays: advanceConfig.maxAdvanceDays || 7,
    disabledReason: !isAdvanceEnabled
      ? "Advance scheduled booking is currently disabled."
      : !isServiceable
      ? unserviceableReason
      : null,
  };

  return {
    isServiceable,
    unserviceableReason,
    distanceKm,
    matchedZone: matchedZone ? {
      id: matchedZone._id,
      name: matchedZone.name,
      priority: matchedZone.priority,
      deliveryFee: matchedZone.deliveryFee,
      surcharge: matchedZone.surcharge,
    } : null,
    deliveryOptions: {
      [DELIVERY_METHODS.EXPRESS]: expressOption,
      [DELIVERY_METHODS.NORMAL]: normalOption,
      [DELIVERY_METHODS.SCHEDULED]: scheduledOption,
    },
    availableDates,
    selectedDate: activeDate,
    slots,
  };
}

/**
 * Pre-order placement atomic slot verification
 */
export async function verifySlotAvailabilityBeforePlacement({
  sellerId,
  deliveryMethod,
  scheduledDate,
  scheduledStartTime,
  session = null,
}) {
  if (deliveryMethod !== DELIVERY_METHODS.SCHEDULED) {
    return { ok: true };
  }

  const financeSettings = await getOrCreateFinanceSettings({ session });
  const advanceConfig = financeSettings?.deliveryConfig?.advance || {};
  if (advanceConfig.enabled === false) {
    return {
      ok: false,
      reason: "Advance scheduled delivery is currently disabled.",
    };
  }

  if (!scheduledDate || !scheduledStartTime) {
    return {
      ok: false,
      reason: "Scheduled date and time slot are required for scheduled delivery.",
    };
  }

  const now = new Date();
  const todayISO = formatDateToISOString(now);

  if (scheduledDate < todayISO) {
    return {
      ok: false,
      reason: "Cannot schedule delivery for a past date.",
    };
  }

  const minAdvanceMinutes = advanceConfig.minAdvanceMinutes != null
    ? Number(advanceConfig.minAdvanceMinutes)
    : DELIVERY_SLOT_CONFIG.MINIMUM_ADVANCE_MINUTES;

  if (scheduledDate === todayISO) {
    const currentMinutes = getCurrentLocalMinutes(now);
    const slotMinutes = timeStrToMinutes(scheduledStartTime);
    if (slotMinutes < currentMinutes + minAdvanceMinutes) {
      return {
        ok: false,
        reason: "The selected time slot has passed. Please select another slot.",
      };
    }
  }

  // Check manual slot overrides
  const slotOverrides = financeSettings?.deliveryConfig?.slotOverrides || [];
  const override = slotOverrides.find(
    (o) => o.startTime === scheduledStartTime && (!o.date || o.date === scheduledDate)
  );

  if (override?.enabled === false) {
    return {
      ok: false,
      reason: "This delivery slot is currently disabled. Please select another slot.",
    };
  }

  const maxCapacity = override?.capacity != null && Number.isFinite(Number(override.capacity))
    ? Number(override.capacity)
    : (Number(advanceConfig.maxOrdersPerSlot) || DELIVERY_SLOT_CONFIG.DEFAULT_MAX_ORDERS_PER_SLOT);

  // Check capacity
  const query = Order.countDocuments({
    seller: sellerId,
    scheduledDate,
    scheduledStartTime,
    status: { $nin: ["cancelled"] },
  });
  if (session) query.session(session);

  const activeCount = await query;
  if (activeCount >= maxCapacity) {
    return {
      ok: false,
      reason: "This delivery slot is no longer available. Please select another slot.",
    };
  }

  return { ok: true };
}
