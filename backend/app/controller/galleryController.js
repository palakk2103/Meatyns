import Gallery from "../models/gallery.js";
import GalleryCategory from "../models/galleryCategory.js";
import GallerySetting from "../models/gallerySetting.js";
import handleResponse from "../utils/helper.js";
import logger from "../services/logger.js";
import { uploadToCloudinary } from "../services/mediaService.js";
import { detectImageType } from "../services/localImageStorage.js";
import {
  buildUniqueSlug,
  cleanupUnreferencedImages,
  ensureGalleryBootstrap,
  escapeRegex,
  getGallerySettings,
  getHomepageGalleries,
  getPublishedGallery,
  httpError,
  isObjectId,
  listPublishedGalleries,
  normalizeImages,
  toCard,
  toPublicSettings,
} from "../services/galleryService.js";

// Short browser cache: admin publish/visibility changes reach customers within seconds.
const PUBLIC_CACHE_HEADER = "public, max-age=15";
const ALLOWED_GALLERY_IMAGE_EXT = new Set(["jpg", "png", "webp"]);

const toInt = (value, fallback, { min = 1, max = 100 } = {}) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const fail = (res, error, fallbackMessage) => {
  const status = error?.statusCode || (error?.name === "ValidationError" ? 400 : 500);
  if (status >= 500) logger.error(fallbackMessage, { message: error?.message });
  return handleResponse(res, status, status >= 500 ? fallbackMessage : error.message, error?.details || {});
};

const ensureCategory = async (categoryId) => {
  if (!isObjectId(String(categoryId || ""))) throw httpError(400, "A valid gallery category is required");
  const exists = await GalleryCategory.exists({ _id: categoryId });
  if (!exists) throw httpError(400, "Selected gallery category does not exist");
};

/* =====================================================================
   PUBLIC (customer) handlers — published content only
===================================================================== */

export const getPublicGallerySettings = async (_req, res) => {
  try {
    const settings = await getGallerySettings();
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    return handleResponse(res, 200, "Gallery settings fetched", toPublicSettings(settings));
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery settings");
  }
};

