import mongoose from "mongoose";

/**
 * Singleton document controlling where the gallery appears on the customer side.
 * Kept separate from the global `Setting` model so gallery toggles never touch
 * the platform/finance settings write path.
 */
const gallerySettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    homepageGalleryEnabled: { type: Boolean, default: true },
    profileGalleryEnabled: { type: Boolean, default: true },
    homepageItemLimit: { type: Number, default: 4, min: 1, max: 12 },
    homepageTitle: { type: String, trim: true, default: "Our Journey & Moments", maxlength: 80 },
    homepageSubtitle: {
      type: String,
      trim: true,
      default: "Celebrating our milestones, achievements and memorable moments.",
      maxlength: 200,
    },
    pageTitle: { type: String, trim: true, default: "Our Journey & Moments", maxlength: 80 },
    pageDescription: {
      type: String,
      trim: true,
      default:
        "Explore the journey, milestones, franchise openings, events and memorable moments of Meatyns.",
      maxlength: 300,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

export default mongoose.models.GallerySetting ||
  mongoose.model("GallerySetting", gallerySettingSchema);
