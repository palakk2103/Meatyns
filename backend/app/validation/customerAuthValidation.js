import Joi from "joi";

export const sendSignupOtpSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().min(7).max(24).optional(),
}).or("email", "phone");

export const sendLoginOtpSchema = Joi.object({
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().min(7).max(24).optional(),
}).or("email", "phone");

export const verifyOtpSchema = Joi.object({
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().min(7).max(24).optional(),
  otp: Joi.string().trim().pattern(/^\d{4,8}$/).required(),
  deviceId: Joi.string().trim().max(100).optional(),
  fingerprint: Joi.object().optional(),
}).or("email", "phone");

export function validateSchema(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (!error) return value;
  const err = new Error(error.details.map((item) => item.message).join("; "));
  err.statusCode = 400;
  throw err;
}
