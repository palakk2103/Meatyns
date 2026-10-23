import mongoose from "mongoose";

const flashDealProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    flashPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    dealStock: {
      type: Number,
      default: 50,
      min: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const flashDealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Deal title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    products: {
      type: [flashDealProductSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one product is required for a flash deal",
      },
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "expired"],
      default: "active",
    },
    maxQtyPerCustomer: {
      type: Number,
      default: 2,
      min: 1,
    },
    totalDealCap: {
      type: Number,
      min: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

flashDealSchema.pre("validate", function (next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "End time must be strictly after start time");
  }
  next();
});

flashDealSchema.index({ status: 1, startTime: 1, endTime: 1 });
flashDealSchema.index({ "products.productId": 1 });

const FlashDeal = mongoose.model("FlashDeal", flashDealSchema);
export default FlashDeal;
