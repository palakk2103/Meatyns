import mongoose from "mongoose";
import Gallery from "../models/gallery.js";
import GalleryCategory from "../models/galleryCategory.js";
import GallerySetting from "../models/gallerySetting.js";
import { slugify } from "../utils/slugify.js";
import { deleteLocalImageByUrl } from "./localImageStorage.js";
import logger from "./logger.js";

export const DEFAULT_GALLERY_CATEGORIES = [
  { name: "Openings & Inaugurations", description: "Store openings and inauguration ceremonies." },
  { name: "Our Franchises", description: "Franchise launches across cities." },
  { name: "Distinguished Visitors", description: "Visits by officers and distinguished guests." },
  { name: "Events & Programs", description: "Programs and events conducted by Meatyns." },
  { name: "Achievements & Milestones", description: "Company achievements and milestones." },
  { name: "Memorable Moments", description: "Celebrations and remarkable moments." },
];

const SETTINGS_KEY = "default";
const PUBLIC_SETTINGS_FIELDS = [
  "homepageGalleryEnabled",
  "profileGalleryEnabled",
  "homepageItemLimit",
  "homepageTitle",
  "homepageSubtitle",
  "pageTitle",
  "pageDescription",
];

export function httpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

export const isObjectId = (value) =>
  typeof value === "string" && /^[a-f0-9]{24}$/i.test(value) && mongoose.isValidObjectId(value);

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * First-run bootstrap: creates the settings singleton and, only at that moment,
 * seeds the default categories. Runs once per process; afterwards admins own the data
 * (deleting every category will NOT resurrect the defaults).
 */
let bootstrapPromise = null;
export function ensureGalleryBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const existing = await GallerySetting.findOne({ key: SETTINGS_KEY }).lean();
      if (existing) return existing;
      let created;
      try {
        created = await GallerySetting.create({ key: SETTINGS_KEY });
      } catch (err) {
        if (err?.code === 11000) return GallerySetting.findOne({ key: SETTINGS_KEY }).lean();
        throw err;
      }
      if ((await GalleryCategory.estimatedDocumentCount()) === 0) {
        await GalleryCategory.insertMany(
          DEFAULT_GALLERY_CATEGORIES.map((c, idx) => ({
            ...c,
            slug: slugify(c.name.replace(/&/g, "and")),
            displayOrder: idx + 1,
          })),
          { ordered: false },
        ).catch((err) => logger.warn("Gallery category seed partially failed", { message: err.message }));
      }
      return created.toObject();
    })().catch((err) => {
      bootstrapPromise = null; // allow retry on transient DB failure
      throw err;
    });
  }
  return bootstrapPromise;
}

export async function getGallerySettings() {
  await ensureGalleryBootstrap();
  const doc = await GallerySetting.findOne({ key: SETTINGS_KEY }).lean();
  return doc || (await GallerySetting.create({ key: SETTINGS_KEY })).toObject();
}

export function toPublicSettings(settings) {
  return PUBLIC_SETTINGS_FIELDS.reduce((acc, key) => {
    acc[key] = settings?.[key];
    return acc;
  }, {});
}

/** Builds a slug unique within `Model`, appending -2, -3 ... on collision. */
export async function buildUniqueSlug(Model, base, excludeId = null) {
  const root = slugify(String(base || "").replace(/&/g, "and")).replace(/_/g, "-").replace(/^-+|-+$/g, "") || "item";
  let candidate = root.slice(0, 150);
  for (let i = 2; i < 500; i += 1) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    if (!(await Model.exists(query))) return candidate;
    candidate = `${root.slice(0, 145)}-${i}`;
  }
  return `${root.slice(0, 140)}-${Date.now()}`;
}

/** Normalises the image array order and guarantees the cover belongs to it. */
export function normalizeImages(images = [], coverImage = "") {
  const seen = new Set();
  const clean = [];
  for (const img of images) {
    if (!img?.url || seen.has(img.url)) continue;
    seen.add(img.url);
    const item = {
      url: img.url,
      caption: img.caption || "",
      altText: img.altText || "",
      order: clean.length,
    };
    if (img._id && isObjectId(String(img._id))) item._id = img._id;
    clean.push(item);
  }
  const cover = coverImage && seen.has(coverImage) ? coverImage : clean[0]?.url || "";
  return { images: clean, coverImage: cover };
}

