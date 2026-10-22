import Razorpay from "razorpay";
import crypto from "crypto";
import { PAYMENT_STATUS, PAYMENT_GATEWAY } from "../../../constants/payment.js";
import { PaymentProviderPort } from "../ports/paymentProviderPort.js";
import logger from "../../logger.js";

let _razorpayClient = null;

export function getRazorpayClient() {
  if (_razorpayClient) return _razorpayClient;
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)");
  }
  _razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  return _razorpayClient;
}

export class RazorpayAdapter extends PaymentProviderPort {
  get providerName() {
    return PAYMENT_GATEWAY.RAZORPAY;
  }

  async initiatePayment({ merchantOrderId, amountPaise, redirectUrl }) {
    const client = getRazorpayClient();
    const options = {
      amount: Math.round(Number(amountPaise)),
      currency: "INR",
      receipt: String(merchantOrderId || "").slice(0, 40),
    };
    const response = await client.orders.create(options);
    return {
      redirectUrl: redirectUrl || "",
      gatewayResponse: response,
    };
  }

  async getPaymentStatus({ merchantOrderId }) {
    const client = getRazorpayClient();
    const order = await client.orders.fetch(merchantOrderId);

    let transactionId = null;
    let paymentStatus = order.status;

    try {
      const payments = await client.orders.fetchPayments(merchantOrderId);
      const paymentItems = Array.isArray(payments?.items) ? payments.items : [];
      const captured = paymentItems.find((p) => p.status === "captured");
      if (captured) {
        transactionId = captured.id;
        paymentStatus = "captured";
      } else if (paymentItems.length > 0) {
        const latest = paymentItems[0];
        transactionId = latest.id;
        paymentStatus = latest.status;
      }
    } catch (fetchErr) {
      logger.warn("Could not fetch payments for Razorpay order", {
        merchantOrderId,
        error: fetchErr.message,
      });
    }

    return {
      state: paymentStatus,
      transactionId: transactionId || order.id,
      responseCode: paymentStatus,
      gatewayResponse: order,
    };
  }

  async validateWebhook({ rawBody, authorization, signature }) {
    const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
    if (!secret) {
      logger.error("RAZORPAY_WEBHOOK_SECRET is not configured; cannot verify webhook signature");
      return false;
    }

    const sig = String(signature || authorization || "").trim();
    if (!sig) {
      logger.warn("Razorpay webhook received without signature header");
      return false;
    }

    try {
      const bodyBuffer = Buffer.isBuffer(rawBody)
        ? rawBody
        : Buffer.from(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody || {}));

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(bodyBuffer)
        .digest("hex");

      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const receivedBuffer = Buffer.from(sig, "utf8");

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      logger.error("Error validating Razorpay webhook signature", { error: err.message });
      return false;
    }
  }

  async decodeWebhookPayload({ rawBody }) {
    let parsed;
    if (typeof rawBody === "object" && rawBody !== null && !Buffer.isBuffer(rawBody)) {
      parsed = rawBody;
    } else {
      const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "{}");
      parsed = JSON.parse(rawString);
    }

    const event = String(parsed.event || "").toLowerCase();
    const eventId = String(parsed.id || parsed.event_id || `rzp-evt-${Date.now()}-${crypto.randomUUID()}`);

    const paymentEntity = parsed.payload?.payment?.entity || null;
    const orderEntity = parsed.payload?.order?.entity || null;
    const refundEntity = parsed.payload?.refund?.entity || null;

    const merchantOrderId =
      paymentEntity?.order_id ||
      orderEntity?.id ||
      paymentEntity?.receipt ||
      orderEntity?.receipt ||
      null;

    const transactionId = paymentEntity?.id || refundEntity?.payment_id || null;
    const refundId = refundEntity?.id || null;

    let state;
    if (event === "payment.captured" || event === "order.paid") {
      state = PAYMENT_STATUS.CAPTURED;
    } else if (event === "payment.failed") {
      state = PAYMENT_STATUS.FAILED;
    } else if (event === "refund.processed" || event === "refund.created") {
      state = PAYMENT_STATUS.REFUNDED;
    } else if (event === "payment.authorized") {
      state = PAYMENT_STATUS.PENDING;
    } else {
      state = PAYMENT_STATUS.PENDING;
    }

    return {
      eventId,
      merchantOrderId,
      state,
      transactionId,
      refundId,
      responseCode: event,
      raw: parsed,
      amount: paymentEntity?.amount || refundEntity?.amount || orderEntity?.amount || null,
      currency: paymentEntity?.currency || orderEntity?.currency || "INR",
    };
  }

  async initiateRefund({ paymentId, amountPaise, notes = {}, receipt }) {
    const client = getRazorpayClient();
    if (!paymentId) {
      throw new Error("Razorpay paymentId is required to initiate refund");
    }

    const refundPayload = {};
    if (amountPaise && Number(amountPaise) > 0) {
      refundPayload.amount = Math.round(Number(amountPaise));
    }
    if (notes && Object.keys(notes).length > 0) {
      refundPayload.notes = notes;
    }
    if (receipt) {
      refundPayload.receipt = String(receipt).slice(0, 40);
    }

    const response = await client.payments.refund(paymentId, refundPayload);

    return {
      refundId: response.id,
      paymentId: response.payment_id,
      amount: response.amount,
      currency: response.currency || "INR",
      status: response.status,
      raw: response,
    };
  }

  mapStatusToInternal(gatewayState) {
    const normalized = String(gatewayState || "").toLowerCase();
    if (normalized === "paid" || normalized === "captured") return PAYMENT_STATUS.CAPTURED;
    if (normalized === "refunded") return PAYMENT_STATUS.REFUNDED;
    if (normalized === "authorized" || normalized === "created" || normalized === "attempted") return PAYMENT_STATUS.PENDING;
    if (normalized === "failed" || normalized === "cancelled") return PAYMENT_STATUS.FAILED;
    return PAYMENT_STATUS.FAILED;
  }
}

export default RazorpayAdapter;
