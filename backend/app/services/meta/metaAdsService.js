import axios from "axios";
import { getOrCreateMetaIntegration } from "./metaOAuthService.js";
import logger from "../logger.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Get active access token and ad account ID
 */
async function getActiveMetaContext() {
  const config = await getOrCreateMetaIntegration(true);
  const token = config.accessToken || process.env.META_CAPI_ACCESS_TOKEN || null;
  const adAccountId = config.selectedAdAccount?.id || process.env.META_AD_ACCOUNT_ID || null;

  return {
    config,
    token,
    adAccountId,
    isConnected: Boolean(config.isConnected && token && adAccountId),
  };
}

let demoCampaignsStore = [
  {
    id: "camp_demo_101",
    name: "Diwali Fresh Chicken Blitz - 30 Min Delivery",
    objective: "OUTCOME_SALES",
    status: "ACTIVE",
    effectiveStatus: "ACTIVE",
    dailyBudget: 1500,
    lifetimeBudget: null,
    startTime: new Date(Date.now() - 7 * 86400000).toISOString(),
    stopTime: null,
    createdTime: new Date(Date.now() - 14 * 86400000).toISOString(),
    metrics: {
      impressions: 48200,
      spend: 12450,
      clicks: 1840,
      cpc: 6.76,
      ctr: 3.82,
    },
  },
  {
    id: "camp_demo_102",
    name: "Mutton Biryani Cut Special - Hyperlocal Patna",
    objective: "OUTCOME_SALES",
    status: "ACTIVE",
    effectiveStatus: "ACTIVE",
    dailyBudget: 1000,
    lifetimeBudget: null,
    startTime: new Date(Date.now() - 5 * 86400000).toISOString(),
    stopTime: null,
    createdTime: new Date(Date.now() - 10 * 86400000).toISOString(),
    metrics: {
      impressions: 31400,
      spend: 8200,
      clicks: 1120,
      cpc: 7.32,
      ctr: 3.56,
    },
  },
  {
    id: "camp_demo_103",
    name: "Weekend Seafood & Prawns Discovery",
    objective: "OUTCOME_TRAFFIC",
    status: "PAUSED",
    effectiveStatus: "PAUSED",
    dailyBudget: 800,
    lifetimeBudget: null,
    startTime: new Date(Date.now() - 3 * 86400000).toISOString(),
    stopTime: null,
    createdTime: new Date(Date.now() - 7 * 86400000).toISOString(),
    metrics: {
      impressions: 14900,
      spend: 3600,
      clicks: 490,
      cpc: 7.34,
      ctr: 3.28,
    },
  },
];

/**
 * List campaigns for the connected ad account
 */
export async function getMetaCampaigns() {
  const { config, token, adAccountId, isConnected } = await getActiveMetaContext();

  if (!isConnected) {
    return {
      connected: false,
      message: "Meta account not connected or ad account not selected.",
      campaigns: [],
    };
  }

  // Handle simulated demo environment
  if (token?.startsWith("demo_")) {
    return {
      connected: true,
      selectedAdAccount: config.selectedAdAccount,
      campaigns: demoCampaignsStore,
    };
  }

  try {
    const formattedAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const response = await axios.get(`${GRAPH_BASE_URL}/${formattedAdAccountId}/campaigns`, {
      params: {
        fields:
          "id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,insights{impressions,spend,clicks,cpc,ctr}",
        access_token: token,
        limit: 50,
      },
      timeout: 12000,
    });

    const rawList = response.data?.data || [];
    const campaigns = rawList.map((c) => {
      const insight = c.insights?.data?.[0] || {};
      return {
        id: c.id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        effectiveStatus: c.effective_status,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startTime: c.start_time || null,
        stopTime: c.stop_time || null,
        createdTime: c.created_time || null,
        metrics: {
          impressions: Number(insight.impressions || 0),
          spend: Number(insight.spend || 0),
          clicks: Number(insight.clicks || 0),
          cpc: Number(insight.cpc || 0),
          ctr: Number(insight.ctr || 0),
        },
      };
    });

    // Update last sync time
    config.lastSyncedAt = new Date();
    await config.save();

    return {
      connected: true,
      selectedAdAccount: config.selectedAdAccount,
      campaigns,
    };
  } catch (error) {
    const metaError = error.response?.data?.error?.message || error.message;
    logger.error("getMetaCampaigns error:", { message: metaError });
    return {
      connected: true,
      error: `Meta API Error: ${metaError}`,
      campaigns: [],
    };
  }
}

