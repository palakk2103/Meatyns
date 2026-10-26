import { jest } from "@jest/globals";

describe("Admin-Controlled Seller Acceptance Timeout Configuration", () => {
  let originalEnvTimeout;

  beforeAll(() => {
    originalEnvTimeout = process.env.SELLER_TIMEOUT_MS;
  });

  afterAll(() => {
    if (originalEnvTimeout !== undefined) {
      process.env.SELLER_TIMEOUT_MS = originalEnvTimeout;
    } else {
      delete process.env.SELLER_TIMEOUT_MS;
    }
  });

  describe("getEffectiveSellerTimeoutMs precedence & fallbacks", () => {
    let mockFindOne;
    let getEffectiveSellerTimeoutMs;

    beforeEach(async () => {
      jest.resetModules();
      mockFindOne = jest.fn();

      jest.unstable_mockModule("../app/models/setting.js", () => ({
        default: {
          findOne: mockFindOne,
        },
      }));

      const mod = await import("../app/services/workflow/sellerTimeoutConfig.js");
      getEffectiveSellerTimeoutMs = mod.getEffectiveSellerTimeoutMs;
    });

    it("returns default 60000ms when setting is not found and no env is set", async () => {
      delete process.env.SELLER_TIMEOUT_MS;
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const timeout = await getEffectiveSellerTimeoutMs();
      expect(timeout).toBe(60000);
    });

    it("returns env variable fallback when setting is not persisted in database", async () => {
      process.env.SELLER_TIMEOUT_MS = "45000";
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const timeout = await getEffectiveSellerTimeoutMs();
      expect(timeout).toBe(45000);
    });

    it("persisted Admin setting takes precedence over env variable", async () => {
      process.env.SELLER_TIMEOUT_MS = "45000";
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              sellerAcceptanceTimeoutMs: 180000, // 3 minutes
            }),
          }),
        }),
      });

      const timeout = await getEffectiveSellerTimeoutMs();
      expect(timeout).toBe(180000);
    });

    it("falls back to default if persisted setting value is out of bounds (< 10000ms)", async () => {
      process.env.SELLER_TIMEOUT_MS = "60000";
      mockFindOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              sellerAcceptanceTimeoutMs: 5000, // Below 10s min
            }),
          }),
        }),
      });

      const timeout = await getEffectiveSellerTimeoutMs();
      expect(timeout).toBe(60000);
    });
  });

  describe("settingsController API validation and conversion", () => {
    let mockFindOne;
    let mockFindOneAndUpdate;
    let mockInvalidate;
    let getPublicSettings;
    let updateSettings;

    beforeEach(async () => {
      jest.resetModules();
      mockFindOne = jest.fn();
      mockFindOneAndUpdate = jest.fn();
      mockInvalidate = jest.fn();

      jest.unstable_mockModule("../app/models/setting.js", () => ({
        default: {
          findOne: mockFindOne,
          findOneAndUpdate: mockFindOneAndUpdate,
          create: jest.fn(),
        },
      }));

      jest.unstable_mockModule("../app/services/cacheService.js", () => ({
        buildKey: jest.fn(() => "cache:key"),
        getOrSet: jest.fn((key, fn) => fn()),
        getTTL: jest.fn(() => 60),
        invalidate: mockInvalidate,
      }));

      const controller = await import("../app/controller/settingsController.js");
      getPublicSettings = controller.getPublicSettings;
      updateSettings = controller.updateSettings;
    });

    it("includes sellerAcceptanceTimeoutMs in getPublicSettings projection", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          appName: "Meatyns",
          sellerAcceptanceTimeoutMs: 120000,
        }),
      });
      mockFindOne.mockReturnValue({ select: mockSelect });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPublicSettings({ tenantId: null }, res);

      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("sellerAcceptanceTimeoutMs"),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      const result = res.json.mock.calls[0][0].result;
      expect(result.sellerAcceptanceTimeoutMs).toBe(120000);
    });

    it("successfully updates sellerAcceptanceTimeoutMs and invalidates cache", async () => {
      mockFindOneAndUpdate.mockResolvedValue({
        toObject: () => ({
          sellerAcceptanceTimeoutMs: 90000,
        }),
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateSettings(
        { body: { sellerAcceptanceTimeoutMs: 90000 }, tenantId: null },
        res,
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { sellerAcceptanceTimeoutMs: 90000 } },
        expect.objectContaining({ new: true }),
      );
      expect(mockInvalidate).toHaveBeenCalledWith("cache:platform:settings:*");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("converts sellerAcceptanceTimeoutSeconds to sellerAcceptanceTimeoutMs", async () => {
      mockFindOneAndUpdate.mockResolvedValue({
        toObject: () => ({
          sellerAcceptanceTimeoutMs: 150000,
        }),
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateSettings(
        { body: { sellerAcceptanceTimeoutSeconds: 150 }, tenantId: null },
        res,
      );

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { sellerAcceptanceTimeoutMs: 150000 } },
        expect.objectContaining({ new: true }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects invalid timeout values (< 10s or > 30m or non-integer)", async () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Case 1: Less than 10s
      await updateSettings(
        { body: { sellerAcceptanceTimeoutMs: 5000 }, tenantId: null },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);

      // Case 2: Greater than 1800000ms (30m)
      await updateSettings(
        { body: { sellerAcceptanceTimeoutMs: 2000000 }, tenantId: null },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);

      // Case 3: Negative
      await updateSettings(
        { body: { sellerAcceptanceTimeoutMs: -60000 }, tenantId: null },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("processSellerTimeoutJob dynamic cancelReason & race protection", () => {
    let mockFindOne;
    let mockFindOneAndUpdate;
    let mockCompensate;
    let processSellerTimeoutJob;

    beforeEach(async () => {
      jest.resetModules();
      mockFindOne = jest.fn();
      mockFindOneAndUpdate = jest.fn();
      mockCompensate = jest.fn().mockResolvedValue(true);

      jest.unstable_mockModule("../app/models/order.js", () => ({
        default: {
          findOne: mockFindOne,
          findOneAndUpdate: mockFindOneAndUpdate,
        },
      }));

      jest.unstable_mockModule("../app/services/orderCompensation.js", () => ({
        compensateOrderCancellation: mockCompensate,
      }));

      jest.unstable_mockModule("../app/modules/notifications/notification.emitter.js", () => ({
        emitNotificationEvent: jest.fn(),
      }));

      jest.unstable_mockModule("../app/services/workflow/jobSchedulerPort.js", () => ({
        scheduleSellerTimeout: jest.fn(),
        removeSellerTimeout: jest.fn(),
        scheduleDeliveryTimeout: jest.fn(),
        removeDeliveryTimeout: jest.fn(),
        scheduleReturnPickupTimeout: jest.fn(),
        removeReturnPickupTimeout: jest.fn(),
      }));

      const workflowMod = await import("../app/services/orderWorkflowService.js");
      processSellerTimeoutJob = workflowMod.processSellerTimeoutJob;
    });

    it("does not cancel order before deadline has expired", async () => {
      const futureDate = new Date(Date.now() + 60000);
      mockFindOne.mockResolvedValue({
        orderId: "ORD-101",
        workflowVersion: 2,
        workflowStatus: "SELLER_PENDING",
        sellerPendingExpiresAt: futureDate,
        sellerAcceptanceTimeoutMs: 120000,
      });

      await processSellerTimeoutJob({ orderId: "ORD-101" });

      expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
      expect(mockCompensate).not.toHaveBeenCalled();
    });

    it("cancels order after deadline has passed and records dynamic timeout reason", async () => {
      const pastDate = new Date(Date.now() - 5000);
      mockFindOne.mockResolvedValue({
        orderId: "ORD-102",
        workflowVersion: 2,
        workflowStatus: "SELLER_PENDING",
        sellerPendingExpiresAt: pastDate,
        sellerAcceptanceTimeoutMs: 180000,
        customer: "cust1",
        seller: "sel1",
      });

      mockFindOneAndUpdate.mockResolvedValue({
        orderId: "ORD-102",
        workflowStatus: "CANCELLED",
        customer: "cust1",
        seller: "sel1",
      });

      await processSellerTimeoutJob({ orderId: "ORD-102" });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "ORD-102",
          workflowStatus: "SELLER_PENDING",
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            workflowStatus: "CANCELLED",
            cancelReason: "Seller timeout (180s)",
          }),
        }),
        expect.anything(),
      );
      expect(mockCompensate).toHaveBeenCalled();
    });

    it("preserves 'Seller timeout (60s)' for historical orders lacking new fields", async () => {
      const pastDate = new Date(Date.now() - 5000);
      mockFindOne.mockResolvedValue({
        orderId: "ORD-LEGACY",
        workflowVersion: 2,
        workflowStatus: "SELLER_PENDING",
        sellerPendingExpiresAt: pastDate,
        customer: "cust1",
        seller: "sel1",
      });

      mockFindOneAndUpdate.mockResolvedValue({
        orderId: "ORD-LEGACY",
        workflowStatus: "CANCELLED",
      });

      await processSellerTimeoutJob({ orderId: "ORD-LEGACY" });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "ORD-LEGACY",
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            cancelReason: "Seller timeout (60s)",
          }),
        }),
        expect.anything(),
      );
    });

    it("never cancels order if already accepted or moved out of SELLER_PENDING", async () => {
      mockFindOne.mockResolvedValue({
        orderId: "ORD-ACCEPTED",
        workflowVersion: 2,
        workflowStatus: "DELIVERY_SEARCH", // Already accepted!
      });

      await processSellerTimeoutJob({ orderId: "ORD-ACCEPTED" });

      expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
      expect(mockCompensate).not.toHaveBeenCalled();
    });
  });
});
