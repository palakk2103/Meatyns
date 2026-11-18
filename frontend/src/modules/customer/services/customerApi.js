import axiosInstance from "@core/api/axios";
import { getWithDedupe, invalidateCache, clearAllCache } from "@core/api/dedupe";
import { getJSON, STORAGE_KEYS } from "@core/utils/storage";

import { filterChickenAndMuttonTree, filterChickenAndMuttonFlat } from "../utils/categoryFilter";

// Every catalogue request must resolve the SAME serving seller on the backend,
// which it derives from the customer's coordinates. Callers that forget to pass
// lat/lng get the persisted delivery location added here so no screen can show
// a different seller's catalogue than the rest of the app.
const withCustomerLocation = (params = {}) => {
  if (params && params.lat !== undefined && params.lng !== undefined) return params;
  const stored = getJSON(STORAGE_KEYS.LOCATION, null);
  const lat = Number(stored?.latitude);
  const lng = Number(stored?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return params;
  return { ...params, lat, lng };
};

export const customerApi = {
  loginWithPassword: (data) =>
    axiosInstance.post("/customer/login-password", data, { withCredentials: true }),
  sendLoginOtp: (data) => axiosInstance.post("/customer/send-login-otp", data),
  sendSignupOtp: (data) =>
    axiosInstance.post("/customer/send-signup-otp", data),
  verifyOtp: (data) =>
    axiosInstance
      .post("/customer/verify-otp", data, { withCredentials: true })
      .then((res) => {
        clearAllCache(); // never reuse another account's cached responses
        return res;
      }),
  getProfile: () => getWithDedupe("/customer/profile", {}, { ttl: 5000 }), // Short cache for profile
  updateProfile: (data) => axiosInstance.put("/customer/profile", data),
  deleteAccount: () => axiosInstance.delete("/customer/profile"),
  uploadMedia: (formData) =>
    axiosInstance.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getWalletTransactions: (params) =>
    getWithDedupe("/customer/transactions", params),
  getCategories: async (params) => {
    const res = await getWithDedupe("/categories", params, { ttl: 60 * 1000 });
    if (res?.data?.success) {
      const isTree = Boolean(params?.tree === true || params?.tree === "true");
      const rawData = res.data.results || res.data.result || [];
      const filtered = isTree
        ? filterChickenAndMuttonTree(rawData)
        : filterChickenAndMuttonFlat(rawData);
      return {
        ...res,
        data: {
          ...res.data,
          results: filtered,
          result: filtered,
        },
      };
    }
    return res;
  },
  getProducts: (params, options) =>
    getWithDedupe("/products", withCustomerLocation(params), options),
  getProductById: (id, params) =>
    getWithDedupe(`/products/${id}`, withCustomerLocation(params)),

  // Sellers & Location
  getNearbySellers: (params) => getWithDedupe("/seller/nearby", params),

  // Cart
  getCart: () => getWithDedupe("/cart", {}, { ttl: 2000 }), // Very short cache for cart
  // Re-validates the server cart against a delivery location (single-seller rule).
  getCartServiceability: (lat, lng) =>
    axiosInstance.get("/cart/serviceability", { params: { lat, lng } }),
  addToCart: (data) => {
    invalidateCache("/cart"); // Invalidate cart cache
    return axiosInstance.post("/cart/add", data);
  },
  updateCartQuantity: (data) => {
    invalidateCache("/cart");
    return axiosInstance.put("/cart/update", data);
  },
  removeFromCart: (productId, variantSku = "") => {
    invalidateCache("/cart");
    const params = {};
    const normalizedVariantSku = String(variantSku || "").trim();
    if (normalizedVariantSku) params.variantSku = normalizedVariantSku;
    return axiosInstance.delete(`/cart/remove/${productId}`, { params });
  },
  clearCart: () => {
    invalidateCache("/cart");
    return axiosInstance.delete("/cart/clear");
  },

  // Wishlist
  getWishlist: (params) => getWithDedupe("/wishlist", params, { ttl: 5000 }),
  addToWishlist: (data) => {
    invalidateCache("/wishlist");
    return axiosInstance.post("/wishlist/add", data);
  },
  toggleWishlist: (data) => {
    invalidateCache("/wishlist");
    return axiosInstance.post("/wishlist/toggle", data);
  },
  removeFromWishlist: (productId) => {
    invalidateCache("/wishlist");
    return axiosInstance.delete(`/wishlist/remove/${productId}`);
  },

  // Orders & Delivery Zones
  checkDeliveryZone: (data) =>
    axiosInstance.post("/delivery-zones/check", data),
  getDeliverySlots: (data) =>
    axiosInstance.post("/orders/delivery/slots", data, { timeout: 15000 }),
  // Explicit timeout so checkout never waits forever if the server blocks (e.g. Redis/Bull).
  checkoutPreview: (data) =>
    axiosInstance.post("/orders/checkout/preview", data, { timeout: 120000 }),
  createOrder: (data) =>
    axiosInstance
      .post("/orders", data, { timeout: 120000 })
      .finally(() => invalidateCache("/orders")),
  verifyOnlineOrderPayment: (orderId, data) =>
    axiosInstance
      .post(`/orders/${orderId}/payment/verify-online`, data)
      .finally(() => invalidateCache("/orders")),
  markOrderDelivered: (orderId, data) =>
    axiosInstance.post(`/orders/${orderId}/delivered`, data || {}),
  markOrderCodCollected: (orderId, data) =>
    axiosInstance.post(`/orders/${orderId}/cod/mark-collected`, data || {}),
  reconcileOrderCod: (orderId, data) =>
    axiosInstance.post(`/orders/${orderId}/cod/reconcile`, data),
  placeOrder: (data) =>
    axiosInstance
      .post("/orders/place", data, { timeout: 120000 })
      .finally(() => invalidateCache("/orders")),
  // Never serve a cached list: a stale/empty response hid freshly placed orders.
  getMyOrders: (params = {}) => getWithDedupe("/orders/my-orders", params, { ttl: 0 }),
  /**
   * Order details must reflect live workflow, but we still dedupe in-flight requests to avoid
   * network spam when multiple effects/events trigger refresh simultaneously.
   * ttl=0 means "no caching" (only in-flight dedupe).
   */
  getOrderDetails: (orderId) =>
    getWithDedupe(
      `/orders/details/${encodeURIComponent(String(orderId ?? "").trim())}`,
      {},
      { ttl: 0 },
    ),
  getOrderRoute: (orderId, params) =>
    axiosInstance.get(`/orders/workflow/${orderId}/route`, { params }),
  cancelOrder: (orderId, data) =>
    axiosInstance
      .put(`/orders/cancel/${orderId}`, data)
      .finally(() => invalidateCache("/orders")),
  requestReturn: (orderId, data) =>
    axiosInstance.post(`/orders/${orderId}/returns`, data),
  getReturnDetails: (orderId) =>
    axiosInstance.get(`/orders/${encodeURIComponent(String(orderId ?? "").trim())}/returns`),

  // Payments
  createPaymentOrder: (data) =>
    axiosInstance.post("/payments/create-order", data),
  verifyPaymentStatus: (id) => axiosInstance.get(`/payments/status/${id}`),
  createRazorpayOrder: (data) =>
    axiosInstance.post("/payments/razorpay/create-order", data),
  verifyRazorpayPayment: (data) =>
    axiosInstance.post("/payments/razorpay/verify", data),
  createWalletRechargeOrder: (data) =>
    axiosInstance.post("/wallet/create-recharge-order", data),
  getWalletBalance: () => axiosInstance.get("/wallet/balance"),

  // Support & Reviews
  getProductReviews: (productId) =>
    getWithDedupe(`/reviews/product/${productId}`),
  submitReview: (data) => axiosInstance.post("/reviews/submit", data),
  createTicket: (data) => axiosInstance.post("/tickets/create", data),
  getMyTickets: () => getWithDedupe("/tickets/my-tickets"),
  replyTicket: (ticketId, text, options = {}) => {
    const {
      mediaUrl = "",
      mediaType = "",
      mimeType = "",
    } = options || {};

    return axiosInstance.post(`/tickets/reply/${encodeURIComponent(String(ticketId))}`, {
      text,
      isAdmin: false,
      mediaUrl,
      mediaType,
      mimeType,
    });
  },

  // Experience sections (home / header pages)
  getExperienceSections: (params) => getWithDedupe("/experience", params),

  // Hero config (separate hero banners + categories per page; fallback to home)
  getHeroConfig: (params) =>
    getWithDedupe("/experience/hero", params, { ttl: 60 * 1000 }),

  // Public offers
  getOffers: () => getWithDedupe("/offers"),
  // Offer sections (category → products, banner + side image)
  getOfferSections: (params) =>
    getWithDedupe("/offer-sections", withCustomerLocation(params)),

  // Coupons & Deals
  validateCoupon: (data) => axiosInstance.post("/coupons/validate", data),
  getActiveCoupons: () => getWithDedupe("/coupons", { status: "active" }),
  getActiveFlashDeal: () => getWithDedupe("/flash-deals/active", {}, { ttl: 10000 }),

  // Maps (server-side geocoding)
  geocodeAddress: (address, params = {}) =>
    axiosInstance.get("/maps/geocode", { params: { address, ...params } }),
  geocodePlaceId: (placeId, params = {}) =>
    axiosInstance.get("/maps/geocode", { params: { placeId, ...params } }),

  // Push (FCM) test
  testPushNotification: () => axiosInstance.post("/push/test"),
  getTestPushNotificationStatus: (orderId) =>
    axiosInstance.get(`/push/test-status/${encodeURIComponent(String(orderId || "").trim())}`),

  // Phase 5: Smart Reorder
  reorderOrder: (orderId) => {
    invalidateCache("/cart");
    return axiosInstance.post(`/cart/reorder/${encodeURIComponent(String(orderId))}`);
  },

  // Phase 5: Subscriptions
  getMySubscriptions: () => getWithDedupe("/subscriptions/my", {}, { ttl: 5000 }),
  getSubscriptionById: (id) => getWithDedupe(`/subscriptions/${id}`),
  createSubscription: (data) => axiosInstance.post("/subscriptions", data),
  updateSubscription: (id, data) => axiosInstance.put(`/subscriptions/${id}`, data),
  pauseSubscription: (id) => axiosInstance.put(`/subscriptions/${id}/pause`),
  resumeSubscription: (id) => axiosInstance.put(`/subscriptions/${id}/resume`),
  cancelSubscription: (id, data) => axiosInstance.put(`/subscriptions/${id}/cancel`, data),

  // Phase 5: Referrals
  getMyReferrals: () => getWithDedupe("/referrals/my", {}, { ttl: 5000 }),
  validateReferralCode: (code) => axiosInstance.get(`/referrals/validate/${encodeURIComponent(code)}`),

  // Phase 5: Recipes
  getRecipes: (params) => getWithDedupe("/recipes", params, { ttl: 30000 }),
  getRecipeDetails: (slugOrId) => getWithDedupe(`/recipes/${encodeURIComponent(slugOrId)}`),
  addRecipeIngredientsToCart: (id, data) => {
    invalidateCache("/cart");
    return axiosInstance.post(`/recipes/${id}/add-to-cart`, data);
  },

  // Gallery (public, published content only). Short TTL so admin changes surface quickly.
  getGallerySettings: () => getWithDedupe("/gallery/settings", {}, { ttl: 15000 }),
  getGalleryCategories: () => getWithDedupe("/gallery/categories", {}, { ttl: 15000 }),
  getHomeGallery: () => getWithDedupe("/gallery/home", {}, { ttl: 15000 }),
  getGalleries: (params) => getWithDedupe("/gallery", params, { ttl: 15000 }),
  getGalleryDetail: (slugOrId) => getWithDedupe(`/gallery/${encodeURIComponent(slugOrId)}`, {}, { ttl: 15000 }),

  // Phase 5: Meal Prep Combos
  getCombos: (params) => getWithDedupe("/combos", params, { ttl: 30000 }),
  getComboDetails: (slugOrId) => getWithDedupe(`/combos/${encodeURIComponent(slugOrId)}`),
  addComboToCart: (id, data) => {
    invalidateCache("/cart");
    return axiosInstance.post(`/combos/${id}/add-to-cart`, data);
  },
};
