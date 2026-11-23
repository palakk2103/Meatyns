import mongoose from "mongoose";

/**
 * One row per seller + product + calendar day (IST, "YYYY-MM-DD").
 *
 * Holds the figures that are typed in by hand (carcasses received, offline
 * sales, wastage). Online sales are NOT stored here: they are always derived
 * from orders at read time so they can never drift out of sync.
 */
const qty = { type: Number, default: 0, min: 0 };

const dailyStockEntrySchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

    receivedPieces: qty, // number of animals / carcasses received
    receivedKg: qty,
    manualSoldPieces: qty, // counter / offline sales not placed through the app
    manualSoldKg: qty,
    wastagePieces: qty,
    wastageKg: qty,

    // Optional starting stock for the day. null = continue from the previous
    // day's closing stock; a number = (re)set the opening stock to that value
    // (used for the very first day and for corrections).
    startStockPieces: { type: Number, default: null, min: 0 },
    startStockKg: { type: Number, default: null, min: 0 },

    note: { type: String, trim: true, default: "", maxlength: 500 },
    updatedByRole: { type: String, enum: ["seller", "admin"], default: "seller" },
    updatedById: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

dailyStockEntrySchema.index({ seller: 1, product: 1, date: 1 }, { unique: true });
dailyStockEntrySchema.index({ date: 1, seller: 1 });

export default mongoose.model("DailyStockEntry", dailyStockEntrySchema);
