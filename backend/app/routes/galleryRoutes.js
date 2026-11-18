import express from "express";
import multer from "multer";
import { verifyToken, requireAdminPermission } from "../middleware/authMiddleware.js";
import { ADMIN_PERMISSIONS } from "../constants/rbac.js";
import handleResponse from "../utils/helper.js";
import * as gallery from "../controller/galleryController.js";
import {
  createGallerySchema,
  updateGallerySchema,
  galleryStatusSchema,
  reorderSchema,
  createCategorySchema,
  updateCategorySchema,
  gallerySettingsSchema,
} from "../validation/galleryValidation.js";

/**
 * Body validator for gallery endpoints. Unlike the shared strict `validate()`
 * it lets Joi coerce/trim (dates arrive as ISO strings from the admin form).
 */
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
  if (error) return handleResponse(res, 400, error.details.map((d) => d.message).join("; "));
  req.body = value;
  return next();
};

const MAX_FILE_BYTES = parseInt(process.env.MEDIA_MAX_FILE_SIZE || "10485760", 10) || 10485760;
const MAX_FILES_PER_REQUEST = 10;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(String(file.mimetype || "").toLowerCase())) {
      const err = new Error(`"${file.originalname}" is not a JPEG, PNG or WebP image`);
      err.statusCode = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

const handleUpload = (req, res, next) =>
  upload.array("images", MAX_FILES_PER_REQUEST)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Each image must be smaller than ${Math.round(MAX_FILE_BYTES / 1048576)} MB`
          : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
            ? `Upload at most ${MAX_FILES_PER_REQUEST} images at a time`
            : err.message;
      return handleResponse(res, 400, message);
    }
    return handleResponse(res, err.statusCode || 400, err.message);
  });

/* ---------------- Public (customer) ---------------- */
export const galleryPublicRouter = express.Router();
galleryPublicRouter.get("/settings", gallery.getPublicGallerySettings);
galleryPublicRouter.get("/categories", gallery.getPublicGalleryCategories);
galleryPublicRouter.get("/home", gallery.getHomepageGalleryPreview);
galleryPublicRouter.get("/", gallery.getPublicGalleries);
galleryPublicRouter.get("/:slugOrId", gallery.getPublicGalleryDetail);

/* ---------------- Admin ---------------- */
export const galleryAdminRouter = express.Router();
const canView = requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_VIEW, ADMIN_PERMISSIONS.MARKETING_MANAGE);
const canManage = requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_MANAGE);

galleryAdminRouter.use(verifyToken);

galleryAdminRouter.get("/stats", canView, gallery.getGalleryStats);
galleryAdminRouter.get("/settings", canView, gallery.getGallerySettingsAdmin);
galleryAdminRouter.put("/settings", canManage, validateBody(gallerySettingsSchema), gallery.updateGallerySettingsAdmin);

galleryAdminRouter.get("/categories", canView, gallery.listCategoriesAdmin);
galleryAdminRouter.post("/categories", canManage, validateBody(createCategorySchema), gallery.createCategoryAdmin);
galleryAdminRouter.put("/categories/reorder", canManage, validateBody(reorderSchema), gallery.reorderCategoriesAdmin);
galleryAdminRouter.put("/categories/:id", canManage, validateBody(updateCategorySchema), gallery.updateCategoryAdmin);
galleryAdminRouter.delete("/categories/:id", canManage, gallery.deleteCategoryAdmin);

galleryAdminRouter.post("/upload", canManage, handleUpload, gallery.uploadGalleryImagesAdmin);
galleryAdminRouter.put("/reorder", canManage, validateBody(reorderSchema), gallery.reorderGalleriesAdmin);

galleryAdminRouter.get("/", canView, gallery.listGalleriesAdmin);
galleryAdminRouter.post("/", canManage, validateBody(createGallerySchema), gallery.createGalleryAdmin);
galleryAdminRouter.get("/:id", canView, gallery.getGalleryAdmin);
galleryAdminRouter.put("/:id", canManage, validateBody(updateGallerySchema), gallery.updateGalleryAdmin);
galleryAdminRouter.patch("/:id/status", canManage, validateBody(galleryStatusSchema), gallery.updateGalleryStatusAdmin);
galleryAdminRouter.delete("/:id", canManage, gallery.deleteGalleryAdmin);
