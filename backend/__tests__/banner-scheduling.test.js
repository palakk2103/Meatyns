import { jest } from "@jest/globals";
import ExperienceSection from "../app/models/experienceSection.js";
import HeroConfig from "../app/models/heroConfig.js";
import {
  isBannerActiveNow,
  getPublicExperienceSections,
  getPublicHeroConfig,
  upsertHeroConfig,
} from "../app/controller/experienceController.js";

describe("Experience Studio Banner Scheduling (HD-010 / MKT-008)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const now = new Date("2026-10-24T12:00:00Z");

  describe("isBannerActiveNow Helper", () => {
    test("returns true for banner without date constraints (backward compatibility)", () => {
      const banner = { status: "active" };
      expect(isBannerActiveNow(banner, now)).toBe(true);
    });

    test("returns false for inactive banner even if dates are valid", () => {
      const banner = {
        status: "inactive",
        validFrom: new Date("2026-10-24T10:00:00Z"),
        validTo: new Date("2026-10-24T15:00:00Z"),
      };
      expect(isBannerActiveNow(banner, now)).toBe(false);
    });

    test("returns false if banner validFrom is in the future", () => {
      const futureBanner = {
        status: "active",
        validFrom: new Date("2026-10-24T13:00:00Z"),
        validTo: new Date("2026-10-24T18:00:00Z"),
      };
      expect(isBannerActiveNow(futureBanner, now)).toBe(false);
    });

    test("returns true if banner is currently within valid window", () => {
      const activeBanner = {
        status: "active",
        validFrom: new Date("2026-10-24T10:00:00Z"),
        validTo: new Date("2026-10-24T18:00:00Z"),
      };
      expect(isBannerActiveNow(activeBanner, now)).toBe(true);
    });

    test("returns false if banner validTo has passed (expired)", () => {
      const expiredBanner = {
        status: "active",
        validFrom: new Date("2026-10-20T10:00:00Z"),
        validTo: new Date("2026-10-24T11:59:59Z"),
      };
      expect(isBannerActiveNow(expiredBanner, now)).toBe(false);
    });
  });

  describe("Public API Banner Filtering", () => {
    test("getPublicExperienceSections filters out future and expired banners and sections", async () => {
      const mockSections = [
        {
          _id: "sec1",
          pageType: "home",
          displayType: "banners",
          status: "active",
          config: {
            banners: {
              items: [
                {
                  imageUrl: "https://example.com/banner-active.jpg",
                  title: "Active Banner",
                  status: "active",
                  validFrom: new Date(Date.now() - 3600000), // 1 hour ago
                  validTo: new Date(Date.now() + 3600000), // 1 hour in future
                },
                {
                  imageUrl: "https://example.com/banner-future.jpg",
                  title: "Future Banner",
                  status: "active",
                  validFrom: new Date(Date.now() + 86400000), // tomorrow
                },
                {
                  imageUrl: "https://example.com/banner-expired.jpg",
                  title: "Expired Banner",
                  status: "active",
                  validTo: new Date(Date.now() - 3600000), // 1 hour ago
                },
              ],
            },
          },
        },
      ];

      jest.spyOn(ExperienceSection, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSections),
      });

      const req = { query: { pageType: "home" } };
      let responseStatus = 200;
      let responseBody = null;
      const res = {
        status: (s) => {
          responseStatus = s;
          return res;
        },
        json: (data) => {
          responseBody = data;
          return res;
        },
      };

      await getPublicExperienceSections(req, res);

      expect(responseBody.success).toBe(true);
      const sections = responseBody.results || responseBody.result;
      const items = sections[0].config.banners.items;
      expect(items.length).toBe(1);
      expect(items[0].title).toBe("Active Banner");
    });

    test("upsertHeroConfig rejects invalid date ranges where validFrom > validTo", async () => {
      const req = {
        body: {
          pageType: "home",
          banners: {
            items: [
              {
                imageUrl: "https://example.com/banner.jpg",
                title: "Invalid Dates",
                validFrom: "2026-10-25T12:00:00Z",
                validTo: "2026-10-20T12:00:00Z", // before validFrom!
              },
            ],
          },
          categoryIds: [],
        },
      };

      let responseStatus = 200;
      let responseBody = null;
      const res = {
        status: (s) => {
          responseStatus = s;
          return res;
        },
        json: (data) => {
          responseBody = data;
          return res;
        },
      };

      await upsertHeroConfig(req, res);

      expect(responseStatus).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toContain("Banner validFrom date cannot be after validTo date");
    });
  });
});
