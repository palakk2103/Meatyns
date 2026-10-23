import { describe, it, expect } from "@jest/globals";
import {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  hasAdminPermission,
  isSuperAdmin,
  normalizeAdminRole,
  getRolePermissions,
} from "../app/constants/rbac.js";
import {
  allowRoles,
  requireAdminPermission,
  requireSuperAdmin,
} from "../app/middleware/authMiddleware.js";

describe("Stage 1 — Sub-Admin RBAC & Permission Matrix", () => {
  it("recognizes legacy 'admin' and 'super_admin' as Super Admin with all permissions", () => {
    expect(isSuperAdmin("admin")).toBe(true);
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(normalizeAdminRole("admin")).toBe(ADMIN_ROLES.SUPER_ADMIN);
    expect(normalizeAdminRole("super_admin")).toBe(ADMIN_ROLES.SUPER_ADMIN);

    const superAdminUser = { role: "admin", adminRole: "super_admin" };
    expect(hasAdminPermission(superAdminUser, ADMIN_PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
    expect(hasAdminPermission(superAdminUser, ADMIN_PERMISSIONS.STAFF_MANAGE)).toBe(true);
    expect(hasAdminPermission(superAdminUser, ADMIN_PERMISSIONS.ORDERS_MANAGE)).toBe(true);
    expect(hasAdminPermission("admin", "any_random_action")).toBe(true);
  });

  it("enforces Order Manager role permissions correctly", () => {
    const orderManager = { role: "admin", adminRole: ADMIN_ROLES.ORDER_MANAGER };
    expect(isSuperAdmin(orderManager.adminRole)).toBe(false);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.ORDERS_VIEW)).toBe(true);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.ORDERS_MANAGE)).toBe(true);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.CUSTOMERS_VIEW)).toBe(true);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.CRM_NOTES_MANAGE)).toBe(true);

    // Denied areas
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.STAFF_MANAGE)).toBe(false);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.PRODUCTS_MANAGE)).toBe(false);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
    expect(hasAdminPermission(orderManager, ADMIN_PERMISSIONS.DELIVERY_MANAGE)).toBe(false);
  });

  it("enforces Inventory Manager role permissions correctly", () => {
    const inventoryManager = { role: "admin", adminRole: ADMIN_ROLES.INVENTORY_MANAGER };
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.PRODUCTS_VIEW)).toBe(true);
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.PRODUCTS_MANAGE)).toBe(true);
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.CATEGORIES_MANAGE)).toBe(true);
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.STOCK_MANAGE)).toBe(true);

    // Denied areas
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.ORDERS_MANAGE)).toBe(false);
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.STAFF_MANAGE)).toBe(false);
    expect(hasAdminPermission(inventoryManager, ADMIN_PERMISSIONS.FINANCE_MANAGE)).toBe(false);
  });

  it("enforces Delivery Manager role permissions correctly", () => {
    const deliveryManager = { role: "admin", adminRole: ADMIN_ROLES.DELIVERY_MANAGER };
    expect(hasAdminPermission(deliveryManager, ADMIN_PERMISSIONS.DELIVERY_VIEW)).toBe(true);
    expect(hasAdminPermission(deliveryManager, ADMIN_PERMISSIONS.DELIVERY_MANAGE)).toBe(true);
    expect(hasAdminPermission(deliveryManager, ADMIN_PERMISSIONS.DELIVERY_SETTLE)).toBe(true);

    // Denied areas
    expect(hasAdminPermission(deliveryManager, ADMIN_PERMISSIONS.PRODUCTS_MANAGE)).toBe(false);
    expect(hasAdminPermission(deliveryManager, ADMIN_PERMISSIONS.STAFF_MANAGE)).toBe(false);
  });

  it("enforces Marketing Manager role permissions correctly", () => {
    const marketingManager = { role: "admin", adminRole: ADMIN_ROLES.MARKETING_MANAGER };
    expect(hasAdminPermission(marketingManager, ADMIN_PERMISSIONS.MARKETING_VIEW)).toBe(true);
    expect(hasAdminPermission(marketingManager, ADMIN_PERMISSIONS.COUPONS_MANAGE)).toBe(true);
    expect(hasAdminPermission(marketingManager, ADMIN_PERMISSIONS.NOTIFICATIONS_SEND)).toBe(true);

    // Denied areas
    expect(hasAdminPermission(marketingManager, ADMIN_PERMISSIONS.ORDERS_MANAGE)).toBe(false);
    expect(hasAdminPermission(marketingManager, ADMIN_PERMISSIONS.STAFF_MANAGE)).toBe(false);
  });

  describe("Middleware enforcement", () => {
    const mockRes = () => {
      const res = {};
      res.statusCode = 200;
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.body = data;
        return res;
      };
      return res;
    };

    it("allows Super Admin through requireSuperAdmin", () => {
      const req = { user: { id: "1", role: "admin", adminRole: "super_admin" } };
      const res = mockRes();
      let nextCalled = false;
      requireSuperAdmin(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("blocks non-super admin through requireSuperAdmin with 403", () => {
      const req = { user: { id: "2", role: "admin", adminRole: "order_manager" } };
      const res = mockRes();
      let nextCalled = false;
      requireSuperAdmin(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain("Super Admin authorization required");
    });

    it("allows Order Manager access to requireAdminPermission(ORDERS_MANAGE)", () => {
      const req = { user: { id: "3", role: "admin", adminRole: "order_manager" } };
      const res = mockRes();
      let nextCalled = false;
      requireAdminPermission(ADMIN_PERMISSIONS.ORDERS_MANAGE)(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("denies Order Manager access to requireAdminPermission(PRODUCTS_MANAGE) with 403", () => {
      const req = { user: { id: "4", role: "admin", adminRole: "order_manager" } };
      const res = mockRes();
      let nextCalled = false;
      requireAdminPermission(ADMIN_PERMISSIONS.PRODUCTS_MANAGE)(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });
});
