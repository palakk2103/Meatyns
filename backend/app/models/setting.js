import mongoose from "mongoose";
import {
    ALL_DELIVERY_PRICING_MODES,
    ALL_HANDLING_FEE_STRATEGIES,
} from "../constants/finance.js";

const settingSchema = new mongoose.Schema(
    {
        // General
        appName: {
            type: String,
            default: "Meatyns",
        },
        supportEmail: {
            type: String,
            default: "support@meatyns.com",
        },
        supportPhone: {
            type: String,
            default: "02269621920",
        },
        currencySymbol: {
            type: String,
            default: "₹",
        },
        currencyCode: {
            type: String,
            default: "INR",
        },
        timezone: {
            type: String,
            default: "Asia/Kolkata",
        },

        // Branding
        logoUrl: String,
        faviconUrl: String,
        primaryColor: {
            type: String,
            default: "#0ea5e9",
        },
        secondaryColor: {
            type: String,
            default: "#64748b",
        },

        // Legal
        companyName: String,
        taxId: String,
        address: {
            type: String,
            default: "Ramkrishna Nagar patna 800020",
        },

        // Social
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String,
        youtube: String,

        // Apps
        playStoreLink: String,
        appStoreLink: String,

        // SEO
        metaTitle: String,
        metaDescription: String,
        metaKeywords: String,
        keywords: [{ type: String }], // Array for structured SEO keywords

        // Optional: multi-tenant (null = default tenant)
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },

        // Returns / logistics configuration
        returnDeliveryCommission: {
            // Flat amount per return pickup, paid by seller
            type: Number,
            default: 0,
        },

        // Seller acceptance workflow configuration (P4 / seller timeout)
        sellerAcceptanceTimeoutMs: {
            type: Number,
            default: 60000,
            min: 10000,
            max: 1800000,
        },

        /**
         * Finance / delivery pricing rules (single source of truth).
         * Existing keys are kept for backward compatibility.
         */
        deliveryPricingMode: {
            type: String,
            enum: ALL_DELIVERY_PRICING_MODES,
            default: "distance_based",
        },
        pricingMode: {
            type: String,
            enum: ALL_DELIVERY_PRICING_MODES,
            default: "distance_based",
        },
        customerBaseDeliveryFee: {
            type: Number,
            default: 30,
            min: 0,
        },
        riderBasePayout: {
            type: Number,
            default: 30,
            min: 0,
        },
        baseDeliveryCharge: {
            type: Number,
            default: 30,
            min: 0,
        },
        baseDistanceCapacityKm: {
            type: Number,
            default: 0.5,
            min: 0,
        },
        incrementalKmSurcharge: {
            type: Number,
            default: 10,
            min: 0,
        },
        deliveryPartnerRatePerKm: {
            type: Number,
            default: 5,
            min: 0,
        },
        fleetCommissionRatePerKm: {
            type: Number,
            default: 5,
            min: 0,
        },
        fixedDeliveryFee: {
            type: Number,
            default: 30,
            min: 0,
        },
        freeDeliveryThreshold: {
            type: Number,
            default: 499,
            min: 0,
        },
        minimumOrderValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        handlingFeeStrategy: {
            type: String,
            enum: ALL_HANDLING_FEE_STRATEGIES,
            default: "highest_category_fee",
        },
        codEnabled: {
            type: Boolean,
            default: true,
        },
        onlineEnabled: {
            type: Boolean,
            default: true,
        },
        lowStockAlertsEnabled: {
            type: Boolean,
            default: true,
        },
        deliveryConfig: {
            express: {
                enabled: { type: Boolean, default: true },
                surcharge: { type: Number, default: 40, min: 0 },
                estimatedMinMinutes: { type: Number, default: 15, min: 0 },
                estimatedMaxMinutes: { type: Number, default: 30, min: 0 },
                operatingHoursOnly: { type: Boolean, default: true },
            },
            normal: {
                enabled: { type: Boolean, default: true },
                deliveryFee: { type: Number, default: null, min: 0 },
                estimatedLabel: { type: String, default: "1–2 hours" },
                minMinutes: { type: Number, default: 60, min: 0 },
                maxMinutes: { type: Number, default: 120, min: 0 },
            },
            advance: {
                enabled: { type: Boolean, default: true },
                deliveryFee: { type: Number, default: null, min: 0 },
                maxAdvanceDays: { type: Number, default: 7, min: 1, max: 30 },
                slotDurationMinutes: { type: Number, default: 60, min: 15, max: 240 },
                maxOrdersPerSlot: { type: Number, default: 10, min: 1 },
                minAdvanceMinutes: { type: Number, default: 60, min: 0 },
                openTime: { type: String, default: "09:00" },
                closeTime: { type: String, default: "21:00" },
                operatingDays: {
                    type: [String],
                    default: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                },
            },
            slotOverrides: [
                {
                    slotId: { type: String },
                    date: { type: String },
                    startTime: { type: String },
                    endTime: { type: String },
                    enabled: { type: Boolean, default: true },
                    capacity: { type: Number, default: 10 },
                },
            ],
        },
        productApproval: {
            sellerCreateRequiresApproval: {
                type: Boolean,
                default: false,
            },
            sellerEditRequiresApproval: {
                type: Boolean,
                default: false,
            },
        },
        abandonedCartIntervalMinutes: {
            type: Number,
            default: 60,
            min: 5,
        },
        abandonedCartMaxReminders: {
            type: Number,
            default: 2,
            min: 1,
            max: 5,
        },
        abandonedCartEnabled: {
            type: Boolean,
            default: true,
        },
        // Phase 5: Loyalty and Rewards Configuration
        loyalty: {
            enabled: {
                type: Boolean,
                default: true,
            },
            pointsPer100Rupees: {
                type: Number,
                default: 5, // 5% reward / 5 coins per ₹100
                min: 0,
            },
            maxRedemptionPercentage: {
                type: Number,
                default: 20, // Max 20% order total payable via coins/wallet
                min: 1,
                max: 100,
            },
            minOrderAmountToEarn: {
                type: Number,
                default: 199,
                min: 0,
            },
        },
        // Phase 5: Referral Program Configuration
        referral: {
            enabled: {
                type: Boolean,
                default: true,
            },
            referrerRewardAmount: {
                type: Number,
                default: 100, // ₹100 wallet credit to referrer
                min: 0,
            },
            refereeRewardAmount: {
                type: Number,
                default: 50, // ₹50 wallet credit to referee
                min: 0,
            },
            minOrderAmountToQualify: {
                type: Number,
                default: 299, // Minimum delivered order amount for qualifying referral
                min: 0,
            },
        },
    },
    {
        timestamps: true,
    }
);

