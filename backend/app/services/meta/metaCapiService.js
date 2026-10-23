import crypto from "crypto";
import axios from "axios";
import MetaIntegration from "../../models/metaIntegration.js";
import MetaConversionEvent from "../../models/metaConversionEvent.js";
import logger from "../logger.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Normalizes and SHA-256 hashes a string according to Meta guidelines
 */
export function hashMetaField(val) {
  if (!val) return null;
  const normalized = String(val).trim().toLowerCase();
  if (!normalized) return null;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Normalizes phone numbers for Meta (digits only, e.g. +919876543210 -> 919876543210)
 */
export function hashMetaPhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  // If 10-digit Indian number without country code, prepend 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return crypto.createHash("sha256").update(digits).digest("hex");
}

/**
 * Sends a server-side conversion event to Meta via the Conversions API (CAPI)
 */
export async function sendMetaConversionEvent({
  eventName,
  eventId,
  orderId = null,
  eventSourceUrl = null,
  userData = {},
  customData = {},
  actionSource = "website",
}) {
  try {
    if (!eventId || !eventName) {
      logger.warn("sendMetaConversionEvent: eventId and eventName are required.");
      return { success: false, reason: "Missing eventId or eventName" };
    }

    // 1. Check idempotency: Has this eventId already been processed?
    const existing = await MetaConversionEvent.findOne({ eventId });
    if (existing && existing.status === "SENT") {
      logger.info(`CAPI Event [${eventId}] already sent. Skipping duplicate.`);
      return { success: true, duplicate: true, eventId };
    }

    // 2. Retrieve Meta credentials
    const config = await MetaIntegration.findOne().select("+accessToken");
    const accessToken = config?.accessToken || process.env.META_CAPI_ACCESS_TOKEN || null;
    const pixelId = config?.selectedPixel?.id || process.env.META_PIXEL_ID || null;
    const testEventCode = config?.testEventCode || process.env.META_TEST_EVENT_CODE || null;

    if (!config?.capiEnabled && !process.env.META_CAPI_ACCESS_TOKEN) {
      logger.info("CAPI is disabled in settings. Event skipped.");
      return { success: false, reason: "CAPI is disabled" };
    }

    if (!pixelId || !accessToken) {
      logger.warn("Meta Pixel ID or Access Token is missing. CAPI event cannot be sent to Meta.");
      // Record as PENDING so it can be retried once credentials are added
      await MetaConversionEvent.findOneAndUpdate(
        { eventId },
        {
          eventId,
          eventName,
          eventTime: Math.floor(Date.now() / 1000),
          orderId,
          status: "PENDING",
          value: customData.value || 0,
          currency: customData.currency || "INR",
          payload: { userData, customData },
          error: "Pixel ID or Access Token not configured",
        },
        { upsert: true, new: true }
      );
      return { success: false, reason: "Credentials not configured" };
    }

    // 3. Prepare normalized and hashed user data
    const normalizedUserData = {
      client_ip_address: userData.clientIp || userData.client_ip_address || undefined,
      client_user_agent: userData.clientUserAgent || userData.client_user_agent || undefined,
    };

    if (userData.email) {
      normalizedUserData.em = [hashMetaField(userData.email)];
    }
    if (userData.phone) {
      normalizedUserData.ph = [hashMetaPhone(userData.phone)];
    }
    if (userData.firstName) {
      normalizedUserData.fn = [hashMetaField(userData.firstName)];
    }
    if (userData.lastName) {
      normalizedUserData.ln = [hashMetaField(userData.lastName)];
    }
    if (userData.fbc) {
      normalizedUserData.fbc = userData.fbc;
    }
    if (userData.fbp) {
      normalizedUserData.fbp = userData.fbp;
    }

    const eventTime = Math.floor(Date.now() / 1000);

    const eventPayload = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      event_source_url: eventSourceUrl || undefined,
      action_source: actionSource,
      user_data: normalizedUserData,
      custom_data: {
        currency: customData.currency || "INR",
        value: Number(customData.value || 0),
        order_id: orderId || undefined,
        content_type: customData.contentType || "product",
        contents: customData.contents || [],
      },
    };

    const requestBody = {
      data: [eventPayload],
    };

    if (testEventCode) {
      requestBody.test_event_code = testEventCode;
    }

    // 4. Record event as PENDING before sending
    const eventRecord = await MetaConversionEvent.findOneAndUpdate(
      { eventId },
      {
        eventId,
        eventName,
        eventTime,
        orderId,
        status: "PENDING",
        value: Number(customData.value || 0),
        currency: customData.currency || "INR",
        payload: {
          ...eventPayload,
          // Do not store raw sensitive data
          user_data: { ...normalizedUserData, em: "[HASHED]", ph: "[HASHED]" },
        },
        testEventCode: testEventCode || null,
        lastAttemptAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 5. Send to Meta Graph API
    const response = await axios.post(`${GRAPH_BASE_URL}/${pixelId}/events`, requestBody, {
      params: { access_token: accessToken },
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });

    // 6. Mark as SENT upon success
    eventRecord.status = "SENT";
    eventRecord.response = response.data;
    eventRecord.error = null;
    await eventRecord.save();

    logger.info(`Meta CAPI event [${eventName}] dispatched successfully for Order [${orderId || "N/A"}].`);
    return { success: true, eventId, response: response.data };
  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    logger.error(`Meta CAPI event delivery failed for [${eventId}]:`, { message: errorDetails });

    await MetaConversionEvent.findOneAndUpdate(
      { eventId },
      {
        status: "FAILED",
        error: errorDetails,
        $inc: { retryCount: 1 },
        lastAttemptAt: new Date(),
      }
    );

    return { success: false, eventId, error: errorDetails };
  }
}

/**
 * Triggers a server-side Purchase event for a confirmed order
 */
export async function trackServerPurchase(order, customer, req = null) {
  if (!order || !order.orderId) return;

  const eventId = `purchase_${order.orderId}`;
  const totalValue =
    Number(order.pricing?.total || order.paymentBreakdown?.payableAmount || 0);

  const contents = (order.items || []).map((item) => ({
    id: String(item.product?._id || item.product || ""),
    quantity: item.quantity || 1,
    item_price: Number(item.price || 0),
  }));

  const userData = {
    email: customer?.email || order.address?.email || null,
    phone: customer?.phone || order.address?.phone || null,
    firstName: customer?.name?.split(" ")[0] || order.address?.name?.split(" ")[0] || null,
    lastName: customer?.name?.split(" ").slice(1).join(" ") || null,
    clientIp: req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || null,
    clientUserAgent: req?.headers?.["user-agent"] || null,
    fbc: order.attribution?.fbc || null,
    fbp: order.attribution?.fbp || null,
  };

  // Run asynchronously so caller is never delayed
  setImmediate(() => {
    sendMetaConversionEvent({
      eventName: "Purchase",
      eventId,
      orderId: order.orderId,
      userData,
      customData: {
        currency: "INR",
        value: totalValue,
        contents,
        contentType: "product",
      },
    }).catch((err) => {
      logger.error("trackServerPurchase async error:", { message: err.message });
    });
  });
}
