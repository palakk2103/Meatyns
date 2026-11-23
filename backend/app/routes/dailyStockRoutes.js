import express from "express";
import { verifyToken, allowRoles, requireApprovedSeller, requireAdminPermission } from "../middleware/authMiddleware.js";
import { ADMIN_PERMISSIONS } from "../constants/rbac.js";
import * as daily from "../controller/dailyStockController.js";

/* Mounted at /api/seller/daily-stock */
export const dailyStockSellerRouter = express.Router();
dailyStockSellerRouter.use(verifyToken, allowRoles("seller"), requireApprovedSeller);
dailyStockSellerRouter.get("/", daily.getSellerDailyStock);
dailyStockSellerRouter.get("/products", daily.getSellerDailyStockProducts);
dailyStockSellerRouter.put("/", daily.saveSellerDailyStock);

/* Mounted at /api/admin/daily-stock */
export const dailyStockAdminRouter = express.Router();
const canView = requireAdminPermission(ADMIN_PERMISSIONS.STOCK_MANAGE, ADMIN_PERMISSIONS.DASHBOARD_VIEW);
const canManage = requireAdminPermission(ADMIN_PERMISSIONS.STOCK_MANAGE);
dailyStockAdminRouter.use(verifyToken);
dailyStockAdminRouter.get("/", canView, daily.getAdminDailyStock);
dailyStockAdminRouter.get("/sellers", canView, daily.listAdminDailyStockSellers);
dailyStockAdminRouter.get("/products", canView, daily.getAdminDailyStockProducts);
dailyStockAdminRouter.put("/", canManage, daily.saveAdminDailyStock);
