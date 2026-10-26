import { jest } from "@jest/globals";

const mockFindOne = jest.fn();

jest.unstable_mockModule("../app/models/subscription.js", () => ({
  default: {
    findOne: mockFindOne,
  },
}));

jest.unstable_mockModule("../app/services/subscriptionService.js", () => ({
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  processDueSubscriptionOrders: jest.fn(),
}));

const { getSubscriptionById } = await import(
  "../app/controller/subscriptionController.js"
);

describe("subscriptionController getSubscriptionById validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns HTTP 400 when id is not a valid ObjectId", async () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getSubscriptionById(
      { user: { id: "cust-1" }, params: { id: "not-a-valid-id" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid subscription ID",
      })
    );
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns HTTP 404 when valid ObjectId is not found", async () => {
    mockFindOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getSubscriptionById(
      { user: { id: "cust-1" }, params: { id: "507f1f77bcf86cd799439011" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Subscription not found",
      })
    );
  });

  it("returns HTTP 200 with subscription data for valid existing subscription", async () => {
    const mockSub = {
      _id: "507f1f77bcf86cd799439011",
      customerId: "cust-1",
      frequency: "weekly",
      status: "active",
    };

    mockFindOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockSub),
        }),
      }),
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getSubscriptionById(
      { user: { id: "cust-1" }, params: { id: "507f1f77bcf86cd799439011" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        result: mockSub,
      })
    );
  });

  it("returns HTTP 500 on unexpected database failure", async () => {
    mockFindOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error("Connection reset by peer")),
        }),
      }),
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getSubscriptionById(
      { user: { id: "cust-1" }, params: { id: "507f1f77bcf86cd799439011" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Connection reset by peer",
      })
    );
  });
});
