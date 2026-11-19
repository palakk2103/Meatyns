/**
 * Card pricing for the home "offer" sections.
 * - Real discount (MRP > selling price): show it as is.
 * - No real discount: show a `fallbackPct` badge, with the struck price set
 *   so the maths is exact: MRP = price / (1 - pct/100)
 *   (e.g. ₹1050 at 15% -> struck ₹1235).
 */
export const getOfferCardPricing = (display, fallbackPct = 15) => {
  const price = Number(display?.price || 0);
  const mrp = Number(display?.mrp || 0);
  if (price <= 0) return { price, originalPrice: null, discount: null, pct: 0 };

  let orig = mrp > price ? mrp : 0;
  if (!orig && fallbackPct > 0 && fallbackPct < 100) {
    orig = Math.round(price / (1 - fallbackPct / 100));
  }
  if (!(orig > price)) return { price, originalPrice: null, discount: null, pct: 0 };

  const pct = Math.round(((orig - price) / orig) * 100);
  return { price, originalPrice: orig, discount: `${pct}% OFF`, pct };
};

/**
 * Price + weight a product card should show so it matches what the
 * product detail sheet shows by default (the first variant).
 *
 * Without this, cards showed the product's base price (e.g. the 1 kg price)
 * next to a hard-coded "500 g" label.
 */
export const getDefaultVariantDisplay = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const baseSale = Number(product?.salePrice || 0);
  const baseMrp = Number(product?.originalPrice || product?.price || 0);

  const fallbackWeight =
    product?.weight ||
    (product?.unitValue && product?.unit ? `${product.unitValue} ${product.unit}` : "");

  if (!variants.length) {
    return {
      price: baseSale || baseMrp,
      mrp: baseMrp,
      weight: fallbackWeight,
      variantSku: "",
      variantName: "",
    };
  }

  const v = variants[0];
  const mrp = Number(v?.price || 0) || baseMrp;
  const sale = Number(v?.salePrice || 0);
  const price = sale > 0 ? sale : mrp;
  const variantName = String(v?.name || "").trim();

  return {
    price,
    mrp,
    weight: variantName || fallbackWeight,
    variantSku: String(v?.sku || variantName || "").trim(),
    variantName,
  };
};
