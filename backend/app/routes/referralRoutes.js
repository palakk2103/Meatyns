import express from "express";
import {
  getMyReferralDetails,
  validateCustomerReferralCode,
  getAllReferralsAdmin,
  getReferralStatsAdmin,
} from "../controller/referralController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer endpoints
router.get("/my", verifyToken, getMyReferralDetails);
router.get("/validate/:code", validateCustomerReferralCode);

// Admin endpoints
router.get(
  "/admin/all",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager"),
  getAllReferralsAdmin
);
router.get(
  "/admin/stats",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager"),
  getReferralStatsAdmin
);

export default router;
