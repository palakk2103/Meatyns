import { jest } from "@jest/globals";

jest.unstable_mockModule("../app/config/redis.js", () => ({
  getRedisClient: () => null, // Redis disabled / unavailable
}));

const { isExpressBlockedForCity } = await import("../app/services/deliverySlotService.js");
const idem = await import("../app/services/idempotencyService.js");
const { normalizeServiceRadiusKm, DEFAULT_SERVICE_RADIUS_KM } = await import(
  "../app/services/customerVisibilityService.js"
);

const KEY = "a".repeat(36);

describe("Express blocked cities are settings-driven", () => {
  test("falls back to Pune when the setting was never saved", () => {
    expect(isExpressBlockedForCity("Pune")).toBe(true);
    expect(isExpressBlockedForCity("Kolhapur")).toBe(false);
  });
  test("uses the admin list when provided", () => {
    expect(isExpressBlockedForCity("Pune", [])).toBe(false);
    expect(isExpressBlockedForCity(" Nagpur ", ["pune", "nagpur"])).toBe(true);
    expect(isExpressBlockedForCity("Kolhapur", ["pune", "nagpur"])).toBe(false);
  });
});

describe("idempotency fails open without Redis", () => {
  test("check/acquire/store/release never throw", async () => {
    await expect(idem.checkIdempotency(KEY, {})).resolves.toMatchObject({ exists: false, inProgress: false });
    await expect(idem.acquireIdempotencyLock(KEY)).resolves.toBe(true);
    await expect(idem.storeIdempotencyResult(KEY, { ok: 1 }, {})).resolves.toBeUndefined();
    await expect(idem.storeIdempotencyError(KEY, new Error("x"), {})).resolves.toBeUndefined();
    await expect(idem.releaseIdempotencyLock(KEY)).resolves.toBeUndefined();
  });
});

describe("single service-radius default", () => {
  test("missing/invalid radius uses the shared default", () => {
    expect(normalizeServiceRadiusKm(undefined)).toBe(DEFAULT_SERVICE_RADIUS_KM);
    expect(normalizeServiceRadiusKm(0)).toBe(DEFAULT_SERVICE_RADIUS_KM);
    expect(normalizeServiceRadiusKm(8)).toBe(8);
  });
});
