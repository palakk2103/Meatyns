import { jest } from "@jest/globals";
import Product from "../app/models/product.js";
import { getProducts } from "../app/controller/productController.js";

describe("Meat Cut and Boneless Filters (UX-004)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const extractProductFilter = (capturedQuery) => {
    if (capturedQuery?.$and && Array.isArray(capturedQuery.$and)) {
      return capturedQuery.$and[0];
    }
    return capturedQuery || {};
  };

  const createMockReqRes = (query = {}, user = null) => {
    const req = {
      query,
      headers: {},
      originalUrl: "/api/products",
      baseUrl: "/api/products",
      user,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return { req, res };
  };

  test("filters products by single cutType correctly", async () => {
    let capturedQuery = null;
    jest.spyOn(Product, "find").mockImplementation((query) => {
      capturedQuery = query;
      return {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: "prod1", name: "Chicken Curry Cut", cutType: "curry_cut" },
        ]),
      };
    });
    jest.spyOn(Product, "countDocuments").mockResolvedValue(1);

    const { req, res } = createMockReqRes({ cutType: "curry_cut" });
    await getProducts(req, res);

    const filter = extractProductFilter(capturedQuery);
    expect(filter.cutType).toBe("curry_cut");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        result: expect.objectContaining({
          total: 1,
        }),
      })
    );
  });

  test("filters products by multiple comma-separated cutTypes", async () => {
    let capturedQuery = null;
    jest.spyOn(Product, "find").mockImplementation((query) => {
      capturedQuery = query;
      return {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
    });
    jest.spyOn(Product, "countDocuments").mockResolvedValue(0);

    const { req, res } = createMockReqRes({ cutType: "curry_cut,biryani_cut" });
    await getProducts(req, res);

    const filter = extractProductFilter(capturedQuery);
    expect(filter.cutType).toEqual({ $in: ["curry_cut", "biryani_cut"] });
  });

  test("filters products by boneType=boneless", async () => {
    let capturedQuery = null;
    jest.spyOn(Product, "find").mockImplementation((query) => {
      capturedQuery = query;
      return {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
    });
    jest.spyOn(Product, "countDocuments").mockResolvedValue(0);

    const { req, res } = createMockReqRes({ boneType: "boneless" });
    await getProducts(req, res);

    const filter = extractProductFilter(capturedQuery);
    expect(filter.boneType).toBe("boneless");
  });

  test("filters products by skinType and freshness", async () => {
    let capturedQuery = null;
    jest.spyOn(Product, "find").mockImplementation((query) => {
      capturedQuery = query;
      return {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
    });
    jest.spyOn(Product, "countDocuments").mockResolvedValue(0);

    const { req, res } = createMockReqRes({
      skinType: "skinless",
      freshness: "fresh",
    });
    await getProducts(req, res);

    const filter = extractProductFilter(capturedQuery);
    expect(filter.skinType).toBe("skinless");
    expect(filter.freshness).toBe("fresh");
  });

  test("ignores attribute filters when set to 'all' or empty string", async () => {
    let capturedQuery = null;
    jest.spyOn(Product, "find").mockImplementation((query) => {
      capturedQuery = query;
      return {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
    });
    jest.spyOn(Product, "countDocuments").mockResolvedValue(0);

    const { req, res } = createMockReqRes({
      cutType: "all",
      boneType: "all",
      skinType: "",
      freshness: "all",
    });
    await getProducts(req, res);

    const filter = extractProductFilter(capturedQuery);
    expect(filter.cutType).toBeUndefined();
    expect(filter.boneType).toBeUndefined();
    expect(filter.skinType).toBeUndefined();
    expect(filter.freshness).toBeUndefined();
  });
});
