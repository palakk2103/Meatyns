import crypto from "crypto";
import axios from "axios";
import MetaIntegration from "../../models/metaIntegration.js";
import MetaConversionEvent from "../../models/metaConversionEvent.js";
import logger from "../logger.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Get or create the singleton MetaIntegration configuration
 */
export async function getOrCreateMetaIntegration(includeSecrets = false) {
  let doc = includeSecrets
    ? await MetaIntegration.findOne().select("+accessToken")
    : await MetaIntegration.findOne();

  if (!doc) {
    doc = await MetaIntegration.create({
      isConnected: false,
      pixelEnabled: true,
      capiEnabled: true,
    });
  }
  return doc;
}

function getMetaCsrfSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be configured in production for Meta OAuth state signing");
    }
    return "meatyns_meta_csrf_secret";
  }
  return secret;
}

/**
 * Generates the official Meta OAuth redirect URL with CSRF protection
 */
export async function generateMetaOAuthUrl(adminUserId) {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:7000"}/api/admin/meta/oauth/callback`;

  if (!appId) {
    throw new Error("META_APP_ID is not configured in backend environment variables.");
  }

  // Create HMAC-signed state token containing user ID, timestamp, and a nonce
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = JSON.stringify({ userId: String(adminUserId || ""), nonce, ts: Date.now() });
  const secret = getMetaCsrfSecret();
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

  const scopes = [
    "ads_management",
    "ads_read",
    "business_management",
  ].join(",");

  const authUrl = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${encodeURIComponent(
    appId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(
    scopes
  )}&response_type=code`;

  return { authUrl, state };
}

/**
 * Validates CSRF state parameter from OAuth callback
 */
export function validateOAuthState(stateStr) {
  try {
    if (!stateStr) return false;
    const { payload, signature } = JSON.parse(Buffer.from(stateStr, "base64url").toString());
    const secret = getMetaCsrfSecret();
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return false;
    }

    const data = JSON.parse(payload);
    // 15-minute expiration for OAuth state
    if (Date.now() - data.ts > 15 * 60 * 1000) {
      return false;
    }

    return true;
  } catch (error) {
    logger.warn("validateOAuthState error:", { message: error.message });
    return false;
  }
}

/**
 * Exchanges OAuth authorization code for long-lived access token and fetches user's ad accounts
 */
export async function exchangeCodeAndConnectMeta(code) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:7000"}/api/admin/meta/oauth/callback`;

  if (!appId || !appSecret) {
    throw new Error("Meta App ID or App Secret is not configured.");
  }

  // 1. Exchange code for short-lived token
  const tokenRes = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token`, {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    },
    timeout: 10000,
  });

  const shortLivedToken = tokenRes.data?.access_token;
  if (!shortLivedToken) {
    throw new Error("Failed to obtain access token from Meta OAuth.");
  }

  // 2. Exchange for long-lived token (60-day expiry)
  let longLivedToken = shortLivedToken;
  let expiresInSec = tokenRes.data?.expires_in || 5184000; // default 60 days

  try {
    const exchangeRes = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
      timeout: 10000,
    });
    if (exchangeRes.data?.access_token) {
      longLivedToken = exchangeRes.data.access_token;
      expiresInSec = exchangeRes.data.expires_in || expiresInSec;
    }
  } catch (exErr) {
    logger.warn("Long-lived token exchange failed, using short-lived token:", { message: exErr.message });
  }

  const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

  // 3. Fetch connected user profile
  const userRes = await axios.get(`${GRAPH_BASE_URL}/me`, {
    params: {
      fields: "id,name,email",
      access_token: longLivedToken,
    },
    timeout: 10000,
  });

  // 4. Fetch ad accounts
  const adAccountsRes = await axios.get(`${GRAPH_BASE_URL}/me/adaccounts`, {
    params: {
      fields: "id,name,account_id,currency,timezone_name,account_status",
      access_token: longLivedToken,
    },
    timeout: 10000,
  });

  const adAccounts = (adAccountsRes.data?.data || []).map((acc) => ({
    id: acc.id,
    name: acc.name || `Ad Account ${acc.account_id || acc.id}`,
    accountId: acc.account_id || acc.id.replace("act_", ""),
    currency: acc.currency || "INR",
    timezone: acc.timezone_name || "Asia/Kolkata",
    accountStatus: acc.account_status,
  }));

  // 5. Fetch available pixels (if any ad account is found)
  let pixels = [];
  if (adAccounts.length > 0) {
    try {
      const firstAccId = adAccounts[0].id;
      const pixelRes = await axios.get(`${GRAPH_BASE_URL}/${firstAccId}/adspixels`, {
        params: {
          fields: "id,name",
          access_token: longLivedToken,
        },
        timeout: 10000,
      });
      pixels = (pixelRes.data?.data || []).map((p) => ({
        id: p.id,
        name: p.name || `Pixel ${p.id}`,
      }));
    } catch (pixelErr) {
      logger.warn("Failed to fetch pixels for initial ad account:", { message: pixelErr.message });
    }
  }

  // 6. Update singleton configuration
  const config = await getOrCreateMetaIntegration(true);
  config.isConnected = true;
  config.accessToken = longLivedToken;
  config.tokenExpiresAt = tokenExpiresAt;
  config.connectedUser = {
    id: userRes.data?.id || null,
    name: userRes.data?.name || "Meta User",
    email: userRes.data?.email || null,
  };
  config.adAccounts = adAccounts;
  config.pixels = pixels;

  if (adAccounts.length > 0 && !config.selectedAdAccount?.id) {
    config.selectedAdAccount = adAccounts[0];
  }
  if (pixels.length > 0 && !config.selectedPixel?.id) {
    config.selectedPixel = pixels[0];
  }

  config.lastSyncedAt = new Date();
  config.lastError = null;
  await config.save();

  return config.toSafeDTO();
}

/**
 * Disconnects the Meta account and clears tokens securely
 */
export async function disconnectMetaIntegration() {
  const config = await getOrCreateMetaIntegration(true);
  config.isConnected = false;
  config.accessToken = null;
  config.tokenExpiresAt = null;
  config.connectedUser = null;
  config.adAccounts = [];
  config.selectedAdAccount = null;
  config.pixels = [];
  config.selectedPixel = null;
  config.lastSyncedAt = new Date();
  await config.save();

  return config.toSafeDTO();
}

/**
 * Connects a simulated Demo Meta Account for client showcase and local testing
 */
export async function connectDemoMetaIntegration() {
  const config = await getOrCreateMetaIntegration(true);
  config.isConnected = true;
  config.accessToken = "demo_meta_token_meatyns_2026";
  config.tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  config.connectedUser = {
    id: "1084920194821034",
    name: "Meatyns Marketing Official",
    email: "marketing@meatyns.com",
  };
  config.adAccounts = [
    {
      id: "act_928374829104",
      name: "Meatyns Patna HQ (INR)",
      accountId: "928374829104",
      currency: "INR",
      timezone: "Asia/Kolkata",
      accountStatus: 1,
    },
    {
      id: "act_472819382109",
      name: "Meatyns Growth & Awareness",
      accountId: "472819382109",
      currency: "INR",
      timezone: "Asia/Kolkata",
      accountStatus: 1,
    },
  ];
  config.selectedAdAccount = config.adAccounts[0];
  config.pixels = [
    {
      id: "884920194821034",
      name: "Meatyns Production Pixel",
    },
    {
      id: "773910283746192",
      name: "Meatyns Retargeting Dataset",
    },
  ];
  config.selectedPixel = config.pixels[0];
  config.pixelEnabled = true;
  config.capiEnabled = true;
  config.lastSyncedAt = new Date();
  config.lastError = null;
  await config.save();

  // Seed sample conversion events if empty
  try {
    const count = await MetaConversionEvent.countDocuments();
    if (count === 0) {
      const now = Date.now();
      await MetaConversionEvent.insertMany([
        {
          eventId: "purchase_ORD_DEMO_9821",
          eventName: "Purchase",
          eventTime: Math.floor(now / 1000) - 120,
          orderId: "ORD_DEMO_9821",
          status: "SENT",
          value: 749,
          currency: "INR",
          payload: { content_type: "product", num_items: 2 },
          response: { events_received: 1, messages: [] },
          retryCount: 0,
          lastAttemptAt: new Date(now - 120000),
        },
        {
          eventId: "initiate_checkout_DEMO_9821",
          eventName: "InitiateCheckout",
          eventTime: Math.floor(now / 1000) - 240,
          orderId: "ORD_DEMO_9821",
          status: "SENT",
          value: 749,
          currency: "INR",
          payload: { content_type: "product", num_items: 2 },
          response: { events_received: 1 },
          retryCount: 0,
          lastAttemptAt: new Date(now - 240000),
        },
        {
          eventId: "add_to_cart_DEMO_4812",
          eventName: "AddToCart",
          eventTime: Math.floor(now / 1000) - 600,
          orderId: null,
          status: "SENT",
          value: 499,
          currency: "INR",
          payload: { content_name: "Fresh Chicken Curry Cut 1kg" },
          response: { events_received: 1 },
          retryCount: 0,
          lastAttemptAt: new Date(now - 600000),
        },
        {
          eventId: "view_content_DEMO_3192",
          eventName: "ViewContent",
          eventTime: Math.floor(now / 1000) - 900,
          orderId: null,
          status: "SENT",
          value: 499,
          currency: "INR",
          payload: { content_name: "Fresh Chicken Curry Cut 1kg" },
          response: { events_received: 1 },
          retryCount: 0,
          lastAttemptAt: new Date(now - 900000),
        },
        {
          eventId: "purchase_ORD_DEMO_9815",
          eventName: "Purchase",
          eventTime: Math.floor(now / 1000) - 3600,
          orderId: "ORD_DEMO_9815",
          status: "SENT",
          value: 1299,
          currency: "INR",
          payload: { content_name: "Mutton Rogan Josh Special Pack" },
          response: { events_received: 1 },
          retryCount: 0,
          lastAttemptAt: new Date(now - 3600000),
        },
      ]);
    }
  } catch (seedErr) {
    logger.warn("Failed to seed demo Meta conversion events:", { message: seedErr.message });
  }

  return config.toSafeDTO();
}
