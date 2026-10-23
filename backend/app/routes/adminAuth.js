import express from "express";
import {
    bootstrapAdmin,
    signupAdmin,
    loginAdmin,
    sendAdminLoginOtp,
    verifyAdminLoginOtp,
} from "../controller/adminAuthController.js";
import {
    getAdminProfile,
    updateAdminProfile,
    updateAdminPassword,
    getAdminStats,
    getDeliveryPartners,
    approveDeliveryPartner,
    rejectDeliveryPartner,
    getActiveFleet,
    getAdminWalletData,
    getDeliveryTransactions,
    settleTransaction,
    bulkSettleDelivery,
    getActiveSellers,
    getPendingSellers,
    approveSellerApplication,
    rejectSellerApplication,
    getSellerWithdrawals,
    getDeliveryWithdrawals,
    updateWithdrawalStatus,
    getSellerTransactions,
    getDeliveryCashBalances,
    getRiderCashDetails,
    settleRiderCash,
    getCashSettlementHistory,
    getUsers,
    getUserById,
    getCustomerNotes,
    addCustomerNote,
    getSellers,
    getSellerLocations,
    getPlatformSettings,
    updatePlatformSettings,
    getUserWalletDetails,
    getUserWalletHistoryController,
    addCoinsController,
    removeCoinsController,
    getStaffList,
    createStaffMember,
    updateStaffRole,
    toggleStaffStatus,
} from "../controller/adminController.js";
import {
    exportAdminFinanceStatementController,
    getAdminFinanceLedgerController,
    getAdminFinancePayoutsController,
    getAdminFinanceSummaryController,
    getDeliverySettingsController,
    processAdminFinancePayoutsController,
    updateDeliverySettingsController,
} from "../controller/adminFinanceController.js";
import {
    getAdminPayments,
    getAdminPaymentById,
    refundPaymentAdmin,
} from "../controller/paymentController.js";
import { getAdminAbandonedCarts } from "../controller/cartController.js";
import {
    getSegmentsOverview,
    getSegmentCustomerList,
} from "../controller/admin/customerSegmentController.js";
import {
    getAdminInventory,
    adjustAdminStock,
    getAdminStockHistory,
} from "../controller/admin/inventoryAdminController.js";

import {
    verifyToken,
    allowRoles,
    requireAdminPermission,
    requireSuperAdmin,
} from "../middleware/authMiddleware.js";
import { ADMIN_PERMISSIONS } from "../constants/rbac.js";
import {
    adminBootstrapRateLimiter,
    authRouteRateLimiter,
    createContentLengthGuard,
} from "../middleware/securityMiddlewares.js";

const router = express.Router();

const smallAdminPayload = createContentLengthGuard(
    parseInt(process.env.ADMIN_AUTH_MAX_PAYLOAD_BYTES || "20480", 10),
    "Admin auth payload too large",
);
router.post("/bootstrap", adminBootstrapRateLimiter, smallAdminPayload, bootstrapAdmin);
router.post("/signup", adminBootstrapRateLimiter, smallAdminPayload, signupAdmin);
router.post("/login", authRouteRateLimiter, smallAdminPayload, loginAdmin);
router.post("/login-otp", authRouteRateLimiter, smallAdminPayload, sendAdminLoginOtp);
router.post("/verify-login-otp", authRouteRateLimiter, smallAdminPayload, verifyAdminLoginOtp);

// Profile routes
router.get(
    "/profile",
    verifyToken,
    allowRoles("admin"),
    getAdminProfile
);

router.put(
    "/profile",
    verifyToken,
    allowRoles("admin"),
    updateAdminProfile
);

router.put(
    "/profile/password",
    verifyToken,
    allowRoles("admin"),
    updateAdminPassword
);

router.get(
    "/stats",
    verifyToken,
    allowRoles("admin"),
    getAdminStats
);
router.get(
    "/finance/summary",
    verifyToken,
    allowRoles("admin"),
    getAdminFinanceSummaryController,
);
router.get(
    "/finance/ledger",
    verifyToken,
    allowRoles("admin"),
    getAdminFinanceLedgerController,
);
router.get(
    "/finance/payouts",
    verifyToken,
    allowRoles("admin"),
    getAdminFinancePayoutsController,
);
router.post(
    "/finance/payouts/process",
    verifyToken,
    allowRoles("admin"),
    processAdminFinancePayoutsController,
);
router.get(
    "/finance/export-statement",
    verifyToken,
    allowRoles("admin"),
    exportAdminFinanceStatementController,
);
router.get(
    "/settings/platform",
    verifyToken,
    allowRoles("admin"),
    getPlatformSettings
);
router.get(
    "/settings/delivery",
    verifyToken,
    allowRoles("admin"),
    getDeliverySettingsController,
);
router.put(
    "/settings/delivery",
    verifyToken,
    allowRoles("admin"),
    updateDeliverySettingsController,
);
router.put(
    "/settings/platform",
    verifyToken,
    requireSuperAdmin,
    updatePlatformSettings
);

