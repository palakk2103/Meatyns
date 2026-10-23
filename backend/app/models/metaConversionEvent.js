import mongoose from "mongoose";

const metaConversionEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    eventTime: {
      type: Number,
      required: true,
    },
    orderId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED", "DUPLICATE"],
      default: "PENDING",
      index: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    testEventCode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

metaConversionEventSchema.index({ createdAt: -1 });

export default mongoose.model("MetaConversionEvent", metaConversionEventSchema);
