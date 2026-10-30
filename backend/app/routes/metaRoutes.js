import express from "express";
import {
  getMetaStatus,
  getOAuthUrl,
  handleOAuthCallback,
  selectAdAccount,
  disconnectMeta,
  connectDemoAccountController,
  getCampaigns,
  createCampaignDraft,
  updateCampaignStatusController,
  getAnalytics,
  getConversionEvents,
  retryConversionEvent,
  updateMetaSettings,
  getPublicPixelConfig,
} from "../controller/metaController.js";
import {
  verifyToken,
  allowRoles,
  requireAdminPermission,
} from "../middleware/authMiddleware.js";
import { ADMIN_PERMISSIONS } from "../constants/rbac.js";

const router = express.Router();

// Public endpoints
router.get("/oauth/callback", handleOAuthCallback);
router.get("/pixel-config", getPublicPixelConfig);

// Admin-protected endpoints (requires MARKETING_VIEW or MARKETING_MANAGE)
router.use(verifyToken);
router.use(allowRoles("admin"));

// Status and OAuth initiation
router.get("/status", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_VIEW), getMetaStatus);
router.get("/oauth/url", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), getOAuthUrl);
router.post("/select-account", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), selectAdAccount);
router.post("/disconnect", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), disconnectMeta);
router.post("/connect-demo", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), connectDemoAccountController);

// Campaigns
router.get("/campaigns", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_VIEW), getCampaigns);
router.post("/campaigns", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), createCampaignDraft);
router.patch("/campaigns/:id/status", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), updateCampaignStatusController);

// Analytics
router.get("/analytics", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_VIEW), getAnalytics);

// Conversions API (CAPI) events & logs
router.get("/events", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_VIEW), getConversionEvents);
router.post("/events/:id/retry", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), retryConversionEvent);

// Integration Settings
router.put("/settings", requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE), updateMetaSettings);

export default router;
