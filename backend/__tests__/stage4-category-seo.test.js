import { describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import Category from "../app/models/category.js";

describe("Stage 4 — Category SEO Metadata", () => {
  describe("A. Model Validation & Constraints", () => {
    test("allows creating category with complete SEO metadata", async () => {
      const category = new Category({
        name: "Premium Mutton Cuts",
        slug: "premium-mutton-cuts",
        type: "header",
        metaTitle: "Buy Fresh Mutton Online | Meatyns Fast Delivery",
        metaDescription: "Order premium goat & mutton cuts online in Bangalore. Freshly butchered, antibiotic-free, delivered in 15 mins.",
        canonicalUrl: "https://meatyns.com/category/premium-mutton-cuts",
        ogImage: "https://meatyns.com/images/mutton-og.jpg",
      });

      let err = null;
      try {
        await category.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeNull();
      expect(category.metaTitle).toBe("Buy Fresh Mutton Online | Meatyns Fast Delivery");
      expect(category.metaDescription).toBe(
        "Order premium goat & mutton cuts online in Bangalore. Freshly butchered, antibiotic-free, delivered in 15 mins."
      );
      expect(category.canonicalUrl).toBe("https://meatyns.com/category/premium-mutton-cuts");
    });

    test("defaults SEO metadata fields to empty strings for backward compatibility", async () => {
      const category = new Category({
        name: "Farm Fresh Chicken",
        slug: "farm-fresh-chicken",
        type: "header",
      });

      let err = null;
      try {
        await category.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeNull();
      expect(category.metaTitle).toBe("");
      expect(category.metaDescription).toBe("");
      expect(category.canonicalUrl).toBe("");
      expect(category.ogImage).toBe("");
    });

    test("enforces metaTitle maxlength (100 chars)", async () => {
      const tooLongTitle = "A".repeat(101);
      const category = new Category({
        name: "Seafood & Fish",
        slug: "seafood-fish",
        type: "header",
        metaTitle: tooLongTitle,
      });

      let err = null;
      try {
        await category.validate();
      } catch (e) {
        err = e;
      }

      expect(err).not.toBeNull();
      expect(err.errors?.metaTitle).toBeDefined();
    });

    test("enforces metaDescription maxlength (300 chars)", async () => {
      const tooLongDesc = "B".repeat(301);
      const category = new Category({
        name: "Exotic Cuts",
        slug: "exotic-cuts",
        type: "header",
        metaDescription: tooLongDesc,
      });

      let err = null;
      try {
        await category.validate();
      } catch (e) {
        err = e;
      }

      expect(err).not.toBeNull();
      expect(err.errors?.metaDescription).toBeDefined();
    });

    test("trims leading/trailing whitespace from SEO fields", async () => {
      const category = new Category({
        name: "Eggs & Dairy",
        slug: "eggs-dairy",
        type: "header",
        metaTitle: "   Organic Eggs Online   ",
        metaDescription: "   Fresh country eggs directly from farm.   ",
        canonicalUrl: "   https://meatyns.com/category/eggs   ",
      });

      expect(category.metaTitle).toBe("Organic Eggs Online");
      expect(category.metaDescription).toBe("Fresh country eggs directly from farm.");
      expect(category.canonicalUrl).toBe("https://meatyns.com/category/eggs");
    });
  });

  describe("B. Fallback & Metadata Resolution", () => {
    test("computes graceful fallback title and description when SEO fields are absent", () => {
      const categoryWithoutSeo = {
        name: "Country Chicken",
        description: "Fresh country chicken cuts sourced daily.",
      };

      const resolvedTitle = categoryWithoutSeo.metaTitle || `${categoryWithoutSeo.name} | Meatyns`;
      const resolvedDesc = categoryWithoutSeo.metaDescription || categoryWithoutSeo.description || "Fresh meat delivered in minutes.";

      expect(resolvedTitle).toBe("Country Chicken | Meatyns");
      expect(resolvedDesc).toBe("Fresh country chicken cuts sourced daily.");
    });

    test("prioritizes custom SEO title and description when populated", () => {
      const categoryWithSeo = {
        name: "Country Chicken",
        description: "Fresh country chicken cuts sourced daily.",
        metaTitle: "Best Country Chicken in Town - 100% Free Range | Meatyns",
        metaDescription: "Buy natural country chicken online with instant delivery in 15 mins.",
      };

      const resolvedTitle = categoryWithSeo.metaTitle || `${categoryWithSeo.name} | Meatyns`;
      const resolvedDesc = categoryWithSeo.metaDescription || categoryWithSeo.description;

      expect(resolvedTitle).toBe("Best Country Chicken in Town - 100% Free Range | Meatyns");
      expect(resolvedDesc).toBe("Buy natural country chicken online with instant delivery in 15 mins.");
    });
  });
});