export const getPublicGalleryCategories = async (_req, res) => {
  try {
    await ensureGalleryBootstrap();
    const categories = await GalleryCategory.find({ isActive: true })
      .select("name slug description image displayOrder")
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    const counts = await Gallery.aggregate([
      { $match: { isPublished: true, "images.0": { $exists: true }, category: { $in: categories.map((c) => c._id) } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    const results = categories.map((c) => ({ ...c, galleryCount: countMap.get(String(c._id)) || 0 }));
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    return handleResponse(res, 200, "Gallery categories fetched", results);
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery categories");
  }
};

export const getHomepageGalleryPreview = async (_req, res) => {
  try {
    const data = await getHomepageGalleries();
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    return handleResponse(res, 200, "Homepage gallery fetched", data);
  } catch (error) {
    return fail(res, error, "Failed to fetch homepage gallery");
  }
};

export const getPublicGalleries = async (req, res) => {
  try {
    await ensureGalleryBootstrap();
    const page = toInt(req.query.page, 1, { max: 10000 });
    const limit = toInt(req.query.limit, 12, { max: 48 });
    const data = await listPublishedGalleries({ categorySlug: req.query.category, page, limit });
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    return handleResponse(res, 200, "Galleries fetched", data);
  } catch (error) {
    return fail(res, error, "Failed to fetch galleries");
  }
};

export const getPublicGalleryDetail = async (req, res) => {
  try {
    const gallery = await getPublishedGallery(req.params.slugOrId);
    if (!gallery) return handleResponse(res, 404, "Gallery not found");
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    return handleResponse(res, 200, "Gallery fetched", gallery);
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery");
  }
};

/* =====================================================================
   ADMIN — galleries
===================================================================== */

export const getGalleryStats = async (_req, res) => {
  try {
    await ensureGalleryBootstrap();
    const [total, published, imageAgg, activeCategories, totalCategories] = await Promise.all([
      Gallery.countDocuments({}),
      Gallery.countDocuments({ isPublished: true }),
      Gallery.aggregate([{ $group: { _id: null, count: { $sum: { $size: { $ifNull: ["$images", []] } } } } }]),
      GalleryCategory.countDocuments({ isActive: true }),
      GalleryCategory.countDocuments({}),
    ]);
    return handleResponse(res, 200, "Gallery stats fetched", {
      totalGalleries: total,
      publishedGalleries: published,
      draftGalleries: total - published,
      totalImages: imageAgg[0]?.count || 0,
      activeCategories,
      totalCategories,
    });
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery stats");
  }
};

const ADMIN_SORTS = {
  order: { displayOrder: 1, createdAt: -1 },
  latest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  eventDate: { eventDate: -1, createdAt: -1 },
  title: { title: 1 },
};

export const listGalleriesAdmin = async (req, res) => {
  try {
    await ensureGalleryBootstrap();
    const page = toInt(req.query.page, 1, { max: 10000 });
    const limit = toInt(req.query.limit, 12, { max: 100 });
    const filter = {};
    const search = String(req.query.search || "").trim().slice(0, 100);
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: rx }, { franchiseName: rx }, { city: rx }, { location: rx }, { state: rx }];
    }
    if (req.query.category && isObjectId(String(req.query.category))) filter.category = req.query.category;
    if (req.query.status === "published") filter.isPublished = true;
    if (req.query.status === "draft") filter.isPublished = false;
    if (req.query.featured === "true") filter.isFeatured = true;
    const sort = ADMIN_SORTS[req.query.sort] || ADMIN_SORTS.order;

    const [rows, total] = await Promise.all([
      Gallery.find(filter)
        .select("title slug category franchiseName location city state eventDate shortDescription coverImage images.url isFeatured showOnHomepage isPublished displayOrder createdAt updatedAt")
        .populate("category", "name slug isActive")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Gallery.countDocuments(filter),
    ]);
    const items = rows.map((r) => ({ ...toCard(r), showOnHomepage: r.showOnHomepage, isPublished: r.isPublished, updatedAt: r.updatedAt }));
    const totalPages = Math.ceil(total / limit);
    return handleResponse(res, 200, "Galleries fetched", {
      items,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    return fail(res, error, "Failed to fetch galleries");
  }
};

export const getGalleryAdmin = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return handleResponse(res, 400, "Invalid gallery id");
    const gallery = await Gallery.findById(req.params.id).populate("category", "name slug isActive").lean();
    if (!gallery) return handleResponse(res, 404, "Gallery not found");
    gallery.images = [...(gallery.images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return handleResponse(res, 200, "Gallery fetched", gallery);
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery");
  }
};

const nextDisplayOrder = async (Model) => {
  const last = await Model.findOne({}).sort({ displayOrder: -1 }).select("displayOrder").lean();
  return (last?.displayOrder || 0) + 1;
};

export const createGalleryAdmin = async (req, res) => {
  try {
    const payload = { ...req.body };
    await ensureCategory(payload.category);
    payload.slug = await buildUniqueSlug(Gallery, payload.slug || payload.title);
    const { images, coverImage } = normalizeImages(payload.images || [], payload.coverImage);
    if (payload.isPublished && images.length === 0) {
      return handleResponse(res, 400, "Add at least one image before publishing");
    }
    if (payload.eventDate === "") payload.eventDate = null;
    if (payload.displayOrder === undefined) payload.displayOrder = await nextDisplayOrder(Gallery);
    const gallery = await Gallery.create({
      ...payload,
      images,
      coverImage,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
    });
    const populated = await Gallery.findById(gallery._id).populate("category", "name slug isActive").lean();
    return handleResponse(res, 201, "Gallery created successfully", populated);
  } catch (error) {
    if (error?.code === 11000) return handleResponse(res, 409, "A gallery with this slug already exists");
    return fail(res, error, "Failed to create gallery");
  }
};

export const updateGalleryAdmin = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return handleResponse(res, 400, "Invalid gallery id");
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return handleResponse(res, 404, "Gallery not found");

    const payload = { ...req.body };
    if (payload.category !== undefined) await ensureCategory(payload.category);
    if (payload.slug !== undefined || payload.title !== undefined) {
      const desired = payload.slug || (payload.slug === "" ? payload.title || gallery.title : gallery.slug);
      payload.slug = await buildUniqueSlug(Gallery, desired, gallery._id);
    }
    if (payload.eventDate === "") payload.eventDate = null;

    const previousUrls = gallery.images.map((i) => i.url);
    if (gallery.coverImage) previousUrls.push(gallery.coverImage);
    if (payload.images !== undefined || payload.coverImage !== undefined) {
      const source = payload.images !== undefined ? payload.images : gallery.images.map((i) => i.toObject());
      const normalized = normalizeImages(source, payload.coverImage !== undefined ? payload.coverImage : gallery.coverImage);
      payload.images = normalized.images;
      payload.coverImage = normalized.coverImage;
    }
    const willBePublished = payload.isPublished !== undefined ? payload.isPublished : gallery.isPublished;
    const finalImageCount = payload.images !== undefined ? payload.images.length : gallery.images.length;
    if (willBePublished && finalImageCount === 0) {
      return handleResponse(res, 400, "A published gallery must have at least one image");
    }

    gallery.set({ ...payload, updatedBy: req.user?.id || null });
    await gallery.save();

    const currentUrls = new Set(gallery.images.map((i) => i.url).concat(gallery.coverImage || []));
    const removed = previousUrls.filter((u) => !currentUrls.has(u));
    if (removed.length) await cleanupUnreferencedImages(removed);

    const populated = await Gallery.findById(gallery._id).populate("category", "name slug isActive").lean();
    populated.images = [...(populated.images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return handleResponse(res, 200, "Gallery updated successfully", populated);
  } catch (error) {
    if (error?.code === 11000) return handleResponse(res, 409, "A gallery with this slug already exists");
    return fail(res, error, "Failed to update gallery");
  }
};

export const updateGalleryStatusAdmin = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return handleResponse(res, 400, "Invalid gallery id");
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return handleResponse(res, 404, "Gallery not found");
    if (req.body.isPublished === true && gallery.images.length === 0) {
      return handleResponse(res, 400, "Add at least one image before publishing");
    }
    gallery.set({ ...req.body, updatedBy: req.user?.id || null });
    await gallery.save();
    return handleResponse(res, 200, "Gallery status updated", {
      _id: gallery._id,
      isPublished: gallery.isPublished,
      isFeatured: gallery.isFeatured,
      showOnHomepage: gallery.showOnHomepage,
    });
  } catch (error) {
    return fail(res, error, "Failed to update gallery status");
  }
};

export const reorderGalleriesAdmin = async (req, res) => {
  try {
    const ops = req.body.items.map(({ id, displayOrder }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { displayOrder, updatedBy: req.user?.id || null } } },
    }));
    const result = await Gallery.bulkWrite(ops, { ordered: false });
    return handleResponse(res, 200, "Gallery order updated", { modified: result.modifiedCount });
  } catch (error) {
    return fail(res, error, "Failed to reorder galleries");
  }
};