/**
 * Creates a new campaign in PAUSED draft state only.
 * Requires explicit user confirmation.
 */
export async function createDraftCampaign({ name, objective, dailyBudget, specialAdCategories, confirmed }) {
  if (!confirmed) {
    throw new Error("Explicit user confirmation is required before creating a campaign.");
  }

  const { token, adAccountId, isConnected } = await getActiveMetaContext();
  if (!isConnected) {
    throw new Error("Meta account is not connected or ad account is missing.");
  }

  if (token?.startsWith("demo_")) {
    const newDemo = {
      id: `camp_demo_${Date.now()}`,
      name: String(name || "New Promo Draft").trim(),
      objective: String(objective || "OUTCOME_SALES").toUpperCase(),
      status: "PAUSED",
      effectiveStatus: "PAUSED",
      dailyBudget: Number(dailyBudget) || 1000,
      lifetimeBudget: null,
      startTime: new Date().toISOString(),
      stopTime: null,
      createdTime: new Date().toISOString(),
      metrics: { impressions: 0, spend: 0, clicks: 0, cpc: 0, ctr: 0 },
    };
    demoCampaignsStore.unshift(newDemo);
    return {
      success: true,
      campaignId: newDemo.id,
      status: "PAUSED",
      message: "Demo Campaign draft created successfully in PAUSED state.",
    };
  }

  const formattedAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  
  // Enforce PAUSED draft status for safety (never publish live directly)
  const payload = {
    name: String(name || "").trim(),
    objective: String(objective || "OUTCOME_SALES").toUpperCase(),
    status: "PAUSED",
    special_ad_categories: Array.isArray(specialAdCategories) && specialAdCategories.length > 0 ? specialAdCategories : ["NONE"],
    access_token: token,
  };

  if (dailyBudget && Number(dailyBudget) > 0) {
    // Meta expects budgets in lowest currency denomination (e.g. Paise / Cents)
    payload.daily_budget = Math.round(Number(dailyBudget) * 100);
  }

  try {
    const response = await axios.post(`${GRAPH_BASE_URL}/${formattedAdAccountId}/campaigns`, payload, {
      timeout: 12000,
    });

    return {
      success: true,
      campaignId: response.data?.id,
      status: "PAUSED",
      message: "Campaign draft created successfully in PAUSED state.",
    };
  } catch (error) {
    const metaError = error.response?.data?.error?.message || error.message;
    logger.error("createDraftCampaign error:", { message: metaError });
    throw new Error(`Meta Campaign Creation Failed: ${metaError}`);
  }
}

/**
 * Update campaign status (PAUSED or ACTIVE).
 * Requires explicit user confirmation.
 */
export async function updateCampaignStatus(campaignId, nextStatus, { confirmed } = {}) {
  if (!confirmed) {
    throw new Error("Explicit confirmation is required before updating campaign status.");
  }

  const normalizedStatus = String(nextStatus || "").toUpperCase();
  if (!["PAUSED", "ACTIVE"].includes(normalizedStatus)) {
    throw new Error("Invalid status. Only 'PAUSED' or 'ACTIVE' are supported.");
  }

  const { token, isConnected } = await getActiveMetaContext();
  if (!isConnected) {
    throw new Error("Meta account is not connected.");
  }

  if (token?.startsWith("demo_") || campaignId?.startsWith("camp_demo_")) {
    const target = demoCampaignsStore.find((c) => c.id === campaignId);
    if (target) {
      target.status = normalizedStatus;
      target.effectiveStatus = normalizedStatus;
    }
    return {
      success: true,
      campaignId,
      status: normalizedStatus,
      result: { success: true },
    };
  }

  try {
    const response = await axios.post(
      `${GRAPH_BASE_URL}/${campaignId}`,
      {
        status: normalizedStatus,
        access_token: token,
      },
      { timeout: 10000 }
    );

    return {
      success: true,
      campaignId,
      status: normalizedStatus,
      result: response.data,
    };
  } catch (error) {
    const metaError = error.response?.data?.error?.message || error.message;
    logger.error("updateCampaignStatus error:", { message: metaError });
    throw new Error(`Meta API Status Update Failed: ${metaError}`);
  }
}
