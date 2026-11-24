/**
 * Customer self-cancel window.
 *
 * A customer may cancel an order only for a few minutes after it reached the
 * seller (COD: when placed; ONLINE: when payment was captured). The window
 * start is derived from `sellerPendingExpiresAt - sellerAcceptanceTimeoutMs`,
 * which both placement and post-payment flows set at the moment the order
 * enters SELLER_PENDING. Falls back to `createdAt`.
 */
const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

export function getCustomerCancelWindowMs() {
  const n = Number(process.env.CUSTOMER_CANCEL_WINDOW_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_MS;
}

export function getCustomerCancelWindow(order, nowMs = Date.now()) {
  const windowMs = getCustomerCancelWindowMs();
  const expires = order?.sellerPendingExpiresAt
    ? new Date(order.sellerPendingExpiresAt).getTime()
    : NaN;
  const timeout = Number(order?.sellerAcceptanceTimeoutMs);
  let startMs = NaN;
  if (Number.isFinite(expires) && Number.isFinite(timeout) && timeout > 0) {
    startMs = expires - timeout;
  }
  if (!Number.isFinite(startMs) && order?.createdAt) {
    startMs = new Date(order.createdAt).getTime();
  }
  if (!Number.isFinite(startMs)) {
    return { windowMs, endsAt: null, serverNow: nowMs, open: true };
  }
  const endsAt = startMs + windowMs;
  return { windowMs, endsAt, serverNow: nowMs, open: nowMs <= endsAt };
}
