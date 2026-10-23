import { describe, test, expect, jest, afterEach } from "@jest/globals";
import mongoose from "mongoose";
import Cart from "../app/models/cart.js";
import Order from "../app/models/order.js";
import Setting from "../app/models/setting.js";
import NotificationPreference from "../app/modules/notifications/preference.model.js";
import { processAbandonedCarts } from "../app/jobs/abandonedCartJob.js";

describe("Stage 2 — Automated Abandoned-Cart Reminders", () => {
  const mockCustomerId = new mongoose.Types.ObjectId();
  const mockProductId = new mongoose.Types.ObjectId();
  const mockCartId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("A. Inactivity Threshold & Eligibility Detection", () => {
    test("skips processing when abandonedCartEnabled is false in settings", async () => {
      jest.spyOn(Setting, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({ abandonedCartEnabled: false }),
      });

      const result = await processAbandonedCarts();
      expect(result.reason).toBe("disabled_by_settings");
      expect(result.sent).toBe(0);
    });

    test("skips carts if customer completed an order after cart was last updated", async () => {
      const cartUpdatedAt = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
      const candidateCart = {
        _id: mockCartId,
        customerId: {
          _id: mockCustomerId,
          name: "John Doe",
          isActive: true,
        },
        items: [{ productId: mockProductId, quantity: 1 }],
        updatedAt: cartUpdatedAt,
        reminderCount: 0,
      };

      jest.spyOn(Setting, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          abandonedCartEnabled: true,
          abandonedCartIntervalMinutes: 60,
          abandonedCartMaxReminders: 2,
        }),
      });

      jest.spyOn(Cart, "find").mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([candidateCart]),
        }),
      });

      // An order exists placed 1 hour ago (after cart update)
      jest.spyOn(Order, "findOne").mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
        }),
      });

      const updateSpy = jest.spyOn(Cart, "updateOne").mockResolvedValue({});

      const result = await processAbandonedCarts();

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      // Cart should be marked converted/maxed to avoid further scanning
      expect(updateSpy).toHaveBeenCalledWith(
        { _id: mockCartId },
        { $set: { reminderCount: 2, abandonedNotified: true } }
      );
    });
  });

  describe("B. Preference Respect & Opt-out", () => {
    test("skips notification when customer explicitly opted out of promotions", async () => {
      const cartUpdatedAt = new Date(Date.now() - 2 * 3600 * 1000);
      const candidateCart = {
        _id: mockCartId,
        customerId: {
          _id: mockCustomerId,
          name: "Opted Out User",
          isActive: true,
        },
        items: [{ productId: mockProductId, quantity: 2 }],
        updatedAt: cartUpdatedAt,
        reminderCount: 0,
      };

      jest.spyOn(Setting, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          abandonedCartEnabled: true,
          abandonedCartIntervalMinutes: 60,
          abandonedCartMaxReminders: 2,
        }),
      });

      jest.spyOn(Cart, "find").mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([candidateCart]),
        }),
      });

      // No recent order
      jest.spyOn(Order, "findOne").mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      // Preference has promotions = false
      jest.spyOn(NotificationPreference, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({ promotions: false }),
      });

      const updateSpy = jest.spyOn(Cart, "updateOne").mockResolvedValue({});

      const result = await processAbandonedCarts();

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      // No notification update should be made to cart
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("C. Successful Reminder Dispatch & Idempotency", () => {
    test("dispatches reminder and increments reminderCount for eligible cart", async () => {
      const cartUpdatedAt = new Date(Date.now() - 90 * 60 * 1000); // 90 mins ago
      const candidateCart = {
        _id: mockCartId,
        customerId: {
          _id: mockCustomerId,
          name: "Eligible Customer",
          isActive: true,
        },
        items: [
          { productId: mockProductId, quantity: 2 },
          { productId: new mongoose.Types.ObjectId(), quantity: 1 },
        ],
        updatedAt: cartUpdatedAt,
        reminderCount: 0,
        lastReminderSentAt: null,
      };

      jest.spyOn(Setting, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          abandonedCartEnabled: true,
          abandonedCartIntervalMinutes: 60,
          abandonedCartMaxReminders: 2,
        }),
      });

      jest.spyOn(Cart, "find").mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([candidateCart]),
        }),
      });

      jest.spyOn(Order, "findOne").mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      jest.spyOn(NotificationPreference, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({ promotions: true }),
      });

      const updateSpy = jest.spyOn(Cart, "updateOne").mockResolvedValue({});

      const result = await processAbandonedCarts();

      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(0);
      expect(updateSpy).toHaveBeenCalledWith(
        { _id: mockCartId },
        expect.objectContaining({
          $set: expect.objectContaining({
            reminderCount: 1,
            abandonedNotified: true,
          }),
        })
      );
    });

    test("cooldown prevents duplicate reminders sent within the same interval window", async () => {
      const cartUpdatedAt = new Date(Date.now() - 120 * 60 * 1000);
      const candidateCart = {
        _id: mockCartId,
        customerId: {
          _id: mockCustomerId,
          name: "Cooldown User",
          isActive: true,
        },
        items: [{ productId: mockProductId, quantity: 1 }],
        updatedAt: cartUpdatedAt,
        reminderCount: 1,
        lastReminderSentAt: new Date(Date.now() - 15 * 60 * 1000), // Only 15 mins ago
      };

      jest.spyOn(Setting, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          abandonedCartEnabled: true,
          abandonedCartIntervalMinutes: 60,
          abandonedCartMaxReminders: 2,
        }),
      });

      jest.spyOn(Cart, "find").mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([candidateCart]),
        }),
      });

      jest.spyOn(Order, "findOne").mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      jest.spyOn(NotificationPreference, "findOne").mockReturnValue({
        lean: jest.fn().mockResolvedValue(null), // Default allowed
      });

      const updateSpy = jest.spyOn(Cart, "updateOne").mockResolvedValue({});

      const result = await processAbandonedCarts();

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
