import express from "express";
import {
  getFlashDeals,
  createFlashDeal,
  updateFlashDeal,
  toggleFlashDealStatus,
  getPublicActiveDeal,
} from "../controller/admin/flashDealController.js";
import {
  verifyToken,
  requireAdminPermission,
} from "../middleware/authMiddleware.js";
import { ADMIN_PERMISSIONS } from "../constants/rbac.js";

const router = express.Router();

// Public route for customer frontend
router.get("/flash-deals/active", getPublicActiveDeal);

// Admin routes for flash deal management
router.get(
  "/admin/flash-deals",
  verifyToken,
  requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE),
  getFlashDeals
);

router.post(
  "/admin/flash-deals",
  verifyToken,
  requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE),
  createFlashDeal
);

router.put(
  "/admin/flash-deals/:id",
  verifyToken,
  requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE),
  updateFlashDeal
);

router.patch(
  "/admin/flash-deals/:id/status",
  verifyToken,
  requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE),
  toggleFlashDealStatus
);

export default router;
