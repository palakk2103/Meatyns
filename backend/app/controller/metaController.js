import handleResponse from "../utils/helper.js";
import {
  getOrCreateMetaIntegration,
  generateMetaOAuthUrl,
  validateOAuthState,
  exchangeCodeAndConnectMeta,
  disconnectMetaIntegration,
  connectDemoMetaIntegration,
} from "../services/meta/metaOAuthService.js";
import {
  getMetaCampaigns,
  createDraftCampaign,
  updateCampaignStatus,
} from "../services/meta/metaAdsService.js";
import { sendMetaConversionEvent } from "../services/meta/metaCapiService.js";
import { getCampaignPerformanceAnalytics } from "../services/meta/metaAnalyticsService.js";
import MetaConversionEvent from "../models/metaConversionEvent.js";
import MetaIntegration from "../models/metaIntegration.js";
import logger from "../services/logger.js";

/**
 * GET /api/admin/meta/status
 * Returns current connection state without secrets
 */
export const getMetaStatus = async (req, res) => {
  try {
    const config = await getOrCreateMetaIntegration();
    return handleResponse(res, 200, "Meta integration status retrieved", config.toSafeDTO());
  } catch (error) {
    logger.error("getMetaStatus error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/admin/meta/oauth/url
 * Returns authorization URL for initiating Meta OAuth flow
 */
export const getOAuthUrl = async (req, res) => {
  try {
    const { authUrl, state } = await generateMetaOAuthUrl(req.user?.id);
    return handleResponse(res, 200, "OAuth URL generated", { authUrl, state });
  } catch (error) {
    logger.error("getOAuthUrl error:", { message: error.message });
    return handleResponse(res, 400, error.message);
  }
};

/**
 * GET /api/admin/meta/oauth/callback
 * Handles OAuth callback from Meta dialog
 */
export const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    const frontendBaseUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    if (error) {
      logger.warn("Meta OAuth error callback:", { error, error_description });
      return res.redirect(
        `${frontendBaseUrl}/admin/meta-ads/connect?error=${encodeURIComponent(
          error_description || error
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendBaseUrl}/admin/meta-ads/connect?error=Missing_code_or_state`
      );
    }

    const isStateValid = validateOAuthState(state);
    if (!isStateValid) {
      logger.warn("Meta OAuth state validation failed (possible CSRF attempt)");
      return res.redirect(
        `${frontendBaseUrl}/admin/meta-ads/connect?error=Invalid_OAuth_state`
      );
    }

    await exchangeCodeAndConnectMeta(code);

    return res.redirect(`${frontendBaseUrl}/admin/meta-ads/connect?success=true`);
  } catch (err) {
    logger.error("handleOAuthCallback error:", { message: err.message });
    const frontendBaseUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(
      `${frontendBaseUrl}/admin/meta-ads/connect?error=${encodeURIComponent(
        err.message || "Connection_failed"
      )}`
    );
  }
};

/**
 * POST /api/admin/meta/select-account
 * Selects the active ad account and pixel
 */
export const selectAdAccount = async (req, res) => {
  try {
    const { adAccountId, pixelId } = req.body;
    const config = await getOrCreateMetaIntegration(true);

    if (adAccountId) {
      const match = (config.adAccounts || []).find(
        (a) => a.id === adAccountId || a.accountId === adAccountId
      );
      if (match) {
        config.selectedAdAccount = match;
      } else {
        config.selectedAdAccount = {
          id: adAccountId,
          name: `Ad Account (${adAccountId})`,
          accountId: adAccountId.replace("act_", ""),
        };
      }
    }

    if (pixelId) {
      const pMatch = (config.pixels || []).find((p) => p.id === pixelId);
      if (pMatch) {
        config.selectedPixel = pMatch;
      } else {
        config.selectedPixel = { id: pixelId, name: `Pixel (${pixelId})` };
      }
    }

    await config.save();
    return handleResponse(res, 200, "Account selection updated", config.toSafeDTO());
  } catch (error) {
    logger.error("selectAdAccount error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/admin/meta/disconnect
 * Safely disconnects the Meta account
 */
export const disconnectMeta = async (req, res) => {
  try {
    const safeDTO = await disconnectMetaIntegration();
    return handleResponse(res, 200, "Meta integration disconnected", safeDTO);
  } catch (error) {
    logger.error("disconnectMeta error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/admin/meta/connect-demo
 * Connects demo Meta account for local testing and client showcase
 */
export const connectDemoAccountController = async (req, res) => {
  try {
    const safeDTO = await connectDemoMetaIntegration();
    return handleResponse(res, 200, "Demo Meta account connected successfully", safeDTO);
  } catch (error) {
    logger.error("connectDemoAccountController error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/admin/meta/campaigns
 * Retrieves campaigns for the selected ad account
 */
export const getCampaigns = async (req, res) => {
  try {
    const result = await getMetaCampaigns();
    return handleResponse(res, 200, "Campaigns retrieved", result);
  } catch (error) {
    logger.error("getCampaigns error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/admin/meta/campaigns
 * Creates a new campaign in PAUSED draft status with safety checks
 */
export const createCampaignDraft = async (req, res) => {
  try {
    const { name, objective, dailyBudget, specialAdCategories, confirmed } = req.body;

    if (!confirmed) {
      return handleResponse(
        res,
        400,
        "Explicit user confirmation is required before submitting a campaign to Meta."
      );
    }

    const result = await createDraftCampaign({
      name,
      objective,
      dailyBudget,
      specialAdCategories,
      confirmed,
    });

    return handleResponse(res, 201, result.message, result);
  } catch (error) {
    logger.error("createCampaignDraft error:", { message: error.message });
    return handleResponse(res, 400, error.message);
  }
};

/**
 * PATCH /api/admin/meta/campaigns/:id/status
 * Updates status of a campaign (PAUSED or ACTIVE)
 */
export const updateCampaignStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, confirmed } = req.body;

    if (!confirmed) {
      return handleResponse(
        res,
        400,
        "Explicit user confirmation is required before modifying campaign status."
      );
    }

    const result = await updateCampaignStatus(id, status, { confirmed });
    return handleResponse(res, 200, "Campaign status updated", result);
  } catch (error) {
    logger.error("updateCampaignStatus error:", { message: error.message });
    return handleResponse(res, 400, error.message);
  }
};

/**
 * GET /api/admin/meta/analytics
 * Performance analytics blending Meta Insights with Meatyns internal order attribution
 */
export const getAnalytics = async (req, res) => {
  try {
    const { datePreset, startDate, endDate } = req.query;
    const analytics = await getCampaignPerformanceAnalytics({
      datePreset,
      startDate,
      endDate,
    });
    return handleResponse(res, 200, "Performance analytics retrieved", analytics);
  } catch (error) {
    logger.error("getAnalytics error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/admin/meta/events
 * Lists CAPI event logs with pagination and status filter
 */
export const getConversionEvents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;

    const query = {};
    if (status) query.status = status;

    const total = await MetaConversionEvent.countDocuments(query);
    const events = await MetaConversionEvent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return handleResponse(res, 200, "Conversion events retrieved", {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("getConversionEvents error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/admin/meta/events/:id/retry
 * Retries a failed CAPI event
 */
export const retryConversionEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await MetaConversionEvent.findById(id);

    if (!event) {
      return handleResponse(res, 404, "Conversion event not found");
    }

    const result = await sendMetaConversionEvent({
      eventName: event.eventName,
      eventId: event.eventId,
      orderId: event.orderId,
      userData: event.payload?.user_data || {},
      customData: event.payload?.custom_data || {},
    });

    return handleResponse(res, 200, "Event retry processed", result);
  } catch (error) {
    logger.error("retryConversionEvent error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PUT /api/admin/meta/settings
 * Updates Pixel ID, CAPI enabled toggles, and test event code
 */
export const updateMetaSettings = async (req, res) => {
  try {
    const { pixelId, pixelEnabled, capiEnabled, testEventCode } = req.body;
    const config = await getOrCreateMetaIntegration(true);

    if (pixelId !== undefined) {
      config.selectedPixel = { id: String(pixelId).trim(), name: `Pixel (${pixelId})` };
    }
    if (pixelEnabled !== undefined) {
      config.pixelEnabled = Boolean(pixelEnabled);
    }
    if (capiEnabled !== undefined) {
      config.capiEnabled = Boolean(capiEnabled);
    }
    if (testEventCode !== undefined) {
      config.testEventCode = String(testEventCode || "").trim();
    }

    await config.save();
    return handleResponse(res, 200, "Settings updated", config.toSafeDTO());
  } catch (error) {
    logger.error("updateMetaSettings error:", { message: error.message });
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/meta/pixel-config
 * Public endpoint returning safe Pixel ID for client-side tracking
 */
export const getPublicPixelConfig = async (req, res) => {
  try {
    const config = await MetaIntegration.findOne().lean();
    const pixelId =
      config?.selectedPixel?.id || process.env.META_PIXEL_ID || null;
    const enabled =
      Boolean(config ? config.pixelEnabled : process.env.META_PIXEL_ENABLED !== "false") &&
      Boolean(pixelId);

    return handleResponse(res, 200, "Pixel config retrieved", {
      pixelId: enabled ? pixelId : null,
      enabled,
    });
  } catch (error) {
    return handleResponse(res, 200, "Pixel config fallback", {
      pixelId: process.env.META_PIXEL_ID || null,
      enabled: false,
    });
  }
};
