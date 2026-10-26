import mongoose from "mongoose";

const subscriptionItemSchema = new mongoose.Schema(
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
    unitValue: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Weekly Meat Basket",
    },
    items: {
      type: [subscriptionItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "Subscription must contain at least one product.",
      },
    },
    frequency: {
      type: String,
      enum: ["weekly", "bi-weekly", "monthly"],
      default: "weekly",
    },
    deliveryDayOfWeek: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: "Sunday",
    },
    deliveryTimeSlot: {
      type: String,
      default: "07:00 AM - 10:00 AM",
      trim: true,
    },
    deliveryAddress: {
      fullAddress: { type: String, required: true },
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      location: {
        lat: Number,
        lng: Number,
      },
    },
    paymentPreference: {
      type: String,
      enum: ["COD", "WALLET", "PAY_ON_DELIVERY"],
      default: "COD",
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled"],
      default: "active",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    nextOrderDate: {
      type: Date,
      required: true,
      index: true,
    },
    lastOrderDate: {
      type: Date,
      default: null,
    },
    lastGeneratedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    resumedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ customerId: 1, status: 1 });
subscriptionSchema.index({ status: 1, nextOrderDate: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
