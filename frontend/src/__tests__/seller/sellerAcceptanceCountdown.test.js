describe("Seller Acceptance Countdown Logic", () => {
  function secondsLeftUntilSellerExpiry(order) {
    if (!order) return 0;
    const raw = order.sellerPendingExpiresAt ?? order.expiresAt;
    if (!raw) {
      return order.sellerAcceptanceTimeoutMs
        ? Math.round(order.sellerAcceptanceTimeoutMs / 1000)
        : 60;
    }
    const ms = new Date(raw).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }

  function computeAcceptanceWindowTotal(order, left) {
    return order.sellerAcceptanceTimeoutMs
      ? Math.round(order.sellerAcceptanceTimeoutMs / 1000)
      : (order.sellerPendingExpiresAt && order.createdAt
          ? Math.max(left, Math.round((new Date(order.sellerPendingExpiresAt).getTime() - new Date(order.createdAt).getTime()) / 1000))
          : Math.max(left, 60));
  }

  it("calculates remaining time accurately from server sellerPendingExpiresAt", () => {
    const futureDeadline = new Date(Date.now() + 45000).toISOString();
    const order = {
      orderId: "ORD-1",
      sellerPendingExpiresAt: futureDeadline,
      sellerAcceptanceTimeoutMs: 120000,
    };

    const left = secondsLeftUntilSellerExpiry(order);
    expect(left).toBeGreaterThanOrEqual(44);
    expect(left).toBeLessThanOrEqual(46);
  });

  it("returns 0 when sellerPendingExpiresAt has already elapsed", () => {
    const pastDeadline = new Date(Date.now() - 5000).toISOString();
    const order = {
      orderId: "ORD-EXPIRED",
      sellerPendingExpiresAt: pastDeadline,
      sellerAcceptanceTimeoutMs: 180000,
    };

    const left = secondsLeftUntilSellerExpiry(order);
    expect(left).toBe(0);
  });

  it("uses sellerAcceptanceTimeoutMs fallback if sellerPendingExpiresAt is missing", () => {
    const order = {
      orderId: "ORD-NO-EXPIRES",
      sellerAcceptanceTimeoutMs: 180000, // 180 seconds
    };

    const left = secondsLeftUntilSellerExpiry(order);
    expect(left).toBe(180);
  });

  it("falls back to 60 seconds for legacy orders without deadline or timeout", () => {
    const order = {
      orderId: "ORD-LEGACY",
    };

    const left = secondsLeftUntilSellerExpiry(order);
    expect(left).toBe(60);
  });

  it("computes total progress window from sellerAcceptanceTimeoutMs", () => {
    const order = {
      orderId: "ORD-WINDOW",
      sellerAcceptanceTimeoutMs: 300000, // 5 minutes (300 seconds)
      sellerPendingExpiresAt: new Date(Date.now() + 150000).toISOString(),
    };

    const total = computeAcceptanceWindowTotal(order, 150);
    expect(total).toBe(300);
  });

  it("supports multiple orders with independent countdowns", () => {
    const orderA = {
      orderId: "ORD-A",
      sellerPendingExpiresAt: new Date(Date.now() + 30000).toISOString(),
      sellerAcceptanceTimeoutMs: 60000,
    };
    const orderB = {
      orderId: "ORD-B",
      sellerPendingExpiresAt: new Date(Date.now() + 120000).toISOString(),
      sellerAcceptanceTimeoutMs: 180000,
    };

    const leftA = secondsLeftUntilSellerExpiry(orderA);
    const leftB = secondsLeftUntilSellerExpiry(orderB);

    expect(leftA).toBeGreaterThanOrEqual(29);
    expect(leftA).toBeLessThanOrEqual(31);
    expect(leftB).toBeGreaterThanOrEqual(119);
    expect(leftB).toBeLessThanOrEqual(121);
    expect(leftB).toBeGreaterThan(leftA);
  });
});
