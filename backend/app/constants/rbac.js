export const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin", // Legacy alias for super_admin
  ORDER_MANAGER: "order_manager",
  INVENTORY_MANAGER: "inventory_manager",
  DELIVERY_MANAGER: "delivery_manager",
  MARKETING_MANAGER: "marketing_manager",
});

export const ALL_ADMIN_ROLES = Object.freeze(Object.values(ADMIN_ROLES));

export const ADMIN_PERMISSIONS = Object.freeze({
  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",
  // Orders
  ORDERS_VIEW: "orders:view",
  ORDERS_MANAGE: "orders:manage",
  ORDERS_REFUND: "orders:refund",
  // Catalog & Inventory
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_MANAGE: "products:manage",
  CATEGORIES_MANAGE: "categories:manage",
  STOCK_MANAGE: "stock:manage",
  // Delivery & Fleet
  DELIVERY_VIEW: "delivery:view",
  DELIVERY_MANAGE: "delivery:manage",
  DELIVERY_SETTLE: "delivery:settle",
  // Marketing & Promotions
  MARKETING_VIEW: "marketing:view",
  MARKETING_MANAGE: "marketing:manage",
  COUPONS_MANAGE: "coupons:manage",
  NOTIFICATIONS_SEND: "notifications:send",
  // Customers & CRM
  CUSTOMERS_VIEW: "customers:view",
  CUSTOMERS_MANAGE: "customers:manage",
  CRM_NOTES_MANAGE: "crm_notes:manage",
  // Finance & Platform Settings
  FINANCE_VIEW: "finance:view",
  FINANCE_MANAGE: "finance:manage",
  SETTINGS_MANAGE: "settings:manage",
  // Staff / Roles
  STAFF_MANAGE: "staff:manage",
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ADMIN_ROLES.SUPER_ADMIN]: ["*"],
  [ADMIN_ROLES.ADMIN]: ["*"],
  [ADMIN_ROLES.ORDER_MANAGER]: [
    ADMIN_PERMISSIONS.DASHBOARD_VIEW,
    ADMIN_PERMISSIONS.ORDERS_VIEW,
    ADMIN_PERMISSIONS.ORDERS_MANAGE,
    ADMIN_PERMISSIONS.ORDERS_REFUND,
    ADMIN_PERMISSIONS.CUSTOMERS_VIEW,
    ADMIN_PERMISSIONS.CRM_NOTES_MANAGE,
  ],
  [ADMIN_ROLES.INVENTORY_MANAGER]: [
    ADMIN_PERMISSIONS.DASHBOARD_VIEW,
    ADMIN_PERMISSIONS.PRODUCTS_VIEW,
    ADMIN_PERMISSIONS.PRODUCTS_MANAGE,
    ADMIN_PERMISSIONS.CATEGORIES_MANAGE,
    ADMIN_PERMISSIONS.STOCK_MANAGE,
  ],
  [ADMIN_ROLES.DELIVERY_MANAGER]: [
    ADMIN_PERMISSIONS.DASHBOARD_VIEW,
    ADMIN_PERMISSIONS.DELIVERY_VIEW,
    ADMIN_PERMISSIONS.DELIVERY_MANAGE,
    ADMIN_PERMISSIONS.DELIVERY_SETTLE,
  ],
  [ADMIN_ROLES.MARKETING_MANAGER]: [
    ADMIN_PERMISSIONS.DASHBOARD_VIEW,
    ADMIN_PERMISSIONS.MARKETING_VIEW,
    ADMIN_PERMISSIONS.MARKETING_MANAGE,
    ADMIN_PERMISSIONS.COUPONS_MANAGE,
    ADMIN_PERMISSIONS.NOTIFICATIONS_SEND,
  ],
});

export function normalizeAdminRole(role = "") {
  const normalized = String(role || "").toLowerCase().trim();
  if (normalized === ADMIN_ROLES.ADMIN || normalized === ADMIN_ROLES.SUPER_ADMIN) {
    return ADMIN_ROLES.SUPER_ADMIN;
  }
  return normalized;
}

export function isSuperAdmin(role = "") {
  const norm = normalizeAdminRole(role);
  return norm === ADMIN_ROLES.SUPER_ADMIN;
}

export function getRolePermissions(role = "") {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === ADMIN_ROLES.SUPER_ADMIN) {
    return ["*"];
  }
  return ROLE_PERMISSIONS[normalizedRole] || [];
}

export function hasAdminPermission(roleOrUser, permission) {
  if (!roleOrUser) return false;
  const role = typeof roleOrUser === "string"
    ? roleOrUser
    : (roleOrUser.adminRole || roleOrUser.role);
  if (isSuperAdmin(role)) return true;

  const permissions = Array.isArray(roleOrUser.permissions) && roleOrUser.permissions.length > 0
    ? roleOrUser.permissions
    : getRolePermissions(role);

  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}
