import express from "express";
import {
  getPublicRecipes,
  getPublicRecipeDetails,
  addRecipeIngredients,
  getAllRecipesAdmin,
  createRecipeAdmin,
  updateRecipeAdmin,
  deleteRecipeAdmin,
} from "../controller/recipeController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public recipe browsing
router.get("/", getPublicRecipes);
router.get("/:slugOrId", getPublicRecipeDetails);

// Customer cart bundling
router.post("/:id/add-to-cart", verifyToken, addRecipeIngredients);

// Admin management
router.get(
  "/admin/all",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager"),
  getAllRecipesAdmin
);
router.post(
  "/admin/create",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager"),
  createRecipeAdmin
);
router.put(
  "/admin/:id",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager"),
  updateRecipeAdmin
);
router.delete(
  "/admin/:id",
  verifyToken,
  allowRoles("admin", "super_admin", "marketing_manager"),
  deleteRecipeAdmin
);

export default router;
