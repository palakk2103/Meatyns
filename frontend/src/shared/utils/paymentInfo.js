/**
 * Single source of truth for describing how an order is being paid for.
 * Used by customer, seller (and can be reused by delivery/admin) UIs.
 *
 * Prefers canonical `paymentMode` / `paymentStatus`, falls back to legacy
 * `payment.method` / `payment.status`.
 */
export function getPaymentInfo(order) {
  const legacyMethod = String(order?.payment?.method || '').toLowerCase();
  const mode = String(order?.paymentMode || '').toUpperCase()
    || (legacyMethod === 'online' ? 'ONLINE' : legacyMethod === 'wallet' ? 'WALLET' : 'COD');

  const status = String(order?.paymentStatus || '').toUpperCase();
  const legacyStatus = String(order?.payment?.status || '').toLowerCase();

  const isOnline = mode === 'ONLINE';
  const isWallet = mode === 'WALLET';
  const isCod = !isOnline && !isWallet;

  const isPaid =
    status === 'PAID' ||
    status === 'CASH_COLLECTED' ||
    status === 'PARTIALLY_REMITTED' ||
    status === 'COD_RECONCILED' ||
    (!status && legacyStatus === 'completed');
  const isFailed = status === 'FAILED' || legacyStatus === 'failed';
  const isRefunded = status === 'REFUNDED' || legacyStatus === 'refunded';

  const modeLabel = isOnline ? 'Online Payment' : isWallet ? 'Wallet' : 'Cash on Delivery';

  let statusLabel;
  let tone;
  if (isRefunded) {
    statusLabel = 'Refunded';
    tone = 'slate';
  } else if (isFailed) {
    statusLabel = 'Payment Failed';
    tone = 'rose';
  } else if (isCod) {
    statusLabel = isPaid ? 'Cash Collected' : 'Pay on Delivery';
    tone = isPaid ? 'emerald' : 'amber';
  } else {
    statusLabel = isPaid ? 'Paid' : 'Payment Pending';
    tone = isPaid ? 'emerald' : 'amber';
  }

  return { mode, modeLabel, statusLabel, tone, isOnline, isWallet, isCod, isPaid, isFailed, isRefunded };
}

export const PAYMENT_TONE_CLASSES = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};