export const deleteGalleryAdmin = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return handleResponse(res, 400, "Invalid gallery id");
    const gallery = await Gallery.findByIdAndDelete(req.params.id).lean();
    if (!gallery) return handleResponse(res, 404, "Gallery not found");
    const urls = (gallery.images || []).map((i) => i.url).concat(gallery.coverImage || []);
    // Only files referenced by no other gallery/category are removed.
    const filesRemoved = await cleanupUnreferencedImages(urls);
    return handleResponse(res, 200, "Gallery deleted successfully", { _id: gallery._id, filesRemoved });
  } catch (error) {
    return fail(res, error, "Failed to delete gallery");
  }
};

/** Multi-image upload through the existing media storage (local disk or Cloudinary). */
export const uploadGalleryImagesAdmin = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return handleResponse(res, 400, "Select at least one image to upload");
    const uploaded = [];
    for (const file of files) {
      const detected = detectImageType(file.buffer);
      if (!detected || !ALLOWED_GALLERY_IMAGE_EXT.has(detected.ext)) {
        return handleResponse(res, 400, `"${file.originalname}" is not a valid JPEG, PNG or WebP image`, { uploaded });
      }
      const url = await uploadToCloudinary(file.buffer, "gallery", { mimeType: detected.mime, resourceType: "image" });
      uploaded.push({ url, originalName: file.originalname, size: file.size });
    }
    return handleResponse(res, 200, "Images uploaded successfully", { images: uploaded });
  } catch (error) {
    return fail(res, error, "Failed to upload gallery images");
  }
};

/* =====================================================================
   ADMIN — categories
===================================================================== */

