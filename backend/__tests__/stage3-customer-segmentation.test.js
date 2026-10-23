import { describe, test, expect, jest, afterEach } from "@jest/globals";
import mongoose from "mongoose";
import User from "../app/models/customer.js";
import {
  SEGMENT_KEYS,
  SEGMENT_DEFINITIONS,
  VALID_ORDER_STATUSES,
  getSegmentSummary,
  getSegmentCustomers,
} from "../app/services/customerSegmentationService.js";

describe("Stage 3 — Customer Behavioral Segmentation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("A. Segment Definitions & Status Rules", () => {
    test("defines all 5 required behavioral segments", () => {
      expect(SEGMENT_DEFINITIONS[SEGMENT_KEYS.NEW]).toBeDefined();
      expect(SEGMENT_DEFINITIONS[SEGMENT_KEYS.ACTIVE]).toBeDefined();
      expect(SEGMENT_DEFINITIONS[SEGMENT_KEYS.REPEAT]).toBeDefined();
      expect(SEGMENT_DEFINITIONS[SEGMENT_KEYS.VIP]).toBeDefined();
      expect(SEGMENT_DEFINITIONS[SEGMENT_KEYS.AT_RISK]).toBeDefined();
    });

    test("excludes cancelled and payment_failed from valid order statuses", () => {
      expect(VALID_ORDER_STATUSES).toContain("delivered");
      expect(VALID_ORDER_STATUSES).toContain("confirmed");
      expect(VALID_ORDER_STATUSES).not.toContain("cancelled");
      expect(VALID_ORDER_STATUSES).not.toContain("payment_failed");
    });
  });

  describe("B. Segment Summary Aggregation", () => {
    test("aggregates counts across all 5 behavioral segments accurately", async () => {
      const now = new Date("2026-10-23T12:00:00Z");

      const mockAggResult = {
        totalCustomers: 250,
        newCustomers: 45,
        activeCustomers: 120,
        repeatCustomers: 95,
        vipCustomers: 30,
        atRiskCustomers: 25,
      };

      jest.spyOn(User, "aggregate").mockResolvedValue([mockAggResult]);

      const summary = await getSegmentSummary({ now });

      expect(summary.totalCustomers).toBe(250);
      expect(summary.segments.length).toBe(5);

      const newSegment = summary.segments.find((s) => s.key === SEGMENT_KEYS.NEW);
      expect(newSegment.count).toBe(45);
      expect(newSegment.name).toBe("New Customers");

      const activeSegment = summary.segments.find((s) => s.key === SEGMENT_KEYS.ACTIVE);
      expect(activeSegment.count).toBe(120);

      const repeatSegment = summary.segments.find((s) => s.key === SEGMENT_KEYS.REPEAT);
      expect(repeatSegment.count).toBe(95);

      const vipSegment = summary.segments.find((s) => s.key === SEGMENT_KEYS.VIP);
      expect(vipSegment.count).toBe(30);

      const atRiskSegment = summary.segments.find((s) => s.key === SEGMENT_KEYS.AT_RISK);
      expect(atRiskSegment.count).toBe(25);
    });
  });

  describe("C. Paginated Segment Customer Listing", () => {
    test("returns paginated customer items and segment metadata", async () => {
      const mockCustomerId = new mongoose.Types.ObjectId();
      const mockCustomers = [
        {
          _id: mockCustomerId,
          name: "Alice Smith",
          email: "alice@example.com",
          phone: "+919876543210",
          totalOrders: 6,
          totalSpent: 6250,
          lastOrderDate: new Date("2026-10-20"),
        },
      ];

      const mockFacetResult = {
        totalCount: [{ count: 1 }],
        items: mockCustomers,
      };

      jest.spyOn(User, "aggregate").mockResolvedValue([mockFacetResult]);

      const result = await getSegmentCustomers({
        segmentKey: SEGMENT_KEYS.VIP,
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("Alice Smith");
      expect(result.items[0].totalSpent).toBe(6250);
      expect(result.segment.key).toBe(SEGMENT_KEYS.VIP);
    });
  });
});
