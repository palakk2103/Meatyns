import mongoose from "mongoose";
import bcrypt from "bcrypt";
import * as cache from "../services/cacheService.js";

const sellerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    profileImage: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },
    locality: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },

    documents: {
      tradeLicense: { type: String, trim: true },
      gstCertificate: { type: String, trim: true },
      idProof: { type: String, trim: true },
      businessRegistration: { type: String, trim: true },
      fssaiLicense: { type: String, trim: true },
      other: { type: String, trim: true },
    },

    // Payout destination for withdrawals. The account number is `select:false`
    // so it never leaks through populate()/find() on the seller document
    // (e.g. customer-facing seller lookups); read it explicitly with
    // `+bankDetails.accountNumber` where it is genuinely needed.
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true, select: false },
      ifsc: { type: String, trim: true, uppercase: true },
      bankName: { type: String, trim: true },
      updatedAt: { type: Date },
    },

    role: {
      type: String,
      default: "seller",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reviewedAt: {
      type: Date,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    isManualOverride: {
      type: Boolean,
      default: false,
    },
    // Admin-forced closure. Overrides seller toggle and store hours; only admin can reopen.
    adminClosed: {
      type: Boolean,
      default: false,
    },
    adminClosedReason: {
      type: String,
      trim: true,
      default: "",
    },
    adminClosedAt: {
      type: Date,
    },
    storeHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      schedule: [
        {
          day: {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            required: true,
          },
          openTime: {
            type: String,
            default: "09:00", // 24-hr format HH:mm
          },
          closeTime: {
            type: String,
            default: "21:00", // 24-hr format HH:mm
          },
          isOpen: {
            type: Boolean,
            default: true,
          },
        },
      ],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    serviceRadius: {
      type: Number,
      default: 5, // Default 5km
    },
    lastLogin: Date,
    loginOtp: { type: String, select: false },
    loginOtpExpiry: { type: Date, select: false },
  },
  { timestamps: true },
);

sellerSchema.index({ location: "2dsphere" });
sellerSchema.index({ isActive: 1, isVerified: 1 });

// Seller location / radius / active / approval changes alter which seller
// serves a customer, so cached selections must not outlive them.
const dropSelectedSellerCache = () => {
  Promise.resolve(cache.delPattern?.(cache.buildKey("sellers", "selected", "*"))).catch(() => {});
};
sellerSchema.post("save", dropSelectedSellerCache);
sellerSchema.post("findOneAndUpdate", dropSelectedSellerCache);
sellerSchema.post("updateOne", dropSelectedSellerCache);
sellerSchema.post("updateMany", dropSelectedSellerCache);

// Hash password before saving
sellerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
sellerSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Seller", sellerSchema);
