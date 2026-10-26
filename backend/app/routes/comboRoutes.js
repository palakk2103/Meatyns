import express from "express";
import {
  getPublicCombos,
  getPublicComboDetails,
  addComboToCartHandler,
  getAllCombosAdmin,
  createComboAdmin,
  updateComboAdmin,
  deleteComboAdmin,
} from "../controller/comboController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public combo browsing
router.get("/", getPublicCombos);
router.get("/:slugOrId", getPublicComboDetails);

// Customer cart addition
router.post("/:id/add-to-cart", verifyToken, addComboToCartHandler);

// Admin management
router.get(
  "/admin/all",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager", "inventory_manager"),
  getAllCombosAdmin
);
router.post(
  "/admin/create",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager", "inventory_manager"),
  createComboAdmin
);
router.put(
  "/admin/:id",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager", "inventory_manager"),
  updateComboAdmin
);
router.delete(
  "/admin/:id",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager", "inventory_manager"),
  deleteComboAdmin
);

export default router;
