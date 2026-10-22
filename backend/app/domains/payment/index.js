/**
 * Payment domain barrel. See `app/domains/README.md`.
 *
 * The payment surface is provider-agnostic: there is
 * a provider port, a provider registry, and a Razorpay
 * adapter. This barrel re-exports that surface as a single
 * import:
 *
 *   import { createPaymentOrderForOrderRef, getActivePaymentProvider } from "@/domains/payment";
 */
export * as paymentController from "./payment.controller.js";
export * from "./payment.service.js";
export * as paymentValidation from "./payment.validation.js";
export { default as paymentRoutes } from "./payment.routes.js";
