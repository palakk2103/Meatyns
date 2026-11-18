import Joi from "joi";

const str = (max) => Joi.string().trim().allow("").max(max);
const objectId = Joi.string().trim().hex().length(24);
const slug = Joi.string().trim().lowercase().max(170).pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).messages({
  "string.pattern.base": "Slug may contain only lowercase letters, numbers and single hyphens",
});
// Only URLs we can serve: absolute http(s) or our own /uploads path.
const imageUrl = Joi.string().trim().max(1000).pattern(/^(https?:\/\/|\/uploads\/)/).messages({
  "string.pattern.base": "Image URL must be an http(s) URL or an /uploads path",
});

const imageItem = Joi.object({
  _id: Joi.string().trim().allow("").optional(),
  url: imageUrl.required(),
  caption: str(200).default(""),
  altText: str(200).default(""),
  order: Joi.number().integer().min(0).optional(),
});

const galleryFields = {
  title: Joi.string().trim().min(2).max(150),
  slug: slug.allow(""),
  category: objectId,
  franchiseName: str(120),
  location: str(160),
  city: str(80),
  state: str(80),
  eventDate: Joi.alternatives().try(Joi.date().iso(), Joi.valid(null, "")),
  shortDescription: str(300),
  description: str(5000),
  images: Joi.array().items(imageItem).max(100),
  coverImage: imageUrl.allow(""),
  isFeatured: Joi.boolean(),
  showOnHomepage: Joi.boolean(),
  isPublished: Joi.boolean(),
  displayOrder: Joi.number().integer().min(0).max(100000),
};

export const createGallerySchema = Joi.object({
  ...galleryFields,
  title: galleryFields.title.required(),
  category: galleryFields.category.required(),
});

export const updateGallerySchema = Joi.object(galleryFields).min(1);

export const galleryStatusSchema = Joi.object({
  isPublished: Joi.boolean(),
  isFeatured: Joi.boolean(),
  showOnHomepage: Joi.boolean(),
}).min(1);

export const reorderSchema = Joi.object({
  items: Joi.array()
    .items(Joi.object({ id: objectId.required(), displayOrder: Joi.number().integer().min(0).max(100000).required() }))
    .min(1)
    .max(500)
    .required(),
});

const categoryFields = {
  name: Joi.string().trim().min(2).max(80),
  slug: slug.max(100).allow(""),
  description: str(500),
  image: imageUrl.allow(""),
  isActive: Joi.boolean(),
  displayOrder: Joi.number().integer().min(0).max(100000),
};

export const createCategorySchema = Joi.object({ ...categoryFields, name: categoryFields.name.required() });
export const updateCategorySchema = Joi.object(categoryFields).min(1);

export const gallerySettingsSchema = Joi.object({
  homepageGalleryEnabled: Joi.boolean(),
  profileGalleryEnabled: Joi.boolean(),
  homepageItemLimit: Joi.number().integer().min(1).max(12),
  homepageTitle: Joi.string().trim().min(2).max(80),
  homepageSubtitle: str(200),
  pageTitle: Joi.string().trim().min(2).max(80),
  pageDescription: str(300),
}).min(1);
