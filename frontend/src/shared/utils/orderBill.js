// Single source for showing an order's price breakdown (seller / admin / customer).
// Always read the amounts the backend stored on the order — never re-derive them
// from the total (e.g. "total - flat delivery fee"), which breaks the split.

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function getOrderBill(order) {
  const pricing = order?.pricing || {};
  const breakdown = order?.paymentBreakdown || {};

  const subtotal = toAmount(pricing.subtotal ?? breakdown.productSubtotal);
  const deliveryFee = toAmount(pricing.deliveryFee ?? breakdown.deliveryFeeCharged);
  const handlingFee = toAmount(pricing.platformFee ?? breakdown.handlingFeeCharged);
  const tax = toAmount(pricing.gst ?? breakdown.taxTotal);
  const tip = toAmount(pricing.tip ?? breakdown.tipTotal);
  const discount = toAmount(pricing.discount ?? breakdown.discountTotal);
  const walletAmount = toAmount(pricing.walletAmount ?? breakdown.walletAmount);
  const total = toAmount(pricing.total ?? breakdown.grandTotal);

  // `total` is post-wallet only when wallet redemption reduces the payable;
  // otherwise it is the pre-wallet amount. Detect which so rows add up.
  const gross = subtotal + deliveryFee + handlingFee + tax + tip - discount;
  const walletDeducted =
    walletAmount > 0 && Math.abs(gross - walletAmount - total) < 0.02;

  return {
    subtotal,
    deliveryFee,
    handlingFee,
    tax,
    tip,
    discount,
    walletAmount: walletDeducted ? walletAmount : 0,
    total,
  };
}

// Optional rows (shown only when non-zero), in display order.
export function getOrderBillExtraRows(bill) {
  return [
    { key: "handling", label: "Handling Fee", amount: bill.handlingFee, sign: "" },
    { key: "tax", label: "Tax", amount: bill.tax, sign: "" },
    { key: "tip", label: "Rider Tip", amount: bill.tip, sign: "" },
    { key: "discount", label: "Discount", amount: bill.discount, sign: "-" },
    { key: "wallet", label: "Wallet Used", amount: bill.walletAmount, sign: "-" },
  ].filter((row) => row.amount > 0);
}
