import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refereeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // A user can only be referred once
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "qualified", "rewarded", "cancelled"],
      default: "pending",
      index: true,
    },
    qualifyingOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    referrerRewardAmount: {
      type: Number,
      default: 100,
      min: 0,
    },
    refereeRewardAmount: {
      type: Number,
      default: 50,
      min: 0,
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1, status: 1 });

export default mongoose.model("Referral", referralSchema);
