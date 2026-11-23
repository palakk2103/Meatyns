import { describe, it, expect } from "@jest/globals";
import {
  pickBestGeocodeResult,
  stripLeadingCode,
  isCodeLikeAddress,
} from "../core/utils/geocodeResult.js";

describe("geocodeResult", () => {
  it("detects code-like addresses", () => {
    expect(isCodeLikeAddress("HPSBA-C407138, Manganwlar Peth, Kolhapur")).toBe(true);
    expect(isCodeLikeAddress("8FVC9G8F+6X, Kolhapur")).toBe(true);
    expect(isCodeLikeAddress("Hockey Stadium Rd, Kolhapur")).toBe(false);
    expect(isCodeLikeAddress("")).toBe(false);
  });

  it("strips a leading code but keeps the rest", () => {
    expect(stripLeadingCode("HPSBA-C407138, Manganwlar Peth, Kolhapur 416012")).toBe(
      "Manganwlar Peth, Kolhapur 416012",
    );
    expect(stripLeadingCode("Flat 4, Sai Residency, Kolhapur")).toBe(
      "Flat 4, Sai Residency, Kolhapur",
    );
    expect(stripLeadingCode(undefined)).toBe("");
  });

  it("prefers a real street result over a plus-code first result", () => {
    const results = [
      { types: ["plus_code"], formatted_address: "HPSBA-C407138, Kolhapur" },
      { types: ["route"], formatted_address: "Hockey Stadium Rd, Kolhapur" },
      { types: ["locality"], formatted_address: "Kolhapur" },
    ];
    expect(pickBestGeocodeResult(results).formatted_address).toBe("Hockey Stadium Rd, Kolhapur");
  });

  it("falls back to first result and handles empty input", () => {
    const only = [{ types: ["plus_code"], formatted_address: "HPSBA-C407138, Kolhapur" }];
    expect(pickBestGeocodeResult(only)).toBe(only[0]);
    expect(pickBestGeocodeResult([])).toBeNull();
    expect(pickBestGeocodeResult(null)).toBeNull();
  });
});