// Internal staff & RBAC management (Super Admin only)
router.get("/staff", verifyToken, requireSuperAdmin, getStaffList);
router.post("/staff", verifyToken, requireSuperAdmin, createStaffMember);
router.patch("/staff/:id/role", verifyToken, requireSuperAdmin, updateStaffRole);
router.patch("/staff/:id/status", verifyToken, requireSuperAdmin, toggleStaffStatus);

router.get("/users", verifyToken, allowRoles("admin"), getUsers);
router.get("/users/:id", verifyToken, allowRoles("admin"), getUserById);
router.get(
    "/users/:id/notes",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission(ADMIN_PERMISSIONS.CRM_NOTES_MANAGE),
    getCustomerNotes
);
router.post(
    "/users/:id/notes",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission(ADMIN_PERMISSIONS.CRM_NOTES_MANAGE),
    addCustomerNote
);
router.get("/users/:id/wallet", verifyToken, allowRoles("admin"), getUserWalletDetails);
router.get("/users/:id/wallet/history", verifyToken, allowRoles("admin"), getUserWalletHistoryController);
router.post("/wallet/add-coins", verifyToken, allowRoles("admin"), addCoinsController);
router.post("/wallet/remove-coins", verifyToken, allowRoles("admin"), removeCoinsController);
router.get("/sellers", verifyToken, allowRoles("admin"), getSellers);
router.get("/sellers/locations", verifyToken, allowRoles("admin"), getSellerLocations);
router.get("/sellers/active", verifyToken, allowRoles("admin"), getActiveSellers);
router.get("/sellers/pending", verifyToken, allowRoles("admin"), getPendingSellers);
router.patch("/sellers/approve/:id", verifyToken, allowRoles("admin"), approveSellerApplication);
router.delete("/sellers/reject/:id", verifyToken, allowRoles("admin"), rejectSellerApplication);

router.get(
    "/delivery-partners",
    verifyToken,
    allowRoles("admin"),
    getDeliveryPartners
);

router.patch(
    "/delivery-partners/approve/:id",
    verifyToken,
    allowRoles("admin"),
    approveDeliveryPartner
);

router.delete(
    "/delivery-partners/reject/:id",
    verifyToken,
    allowRoles("admin"),
    rejectDeliveryPartner
);

router.get("/active-fleet", verifyToken, allowRoles("admin"), getActiveFleet);
router.get("/wallet-data", verifyToken, allowRoles("admin"), getAdminWalletData);

// Delivery Payouts / Funds
router.get("/delivery-transactions", verifyToken, allowRoles('admin'), getDeliveryTransactions);
router.put("/transactions/:id/settle", verifyToken, allowRoles("admin"), settleTransaction);
router.put("/transactions/bulk-settle-delivery", verifyToken, allowRoles("admin"), bulkSettleDelivery);

// Cash Collection Hub
router.get("/delivery-cash", verifyToken, allowRoles("admin"), getDeliveryCashBalances);
router.get("/rider-cash-details/:id", verifyToken, allowRoles("admin"), getRiderCashDetails);
router.post("/settle-cash", verifyToken, allowRoles("admin"), settleRiderCash);
router.get("/cash-history", verifyToken, allowRoles("admin"), getCashSettlementHistory);

// Seller Withdrawal Management
router.get("/seller-withdrawals", verifyToken, allowRoles("admin"), getSellerWithdrawals);
router.get("/delivery-withdrawals", verifyToken, allowRoles("admin"), getDeliveryWithdrawals);
router.get("/seller-transactions", verifyToken, allowRoles("admin"), getSellerTransactions);
router.put("/withdrawals/:id", verifyToken, allowRoles("admin"), updateWithdrawalStatus);

// Online Payment Gateway Management & Audit
router.get("/payments", verifyToken, allowRoles("admin"), getAdminPayments);
router.get("/payments/:id", verifyToken, allowRoles("admin"), getAdminPaymentById);
router.post("/payments/:id/refund", verifyToken, allowRoles("admin"), refundPaymentAdmin);

// Abandoned Cart Analytics & Recovery Oversight
router.get(
    "/abandoned-carts",
    verifyToken,
    requireAdminPermission(ADMIN_PERMISSIONS.MARKETING_VIEW),
    getAdminAbandonedCarts
);

// Customer Behavioral Segmentation
router.get(
    "/segments",
    verifyToken,
    requireAdminPermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
    getSegmentsOverview
);
router.get(
    "/segments/:key/customers",
    verifyToken,
    requireAdminPermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
    getSegmentCustomerList
);

// Store-Wise Inventory & Stock Audit
router.get(
    "/inventory",
    verifyToken,
    requireAdminPermission(ADMIN_PERMISSIONS.PRODUCTS_VIEW),
    getAdminInventory
);
router.post(
    "/inventory/adjust",
    verifyToken,
    requireAdminPermission(ADMIN_PERMISSIONS.STOCK_MANAGE),
    adjustAdminStock
);
router.get(
    "/inventory/history",
    verifyToken,
    requireAdminPermission(ADMIN_PERMISSIONS.STOCK_MANAGE),
    getAdminStockHistory
);

// Protected admin route example
router.get(
    "/dashboard",
    verifyToken,
    allowRoles("admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Welcome to Admin Dashboard",
        });
    }
);

export default router;