settingSchema.pre("save", function syncFinanceAliases(next) {
    if (!this.pricingMode && this.deliveryPricingMode) {
        this.pricingMode = this.deliveryPricingMode;
    }
    if (!this.deliveryPricingMode && this.pricingMode) {
        this.deliveryPricingMode = this.pricingMode;
    }

    if (this.baseDeliveryCharge == null) {
        this.baseDeliveryCharge = this.customerBaseDeliveryFee ?? 30;
    }
    if (this.customerBaseDeliveryFee == null) {
        this.customerBaseDeliveryFee = this.baseDeliveryCharge ?? 30;
    }

    if (this.riderBasePayout == null) {
        this.riderBasePayout = this.baseDeliveryCharge ?? this.customerBaseDeliveryFee ?? 30;
    }

    if (this.fleetCommissionRatePerKm == null && this.deliveryPartnerRatePerKm != null) {
        this.fleetCommissionRatePerKm = this.deliveryPartnerRatePerKm;
    }
    if (this.deliveryPartnerRatePerKm == null && this.fleetCommissionRatePerKm != null) {
        this.deliveryPartnerRatePerKm = this.fleetCommissionRatePerKm;
    }

    if (this.fixedDeliveryFee == null) {
        this.fixedDeliveryFee = this.baseDeliveryCharge ?? this.customerBaseDeliveryFee ?? 30;
    }

    next();
});

export default mongoose.model("Setting", settingSchema);
