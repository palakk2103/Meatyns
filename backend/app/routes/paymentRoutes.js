import express from "express";
import {
  createPaymentOrder,
  verifyPaymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentWebhook,
  getAdminPayments,
  getAdminPaymentById,
  refundPaymentAdmin,
} from "../controller/paymentController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import { paymentRouteRateLimiter } from "../middleware/securityMiddlewares.js";

const paymentRoute = express.Router();

/**
 * Razorpay Webhook endpoint.
 * Auth: Verified by HMAC SHA-256 signature in handlePaymentWebhook
 */
paymentRoute.post("/webhook", handlePaymentWebhook);
paymentRoute.post("/razorpay/webhook", handlePaymentWebhook);

/**
 * Initiate an online payment order for a specific CheckoutGroupId or OrderId.
 * Auth: Required (Customer paying for their own order)
 */
paymentRoute.post(
  "/create-order",
  verifyToken,
  paymentRouteRateLimiter,
  createPaymentOrder,
);

/**
 * Verify payment status from client side.
 * Auth: Required
 */
paymentRoute.get(
  "/status/:id",
  verifyToken,
  paymentRouteRateLimiter,
  verifyPaymentStatus,
);

/**
 * Initiate a Razorpay payment order for a specific CheckoutGroupId or OrderId.
 * Auth: Required
 */
paymentRoute.post(
  "/razorpay/create-order",
  verifyToken,
  paymentRouteRateLimiter,
  createRazorpayOrder,
);

/**
 * Verify Razorpay payment signature and complete the order.
 * Auth: Required
 */
paymentRoute.post(
  "/razorpay/verify",
  verifyToken,
  paymentRouteRateLimiter,
  verifyRazorpayPayment,
);

/**
 * Admin: List and filter all payment transactions.
 * Auth: Required (admin only)
 */
paymentRoute.get(
  "/admin",
  verifyToken,
  allowRoles("admin"),
  getAdminPayments,
);

/**
 * Admin: Get single payment details.
 * Auth: Required (admin only)
 */
paymentRoute.get(
  "/admin/:id",
  verifyToken,
  allowRoles("admin"),
  getAdminPaymentById,
);

/**
 * Admin: Initiate refund for a payment via Razorpay.
 * Auth: Required (admin only)
 */
paymentRoute.post(
  "/admin/:id/refund",
  verifyToken,
  allowRoles("admin"),
  refundPaymentAdmin,
);

export default paymentRoute;