export const listCategoriesAdmin = async (_req, res) => {
  try {
    await ensureGalleryBootstrap();
    const [categories, counts] = await Promise.all([
      GalleryCategory.find({}).sort({ displayOrder: 1, name: 1 }).lean(),
      Gallery.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    return handleResponse(
      res,
      200,
      "Gallery categories fetched",
      categories.map((c) => ({ ...c, galleryCount: countMap.get(String(c._id)) || 0 })),
    );
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery categories");
  }
};

export const createCategoryAdmin = async (req, res) => {
  try {
    await ensureGalleryBootstrap();
    const payload = { ...req.body };
    const duplicate = await GalleryCategory.exists({ name: new RegExp(`^${escapeRegex(payload.name)}$`, "i") });
    if (duplicate) return handleResponse(res, 409, "A category with this name already exists");
    payload.slug = await buildUniqueSlug(GalleryCategory, payload.slug || payload.name);
    if (payload.displayOrder === undefined) payload.displayOrder = await nextDisplayOrder(GalleryCategory);
    const category = await GalleryCategory.create(payload);
    return handleResponse(res, 201, "Category created successfully", { ...category.toObject(), galleryCount: 0 });
  } catch (error) {
    if (error?.code === 11000) return handleResponse(res, 409, "A category with this slug already exists");
    return fail(res, error, "Failed to create category");
  }
};

export const updateCategoryAdmin = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return handleResponse(res, 400, "Invalid category id");
    const category = await GalleryCategory.findById(req.params.id);
    if (!category) return handleResponse(res, 404, "Category not found");
    const payload = { ...req.body };
    if (payload.name && payload.name.toLowerCase() !== category.name.toLowerCase()) {
      const duplicate = await GalleryCategory.exists({
        _id: { $ne: category._id },
        name: new RegExp(`^${escapeRegex(payload.name)}$`, "i"),
      });
      if (duplicate) return handleResponse(res, 409, "A category with this name already exists");
    }
    if (payload.slug !== undefined) {
      payload.slug = await buildUniqueSlug(GalleryCategory, payload.slug || payload.name || category.name, category._id);
    }
    const previousImage = category.image;
    category.set(payload);
    await category.save();
    if (previousImage && previousImage !== category.image) await cleanupUnreferencedImages([previousImage]);
    return handleResponse(res, 200, "Category updated successfully", category);
  } catch (error) {
    if (error?.code === 11000) return handleResponse(res, 409, "A category with this slug already exists");
    return fail(res, error, "Failed to update category");
  }
};

/**
 * Safe delete: a category that still owns galleries is never removed silently.
 * Caller must pass ?reassignTo=<categoryId>; galleries move there first.
 */
export const deleteCategoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return handleResponse(res, 400, "Invalid category id");
    const category = await GalleryCategory.findById(id);
    if (!category) return handleResponse(res, 404, "Category not found");

    const galleryCount = await Gallery.countDocuments({ category: id });
    let reassigned = 0;
    if (galleryCount > 0) {
      const reassignTo = String(req.query.reassignTo || "");
      if (!reassignTo) {
        return handleResponse(
          res,
          409,
          `This category has ${galleryCount} galleries. Choose another category to move them to before deleting.`,
          { galleryCount, requiresReassignment: true },
        );
      }
      if (!isObjectId(reassignTo) || reassignTo === id) return handleResponse(res, 400, "Invalid target category");
      if (!(await GalleryCategory.exists({ _id: reassignTo }))) {
        return handleResponse(res, 400, "Target category does not exist");
      }
      const result = await Gallery.updateMany(
        { category: id },
        { $set: { category: reassignTo, updatedBy: req.user?.id || null } },
      );
      reassigned = result.modifiedCount;
    }
    await category.deleteOne();
    if (category.image) await cleanupUnreferencedImages([category.image]);
    return handleResponse(res, 200, "Category deleted successfully", { _id: id, reassigned });
  } catch (error) {
    return fail(res, error, "Failed to delete category");
  }
};

export const reorderCategoriesAdmin = async (req, res) => {
  try {
    const ops = req.body.items.map(({ id, displayOrder }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { displayOrder } } },
    }));
    const result = await GalleryCategory.bulkWrite(ops, { ordered: false });
    return handleResponse(res, 200, "Category order updated", { modified: result.modifiedCount });
  } catch (error) {
    return fail(res, error, "Failed to reorder categories");
  }
};

/* =====================================================================
   ADMIN — display settings
===================================================================== */

export const getGallerySettingsAdmin = async (_req, res) => {
  try {
    const settings = await getGallerySettings();
    return handleResponse(res, 200, "Gallery settings fetched", settings);
  } catch (error) {
    return fail(res, error, "Failed to fetch gallery settings");
  }
};

export const updateGallerySettingsAdmin = async (req, res) => {
  try {
    await getGallerySettings();
    const settings = await GallerySetting.findOneAndUpdate(
      { key: "default" },
      { $set: { ...req.body, updatedBy: req.user?.id || null } },
      { new: true, runValidators: true },
    ).lean();
    return handleResponse(res, 200, "Gallery settings updated", settings);
  } catch (error) {
    return fail(res, error, "Failed to update gallery settings");
  }
};
