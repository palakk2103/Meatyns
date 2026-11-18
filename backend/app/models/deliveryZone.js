import mongoose from "mongoose";

const deliveryZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    polygon: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
        required: true,
      },
      // GeoJSON Polygon coordinates: array of linear rings [[ [lng, lat], ... ]]
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    deliveryFee: {
      type: Number,
      default: null, // null = fallback to platform default
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: null, // null = fallback to platform default
      min: 0,
    },
    expressAvailable: {
      type: Boolean,
      default: true,
    },
    surcharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

deliveryZoneSchema.index({ polygon: "2dsphere" });
deliveryZoneSchema.index({ isActive: 1, isDeleted: 1, priority: -1 });

export default mongoose.model("DeliveryZone", deliveryZoneSchema);
