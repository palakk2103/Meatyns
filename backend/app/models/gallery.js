import mongoose from "mongoose";

const galleryImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    caption: { type: String, trim: true, default: "", maxlength: 200 },
    altText: { type: String, trim: true, default: "", maxlength: 200 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

/**
 * A gallery = one event/occasion (store opening, franchise launch, visit, ...)
 * with many photographs. Image binaries live in the existing media storage
 * (local disk or Cloudinary); only URLs are stored here.
 */
const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 170 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "GalleryCategory", required: true },
    franchiseName: { type: String, trim: true, default: "", maxlength: 120 },
    location: { type: String, trim: true, default: "", maxlength: 160 },
    city: { type: String, trim: true, default: "", maxlength: 80 },
    state: { type: String, trim: true, default: "", maxlength: 80 },
    eventDate: { type: Date, default: null },
    shortDescription: { type: String, trim: true, default: "", maxlength: 300 },
    description: { type: String, trim: true, default: "", maxlength: 5000 },
    images: { type: [galleryImageSchema], default: [] },
    coverImage: { type: String, trim: true, default: "" },
    isFeatured: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

// Public listing / homepage preview / category filter queries.
gallerySchema.index({ isPublished: 1, category: 1, displayOrder: 1, eventDate: -1 });
gallerySchema.index({ isPublished: 1, showOnHomepage: 1, isFeatured: -1, displayOrder: 1 });
gallerySchema.index({ "images.url": 1 });
gallerySchema.index({ title: "text", franchiseName: "text", city: "text", location: "text" });

export default mongoose.models.Gallery || mongoose.model("Gallery", gallerySchema);
