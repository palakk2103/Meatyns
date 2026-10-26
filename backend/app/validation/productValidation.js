/**
 * Joi schemas for product CRUD and moderation endpoints.
 * Refactor P5.2. Opt-in adoption — see orderValidation.js header.
 */
import Joi from "joi";

const trimmedString = Joi.string().trim();
const objectIdLike = trimmedString.min(8).max(64);

export const createProductSchema = Joi.object({
  name: trimmedString.min(1).max(200).required(),
  slug: trimmedString.max(250).allow("", null).optional(),
  metaTitle: trimmedString.max(200).allow("", null).optional(),
  metaDescription: trimmedString.max(2000).allow("", null).optional(),
  seoKeywords: Joi.alternatives()
    .try(
      Joi.array().items(trimmedString.max(100)).max(50),
      trimmedString
    )
    .optional(),
  description: trimmedString.max(5000).optional(),
  price: Joi.number().min(0).required(),
  salePrice: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).required(),
  unit: trimmedString.valid("g", "kg", "pc", "pack", "box", "packet", "unit", "", null).optional(),
  unitValue: Joi.number().min(0.01).optional(),
  orderIncrement: Joi.number().min(0.01).optional(),
  minOrderQty: Joi.number().min(0.01).optional(),
  maxOrderQty: Joi.number().min(0.01).allow(null).optional(),
  isScheduled: Joi.boolean().optional(),
  scheduleDays: Joi.array().items(
    trimmedString.valid("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
  ).optional(),
  availableFromTime: trimmedString.pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow("", null).optional(),
  availableToTime: trimmedString.pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow("", null).optional(),
  scheduleStartDate: Joi.date().iso().allow("", null).optional(),
  scheduleEndDate: Joi.date().iso().allow("", null).optional(),
  category: objectIdLike.required(),
  subCategory: objectIdLike.optional(),
  mainImage: trimmedString.uri().optional(),
  images: Joi.array().items(trimmedString.uri()).max(10).optional(),
  isActive: Joi.boolean().optional(),
  variants: Joi.array()
    .items(
      Joi.object({
        slot: trimmedString.optional(),
        name: trimmedString.optional(),
        sku: trimmedString.optional(),
        price: Joi.number().min(0).required(),
        salePrice: Joi.number().min(0).optional(),
        stock: Joi.number().integer().min(0).required(),
        unit: trimmedString.optional(),
        tieredPricing: Joi.array()
          .items(
            Joi.object({
              minQty: Joi.number().min(0.01).required(),
              discountPercentage: Joi.number().min(0).max(100).optional(),
              fixedUnitPrice: Joi.number().min(0).optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  tieredPricing: Joi.array()
    .items(
      Joi.object({
        minQty: Joi.number().min(0.01).required(),
        discountPercentage: Joi.number().min(0).max(100).optional(),
        fixedUnitPrice: Joi.number().min(0).optional(),
      }),
    )
    .optional(),
  brand: trimmedString.max(100).optional(),
  cutType: trimmedString.max(100).allow("", null).optional(),
  boneType: trimmedString.valid("bone_in", "boneless", "not_applicable", "", null).optional(),
  skinType: trimmedString.valid("skin_on", "skinless", "not_applicable", "", null).optional(),
  freshness: trimmedString.valid("fresh", "chilled", "frozen", "not_applicable", "", null).optional(),
  tags: Joi.array().items(trimmedString.max(50)).max(20).optional(),
}).unknown(true); // images may arrive via multer in a different field

export const updateProductSchema = createProductSchema.fork(
  ["name", "price", "stock", "category"],
  (s) => s.optional(),
);

export const productModerationActionSchema = Joi.object({
  reason: trimmedString.max(1000).optional(),
  notes: trimmedString.max(1000).optional(),
});

export const updateStockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required(),
  variantSlot: trimmedString.optional(),
});
