import mongoose from "mongoose";
import Subscription from "../models/subscription.js";
import handleResponse from "../utils/helper.js";
import {
  createSubscription,
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  processDueSubscriptionOrders,
} from "../services/subscriptionService.js";

/* ===============================
   CUSTOMER CONTROLLERS
================================ */

export const getMySubscriptions = async (req, res) => {
  try {
    const customerId = req.user.id;
    const subscriptions = await Subscription.find({ customerId })
      .populate("items.productId", "name mainImage price salePrice unit unitValue stock")
      .sort({ createdAt: -1 })
      .lean();

    return handleResponse(res, 200, "Subscriptions fetched successfully", subscriptions);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getSubscriptionById = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid subscription ID");
    }

    const subscription = await Subscription.findOne({
      _id: id,
      customerId,
    })
      .populate("items.productId", "name mainImage price salePrice unit unitValue stock isScheduled")
      .populate("lastGeneratedOrderId", "orderId total status paymentMode createdAt")
      .lean();

    if (!subscription) {
      return handleResponse(res, 404, "Subscription not found");
    }

    return handleResponse(res, 200, "Subscription details fetched", subscription);
  } catch (error) {
    if (error.name === "CastError") {
      return handleResponse(res, 400, "Invalid subscription ID");
    }
    return handleResponse(res, 500, error.message);
  }
};

export const createNewSubscription = async (req, res) => {
  try {
    const customerId = req.user.id;
    const payload = req.body || {};
    const subscription = await createSubscription({
      customerId,
      ...payload,
    });

    return handleResponse(res, 201, "Subscription created successfully", subscription);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const updateSubscriptionDetails = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid subscription ID");
    }
    const updated = await updateSubscription(id, customerId, req.body || {});
    return handleResponse(res, 200, "Subscription updated successfully", updated);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const pauseCustomerSubscription = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid subscription ID");
    }
    const paused = await pauseSubscription(id, customerId);
    return handleResponse(res, 200, "Subscription paused successfully", paused);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const resumeCustomerSubscription = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid subscription ID");
    }
    const resumed = await resumeSubscription(id, customerId);
    return handleResponse(res, 200, "Subscription resumed successfully", resumed);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const cancelCustomerSubscription = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid subscription ID");
    }
    const { reason } = req.body || {};
    const cancelled = await cancelSubscription(id, customerId, reason);
    return handleResponse(res, 200, "Subscription cancelled successfully", cancelled);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

/* ===============================
   ADMIN CONTROLLERS
================================ */

export const getAllSubscriptionsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "20", 10));
    const status = req.query.status;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Subscription.find(query)
        .populate("customerId", "name email phone")
        .populate("items.productId", "name price unit")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Admin subscriptions fetched", {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const triggerSubscriptionBatchExecution = async (req, res) => {
  try {
    const results = await processDueSubscriptionOrders(new Date());
    return handleResponse(res, 200, "Batch subscription run completed", results);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
