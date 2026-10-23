import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
        sku: {
            type: String,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        metaTitle: {
            type: String,
            trim: true,
            default: "",
        },
        metaDescription: {
            type: String,
            trim: true,
            default: "",
        },
        seoKeywords: [{
            type: String,
            trim: true,
        }],
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        salePrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
        },
        lowStockAlert: {
            type: Number,
            default: 5,
        },
        brand: {
            type: String,
            trim: true,
        },
        weight: {
            type: String,
            trim: true,
        },
        unit: {
            type: String,
            enum: ["g", "kg", "pc", "pack", "box"],
            default: "pack",
        },
        unitValue: {
            type: Number,
            default: 1,
            min: 0.01,
        },
        orderIncrement: {
            type: Number,
            default: 1,
            min: 0.01,
        },
        minOrderQty: {
            type: Number,
            default: 1,
            min: 0.01,
        },
        maxOrderQty: {
            type: Number,
            default: null,
        },
        isScheduled: {
            type: Boolean,
            default: false,
        },
        scheduleDays: [{
            type: String,
            enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        }],
        availableFromTime: {
            type: String,
            default: null,
        },
        availableToTime: {
            type: String,
            default: null,
        },
        scheduleStartDate: {
            type: Date,
            default: null,
        },
        scheduleEndDate: {
            type: Date,
            default: null,
        },
        cutType: {
            type: String,
            trim: true,
            default: null,
        },
        boneType: {
            type: String,
            enum: ["bone_in", "boneless", "not_applicable", null],
            default: null,
        },
        skinType: {
            type: String,
            enum: ["skin_on", "skinless", "not_applicable", null],
            default: null,
        },
        freshness: {
            type: String,
            enum: ["fresh", "chilled", "frozen", "not_applicable", null],
            default: null,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        mainImage: {
            type: String, // Cloudinary URL
        },
        galleryImages: [{
            type: String, // Array of Cloudinary URLs
        }],
        headerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        subcategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "approved",
        },
        approvalRequestedAt: {
            type: Date,
            default: null,
        },
        approvalReviewedAt: {
            type: Date,
            default: null,
        },
        approvalReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },
        approvalNote: {
            type: String,
            trim: true,
            default: "",
        },
        lastSubmittedByRole: {
            type: String,
            enum: ["seller", "admin"],
            default: null,
        },
        variants: [
            {
                name: String,
                price: Number,
                salePrice: Number,
                stock: Number,
                sku: String,
            }
        ],
        isFeatured: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

// Optimize performance for common queries on home/search pages
productSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ status: 1, createdAt: -1, _id: -1 });
productSchema.index({ approvalStatus: 1, status: 1, createdAt: -1 });
productSchema.index({ headerId: 1, status: 1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ subcategoryId: 1, status: 1 });
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ sellerId: 1, approvalStatus: 1, createdAt: -1 });
productSchema.index({ sellerId: 1, createdAt: -1, _id: -1 });
productSchema.index({ name: "text", tags: "text" }); // For better search if regex is too slow

export default mongoose.model("Product", productSchema);
