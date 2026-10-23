import * as flashDealService from "../../services/flashDealService.js";

export const getFlashDeals = async (req, res) => {
  try {
    const { page, limit, status, search } = req.query;
    const result = await flashDealService.listFlashDeals({
      page,
      limit,
      status,
      search,
    });
    return res.status(200).json({
      success: true,
      error: false,
      result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: true,
      message: error.message || "Failed to fetch flash deals",
    });
  }
};

export const createFlashDeal = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    const deal = await flashDealService.createFlashDeal(req.body, adminId);
    return res.status(201).json({
      success: true,
      error: false,
      message: "Flash deal created successfully",
      result: deal,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: true,
      message: error.message || "Failed to create flash deal",
    });
  }
};

export const updateFlashDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await flashDealService.updateFlashDeal(id, req.body);
    return res.status(200).json({
      success: true,
      error: false,
      message: "Flash deal updated successfully",
      result: deal,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: true,
      message: error.message || "Failed to update flash deal",
    });
  }
};

export const toggleFlashDealStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const deal = await flashDealService.toggleFlashDealStatus(id, status);
    return res.status(200).json({
      success: true,
      error: false,
      message: `Flash deal status updated to ${status}`,
      result: deal,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: true,
      message: error.message || "Failed to update flash deal status",
    });
  }
};

export const getPublicActiveDeal = async (req, res) => {
  try {
    const deal = await flashDealService.getActiveFlashDeal();
    return res.status(200).json({
      success: true,
      error: false,
      result: deal,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to load active flash deal",
    });
  }
};
