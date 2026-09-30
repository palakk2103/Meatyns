import { jest } from "@jest/globals";
import Joi from "joi";
import {
  createProductSchema,
  updateProductSchema,
} from "../app/validation/productValidation.js";

describe("Product SEO Validation & Fields", () => {
  test("createProductSchema accepts valid SEO fields including seoKeywords", () => {
    const validData = {
      name: "Fresh Chicken Curry Cut",
      category: "64a0f1234567890123456789",
      price: 250,
      stock: 30,
      description: "Tender and antibiotic residue-free fresh chicken pieces.",
      brand: "Meatyns Fresh",
      weight: "500g",
      metaTitle: "Buy Fresh Chicken Curry Cut Online | Meatyns",
      metaDescription: "Order fresh, tender chicken curry cut online with 30-min express delivery.",
      slug: "fresh-chicken-curry-cut-500g",
      seoKeywords: ["fresh chicken", "chicken breast", "buy chicken online"],
    };

    const { error, value } = createProductSchema.validate(validData);
    expect(error).toBeUndefined();
    expect(value.metaTitle).toBe("Buy Fresh Chicken Curry Cut Online | Meatyns");
    expect(value.metaDescription).toBe(
      "Order fresh, tender chicken curry cut online with 30-min express delivery."
    );
    expect(value.slug).toBe("fresh-chicken-curry-cut-500g");
    expect(value.seoKeywords).toEqual([
      "fresh chicken",
      "chicken breast",
      "buy chicken online",
    ]);
  });

  test("createProductSchema allows omitting SEO fields for backward compatibility", () => {
    const minimalData = {
      name: "Fresh Mutton Keema",
      category: "64a0f1234567890123456789",
      price: 450,
      stock: 15,
      description: "Fine minced mutton.",
    };

    const { error, value } = createProductSchema.validate(minimalData);
    expect(error).toBeUndefined();
    expect(value.metaTitle).toBeUndefined();
    expect(value.metaDescription).toBeUndefined();
    expect(value.slug).toBeUndefined();
    expect(value.seoKeywords).toBeUndefined();
  });

  test("updateProductSchema allows updating only SEO fields including seoKeywords", () => {
    const seoUpdate = {
      metaTitle: "Updated SEO Title for Mutton Keema",
      metaDescription: "Updated compelling meta description.",
      slug: "mutton-keema-mince",
      seoKeywords: ["mutton mince", "fresh mutton keema"],
    };

    const { error, value } = updateProductSchema.validate(seoUpdate);
    expect(error).toBeUndefined();
    expect(value.metaTitle).toBe("Updated SEO Title for Mutton Keema");
    expect(value.metaDescription).toBe("Updated compelling meta description.");
    expect(value.slug).toBe("mutton-keema-mince");
    expect(value.seoKeywords).toEqual(["mutton mince", "fresh mutton keema"]);
  });

  test("updateProductSchema enforces string type and max lengths if provided", () => {
    const invalidTitle = {
      metaTitle: "x".repeat(301), // over 200 chars (max is 200)
    };

    const { error } = updateProductSchema.validate(invalidTitle);
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("metaTitle");
  });

  test("seoKeywords sanitization logic trims, removes empties and deduplicates", () => {
    const rawInput = ["  fresh chicken  ", "chicken breast", "", "   ", "fresh chicken"];
    const sanitized = Array.from(
      new Set(
        rawInput
          .map((k) => (typeof k === "string" ? k.trim() : ""))
          .filter((k) => k.length > 0)
      )
    );
    expect(sanitized).toEqual(["fresh chicken", "chicken breast"]);
  });
});
