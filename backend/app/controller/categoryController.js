import Category from "../models/category.js";
import Product from "../models/product.js";
import handleResponse from "../utils/helper.js";
import getPagination from "../utils/pagination.js";
import { buildKey, getOrSet, getTTL, invalidate } from "../services/cacheService.js";
import { uploadToCloudinary } from "../services/mediaService.js";
import mongoose from "mongoose";
import { invalidateCategoryName } from "../services/entityNameCache.js";
import { buildSearchRegex } from "../utils/regex.js";
import { slugify } from "../utils/slugify.js";

function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (!/^https?:\/\//i.test(normalized)) {
    return "";
  }
  return normalized;
}

function categoryCacheKey({ tree = false, type = "all" } = {}) {
  return buildKey("catalog", "categories", `${tree ? "tree" : "flat"}:${type || "all"}`);
}

function normalizeParentId(parentId) {
  if (!parentId) return null;
  const raw = String(parentId).trim();
  if (!raw || raw === "null" || raw === "undefined") return null;
  if (!mongoose.Types.ObjectId.isValid(raw)) return "__INVALID__";
  return raw;
}

async function validateParentForType(type, parentId) {
  if (type === "header" || !parentId) return true;

  try {
    const parent = await Category.findById(parentId).select("type").lean();
    if (!parent) return false;
    
    // Support flexible hierarchy (Subcategory can belong to Header or Category)
    if (type === "category" && !["header", "category"].includes(parent.type)) return false;
    if (type === "subcategory" && !["header", "category"].includes(parent.type)) return false;
    
    return true;
  } catch (err) {
    return false;
  }
}

async function generateUniqueCategorySlug(text, excludeCategoryId = null) {
  const baseSlug = slugify(text || "category");
  let slug = baseSlug;
  let count = 0;
  while (true) {
    const query = { slug };
    if (excludeCategoryId) {
      query._id = { $ne: excludeCategoryId };
    }
    const exists = await Category.findOne(query).lean();
    if (!exists) {
      break;
    }
    count++;
    slug = `${baseSlug}-${count}`;
  }
  return slug;
}


/* ===============================
   GET ALL CATEGORIES (Hierarchy)
 ================================ */
