import mongoose from "mongoose";

/**
 * Admin-managed gallery categories (Openings, Franchises, Events, ...).
 * Customer UI renders whatever is active here — nothing is hardcoded client-side.
 */
const galleryCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 100 },
    description: { type: String, trim: true, default: "", maxlength: 500 },
    image: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

galleryCategorySchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.models.GalleryCategory ||
  mongoose.model("GalleryCategory", galleryCategorySchema);
