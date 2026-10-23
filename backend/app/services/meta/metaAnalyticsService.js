import axios from "axios";
import Order from "../../models/order.js";
import { getOrCreateMetaIntegration } from "./metaOAuthService.js";
import logger from "../logger.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Retrieves performance analytics blending Meta Marketing Insights with Meatyns internal order attribution
 */
export async function getCampaignPerformanceAnalytics({ datePreset = "last_30d", startDate, endDate } = {}) {
  const config = await getOrCreateMetaIntegration(true);
  const token = config.accessToken || process.env.META_CAPI_ACCESS_TOKEN || null;
  const adAccountId = config.selectedAdAccount?.id || process.env.META_AD_ACCOUNT_ID || null;
  const isConnected = Boolean(config.isConnected && token && adAccountId);

  let metaMetrics = {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    cpc: 0,
    ctr: 0,
    metaPurchases: 0,
    metaPurchaseValue: 0,
    currency: config.selectedAdAccount?.currency || "INR",
  };

  let metaConnected = false;
  let metaApiMessage = null;

  if (isConnected) {
    try {
      const formattedAdAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const params = {
        fields: "spend,impressions,reach,clicks,cpc,ctr,actions,action_values",
        access_token: token,
      };

      if (startDate && endDate) {
        params.time_range = JSON.stringify({ since: startDate, until: endDate });
      } else {
        params.date_preset = datePreset || "last_30d";
      }

      const response = await axios.get(`${GRAPH_BASE_URL}/${formattedAdAccountId}/insights`, {
        params,
        timeout: 12000,
      });

      const insight = response.data?.data?.[0];
      if (insight) {
        const purchaseAction = (insight.actions || []).find(
          (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
        );
        const purchaseValueAction = (insight.action_values || []).find(
          (a) => a.action_type === "purchase" || a.action_type === "omni_purchase"
        );

        metaMetrics = {
          spend: Number(insight.spend || 0),
          impressions: Number(insight.impressions || 0),
          reach: Number(insight.reach || 0),
          clicks: Number(insight.clicks || 0),
          cpc: Number(insight.cpc || 0),
          ctr: Number(insight.ctr || 0),
          metaPurchases: Number(purchaseAction?.value || 0),
          metaPurchaseValue: Number(purchaseValueAction?.value || 0),
          currency: config.selectedAdAccount?.currency || "INR",
        };
      }
      metaConnected = true;
    } catch (err) {
      metaApiMessage = err.response?.data?.error?.message || err.message;
      logger.warn("Meta Insights API error:", { message: metaApiMessage });
    }
  } else {
    metaApiMessage = "Meta account not connected. Meta-reported advertising metrics are unavailable.";
  }

  // Calculate internal Meatyns orders attributed to Meta
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else {
    // Default to last 30 days
    const past30Days = new Date();
    past30Days.setDate(past30Days.getDate() - 30);
    dateFilter.createdAt = { $gte: past30Days };
  }

  const attributedOrders = await Order.find({
    ...dateFilter,
    "attribution.source": "meta",
    orderStatus: { $nin: ["cancelled", "failed"] },
  })
    .select("orderId pricing paymentBreakdown createdAt orderStatus items")
    .lean();

  const internalOrderCount = attributedOrders.length;
  const internalRevenue = attributedOrders.reduce((sum, order) => {
    const val = Number(order.pricing?.total || order.paymentBreakdown?.payableAmount || 0);
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);

  // Blended ROAS = Internal Attributed Revenue / Meta Spend
  let internalRoas = 0;
  if (metaMetrics.spend > 0) {
    internalRoas = Number((internalRevenue / metaMetrics.spend).toFixed(2));
  }

  return {
    metaConnected,
    metaApiMessage,
    selectedAdAccount: config.selectedAdAccount || null,
    reportingPeriod: {
      datePreset: datePreset || "last_30d",
      startDate: startDate || null,
      endDate: endDate || null,
    },
    // Platform-reported advertising metrics
    metaAdvertising: metaMetrics,
    // Internal platform-verified orders & revenue
    internalAttribution: {
      attributedOrdersCount: internalOrderCount,
      attributedRevenue: Math.round(internalRevenue * 100) / 100,
      blendedRoas: internalRoas,
      currency: "INR",
    },
    comparisonNotes: {
      explanation:
        "Meta-reported purchases represent conversions tracked via Pixel & CAPI according to Meta attribution windows (e.g. 7-day click / 1-day view). Internal attribution reflects confirmed Meatyns orders with verified Meta click or UTM signals.",
    },
  };
}
