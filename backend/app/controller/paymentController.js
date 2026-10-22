import mongoose from "mongoose";
import handleResponse from "../utils/helper.js";
import {
  createPaymentOrderForOrderRef,
  verifyPaymentStatusInternal,
  resolvePaymentTarget,
  validatePaymentEligibility,
  getPayableAmountPaise,
  transitionPaymentState,
  handleOrderSideEffectsFromPaymentStatus,
  processPaymentWebhook,
  initiateRazorpayRefund,
} from "../services/paymentService.js";
import {
  createPaymentOrderSchema,
  verifyPaymentClientSchema,
  validateSchema,
} from "../validation/paymentValidation.js";
import logger from "../services/logger.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/payment.js";
import { PAYMENT_STATUS, PAYMENT_GATEWAY, PAYMENT_EVENT_SOURCE } from "../constants/payment.js";
import getPagination from "../utils/pagination.js";

function resolvePaymentErrorMessage(error) {
  const directMessage = String(error?.message || "").trim();
  if (directMessage) return directMessage;

  const responseStatusText = String(error?.response?.statusText || "").trim();
  if (responseStatusText) return `Payment gateway error: ${responseStatusText}`;

  const causeCode = String(error?.cause?.code || error?.code || "").trim();
  if (causeCode) return `Payment gateway request failed (${causeCode})`;

  return "Unable to initiate payment right now";
}

export const createPaymentOrder = async (req, res) => {
  try {
    const payload = validateSchema(createPaymentOrderSchema, req.body || {});
    const result = await createPaymentOrderForOrderRef({
      orderRef: payload.orderRef || payload.orderId,
      userId: req.user?.id,
      idempotencyKey: req.headers["idempotency-key"] || null,
      correlationId: req.correlationId || null,
    });

    return handleResponse(
      res,
      result.duplicate ? 200 : 201,
      result.duplicate ? "Re-using existing payment" : "Payment initiated",
      {
        payment: result.payment,
        redirectUrl: result.redirectUrl,
        merchantOrderId: result.payment.gatewayOrderId,
      },
    );
  } catch (error) {
    logger.error("createPaymentOrder failed", {
      scope: "PaymentController.createPaymentOrder",
      message: error?.message,
      statusCode: error?.statusCode || error?.status || 500,
      code: error?.code || error?.cause?.code || null,
      responseStatus: error?.response?.status || null,
      responseStatusText: error?.response?.statusText || null,
      orderRef: req.body?.orderRef || req.body?.orderId || null,
      userId: req.user?.id || null,
      correlationId: req.correlationId || null,
    });
    return handleResponse(
      res,
      error.statusCode || error.status || 500,
      resolvePaymentErrorMessage(error),
    );
  }
};

