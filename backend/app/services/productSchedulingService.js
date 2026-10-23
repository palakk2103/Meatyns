/**
 * Product Availability Scheduling Service
 *
 * Evaluates whether a product is currently available for purchase based on its
 * configured schedule rules:
 * - Active schedule flag (isScheduled)
 * - Date validity window (scheduleStartDate / scheduleEndDate)
 * - Allowed days of week (scheduleDays)
 * - Daily time-of-day selling window (availableFromTime / availableToTime)
 *
 * Uses Indian Standard Time (Asia/Kolkata, UTC+5:30) consistently.
 */

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date and time components in application timezone (IST).
 */
export function getZonedTimeParts(date = new Date(), timeZone = APP_TIMEZONE) {
  const d = date instanceof Date ? date : new Date(date);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let dayName = "";
  let hours = "00";
  let minutes = "00";

  for (const part of parts) {
    if (part.type === "weekday") dayName = part.value;
    if (part.type === "hour") hours = part.value;
    if (part.type === "minute") minutes = part.value;
  }

  // Handle midnight 24 edge case from some Intl engines
  if (hours === "24") hours = "00";

  return {
    dayName,
    timeStr: `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`,
    date: d,
  };
}

/**
 * Check if a time string (HH:mm) is within the [openTime, closeTime] window.
 * Supports overnight shifts (e.g. 22:00 to 04:00) cleanly.
 */
export function isTimeInWindow(currentTime, startTime, endTime) {
  if (!startTime || !endTime) return true;

  const current = String(currentTime).trim();
  const start = String(startTime).trim();
  const end = String(endTime).trim();

  if (start <= end) {
    // Normal window within same day (e.g. 06:00 to 11:00)
    return current >= start && current <= end;
  }

  // Overnight shift spanning midnight (e.g. 22:00 to 04:00)
  return current >= start || current <= end;
}

/**
 * Authoritatively check if a product is available at the specified date/time.
 *
 * @param {Object} product - Product record (plain object or Mongoose document)
 * @param {Date} [referenceDate=new Date()] - Reference date for evaluation
 * @returns {Object} { isAvailable: boolean, reason: string, message: string }
 */
export function evaluateProductAvailability(product, referenceDate = new Date()) {
  if (!product) {
    return {
      isAvailable: false,
      available: false,
      reason: "PRODUCT_NOT_FOUND",
      message: "Product not found",
    };
  }

  // If scheduling is not enabled, product is available full-time
  if (!product.isScheduled) {
    return {
      isAvailable: true,
      available: true,
      reason: "UNSCHEDULED",
      message: "Always available",
    };
  }

  const { dayName, timeStr, date } = getZonedTimeParts(referenceDate);

  // 1. Date range bounds
  if (product.scheduleStartDate) {
    const start = new Date(product.scheduleStartDate);
    if (!isNaN(start.getTime()) && date < start) {
      return {
        isAvailable: false,
        available: false,
        reason: "START_DATE_PENDING",
        message: `Available starting ${start.toLocaleDateString("en-IN")}`,
      };
    }
  }

  if (product.scheduleEndDate) {
    const end = new Date(product.scheduleEndDate);
    if (!isNaN(end.getTime()) && date > end) {
      return {
        isAvailable: false,
        available: false,
        reason: "END_DATE_EXPIRED",
        message: "Availability period has ended",
      };
    }
  }

  // 2. Day-of-week restriction
  if (Array.isArray(product.scheduleDays) && product.scheduleDays.length > 0) {
    const allowedDays = product.scheduleDays.map((d) => String(d).trim());
    if (!allowedDays.includes(dayName)) {
      return {
        isAvailable: false,
        available: false,
        reason: "DAY_NOT_ALLOWED",
        message: `Available on ${allowedDays.join(", ")}`,
      };
    }
  }

  // 3. Time-of-day restriction
  if (product.availableFromTime && product.availableToTime) {
    const inWindow = isTimeInWindow(timeStr, product.availableFromTime, product.availableToTime);
    if (!inWindow) {
      return {
        isAvailable: false,
        available: false,
        reason: "TIME_NOT_ALLOWED",
        message: `Available today from ${product.availableFromTime} to ${product.availableToTime}`,
      };
    }
  }

  return {
    isAvailable: true,
    available: true,
    reason: "SCHEDULED_ACTIVE",
    message: "Available now",
  };
}

export default {
  evaluateProductAvailability,
  getZonedTimeParts,
  isTimeInWindow,
};
