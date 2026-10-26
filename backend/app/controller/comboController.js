import Combo from "../models/combo.js";
import handleResponse from "../utils/helper.js";
import {
  listCombos,
  getComboBySlugOrId,
  addComboToCart,
} from "../services/comboService.js";

/* ===============================
   PUBLIC & CUSTOMER CONTROLLERS
================================ */

export const getPublicCombos = async (req, res) => {
  try {
    const { page, limit, sellerId } = req.query;
    const results = await listCombos({
      page,
      limit,
      sellerId,
      includeInactive: false,
    });
    return handleResponse(res, 200, "Combos fetched successfully", results);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getPublicComboDetails = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const combo = await getComboBySlugOrId(slugOrId);
    if (!combo) {
      return handleResponse(res, 404, "Combo package not found");
    }
    return handleResponse(res, 200, "Combo details fetched", combo);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const addComboToCartHandler = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    const { quantity = 1 } = req.body || {};

    const result = await addComboToCart({
      comboId: id,
      customerId,
      quantity,
    });

    return handleResponse(res, 200, result.message, result);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

/* ===============================
   ADMIN CONTROLLERS
================================ */

export const getAllCombosAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, sellerId } = req.query;
    const results = await listCombos({
      page,
      limit,
      sellerId,
      includeInactive: true,
    });
    return handleResponse(res, 200, "Admin combos fetched", results);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createComboAdmin = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.slug || !payload.comboPrice) {
      return handleResponse(res, 400, "Name, slug and combo price are required");
    }

    if (!Array.isArray(payload.items) || payload.items.length < 2) {
      return handleResponse(res, 400, "Combo must contain at least 2 items");
    }

    const combo = await Combo.create(payload);
    return handleResponse(res, 201, "Combo created successfully", combo);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const updateComboAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Combo.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return handleResponse(res, 404, "Combo package not found");
    }
    return handleResponse(res, 200, "Combo updated successfully", updated);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const deleteComboAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Combo.findByIdAndDelete(id);
    if (!deleted) {
      return handleResponse(res, 404, "Combo package not found");
    }
    return handleResponse(res, 200, "Combo deleted successfully", deleted);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