export const verifyPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantOrderId = id || req.query.merchantOrderId;
    
    if (!merchantOrderId) {
        return handleResponse(res, 400, "merchantOrderId is required");
    }

    const verification = await verifyPaymentStatusInternal({
      merchantOrderId,
      userId: req.user?.id,
      correlationId: req.correlationId || null,
    });

    return handleResponse(res, 200, "Payment status verified", {
      status: verification.status,
      payment: verification.payment,
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const getPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const merchantOrderId = id;
    
        const verification = await verifyPaymentStatusInternal({
          merchantOrderId,
          userId: req.user?.id,
          correlationId: req.correlationId || null,
        });
    
        return handleResponse(res, 200, "Payment status retrieved", {
          status: verification.status,
          merchantOrderId: verification.payment.gatewayOrderId,
          amount: verification.payment.amount,
          currency: verification.payment.currency,
        });
      } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
      }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderRef, orderId } = req.body;
    const ref = orderRef || orderId;
    if (!ref) {
      return handleResponse(res, 400, "orderRef or orderId is required");
    }

    const target = await resolvePaymentTarget(ref);
    validatePaymentEligibility(target, req.user?.id);

    const primaryOrder = target.primaryOrder;
    const paymentScopeQuery = target.checkoutGroupId
      ? { checkoutGroupId: target.checkoutGroupId }
      : { order: primaryOrder._id };

    // Check for existing open payment
    const existingOpenPayment = await Payment.findOne({
      ...paymentScopeQuery,
      status: {
        $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING],
      },
    }).sort({ createdAt: -1 });

    if (existingOpenPayment && existingOpenPayment.gatewayName === PAYMENT_GATEWAY.RAZORPAY) {
      return handleResponse(res, 200, "Re-using existing payment", {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: existingOpenPayment.gatewayOrderId,
        amount: existingOpenPayment.amount,
        currency: existingOpenPayment.currency,
        merchantOrderId: existingOpenPayment.gatewayOrderId,
      });
    }

    const amountPaise = getPayableAmountPaise(target);
    const currency = String(primaryOrder?.paymentBreakdown?.currency || "INR").toUpperCase();
    
    // Generate standard merchantOrderId
    const attemptCount = (await Payment.countDocuments(paymentScopeQuery)) + 1;
    const receiptId = `RP-${target.checkoutGroupId || target.publicOrderRef || crypto.randomUUID()}`.slice(0, 40);

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: amountPaise,
      currency,
      receipt: receiptId,
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    const paymentData = {
      order: primaryOrder._id,
      orderIds: target.orders.map((order) => order._id),
      checkoutGroupId: target.checkoutGroupId || null,
      publicOrderId: target.publicOrderRef,
      customer: primaryOrder.customer,
      gatewayName: PAYMENT_GATEWAY.RAZORPAY,
      gatewayOrderId: razorpayOrder.id,
      amount: amountPaise,
      currency,
      status: PAYMENT_STATUS.PENDING,
      attemptCount,
      correlationId: req.correlationId || null,
      rawGatewayResponse: razorpayOrder,
      statusHistory: [
        {
          fromStatus: PAYMENT_STATUS.CREATED,
          toStatus: PAYMENT_STATUS.PENDING,
          source: PAYMENT_EVENT_SOURCE.SYSTEM,
          reason: "Razorpay order created",
        },
      ],
    };

    const payment = await Payment.create(paymentData);

    logger.info("razorpay_payment_order_created", {
      correlationId: req.correlationId || null,
      publicOrderId: payment.publicOrderId,
      paymentId: payment._id.toString(),
      gatewayOrderId: payment.gatewayOrderId,
      amount: payment.amount,
    });

    return handleResponse(res, 201, "Payment initiated", {
      key: keyId,
      orderId: razorpayOrder.id,
      amount: amountPaise,
      currency,
    });
  } catch (error) {
    logger.error("createRazorpayOrder failed", {
      scope: "PaymentController.createRazorpayOrder",
      message: error?.message || error?.error?.description,
      statusCode: error?.statusCode || 500,
    });
    const errorMsg = error?.error?.description || error?.description || error?.message || "Failed to initiate Razorpay order";
    return handleResponse(res, error.statusCode || 500, errorMsg);
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return handleResponse(res, 400, "Missing required Razorpay parameters");
    }

    const payment = await Payment.findOne({ gatewayOrderId: razorpay_order_id });
    if (!payment) {
      return handleResponse(res, 404, "Payment attempt not found");
    }

    if (String(payment.customer) !== String(req.user?.id)) {
      return handleResponse(res, 403, "Not authorized to verify this payment");
    }

    if (payment.status === PAYMENT_STATUS.CAPTURED) {
      return handleResponse(res, 200, "Payment already verified", {
        status: payment.status,
        payment,
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      logger.error("Razorpay signature verification failed", {
        scope: "PaymentController.verifyRazorpayPayment",
        razorpay_order_id,
        razorpay_payment_id,
      });

      await transitionPaymentState(payment, {
        nextStatus: PAYMENT_STATUS.FAILED,
        source: PAYMENT_EVENT_SOURCE.CLIENT_VERIFY,
        reason: "Razorpay signature verification failed",
        gatewayPaymentId: razorpay_payment_id,
        rawGatewayResponse: req.body,
      });

      await handleOrderSideEffectsFromPaymentStatus(payment, PAYMENT_STATUS.FAILED, "Signature verification failed");

      return handleResponse(res, 400, "Invalid signature");
    }

    await transitionPaymentState(payment, {
      nextStatus: PAYMENT_STATUS.CAPTURED,
      source: PAYMENT_EVENT_SOURCE.CLIENT_VERIFY,
      reason: "Razorpay payment verified successfully",
      gatewayPaymentId: razorpay_payment_id,
      rawGatewayResponse: req.body,
    });

    await handleOrderSideEffectsFromPaymentStatus(payment, PAYMENT_STATUS.CAPTURED, "Razorpay payment successful");

    logger.info("razorpay_payment_verified", {
      correlationId: req.correlationId || null,
      gatewayOrderId: razorpay_order_id,
      status: PAYMENT_STATUS.CAPTURED,
    });

    return handleResponse(res, 200, "Payment verified successfully", {
      status: PAYMENT_STATUS.CAPTURED,
      payment,
    });
  } catch (error) {
    logger.error("verifyRazorpayPayment failed", {
      scope: "PaymentController.verifyRazorpayPayment",
      message: error?.message,
      statusCode: error?.statusCode || 500,
    });
    return handleResponse(res, error.statusCode || 500, error.message || "Verification failed");
  }
};

