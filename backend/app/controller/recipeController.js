import Recipe from "../models/recipe.js";
import handleResponse from "../utils/helper.js";
import {
  listRecipes,
  getRecipeBySlugOrId,
  addRecipeIngredientsToCart,
} from "../services/recipeService.js";

/* ===============================
   PUBLIC & CUSTOMER CONTROLLERS
================================ */

export const getPublicRecipes = async (req, res) => {
  try {
    const { page, limit, category, difficulty, search } = req.query;
    const results = await listRecipes({
      page,
      limit,
      category,
      difficulty,
      search,
      includeInactive: false,
    });
    return handleResponse(res, 200, "Recipes fetched successfully", results);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getPublicRecipeDetails = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const recipe = await getRecipeBySlugOrId(slugOrId);
    if (!recipe) {
      return handleResponse(res, 404, "Recipe not found");
    }
    return handleResponse(res, 200, "Recipe details fetched", recipe);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const addRecipeIngredients = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    const { selectedProductIds } = req.body || {};

    const result = await addRecipeIngredientsToCart({
      recipeId: id,
      customerId,
      selectedProductIds,
    });

    return handleResponse(res, 200, result.message, result);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

/* ===============================
   ADMIN CONTROLLERS
================================ */

export const getAllRecipesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const results = await listRecipes({
      page,
      limit,
      search,
      includeInactive: true,
    });
    return handleResponse(res, 200, "Admin recipes fetched", results);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createRecipeAdmin = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.title || !payload.slug) {
      return handleResponse(res, 400, "Title and slug are required");
    }

    const recipe = await Recipe.create(payload);
    return handleResponse(res, 201, "Recipe created successfully", recipe);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const updateRecipeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Recipe.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return handleResponse(res, 404, "Recipe not found");
    }
    return handleResponse(res, 200, "Recipe updated successfully", updated);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const deleteRecipeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Recipe.findByIdAndDelete(id);
    if (!deleted) {
      return handleResponse(res, 404, "Recipe not found");
    }
    return handleResponse(res, 200, "Recipe deleted successfully", deleted);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
