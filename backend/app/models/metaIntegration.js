import mongoose from "mongoose";

const metaIntegrationSchema = new mongoose.Schema(
  {
    isConnected: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Stored securely on the server; select: false so it is never returned by default queries
    accessToken: {
      type: String,
      default: null,
      select: false,
    },
    tokenType: {
      type: String,
      default: "bearer",
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    connectedUser: {
      id: { type: String, default: null },
      name: { type: String, default: null },
      email: { type: String, default: null },
    },
    adAccounts: [
      {
        id: String, // e.g., "act_123456789"
        name: String,
        accountId: String,
        currency: { type: String, default: "INR" },
        timezone: { type: String, default: "Asia/Kolkata" },
        accountStatus: Number,
      },
    ],
    selectedAdAccount: {
      id: { type: String, default: null },
      name: { type: String, default: null },
      accountId: { type: String, default: null },
      currency: { type: String, default: "INR" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    pixels: [
      {
        id: String,
        name: String,
      },
    ],
    selectedPixel: {
      id: { type: String, default: null },
      name: { type: String, default: null },
    },
    pixelEnabled: {
      type: Boolean,
      default: true,
    },
    capiEnabled: {
      type: Boolean,
      default: true,
    },
    testEventCode: {
      type: String,
      default: "",
      trim: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      message: { type: String, default: null },
      occurredAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to return safe DTO for frontend without secrets
metaIntegrationSchema.methods.toSafeDTO = function () {
  return {
    isConnected: Boolean(this.isConnected && (this.accessToken || process.env.META_CAPI_ACCESS_TOKEN)),
    connectedUser: this.connectedUser || null,
    tokenExpiresAt: this.tokenExpiresAt || null,
    adAccounts: this.adAccounts || [],
    selectedAdAccount: this.selectedAdAccount?.id ? this.selectedAdAccount : null,
    pixels: this.pixels || [],
    selectedPixel: this.selectedPixel?.id ? this.selectedPixel : null,
    pixelEnabled: Boolean(this.pixelEnabled),
    capiEnabled: Boolean(this.capiEnabled),
    testEventCode: this.testEventCode || "",
    lastSyncedAt: this.lastSyncedAt || null,
    lastError: this.lastError?.message ? this.lastError : null,
  };
};

export default mongoose.model("MetaIntegration", metaIntegrationSchema);
