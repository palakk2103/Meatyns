import { jest } from "@jest/globals";
import crypto from "crypto";
import { RazorpayAdapter } from "../app/services/payment/providers/razorpay.adapter.js";
import { PAYMENT_STATUS } from "../app/constants/payment.js";

describe("RazorpayAdapter", () => {
  const webhookSecret = "test_webhook_secret_12345";
  let adapter;

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    adapter = new RazorpayAdapter();
  });

  afterEach(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  it("validates authentic Razorpay webhook signature", async () => {
    const rawPayload = JSON.stringify({
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test123",
            order_id: "order_test123",
            amount: 50000,
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(Buffer.from(rawPayload))
      .digest("hex");

    const isValid = await adapter.validateWebhook({
      rawBody: Buffer.from(rawPayload),
      signature,
    });

    expect(isValid).toBe(true);
  });

  it("rejects invalid Razorpay webhook signature", async () => {
    const rawPayload = JSON.stringify({ event: "payment.captured" });
    const forgedSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    const isValid = await adapter.validateWebhook({
      rawBody: Buffer.from(rawPayload),
      signature: forgedSignature,
    });

    expect(isValid).toBe(false);
  });

  it("rejects webhook if RAZORPAY_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const isValid = await adapter.validateWebhook({
      rawBody: Buffer.from("{}"),
      signature: "dummy_sig",
    });

    expect(isValid).toBe(false);
  });

  it("decodes payment.captured payload correctly", async () => {
    const rawPayload = Buffer.from(
      JSON.stringify({
        id: "evt_test_captured_01",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_captured_999",
              order_id: "order_rzp_888",
              amount: 75000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      }),
    );

    const decoded = await adapter.decodeWebhookPayload({ rawBody: rawPayload });

    expect(decoded.eventId).toBe("evt_test_captured_01");
    expect(decoded.merchantOrderId).toBe("order_rzp_888");
    expect(decoded.transactionId).toBe("pay_captured_999");
    expect(decoded.state).toBe(PAYMENT_STATUS.CAPTURED);
    expect(decoded.amount).toBe(75000);
  });

  it("decodes payment.failed payload correctly", async () => {
    const rawPayload = Buffer.from(
      JSON.stringify({
        id: "evt_test_failed_01",
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed_111",
              order_id: "order_rzp_222",
              amount: 25000,
              currency: "INR",
              status: "failed",
            },
          },
        },
      }),
    );

    const decoded = await adapter.decodeWebhookPayload({ rawBody: rawPayload });

    expect(decoded.eventId).toBe("evt_test_failed_01");
    expect(decoded.merchantOrderId).toBe("order_rzp_222");
    expect(decoded.state).toBe(PAYMENT_STATUS.FAILED);
  });

  it("decodes refund.processed payload correctly", async () => {
    const rawPayload = Buffer.from(
      JSON.stringify({
        id: "evt_test_refund_01",
        event: "refund.processed",
        payload: {
          refund: {
            entity: {
              id: "rfnd_test_333",
              payment_id: "pay_orig_444",
              amount: 50000,
              currency: "INR",
              status: "processed",
            },
          },
        },
      }),
    );

    const decoded = await adapter.decodeWebhookPayload({ rawBody: rawPayload });

    expect(decoded.eventId).toBe("evt_test_refund_01");
    expect(decoded.refundId).toBe("rfnd_test_333");
    expect(decoded.transactionId).toBe("pay_orig_444");
    expect(decoded.state).toBe(PAYMENT_STATUS.REFUNDED);
  });

  it("maps external gateway states to internal payment statuses accurately", () => {
    expect(adapter.mapStatusToInternal("paid")).toBe(PAYMENT_STATUS.CAPTURED);
    expect(adapter.mapStatusToInternal("captured")).toBe(PAYMENT_STATUS.CAPTURED);
    expect(adapter.mapStatusToInternal("refunded")).toBe(PAYMENT_STATUS.REFUNDED);
    expect(adapter.mapStatusToInternal("created")).toBe(PAYMENT_STATUS.PENDING);
    expect(adapter.mapStatusToInternal("attempted")).toBe(PAYMENT_STATUS.PENDING);
    expect(adapter.mapStatusToInternal("authorized")).toBe(PAYMENT_STATUS.PENDING);
    expect(adapter.mapStatusToInternal("failed")).toBe(PAYMENT_STATUS.FAILED);
    expect(adapter.mapStatusToInternal("cancelled")).toBe(PAYMENT_STATUS.FAILED);
  });

  it("handles webhook verification failure when signature does not match", async () => {
    const rawPayload = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const badSignature = "bad_signature_hex";

    const isValid = await adapter.validateWebhook({
      rawBody: rawPayload,
      signature: badSignature,
    });

    expect(isValid).toBe(false);
  });
});
