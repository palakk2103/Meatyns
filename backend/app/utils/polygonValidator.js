/**
 * Polygon Geometry Validation & Point-In-Polygon Utilities
 * Complies with RFC 7946 GeoJSON and MongoDB 2dsphere specifications.
 */

/**
 * Validates GeoJSON Polygon coordinates.
 * @param {Array} rawCoordinates - Array of linear rings, e.g. [[[lng, lat], ...]] or [[lng, lat], ...]
 * @returns {{ valid: boolean, error?: string, normalizedCoordinates?: number[][][] }}
 */
export function validateAndNormalizePolygon(rawCoordinates) {
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length === 0) {
    return { valid: false, error: "Polygon coordinates must be a non-empty array." };
  }

  // Support both [[[lng, lat], ...]] (GeoJSON standard) and [[lng, lat], ...] (single ring convenience)
  let rings = rawCoordinates;
  if (Array.isArray(rawCoordinates[0]) && typeof rawCoordinates[0][0] === "number") {
    // Single ring passed: wrap into array of rings
    rings = [rawCoordinates];
  }

  const normalizedRings = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    if (!Array.isArray(ring)) {
      return { valid: false, error: `Ring ${r} must be an array of coordinate pairs.` };
    }

    const ringCoords = [];
    for (let i = 0; i < ring.length; i++) {
      const pt = ring[i];
      let lng, lat;

      if (Array.isArray(pt) && pt.length >= 2) {
        lng = Number(pt[0]);
        lat = Number(pt[1]);
      } else if (pt && typeof pt === "object" && "lng" in pt && "lat" in pt) {
        lng = Number(pt.lng);
        lat = Number(pt.lat);
      } else {
        return {
          valid: false,
          error: `Coordinate at index ${i} in ring ${r} is invalid. Expected [lng, lat] or {lat, lng}.`,
        };
      }

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return {
          valid: false,
          error: `Non-finite coordinate numbers at ring ${r}, index ${i}: [${lng}, ${lat}].`,
        };
      }

      if (lng < -180 || lng > 180) {
        return {
          valid: false,
          error: `Longitude ${lng} is out of bounds [-180, 180] at ring ${r}, index ${i}.`,
        };
      }

      if (lat < -90 || lat > 90) {
        return {
          valid: false,
          error: `Latitude ${lat} is out of bounds [-90, 90] at ring ${r}, index ${i}.`,
        };
      }

      ringCoords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }

    // Check minimum vertices before closing
    if (ringCoords.length < 3) {
      return {
        valid: false,
        error: `A polygon ring must have at least 3 distinct vertices. Found only ${ringCoords.length}.`,
      };
    }

    // Ensure closure: first point must equal last point
    const first = ringCoords[0];
    const last = ringCoords[ringCoords.length - 1];
    const isClosed = Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7;

    if (!isClosed) {
      // Auto-close ring by appending first coordinate
      ringCoords.push([first[0], first[1]]);
    }

    // Minimum requirement for closed GeoJSON linear ring is 4 points (3 vertices + closure)
    if (ringCoords.length < 4) {
      return {
        valid: false,
        error: `A closed polygon ring must contain at least 4 coordinates (3 distinct vertices + 1 closing point).`,
      };
    }

    // Verify non-zero area using Shoelace formula
    let area = 0;
    for (let i = 0; i < ringCoords.length - 1; i++) {
      const [x1, y1] = ringCoords[i];
      const [x2, y2] = ringCoords[i + 1];
      area += x1 * y2 - x2 * y1;
    }
    if (Math.abs(area) < 1e-9) {
      return {
        valid: false,
        error: `Ring ${r} has zero area (collinear or degenerate points).`,
      };
    }

    normalizedRings.push(ringCoords);
  }

  return {
    valid: true,
    normalizedCoordinates: normalizedRings,
  };
}

/**
 * Checks whether a 2D point lies on a line segment between p1 and p2.
 */
function isPointOnSegment(px, py, x1, y1, x2, y2, epsilon = 1e-7) {
  // Check bounding box first
  if (
    px < Math.min(x1, x2) - epsilon ||
    px > Math.max(x1, x2) + epsilon ||
    py < Math.min(y1, y2) - epsilon ||
    py > Math.max(y1, y2) + epsilon
  ) {
    return false;
  }

  // Cross product to check collinearity: (px - x1)*(y2 - y1) - (py - y1)*(x2 - x1)
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  return Math.abs(cross) <= epsilon;
}

/**
 * Standard Ray-Casting algorithm for Point-In-Polygon containment.
 * @param {{ lat: number, lng: number } | [number, number]} point - Customer location [lng, lat] or {lat, lng}
 * @param {Array} polygonCoordinates - GeoJSON Polygon coordinates: [[[lng, lat], ...]]
 * @returns {boolean} True if point is inside or on the boundary of the polygon
 */
export function isPointInPolygon(point, polygonCoordinates) {
  if (!point || !polygonCoordinates || !Array.isArray(polygonCoordinates)) {
    return false;
  }

  let px, py;
  if (Array.isArray(point) && point.length >= 2) {
    px = Number(point[0]); // lng
    py = Number(point[1]); // lat
  } else if (typeof point === "object" && point !== null) {
    px = Number(point.lng);
    py = Number(point.lat);
  }

  if (!Number.isFinite(px) || !Number.isFinite(py)) {
    return false;
  }

  // If coordinates passed as single ring, wrap it
  const rings = Array.isArray(polygonCoordinates[0]) && Array.isArray(polygonCoordinates[0][0])
    ? polygonCoordinates
    : [polygonCoordinates];

  if (!rings[0] || rings[0].length < 4) {
    return false;
  }

  const outerRing = rings[0];
  let inside = false;

  for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
    const xi = outerRing[i][0];
    const yi = outerRing[i][1];
    const xj = outerRing[j][0];
    const yj = outerRing[j][1];

    // Check if the point is directly on the boundary segment
    if (isPointOnSegment(px, py, xi, yi, xj, yj)) {
      return true;
    }

    // Ray casting horizontal test
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  // If inside outer ring and holes exist (inner rings), ensure point is NOT inside any hole
  if (inside && rings.length > 1) {
    for (let h = 1; h < rings.length; h++) {
      const hole = rings[h];
      let insideHole = false;
      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const xi = hole[i][0];
        const yi = hole[i][1];
        const xj = hole[j][0];
        const yj = hole[j][1];

        if (isPointOnSegment(px, py, xi, yi, xj, yj)) {
          return false; // Point is on hole boundary, typically considered outside
        }

        const intersect =
          yi > py !== yj > py &&
          px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

        if (intersect) {
          insideHole = !insideHole;
        }
      }
      if (insideHole) {
        return false; // Point falls inside a hole
      }
    }
  }

  return inside;
}