export const getCategories = async (req, res) => {
  try {
    const { flat, tree, type, status, withCounts } = req.query;

    if (tree === "true") {
      const cacheKey = categoryCacheKey({ tree: true, type: type || "header" });
      const categories = await getOrSet(
        cacheKey,
        async () => {
          const selectFields = "name slug image iconId type parentId headerColor headerFontColor headerIconColor displayOrder status description";
          const treeQuery = { type: type || "header" };
          if (status && status !== "all") {
            treeQuery.status = status;
          }
          return Category.find(treeQuery)
            .select(selectFields)
            .populate({
              path: "children",
              select: selectFields,
              options: { sort: { displayOrder: 1, name: 1, _id: 1 } },
              populate: {
                path: "children",
                select: selectFields,
                options: { sort: { displayOrder: 1, name: 1, _id: 1 } },
              },
            })
            .sort({ displayOrder: 1, name: 1, _id: 1 })
            .lean();
        },
        getTTL("categories"),
      );
      return handleResponse(res, 200, "Category tree fetched", categories);
    }

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    if (pageParam != null || limitParam != null) {
      const { page, limit, skip } = getPagination(req, {
        defaultLimit: 25,
        maxLimit: 100,
      });
      const query = {};
      if (type === "header" || type === "category" || type === "subcategory") {
        query.type = type;
      }
      if (status && status !== "all") {
        query.status = status;
      }
      const search = (req.query.search || "").trim();
      const parentId = req.query.parentId;

      if (search) {
        const safe = buildSearchRegex(String(search), { anchored: false });
        query.$or = [
          { name: safe },
          { slug: safe },
        ];
      }
      
      if (parentId && parentId !== "all") {
        if (parentId === "null" || parentId === "root") {
          query.parentId = null;
        } else if (mongoose.Types.ObjectId.isValid(parentId)) {
          query.parentId = new mongoose.Types.ObjectId(parentId);
        }
      }

      const [rawItems, total] = await Promise.all([
        Category.find(query).sort({ displayOrder: 1, name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
        Category.countDocuments(query),
      ]);

      // Attach subcategory and product counts
      const categoryIds = rawItems.map((c) => c._id);
      let subCountsMap = {};
      let prodCountsMap = {};

      if (categoryIds.length > 0) {
        try {
          const [subCounts, prodCounts] = await Promise.all([
            Category.aggregate([
              { $match: { parentId: { $in: categoryIds } } },
              { $group: { _id: "$parentId", count: { $sum: 1 } } }
            ]),
            Product.aggregate([
              {
                $match: {
                  $or: [
                    { categoryId: { $in: categoryIds } },
                    { subcategoryId: { $in: categoryIds } },
                    { headerId: { $in: categoryIds } }
                  ]
                }
              },
              {
                $project: {
                  matchedIds: {
                    $filter: {
                      input: ["$categoryId", "$subcategoryId", "$headerId"],
                      as: "id",
                      cond: { $in: ["$$id", categoryIds] }
                    }
                  }
                }
              },
              { $unwind: "$matchedIds" },
              { $group: { _id: "$matchedIds", count: { $sum: 1 } } }
            ])
          ]);

          subCounts.forEach((s) => { subCountsMap[String(s._id)] = s.count; });
          prodCounts.forEach((p) => { prodCountsMap[String(p._id)] = p.count; });
        } catch (aggErr) {
          console.warn("[Category] Count aggregation failed:", aggErr.message);
        }
      }

      const items = rawItems.map((item) => ({
        ...item,
        subCategoryCount: subCountsMap[String(item._id)] || 0,
        productCount: prodCountsMap[String(item._id)] || 0,
      }));

      return handleResponse(res, 200, "Categories fetched successfully", {
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      });
    }

    const query = {};
    if (type === "header" || type === "category" || type === "subcategory") {
      query.type = type;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    const parentId = req.query.parentId;
    if (parentId && parentId !== "all") {
      if (parentId === "null" || parentId === "root") {
        query.parentId = null;
      } else if (mongoose.Types.ObjectId.isValid(parentId)) {
        query.parentId = new mongoose.Types.ObjectId(parentId);
      }
    }

    const rawCategories = await Category.find(query).sort({ displayOrder: 1, name: 1, _id: 1 }).lean();

    if (withCounts === "true") {
      const categoryIds = rawCategories.map((c) => c._id);
      let subCountsMap = {};
      let prodCountsMap = {};

      if (categoryIds.length > 0) {
        try {
          const [subCounts, prodCounts] = await Promise.all([
            Category.aggregate([
              { $match: { parentId: { $in: categoryIds } } },
              { $group: { _id: "$parentId", count: { $sum: 1 } } }
            ]),
            Product.aggregate([
              {
                $match: {
                  $or: [
                    { categoryId: { $in: categoryIds } },
                    { subcategoryId: { $in: categoryIds } },
                    { headerId: { $in: categoryIds } }
                  ]
                }
              },
              {
                $project: {
                  matchedIds: {
                    $filter: {
                      input: ["$categoryId", "$subcategoryId", "$headerId"],
                      as: "id",
                      cond: { $in: ["$$id", categoryIds] }
                    }
                  }
                }
              },
              { $unwind: "$matchedIds" },
              { $group: { _id: "$matchedIds", count: { $sum: 1 } } }
            ])
          ]);

          subCounts.forEach((s) => { subCountsMap[String(s._id)] = s.count; });
          prodCounts.forEach((p) => { prodCountsMap[String(p._id)] = p.count; });
        } catch (aggErr) {
          console.warn("[Category] Count aggregation failed:", aggErr.message);
        }
      }

      const categoriesWithCounts = rawCategories.map((item) => ({
        ...item,
        subCategoryCount: subCountsMap[String(item._id)] || 0,
        productCount: prodCountsMap[String(item._id)] || 0,
      }));

      return handleResponse(res, 200, "Categories fetched successfully", categoriesWithCounts);
    }

    return handleResponse(
      res,
      200,
      "Categories fetched successfully",
      rawCategories,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   CREATE CATEGORY
 ================================ */
export const createCategory = async (req, res) => {
  try {
    const categoryData = {};
    const allowedKeys = ["name", "slug", "description", "type", "parentId", "status", "iconId", "headerColor", "headerFontColor", "headerIconColor", "adminCommission", "adminCommissionType", "adminCommissionValue", "handlingFees", "handlingFeeType", "handlingFeeValue", "displayOrder"];
    
    // Strict Whitelisting and Sanitization
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const val = req.body[key];
        // Stripping objects {} that could cause cast errors in Mongoose
        if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof mongoose.Types.ObjectId)) {
           continue;
        }
        categoryData[key] = val;
      }
    }

    if (categoryData.displayOrder !== undefined) {
      categoryData.displayOrder = Number(categoryData.displayOrder) || 0;
    }
    
    // Handle Images
    if (req.file) {
      try {
        const url = await uploadToCloudinary(req.file.buffer, "categories", {
          mimeType: req.file.mimetype,
          resourceType: "image",
        });
        categoryData.image = url;
      } catch (err) {
        console.error("Cloudinary upload failed for category:", err);
        return handleResponse(res, 400, `Image upload failed: ${err.message}`);
      }
    } else if (typeof req.body.image === 'string' && req.body.image.startsWith('http')) {
      categoryData.image = req.body.image;
    } else {
       // FORCED FIX: Ensure no phantom object remains
       delete categoryData.image; 
    }

    // Explicitly validate Parent ID hierarchy
    const normalizedParentId = normalizeParentId(categoryData.parentId);
    if (normalizedParentId === "__INVALID__") {
      return handleResponse(res, 400, "The Parent ID format is invalid");
    }
    categoryData.parentId = normalizedParentId;

    const type = String(categoryData.type || "").trim();
    if (!["header", "category", "subcategory"].includes(type)) {
      return handleResponse(res, 400, `The category type is invalid: ${type}`);
    }

    const parentOk = await validateParentForType(type, categoryData.parentId);
    if (!parentOk) {
      if (type === "category") return handleResponse(res, 400, "Level 2 Category must be linked to a Level 1 Header category");
      if (type === "subcategory") return handleResponse(res, 400, "Level 3 Subcategory must be linked to a Level 2 Category");
    }

    // Auto-generate or make unique slug
    if (!categoryData.slug || String(categoryData.slug).trim() === "") {
      categoryData.slug = await generateUniqueCategorySlug(categoryData.name);
    } else {
      categoryData.slug = await generateUniqueCategorySlug(categoryData.slug);
    }


    const category = await Category.create(categoryData);
    
    invalidate("cache:catalog:categories:*").catch(err => {
      console.warn("[Category] Cache invalidation failed:", err.message);
    });

    return handleResponse(res, 201, "Category created successfully", category);
  } catch (error) {
    if (error.code === 11000) return handleResponse(res, 400, "Duplicate record found; Slug must be unique");
    if (error?.name === "ValidationError" || error?.name === "CastError") return handleResponse(res, 400, error.message);
    return handleResponse(res, 500, `Category operation failed: ${error.message}`);
  }
};

/* ===============================
   UPDATE CATEGORY
 ================================ */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
      return handleResponse(res, 400, "Invalid category ID");
    }

    const categoryData = {};
    const allowedKeys = ["name", "slug", "description", "type", "parentId", "status", "iconId", "headerColor", "headerFontColor", "headerIconColor", "adminCommission", "adminCommissionType", "adminCommissionValue", "handlingFees", "handlingFeeType", "handlingFeeValue", "displayOrder"];
    
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const val = req.body[key];
        if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof mongoose.Types.ObjectId)) {
           continue;
        }
        categoryData[key] = val;
      }
    }

    if (categoryData.displayOrder !== undefined) {
      categoryData.displayOrder = Number(categoryData.displayOrder) || 0;
    }

    if (req.file) {
      try {
        const url = await uploadToCloudinary(req.file.buffer, "categories", {
          mimeType: req.file.mimetype,
          resourceType: "image",
        });
        categoryData.image = url;
      } catch (err) {
        console.error("Cloudinary upload failed for category update:", err);
        return handleResponse(res, 400, `Image update failed: ${err.message}`);
      }
    } else if (typeof req.body.image === 'string' && req.body.image.startsWith('http')) {
      categoryData.image = req.body.image;
    } else if (req.body.image === "") {
        categoryData.image = "";
    } else {
        if (req.body.image && typeof req.body.image === 'object') delete categoryData.image;
    }

    const existing = await Category.findById(id).select("type parentId name slug").lean();
    if (!existing) return handleResponse(res, 404, "Category not found");

    const hasParentId = Object.prototype.hasOwnProperty.call(categoryData, "parentId");
    if (hasParentId) {
      const normalizedParentId = normalizeParentId(categoryData.parentId);
      if (normalizedParentId === "__INVALID__") return handleResponse(res, 400, "Invalid parentId format");
      categoryData.parentId = normalizedParentId;
    }

    const type = String(categoryData.type || existing.type || "").trim();
    const parentToValidate = hasParentId ? categoryData.parentId : existing.parentId;
    
    const parentOk = await validateParentForType(type, parentToValidate);
    if (!parentOk) {
      return handleResponse(res, 400, "Invalid parent category hierarchy relationship");
    }

    if (categoryData.slug !== undefined || categoryData.name) {
      const slugInput = categoryData.slug || categoryData.name || existing.slug || existing.name;
      categoryData.slug = await generateUniqueCategorySlug(slugInput, id);
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: categoryData },
      { new: true, runValidators: true },
    );

    if (!updatedCategory) return handleResponse(res, 404, "Category not found");

    invalidate("cache:catalog:categories:*").catch(err => {
      console.warn("[Category] Cache invalidation failed:", err.message);
    });
    invalidateCategoryName(id).catch(err => {
      console.warn("[Category] Name cache invalidation failed:", err.message);
    });

    return handleResponse(res, 200, "Category updated successfully", updatedCategory);
  } catch (error) {
    if (error.code === 11000) return handleResponse(res, 400, "Slug already exists");
    if (error?.name === "ValidationError" || error?.name === "CastError") return handleResponse(res, 400, error.message);
    return handleResponse(res, 500, `Category operation failed: ${error.message}`);
  }
};