/**
 * Handle incoming payment gateway webhooks (e.g. Razorpay).
 * Public route with HMAC signature verification.
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const rawBody = req.rawBody || req.body;
    const signature = req.headers["x-razorpay-signature"];
    const authorization = req.headers["authorization"];

    const result = await processPaymentWebhook({
      rawBody,
      authorization,
      signature,
      correlationId: req.correlationId || null,
    });

    return handleResponse(res, 200, "Webhook processed successfully", result);
  } catch (error) {
    logger.error("handlePaymentWebhook failed", {
      scope: "PaymentController.handlePaymentWebhook",
      message: error?.message,
      statusCode: error?.statusCode || 500,
    });
    return handleResponse(res, error.statusCode || 500, error.message || "Webhook processing failed");
  }
};

/**
 * Admin: list payment transactions with filtering and pagination.
 */
export const getAdminPayments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const { status, search, gatewayName, paymentType, startDate, endDate } = req.query;

    const query = {};

    if (status && Object.values(PAYMENT_STATUS).includes(String(status).toUpperCase())) {
      query.status = String(status).toUpperCase();
    }

    if (gatewayName) {
      query.gatewayName = String(gatewayName).toUpperCase();
    }

    if (paymentType) {
      query.paymentType = String(paymentType).toUpperCase();
    }

    if (search) {
      const searchTrim = String(search).trim();
      query.$or = [
        { gatewayOrderId: { $regex: searchTrim, $options: "i" } },
        { gatewayPaymentId: { $regex: searchTrim, $options: "i" } },
        { publicOrderId: { $regex: searchTrim, $options: "i" } },
        { checkoutGroupId: { $regex: searchTrim, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email phone")
        .populate("order", "orderId status workflowStatus paymentStatus pricing")
        .lean(),
      Payment.countDocuments(query),
    ]);

    const sanitizedPayments = payments.map((p) => ({
      _id: p._id,
      publicOrderId: p.publicOrderId,
      checkoutGroupId: p.checkoutGroupId,
      order: p.order,
      orderIds: p.orderIds,
      customer: p.customer,
      gatewayName: p.gatewayName,
      gatewayOrderId: p.gatewayOrderId,
      gatewayPaymentId: p.gatewayPaymentId,
      gatewayRefundId: p.gatewayRefundId,
      amount: p.amount ? p.amount / 100 : 0,
      amountPaise: p.amount,
      currency: p.currency,
      status: p.status,
      paymentType: p.paymentType,
      attemptCount: p.attemptCount,
      refundedAmount: p.refundedAmount || 0,
      failureReason: p.failureReason,
      capturedAt: p.capturedAt,
      failedAt: p.failedAt,
      refundedAt: p.refundedAt,
      createdAt: p.createdAt,
      statusHistory: p.statusHistory || [],
    }));

    return handleResponse(res, 200, "Payments fetched successfully", {
      items: sanitizedPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    logger.error("getAdminPayments failed", {
      scope: "PaymentController.getAdminPayments",
      message: error?.message,
    });
    return handleResponse(res, error.statusCode || 500, error.message || "Failed to fetch payments");
  }
};

/**
 * Admin: get payment details by ID or gatewayOrderId.
 */
export const getAdminPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const lookup = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { gatewayOrderId: id }, { gatewayPaymentId: id }] }
      : { $or: [{ gatewayOrderId: id }, { gatewayPaymentId: id }, { publicOrderId: id }] };

    const payment = await Payment.findOne(lookup)
      .populate("customer", "name email phone")
      .populate("order", "orderId status workflowStatus paymentStatus pricing items address")
      .populate("orderIds", "orderId status workflowStatus paymentStatus pricing seller")
      .lean();

    if (!payment) {
      return handleResponse(res, 404, "Payment record not found");
    }

    const sanitized = {
      ...payment,
      amountRupees: payment.amount ? payment.amount / 100 : 0,
      gatewaySignature: undefined,
    };

    return handleResponse(res, 200, "Payment details fetched", sanitized);
  } catch (error) {
    logger.error("getAdminPaymentById failed", {
      scope: "PaymentController.getAdminPaymentById",
      message: error?.message,
    });
    return handleResponse(res, error.statusCode || 500, error.message || "Failed to fetch payment details");
  }
};

/**
 * Admin: initiate refund for a captured payment via Razorpay.
 */
export const refundPaymentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body || {};

    const result = await initiateRazorpayRefund({
      paymentId: id,
      amount: amount ? Number(amount) : null,
      reason: reason || "Admin initiated refund",
      adminId: req.user?.id,
    });

    return handleResponse(res, 200, "Refund initiated successfully", result);
  } catch (error) {
    logger.error("refundPaymentAdmin failed", {
      scope: "PaymentController.refundPaymentAdmin",
      message: error?.message,
      statusCode: error?.statusCode || 500,
    });
    return handleResponse(res, error.statusCode || 500, error.message || "Refund initiation failed");
  }
};

