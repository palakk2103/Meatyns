import { jest } from "@jest/globals";
import Order from "../app/models/order.js";
import {
  getIstStartAndEndOfDay,
  getTodayKpis,
} from "../app/services/admin/dashboardService.js";

describe("Admin Dashboard Today KPIs (ANA-001)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Timezone boundary helper (getIstStartAndEndOfDay)", () => {
    test("calculates correct start and end of day in Asia/Kolkata (IST)", () => {
      // 2026-10-24 10:00:00 UTC = 15:30:00 IST on 2026-10-24
      const utcTime = new Date("2026-10-24T10:00:00.000Z");
      const { startOfDay, endOfDay, dateStr } = getIstStartAndEndOfDay(utcTime);

      expect(dateStr).toBe("2026-10-24");
      // 2026-10-24 00:00:00 IST = 2026-10-23 18:30:00 UTC
      expect(startOfDay.toISOString()).toBe("2026-10-23T18:30:00.000Z");
      // 2026-10-24 23:59:59.999 IST = 2026-10-24 18:29:59.999 UTC
      expect(endOfDay.toISOString()).toBe("2026-10-24T18:29:59.999Z");
    });

    test("handles day roll-over correctly near midnight UTC", () => {
      // 2026-10-23 19:00:00 UTC = 2026-10-24 00:30:00 IST (Day is 24 in IST!)
      const lateUtc = new Date("2026-10-23T19:00:00.000Z");
      const { dateStr } = getIstStartAndEndOfDay(lateUtc);
      expect(dateStr).toBe("2026-10-24");
    });
  });

  describe("getTodayKpis aggregation", () => {
    test("aggregates gross sales, net sales, and counts correctly", async () => {
      const mockFacetResult = [
        {
          grossMetrics: [
            { grossSales: 1500, checkoutCount: 3, subOrderCount: 4 },
          ],
          deliveredMetrics: [
            { netSales: 800, deliveredCount: 2, deliveredSubOrders: 2 },
          ],
          inTransitMetrics: [
            { inTransitCount: 1, inTransitSubOrders: 2 },
          ],
          cancelledMetrics: [
            { cancelledCount: 1, cancelledSubOrders: 1 },
          ],
        },
      ];

      jest.spyOn(Order, "aggregate").mockResolvedValue(mockFacetResult);

      const kpi = await getTodayKpis(new Date("2026-10-24T12:00:00Z"));

      expect(kpi.grossSales).toBe(1500);
      expect(kpi.netDeliveredSales).toBe(800);
      expect(kpi.ordersCount).toBe(3);
      expect(kpi.deliveredOrdersCount).toBe(2);
      expect(kpi.inTransitOrdersCount).toBe(1);
      expect(kpi.cancelledOrdersCount).toBe(1);
      expect(kpi.subOrdersCount).toBe(4);
      expect(kpi.timezone).toContain("Asia/Kolkata");
    });

    test("returns zeroed safe structure when dataset is empty", async () => {
      jest.spyOn(Order, "aggregate").mockResolvedValue([{}]);

      const kpi = await getTodayKpis(new Date("2026-10-24T12:00:00Z"));

      expect(kpi.grossSales).toBe(0);
      expect(kpi.netDeliveredSales).toBe(0);
      expect(kpi.ordersCount).toBe(0);
      expect(kpi.deliveredOrdersCount).toBe(0);
      expect(kpi.inTransitOrdersCount).toBe(0);
      expect(kpi.cancelledOrdersCount).toBe(0);
      expect(kpi.subOrdersCount).toBe(0);
    });

    test("handles aggregation rejection safely without crashing", async () => {
      jest.spyOn(Order, "aggregate").mockRejectedValue(new Error("DB error"));

      const kpi = await getTodayKpis(new Date("2026-10-24T12:00:00Z"));

      expect(kpi.grossSales).toBe(0);
      expect(kpi.ordersCount).toBe(0);
    });
  });
});
