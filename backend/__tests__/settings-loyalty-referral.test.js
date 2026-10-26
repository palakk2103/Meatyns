import { jest } from "@jest/globals";

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockCreate = jest.fn();
const mockInvalidate = jest.fn();

jest.unstable_mockModule("../app/models/setting.js", () => ({
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    create: mockCreate,
  },
}));

jest.unstable_mockModule("../app/services/cacheService.js", () => ({
  buildKey: jest.fn(() => "cache:key"),
  getOrSet: jest.fn((key, fn) => fn()),
  getTTL: jest.fn(() => 60),
  invalidate: mockInvalidate,
}));

const { getPublicSettings, updateSettings } = await import(
  "../app/controller/settingsController.js"
);

describe("settingsController loyalty and referral support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("includes loyalty and referral in getPublicSettings projection", async () => {
    const mockSelect = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        appName: "Meatyns",
        loyalty: { enabled: true, pointsPer100Rupees: 10 },
        referral: { enabled: true, referrerRewardAmount: 150 },
      }),
    });
    mockFindOne.mockReturnValue({ select: mockSelect });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getPublicSettings({ tenantId: null }, res);

    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("loyalty referral")
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const result = res.json.mock.calls[0][0].result;
    expect(result.loyalty.pointsPer100Rupees).toBe(10);
    expect(result.referral.referrerRewardAmount).toBe(150);
  });

  it("validates and updates loyalty and referral via updateSettings", async () => {
    const payload = {
      loyalty: {
        enabled: true,
        pointsPer100Rupees: 8,
        maxRedemptionPercentage: 25,
        minOrderAmountToEarn: 250,
      },
      referral: {
        enabled: true,
        referrerRewardAmount: 120,
        refereeRewardAmount: 60,
        minOrderAmountToQualify: 350,
      },
    };

    mockFindOneAndUpdate.mockResolvedValue({
      toObject: () => ({
        ...payload,
      }),
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await updateSettings({ body: payload, tenantId: null }, res);

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      {
        $set: {
          "loyalty.enabled": true,
          "loyalty.pointsPer100Rupees": 8,
          "loyalty.maxRedemptionPercentage": 25,
          "loyalty.minOrderAmountToEarn": 250,
          "referral.enabled": true,
          "referral.referrerRewardAmount": 120,
          "referral.refereeRewardAmount": 60,
          "referral.minOrderAmountToQualify": 350,
        },
      },
      { new: true, upsert: true }
    );
    expect(mockInvalidate).toHaveBeenCalledWith("cache:platform:settings:*");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects invalid loyalty/referral values with HTTP 400", async () => {
    const invalidPayload = {
      loyalty: {
        pointsPer100Rupees: -5, // Invalid: must be >= 0
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await updateSettings({ body: invalidPayload, tenantId: null }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