export async function getActiveCategoryIds() {
  const rows = await GalleryCategory.find({ isActive: true }).select("_id").lean();
  return rows.map((r) => r._id);
}

const GALLERY_MEDIA_MARKER = "/uploads/gallery/";

/**
 * Deletes locally stored gallery images that are no longer referenced by ANY gallery
 * or gallery category. Files outside /uploads/gallery/ (product images, Cloudinary, ...)
 * are never touched, so shared media cannot be removed by gallery operations.
 */
export async function cleanupUnreferencedImages(urls = []) {
  const unique = [...new Set(urls.filter((u) => typeof u === "string" && u.includes(GALLERY_MEDIA_MARKER)))];
  let deleted = 0;
  for (const url of unique) {
    try {
      const [inGallery, inCategory] = await Promise.all([
        Gallery.exists({ $or: [{ "images.url": url }, { coverImage: url }] }),
        GalleryCategory.exists({ image: url }),
      ]);
      if (inGallery || inCategory) continue;
      if (await deleteLocalImageByUrl(url)) deleted += 1;
    } catch (err) {
      logger.warn("Gallery image cleanup failed", { url, message: err.message });
    }
  }
  return deleted;
}

const CARD_PROJECTION =
  "title slug category franchiseName location city state eventDate shortDescription coverImage images.url isFeatured displayOrder createdAt";

/** Card-sized payload: no full image list, just the count. */
export function toCard(doc) {
  if (!doc) return doc;
  const images = Array.isArray(doc.images) ? doc.images : [];
  const { images: _omit, ...rest } = doc;
  return {
    ...rest,
    coverImage: doc.coverImage || images[0]?.url || "",
    imageCount: images.length,
  };
}

export async function listPublishedGalleries({ categorySlug, page = 1, limit = 12 }) {
  const activeIds = await getActiveCategoryIds();
  const filter = { isPublished: true, "images.0": { $exists: true }, category: { $in: activeIds } };
  if (categorySlug && categorySlug !== "all") {
    const cat = await GalleryCategory.findOne({ slug: String(categorySlug).toLowerCase(), isActive: true })
      .select("_id")
      .lean();
    if (!cat) return { items: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } };
    filter.category = cat._id;
  }
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    Gallery.find(filter)
      .select(CARD_PROJECTION)
      .populate("category", "name slug")
      .sort({ displayOrder: 1, eventDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Gallery.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map(toCard),
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

export async function getHomepageGalleries() {
  const settings = await getGallerySettings();
  const publicSettings = toPublicSettings(settings);
  if (!settings.homepageGalleryEnabled) return { settings: publicSettings, items: [] };
  const activeIds = await getActiveCategoryIds();
  const rows = await Gallery.find({
    isPublished: true,
    showOnHomepage: true,
    "images.0": { $exists: true },
    category: { $in: activeIds },
  })
    .select(CARD_PROJECTION)
    .populate("category", "name slug")
    .sort({ isFeatured: -1, displayOrder: 1, eventDate: -1, createdAt: -1 })
    .limit(settings.homepageItemLimit || 4)
    .lean();
  return { settings: publicSettings, items: rows.map(toCard) };
}

export async function getPublishedGallery(slugOrId) {
  const key = String(slugOrId || "").trim();
  if (!key) return null;
  const match = isObjectId(key) ? { $or: [{ _id: key }, { slug: key.toLowerCase() }] } : { slug: key.toLowerCase() };
  const doc = await Gallery.findOne({ ...match, isPublished: true })
    .select("-createdBy -updatedBy -showOnHomepage -isPublished")
    .populate("category", "name slug isActive")
    .lean();
  if (!doc || !doc.category?.isActive) return null;
  const images = [...(doc.images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { ...doc, images, coverImage: doc.coverImage || images[0]?.url || "", imageCount: images.length };
}
