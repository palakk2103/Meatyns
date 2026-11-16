import mongoose from "mongoose";

/**
 * Server-side record of a customer's persistent login (refresh session).
 * Only a SHA-256 hash of the opaque refresh token is stored; the raw token
 * lives solely in an HttpOnly cookie on the customer's browser.
 */
const customerSessionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: Date.now },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: true },
);

// Auto-purge expired sessions.
customerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.CustomerSession ||
  mongoose.model("CustomerSession", customerSessionSchema);
