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
    // Distance-based Express delivery charges for this zone.
    // When set, the slab fee replaces the global (normal fee + express surcharge) for EXPRESS orders.
    // Example (Kolhapur): [{0,1,30}, {1,3,45}, {3,5,70}]
    expressDistanceSlabs: {
      type: [
        {
          _id: false,
          fromKm: { type: Number, required: true, min: 0 },
          toKm: { type: Number, required: true, min: 0 },
          fee: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
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
