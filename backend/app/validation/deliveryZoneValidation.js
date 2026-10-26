import Joi from "joi";

export const createDeliveryZoneSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Zone name is required",
    "string.min": "Zone name must be at least 2 characters",
  }),
  description: Joi.string().trim().max(500).allow("").default(""),
  polygon: Joi.object({
    type: Joi.string().valid("Polygon").default("Polygon"),
    coordinates: Joi.array().items(Joi.any()).required(),
  }).optional(),
  coordinates: Joi.array().items(Joi.any()).optional(),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().integer().min(-1000).max(100000).default(0),
  deliveryFee: Joi.number().min(0).allow(null).optional(),
  minOrderValue: Joi.number().min(0).allow(null).optional(),
  expressAvailable: Joi.boolean().default(true),
  surcharge: Joi.number().min(0).default(0),
}).or("polygon", "coordinates").messages({
  "object.missing": "Either polygon or coordinates must be provided.",
});

export const updateDeliveryZoneSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(500).allow("").optional(),
  polygon: Joi.object({
    type: Joi.string().valid("Polygon").default("Polygon"),
    coordinates: Joi.array().items(Joi.any()).required(),
  }).optional(),
  coordinates: Joi.array().items(Joi.any()).optional(),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(-1000).max(100000).optional(),
  deliveryFee: Joi.number().min(0).allow(null).optional(),
  minOrderValue: Joi.number().min(0).allow(null).optional(),
  expressAvailable: Joi.boolean().optional(),
  surcharge: Joi.number().min(0).optional(),
});

export const checkDeliveryZoneSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});
