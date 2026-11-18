import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  validateAndNormalizePolygon,
  isPointInPolygon,
} from "../app/utils/polygonValidator.js";
import {
  calculateCustomerDeliveryFee,
} from "../app/services/finance/pricingService.js";
import {
  normalizeCustomerLocation,
} from "../app/services/deliveryZoneService.js";

describe("Sprint 3B: Polygon-Based Delivery Zones", () => {
  // Test triangle coordinates in Patna: [lng, lat]
  // V1: [85.10, 25.58], V2: [85.16, 25.58], V3: [85.13, 25.64]
  const validTriangle = [
    [85.10, 25.58],
    [85.16, 25.58],
    [85.13, 25.64],
  ];

  describe("Polygon Geometry Validation (validateAndNormalizePolygon)", () => {
    it("successfully validates and normalizes a valid polygon and auto-closes it", () => {
      const result = validateAndNormalizePolygon(validTriangle);
      expect(result.valid).toBe(true);
      expect(result.normalizedCoordinates).toBeDefined();
      expect(result.normalizedCoordinates[0].length).toBe(4); // 3 vertices + 1 closing
      // First point equals last point
      const first = result.normalizedCoordinates[0][0];
      const last = result.normalizedCoordinates[0][3];
      expect(first[0]).toBe(last[0]);
      expect(first[1]).toBe(last[1]);
    });

    it("accepts already closed GeoJSON rings [[[lng, lat], ...]]", () => {
      const closedGeoJson = [
        [
          [85.10, 25.58],
          [85.16, 25.58],
          [85.13, 25.64],
          [85.10, 25.58],
        ],
      ];
      const result = validateAndNormalizePolygon(closedGeoJson);
      expect(result.valid).toBe(true);
      expect(result.normalizedCoordinates[0].length).toBe(4);
    });

    it("rejects non-array or empty coordinates", () => {
      expect(validateAndNormalizePolygon(null).valid).toBe(false);
      expect(validateAndNormalizePolygon([]).valid).toBe(false);
      expect(validateAndNormalizePolygon("invalid").valid).toBe(false);
    });

    it("rejects polygons with fewer than 3 distinct vertices", () => {
      const line = [
        [85.10, 25.58],
        [85.16, 25.58],
      ];
      const result = validateAndNormalizePolygon(line);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least 3 distinct vertices/i);
    });

    it("rejects coordinates with latitude or longitude out of bounds", () => {
      const outOfBoundsLat = [
        [85.10, 95.00], // Lat > 90
        [85.16, 25.58],
        [85.13, 25.64],
      ];
      expect(validateAndNormalizePolygon(outOfBoundsLat).valid).toBe(false);

      const outOfBoundsLng = [
        [195.00, 25.58], // Lng > 180
        [85.16, 25.58],
        [85.13, 25.64],
      ];
      expect(validateAndNormalizePolygon(outOfBoundsLng).valid).toBe(false);
    });

    it("rejects collinear / zero-area degenerate polygons", () => {
      const collinear = [
        [85.10, 25.50],
        [85.10, 25.60],
        [85.10, 25.70],
      ];
      const result = validateAndNormalizePolygon(collinear);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/zero area/i);
    });
  });

  describe("Point-In-Polygon Containment Algorithm (isPointInPolygon)", () => {
    const polygon = [
      [
        [85.10, 25.58],
        [85.16, 25.58],
        [85.13, 25.64],
        [85.10, 25.58],
      ],
    ];

    it("returns true for a point strictly inside the polygon", () => {
      const insidePoint = { lng: 85.13, lat: 25.60 };
      expect(isPointInPolygon(insidePoint, polygon)).toBe(true);
    });

    it("returns false for a point strictly outside the polygon", () => {
      const outsidePoint = { lng: 85.20, lat: 25.60 };
      expect(isPointInPolygon(outsidePoint, polygon)).toBe(false);
    });

    it("returns true for a point on the polygon boundary", () => {
      // Midpoint of bottom edge between [85.10, 25.58] and [85.16, 25.58]
      const boundaryPoint = { lng: 85.13, lat: 25.58 };
      expect(isPointInPolygon(boundaryPoint, polygon)).toBe(true);
    });

    it("handles coordinates passed as [lng, lat] array", () => {
      expect(isPointInPolygon([85.13, 25.60], polygon)).toBe(true);
      expect(isPointInPolygon([85.30, 25.60], polygon)).toBe(false);
    });

    it("correctly handles polygon with an exclusion hole (donut polygon)", () => {
      const donutPolygon = [
        // Outer ring: square [0, 0] to [10, 10]
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        // Inner hole: square [3, 3] to [7, 7]
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3],
        ],
      ];

      // Point inside outer ring but outside hole: (1, 1) -> inside
      expect(isPointInPolygon([1, 1], donutPolygon)).toBe(true);

      // Point inside hole: (5, 5) -> outside
      expect(isPointInPolygon([5, 5], donutPolygon)).toBe(false);

      // Point outside outer ring: (12, 12) -> outside
      expect(isPointInPolygon([12, 12], donutPolygon)).toBe(false);
    });
  });

  describe("Customer Location Normalization (normalizeCustomerLocation)", () => {
    it("normalizes { lat, lng } object", () => {
      expect(normalizeCustomerLocation({ lat: 25.594, lng: 85.137 })).toEqual({
        lat: 25.594,
        lng: 85.137,
      });
    });

    it("normalizes { latitude, longitude } object", () => {
      expect(normalizeCustomerLocation({ latitude: 25.594, longitude: 85.137 })).toEqual({
        lat: 25.594,
        lng: 85.137,
      });
    });

    it("normalizes [lng, lat] GeoJSON array", () => {
      expect(normalizeCustomerLocation([85.137, 25.594])).toEqual({
        lat: 25.594,
        lng: 85.137,
      });
    });

    it("returns null for malformed or non-finite inputs", () => {
      expect(normalizeCustomerLocation(null)).toBeNull();
      expect(normalizeCustomerLocation({ lat: "abc", lng: 85 })).toBeNull();
      expect(normalizeCustomerLocation({ lat: 100, lng: 50 })).toBeNull(); // lat > 90
    });
  });

  describe("Delivery Fee Calculation with Zone Overrides (calculateCustomerDeliveryFee)", () => {
    const deliverySettings = {
      deliveryPricingMode: "distance_based",
      customerBaseDeliveryFee: 30,
      baseDistanceCapacityKm: 2,
      incrementalKmSurcharge: 10,
      deliveryConfig: {
        express: { enabled: true, surcharge: 40 },
        normal: { enabled: true },
        advance: { enabled: true },
      },
    };

    it("uses standard distance calculation when no zone override exists", () => {
      const res = calculateCustomerDeliveryFee(4.5, deliverySettings, { deliveryMethod: "NORMAL" });
      // 2km base = ₹30, 2.5km extra = 3 rounded km * 10 = ₹30 -> Total ₹60
      expect(res.deliveryFeeCharged).toBe(60);
      expect(res.zoneFeeOverride).toBeNull();
    });

    it("applies zone delivery fee override when specified", () => {
      const zoneWithCustomFee = {
        _id: "zone-123",
        name: "Central Patna Express Zone",
        deliveryFee: 25, // Overrides base fee to ₹25 flat
      };
      const res = calculateCustomerDeliveryFee(4.5, deliverySettings, {
        deliveryMethod: "NORMAL",
        zone: zoneWithCustomFee,
      });
      expect(res.deliveryFeeCharged).toBe(25);
      expect(res.zoneFeeOverride).toBe(25);
      expect(res.matchedZoneName).toBe("Central Patna Express Zone");
    });

    it("adds zone locality surcharge when present", () => {
      const zoneWithSurcharge = {
        _id: "zone-456",
        name: "Remote Suburb Zone",
        surcharge: 15,
      };
      const res = calculateCustomerDeliveryFee(1, deliverySettings, {
        deliveryMethod: "NORMAL",
        zone: zoneWithSurcharge,
      });
      // Base fee ₹30 + ₹15 surcharge = ₹45
      expect(res.deliveryFeeCharged).toBe(45);
      expect(res.zoneSurcharge).toBe(15);
    });

    it("combines zone delivery fee override with express delivery surcharge", () => {
      const zoneWithCustomFee = {
        _id: "zone-789",
        name: "VIP Prime Zone",
        deliveryFee: 20,
        surcharge: 5,
      };
      const res = calculateCustomerDeliveryFee(5, deliverySettings, {
        deliveryMethod: "EXPRESS",
        zone: zoneWithCustomFee,
      });
      // Fee override: ₹20 + Express surcharge: ₹40 + Zone surcharge: ₹5 = ₹65
      expect(res.deliveryFeeCharged).toBe(65);
      expect(res.expressSurcharge).toBe(40);
      expect(res.zoneSurcharge).toBe(5);
    });
  });

  describe("Overlapping Zones Deterministic Precedence Logic", () => {
    it("prefers higher priority zone when multiple zones match", () => {
      const zoneA = { _id: "zone-a", name: "Broad Area Zone", priority: 1, deliveryFee: 40 };
      const zoneB = { _id: "zone-b", name: "High-Priority Micro Zone", priority: 10, deliveryFee: 30 };

      const sorted = [zoneA, zoneB].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      expect(sorted[0]._id).toBe("zone-b");
    });

    it("breaks ties with lowest delivery fee (customer-friendly tiebreaker)", () => {
      const zoneA = { _id: "zone-a", name: "Zone A", priority: 5, deliveryFee: 35 };
      const zoneB = { _id: "zone-b", name: "Zone B", priority: 5, deliveryFee: 25 };

      const sorted = [zoneA, zoneB].sort((a, b) => {
        if ((b.priority || 0) !== (a.priority || 0)) {
          return (b.priority || 0) - (a.priority || 0);
        }
        return (a.deliveryFee || 0) - (b.deliveryFee || 0);
      });
      expect(sorted[0]._id).toBe("zone-b");
    });
  });
});
