import mongoose from "mongoose";
import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import User from "../../models/customer.js";
import {
  getUserByIdData,
  getUsersData,
} from "../../services/admin/userAdminService.js";

export const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const data = await getUsersData({ page, limit, skip });
    return handleResponse(res, 200, "Users fetched successfully", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserByIdData(id);

    if (!user) {
      return handleResponse(res, 404, "Customer not found");
    }

    return handleResponse(
      res,
      200,
      "Customer details fetched successfully",
      user,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getCustomerNotes = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid customer ID");
    }

    const customer = await User.findById(id).select("+crmNotes");
    if (!customer) {
      return handleResponse(res, 404, "Customer not found");
    }

    return handleResponse(
      res,
      200,
      "Customer notes fetched successfully",
      customer.crmNotes || [],
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const addCustomerNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid customer ID");
    }

    const trimmed = typeof note === "string" ? note.trim() : "";
    if (!trimmed) {
      return handleResponse(res, 400, "Note text cannot be empty");
    }

    if (trimmed.length > 2000) {
      return handleResponse(
        res,
        400,
        "Note length cannot exceed 2000 characters",
      );
    }

    const customer = await User.findById(id).select("+crmNotes");
    if (!customer) {
      return handleResponse(res, 404, "Customer not found");
    }

    const authorId = req.user?.id || req.user?._id;
    const authorName = req.user?.name || req.user?.email || "Staff";
    const authorRole = req.user?.adminRole || req.user?.role || "admin";

    const newNote = {
      note: trimmed,
      authorId: authorId && mongoose.Types.ObjectId.isValid(authorId) ? authorId : undefined,
      authorName,
      authorRole,
      createdAt: new Date(),
    };

    if (!Array.isArray(customer.crmNotes)) {
      customer.crmNotes = [];
    }

    customer.crmNotes.unshift(newNote);
    await customer.save();

    return handleResponse(res, 201, "CRM note saved successfully", {
      note: newNote,
      crmNotes: customer.crmNotes,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

