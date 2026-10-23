import Admin from "../../models/admin.js";
import handleResponse from "../../utils/helper.js";
import {
  ALL_ADMIN_ROLES,
  ADMIN_ROLES,
  normalizeAdminRole,
  isSuperAdmin,
  getRolePermissions,
} from "../../constants/rbac.js";

function sanitizeStaff(doc) {
  const staff = doc?.toObject ? doc.toObject() : { ...(doc || {}) };
  delete staff.password;
  delete staff.__v;
  return staff;
}

export const getStaffList = async (req, res) => {
  try {
    const staff = await Admin.find({})
      .select("_id name email phone role isActive permissions lastLogin createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = staff.map((member) => ({
      ...member,
      normalizedRole: normalizeAdminRole(member.role),
      effectivePermissions:
        Array.isArray(member.permissions) && member.permissions.length > 0
          ? member.permissions
          : getRolePermissions(member.role),
    }));

    return handleResponse(res, 200, "Staff list fetched successfully", enriched);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createStaffMember = async (req, res) => {
  try {
    const { name, email, phone, password, role, permissions } = req.body || {};

    if (!name || !email || !password) {
      return handleResponse(res, 400, "Name, email, and password are required");
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const existing = await Admin.findOne({ email: trimmedEmail });
    if (existing) {
      return handleResponse(res, 400, "A staff member with this email already exists");
    }

    if (phone) {
      const existingPhone = await Admin.findOne({ phone: String(phone).trim() });
      if (existingPhone) {
        return handleResponse(res, 400, "A staff member with this phone number already exists");
      }
    }

    const assignedRole = role && ALL_ADMIN_ROLES.includes(role)
      ? role
      : ADMIN_ROLES.ORDER_MANAGER;

    const newStaff = await Admin.create({
      name: String(name).trim(),
      email: trimmedEmail,
      phone: phone ? String(phone).trim() : undefined,
      password: String(password).trim(),
      role: assignedRole,
      isActive: true,
      permissions: Array.isArray(permissions) ? permissions : [],
      isVerified: true,
    });

    return handleResponse(res, 201, "Staff member created successfully", sanitizeStaff(newStaff));
  } catch (error) {
    if (error.code === 11000) {
      return handleResponse(res, 400, "Email or phone already in use");
    }
    return handleResponse(res, 500, error.message);
  }
};

export const updateStaffRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body || {};

    if (!role || !ALL_ADMIN_ROLES.includes(role)) {
      return handleResponse(
        res,
        400,
        `Invalid role. Supported roles: ${ALL_ADMIN_ROLES.join(", ")}`,
      );
    }

    const targetStaff = await Admin.findById(id);
    if (!targetStaff) {
      return handleResponse(res, 404, "Staff member not found");
    }

    // Prevent modifying self to avoid accidental lock-out
    if (String(req.user?.id) === String(id)) {
      return handleResponse(res, 400, "You cannot alter your own administrative role");
    }

    // Protection against removing the last active Super Admin
    if (isSuperAdmin(targetStaff.role) && !isSuperAdmin(role)) {
      const activeSuperAdmins = await Admin.countDocuments({
        _id: { $ne: id },
        role: { $in: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN] },
        isActive: true,
      });

      if (activeSuperAdmins < 1) {
        return handleResponse(
          res,
          400,
          "Cannot demote the last remaining active Super Admin. Assign another Super Admin first.",
        );
      }
    }

    targetStaff.role = role;
    if (Array.isArray(permissions)) {
      targetStaff.permissions = permissions;
    }
    await targetStaff.save();

    return handleResponse(res, 200, "Staff role updated successfully", sanitizeStaff(targetStaff));
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const targetStaff = await Admin.findById(id);
    if (!targetStaff) {
      return handleResponse(res, 404, "Staff member not found");
    }

    // Prevent deactivating own account
    if (String(req.user?.id) === String(id)) {
      return handleResponse(res, 400, "You cannot deactivate your own administrative account");
    }

    const nextStatus = req.body.isActive !== undefined
      ? Boolean(req.body.isActive)
      : !targetStaff.isActive;

    // Protection: do not allow deactivating the last active Super Admin
    if (isSuperAdmin(targetStaff.role) && !nextStatus) {
      const activeSuperAdmins = await Admin.countDocuments({
        _id: { $ne: id },
        role: { $in: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN] },
        isActive: true,
      });

      if (activeSuperAdmins < 1) {
        return handleResponse(
          res,
          400,
          "Cannot deactivate the last remaining active Super Admin.",
        );
      }
    }

    targetStaff.isActive = nextStatus;
    await targetStaff.save();

    return handleResponse(
      res,
      200,
      `Staff member ${nextStatus ? "activated" : "deactivated"} successfully`,
      sanitizeStaff(targetStaff),
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