/* ===============================
   DELETE BULK CATEGORIES
 ================================ */
export const deleteBulkCategories = async (req, res) => {
  try {
    const ids = req.body?.ids || req.query?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return handleResponse(res, 400, "Please provide an array of category IDs to delete");
    }

    const validObjectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    if (validObjectIds.length === 0) {
      return handleResponse(res, 400, "No valid category IDs provided");
    }

    // Collect all descendants
    const collectDescendantIds = async (parentId) => {
      let result = [parentId];
      const children = await Category.find({ parentId }).select("_id").lean();
      for (const child of children) {
        const subIds = await collectDescendantIds(child._id);
        result = result.concat(subIds);
      }
      return result;
    };

    let allTargetIds = [];
    for (const pId of validObjectIds) {
      const branchIds = await collectDescendantIds(pId);
      allTargetIds = allTargetIds.concat(branchIds);
    }

    // Safety check: ensure no products are linked
    const linkedCount = await Product.countDocuments({
      $or: [
        { categoryId: { $in: allTargetIds } },
        { subcategoryId: { $in: allTargetIds } },
        { headerId: { $in: allTargetIds } }
      ]
    });

    if (linkedCount > 0) {
      return handleResponse(
        res,
        400,
        `Cannot delete: Selected categories (or their subcategories) are assigned to ${linkedCount} product(s). Please reassign or remove the products before deleting.`
      );
    }

    const deleteWithChildren = async (parentId) => {
      const children = await Category.find({ parentId }).select("_id").lean();
      for (const child of children) {
        await deleteWithChildren(child._id);
      }
      await Category.findByIdAndDelete(parentId);
    };

    for (const id of validObjectIds) {
      await deleteWithChildren(id);
      invalidateCategoryName(id).catch(() => {});
    }

    invalidate("cache:catalog:categories:*").catch((err) => {
      console.warn("[Category] Cache invalidation failed:", err.message);
    });

    return handleResponse(res, 200, `${ids.length} categories and their descendants deleted`);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   DELETE ALL CATEGORIES
 ================================ */
export const deleteAllCategories = async (req, res) => {
  try {
    const type = req.query?.type || req.body?.type || "all";
    const parentId = req.query?.parentId || req.body?.parentId;

    // Collect all descendant category IDs for targeted categories
    const collectDescendantIds = async (id) => {
      let result = [id];
      const children = await Category.find({ parentId: id }).select("_id").lean();
      for (const child of children) {
        const subIds = await collectDescendantIds(child._id);
        result = result.concat(subIds);
      }
      return result;
    };

    let targetRootIds = [];
    if (type === "header") {
      const headers = await Category.find({ type: "header" }).select("_id").lean();
      targetRootIds = headers.map((h) => h._id);
    } else if (type === "category") {
      const query = { type: "category" };
      if (parentId && parentId !== "all" && mongoose.Types.ObjectId.isValid(parentId)) {
        query.parentId = parentId;
      }
      const cats = await Category.find(query).select("_id").lean();
      targetRootIds = cats.map((c) => c._id);
    } else if (type === "subcategory") {
      const query = { type: "subcategory" };
      if (parentId && parentId !== "all" && mongoose.Types.ObjectId.isValid(parentId)) {
        query.parentId = parentId;
      }
      const subs = await Category.find(query).select("_id").lean();
      targetRootIds = subs.map((s) => s._id);
    } else {
      const all = await Category.find({}).select("_id").lean();
      targetRootIds = all.map((c) => c._id);
    }

    let allTargetIds = [];
    for (const rId of targetRootIds) {
      const branchIds = await collectDescendantIds(rId);
      allTargetIds = allTargetIds.concat(branchIds);
    }

    allTargetIds = [...new Set(allTargetIds.map((id) => id.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Check if any products are linked to the categories being deleted
    const totalLinked = await Product.countDocuments({
      $or: [
        { categoryId: { $in: allTargetIds } },
        { subcategoryId: { $in: allTargetIds } },
        { headerId: { $in: allTargetIds } },
      ],
    });

    if (totalLinked > 0) {
      return handleResponse(
        res,
        400,
        `Cannot delete categories: There are ${totalLinked} products assigned to these categories. Please reassign or remove products first to prevent orphaned records.`
      );
    }

    const deleteWithChildren = async (id) => {
      const children = await Category.find({ parentId: id }).select("_id").lean();
      for (const child of children) {
        await deleteWithChildren(child._id);
      }
      await Category.findByIdAndDelete(id);
    };

    if (type === "all") {
      await Category.deleteMany({});
    } else if (type === "subcategory") {
      const query = { type: "subcategory" };
      if (parentId && parentId !== "all" && mongoose.Types.ObjectId.isValid(parentId)) {
        query.parentId = parentId;
      }
      await Category.deleteMany(query);
    } else {
      for (const rId of targetRootIds) {
        await deleteWithChildren(rId);
      }
    }

    invalidate("cache:catalog:categories:*").catch((err) => {
      console.warn("[Category] Cache invalidation failed:", err.message);
    });

    return handleResponse(res, 200, `Categories (${type}) deleted successfully`);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   DELETE CATEGORY (Protected)
 ================================ */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid category ID");
    }

    const targetObjectId = new mongoose.Types.ObjectId(id);

    // Recursively collect all descendant IDs
    const collectDescendantIds = async (parentId) => {
      let result = [parentId];
      const children = await Category.find({ parentId }).select("_id").lean();
      for (const child of children) {
        const subIds = await collectDescendantIds(child._id);
        result = result.concat(subIds);
      }
      return result;
    };

    const allIds = await collectDescendantIds(targetObjectId);

    // CRITICAL PRODUCT SAFETY CHECK:
    // Check if any product references this category, header, or subcategory
    const linkedProductCount = await Product.countDocuments({
      $or: [
        { categoryId: { $in: allIds } },
        { subcategoryId: { $in: allIds } },
        { headerId: { $in: allIds } }
      ]
    });

    if (linkedProductCount > 0) {
      return handleResponse(
        res,
        400,
        `Cannot delete: This category (or its subcategories) contains ${linkedProductCount} associated product(s). Please reassign or remove the products before deleting.`
      );
    }

    const deleteWithChildren = async (parentId) => {
      const children = await Category.find({ parentId });
      for (const child of children) {
        await deleteWithChildren(child._id);
      }
      await Category.findByIdAndDelete(parentId);
    };

    await deleteWithChildren(targetObjectId);
    
    for (const subId of allIds) {
      invalidateCategoryName(subId).catch(() => {});
    }

    invalidate("cache:catalog:categories:*").catch(err => {
      console.warn("[Category] Cache invalidation failed:", err.message);
    });

    return handleResponse(res, 200, "Category and all descendants deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

