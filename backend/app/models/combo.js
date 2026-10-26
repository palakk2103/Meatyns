import mongoose from "mongoose";

const comboItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
      default: 1,
    },
    unit: {
      type: String,
      default: "pack",
    },
  },
  { _id: false }
);

const comboSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      default: null,
      index: true,
    },
    items: {
      type: [comboItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2;
        },
        message: "A combo package must contain at least 2 distinct items.",
      },
    },
    comboPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tag: {
      type: String,
      default: "Meal Prep Saver",
      trim: true,
    },
  },
  { timestamps: true }
);

comboSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });

export default mongoose.model("Combo", comboSchema);
