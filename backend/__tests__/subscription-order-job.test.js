import { jest } from "@jest/globals";

const mockProcessDueSubscriptionOrders = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule("../app/services/subscriptionService.js", () => ({
  processDueSubscriptionOrders: mockProcessDueSubscriptionOrders,
}));

jest.unstable_mockModule("../app/services/logger.js", () => ({
  default: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: jest.fn(),
  },
}));

const {
  subscriptionOrderJobHandler,
  getSubscriptionOrderJobInterval,
  isSubscriptionOrderJobEnabled,
} = await import("../app/jobs/subscriptionOrderJob.js");

describe("subscriptionOrderJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("processes due subscriptions and logs result metrics", async () => {
    mockProcessDueSubscriptionOrders.mockResolvedValue({
      processed: 3,
      ordersGenerated: 2,
      skipped: 1,
      errors: [],
    });

    const result = await subscriptionOrderJobHandler();

    expect(mockProcessDueSubscriptionOrders).toHaveBeenCalled();
    expect(result.processed).toBe(3);
    expect(result.ordersGenerated).toBe(2);
    expect(result.skipped).toBe(1);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "Subscription order batch job completed",
      expect.objectContaining({
        jobName: "subscriptionOrderJob",
        processed: 3,
        ordersGenerated: 2,
        skipped: 1,
      })
    );
  });

  it("handles and logs errors during batch execution", async () => {
    mockProcessDueSubscriptionOrders.mockRejectedValue(
      new Error("Database connection dropped")
    );

    await expect(subscriptionOrderJobHandler()).rejects.toThrow(
      "Database connection dropped"
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Subscription order batch job failed",
      expect.objectContaining({
        jobName: "subscriptionOrderJob",
        error: "Database connection dropped",
      })
    );
  });

  it("exposes interval and enabled state checks", () => {
    expect(typeof getSubscriptionOrderJobInterval()).toBe("number");
    expect(getSubscriptionOrderJobInterval()).toBeGreaterThan(0);
    expect(isSubscriptionOrderJobEnabled()).toBe(true);
  });
});
