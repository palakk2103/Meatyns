import axiosInstance from "@core/api/axios";

let isInitialized = false;
let currentPixelId = null;

/**
 * Initializes the Meta Pixel asynchronously using official snippet
 */
export async function initMetaPixel() {
  if (typeof window === "undefined" || isInitialized) return;

  try {
    const res = await axiosInstance.get("/meta/pixel-config");
    const { pixelId, enabled } = res.data?.result || {};

    if (!enabled || !pixelId) {
      return;
    }

    currentPixelId = pixelId;

    /* eslint-disable */
    if (!window.fbq) {
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    }
    /* eslint-enable */

    window.fbq("init", pixelId);
    isInitialized = true;
  } catch (err) {
    // Non-blocking fallback
  }
}

/**
 * Tracks PageView on route changes
 */
export function trackPageView() {
  if (typeof window === "undefined" || !window.fbq || !isInitialized) return;
  try {
    window.fbq("track", "PageView");
  } catch (e) {}
}

/**
 * Tracks ViewContent when customer views product details
 */
export function trackViewContent(product) {
  if (typeof window === "undefined" || !window.fbq || !isInitialized || !product) return;
  try {
    window.fbq("track", "ViewContent", {
      content_name: product.name || product.title,
      content_category: product.category?.name || "Meat",
      content_ids: [String(product._id || product.id)],
      content_type: "product",
      value: Number(product.price || 0),
      currency: "INR",
    });
  } catch (e) {}
}

/**
 * Tracks Search when customer queries products
 */
export function trackSearch(searchQuery) {
  if (typeof window === "undefined" || !window.fbq || !isInitialized || !searchQuery) return;
  try {
    window.fbq("track", "Search", {
      search_string: String(searchQuery).trim(),
      content_category: "Product Search",
    });
  } catch (e) {}
}

/**
 * Tracks AddToCart when customer adds item to bag
 */
export function trackAddToCart(item) {
  if (typeof window === "undefined" || !window.fbq || !isInitialized || !item) return;
  try {
    window.fbq("track", "AddToCart", {
      content_name: item.name || item.title,
      content_ids: [String(item._id || item.id)],
      content_type: "product",
      value: Number(item.price || 0),
      currency: "INR",
    });
  } catch (e) {}
}

/**
 * Tracks InitiateCheckout when customer proceeds to checkout
 */
export function trackInitiateCheckout(items = [], totalValue = 0) {
  if (typeof window === "undefined" || !window.fbq || !isInitialized) return;
  try {
    const contentIds = (items || []).map((i) => String(i._id || i.id || i.product));
    window.fbq("track", "InitiateCheckout", {
      content_ids: contentIds,
      content_type: "product",
      value: Number(totalValue || 0),
      currency: "INR",
      num_items: items.length,
    });
  } catch (e) {}
}

/**
 * Tracks Purchase upon verified order placement.
 * Uses eventId for deduplication with Node.js Conversions API (CAPI).
 * Uses sessionStorage to prevent duplicate fires on page reload.
 */
export function trackPurchase(order, eventId = null) {
  if (typeof window === "undefined" || !window.fbq || !isInitialized || !order) return;

  const orderId = order.orderId || order._id;
  if (!orderId) return;

  const sessionKey = `fb_purchase_fired_${orderId}`;
  if (sessionStorage.getItem(sessionKey)) {
    return; // Already fired for this order in this session
  }

  try {
    const finalEventId = eventId || `purchase_${orderId}`;
    const value = Number(order.pricing?.total || order.total || order.payableAmount || 0);
    const contentIds = (order.items || []).map((i) => String(i.product?._id || i.product || i.id));

    window.fbq(
      "track",
      "Purchase",
      {
        content_ids: contentIds,
        content_type: "product",
        value,
        currency: "INR",
        num_items: (order.items || []).length,
      },
      { eventID: finalEventId }
    );

    sessionStorage.setItem(sessionKey, "true");
  } catch (e) {}
}
