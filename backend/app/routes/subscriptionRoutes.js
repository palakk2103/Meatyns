import express from "express";
import {
  getMySubscriptions,
  getSubscriptionById,
  createNewSubscription,
  updateSubscriptionDetails,
  pauseCustomerSubscription,
  resumeCustomerSubscription,
  cancelCustomerSubscription,
  getAllSubscriptionsAdmin,
  triggerSubscriptionBatchExecution,
} from "../controller/subscriptionController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin Subscription endpoints (declared before parameterized /:id)
router.get(
  "/admin/all",
  verifyToken,
  allowRoles("admin", "super_admin"),
  getAllSubscriptionsAdmin
);
router.post(
  "/admin/run-due-batch",
  verifyToken,
  allowRoles("admin", "super_admin"),
  triggerSubscriptionBatchExecution
);

// Customer Subscription endpoints
router.get("/my", verifyToken, getMySubscriptions);
router.get("/:id", verifyToken, getSubscriptionById);
router.post("/", verifyToken, createNewSubscription);
router.put("/:id", verifyToken, updateSubscriptionDetails);
router.put("/:id/pause", verifyToken, pauseCustomerSubscription);
router.put("/:id/resume", verifyToken, resumeCustomerSubscription);
router.put("/:id/cancel", verifyToken, cancelCustomerSubscription);

export default router;
