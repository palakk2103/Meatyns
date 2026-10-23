import { describe, it, expect } from "@jest/globals";
import { createProductSchema, updateProductSchema } from "../app/validation/productValidation.js";

describe("Stage 2 — Structured Meat Product Attributes", () => {
  const baseValidProduct = {
    name: "Fresh Chicken Curry Cut",
    price: 249,
    stock: 50,
    category: "507f1f77bcf86cd799439011",
  };

  it("validates meat attributes with valid enum values", () => {
    const payload = {
      ...baseValidProduct,
      cutType: "curry_cut",
      boneType: "bone_in",
      skinType: "skinless",
      freshness: "fresh",
    };

    const { error, value } = createProductSchema.validate(payload);
    expect(error).toBeUndefined();
    expect(value.cutType).toBe("curry_cut");
    expect(value.boneType).toBe("bone_in");
    expect(value.skinType).toBe("skinless");
    expect(value.freshness).toBe("fresh");
  });

  it("permits non-meat products without meat attributes (backward compatibility)", () => {
    const groceryPayload = {
      name: "Organic Mustard Oil",
      price: 180,
      stock: 100,
      category: "507f1f77bcf86cd799439012",
    };

    const { error, value } = createProductSchema.validate(groceryPayload);
    expect(error).toBeUndefined();
    expect(value.cutType).toBeUndefined();
    expect(value.boneType).toBeUndefined();
  });

  it("permits null or empty strings for meat attributes", () => {
    const payload = {
      ...baseValidProduct,
      cutType: "",
      boneType: null,
      skinType: "not_applicable",
      freshness: "chilled",
    };

    const { error } = createProductSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it("rejects invalid boneType enum value", () => {
    const payload = {
      ...baseValidProduct,
      boneType: "extra_bony_invalid",
    };

    const { error } = createProductSchema.validate(payload);
    expect(error).toBeDefined();
    expect(error.message).toContain("boneType");
  });

  it("rejects invalid skinType enum value", () => {
    const payload = {
      ...baseValidProduct,
      skinType: "crispy_skin_invalid",
    };

    const { error } = createProductSchema.validate(payload);
    expect(error).toBeDefined();
    expect(error.message).toContain("skinType");
  });

  it("rejects invalid freshness enum value", () => {
    const payload = {
      ...baseValidProduct,
      freshness: "expired_invalid",
    };

    const { error } = createProductSchema.validate(payload);
    expect(error).toBeDefined();
    expect(error.message).toContain("freshness");
  });

  it("supports partial update of meat attributes via updateProductSchema", () => {
    const updatePayload = {
      cutType: "biryani_cut",
      boneType: "boneless",
    };

    const { error, value } = updateProductSchema.validate(updatePayload);
    expect(error).toBeUndefined();
    expect(value.cutType).toBe("biryani_cut");
    expect(value.boneType).toBe("boneless");
  });
});
