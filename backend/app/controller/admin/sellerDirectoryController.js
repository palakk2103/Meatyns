import mongoose from "mongoose";
import Seller from "../../models/seller.js";
import { invalidateSellerSelectionCache } from "../../services/customerVisibilityService.js";
import { emitNotificationEvent } from "../../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../../modules/notifications/notification.constants.js";
import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import {
  getActiveSellersData,
  getSellerLocationsData,
  getSellerOptions,
} from "../../services/admin/sellerDirectoryService.js";

export const getSellerLocations = async (req, res) => {
  try {
    const {
      q = "",
      category = "all",
      city = "all",
      lifecycle = "all",
      mapLimit: rawMapLimit = "500",
      sort = "orders_desc",
    } = req.query;

    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 100,
    });

    const data = await getSellerLocationsData({
      q,
      category,
      city,
      lifecycle,
      mapLimit: rawMapLimit,
      sort,
      page,
      limit,
      skip,
    });

    return handleResponse(res, 200, "Seller locations fetched successfully", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getActiveSellers = async (req, res) => {
  try {
    const { q = "", category = "all", sort = "recent" } = req.query;
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const data = await getActiveSellersData({
      q,
      category,
      sort,
      page,
      limit,
      skip,
    });

    return handleResponse(res, 200, "Active sellers fetched successfully", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/**
 * Admin closes/reopens outlets. Body: { closed: boolean, reason?: string,
 * sellerIds?: string[], all?: boolean }. Param :id is used for a single outlet.
 */
export const setSellerStoreClosure = async (req, res) => {
  try {
    const { closed, reason = "", sellerIds, all } = req.body || {};
    if (typeof closed !== "boolean") {
      return handleResponse(res, 400, "`closed` (boolean) is required");
    }

    let filter;
    if (req.params.id) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return handleResponse(res, 400, "Invalid seller id");
      }
      filter = { _id: req.params.id };
    } else if (all === true) {
      filter = { isVerified: true, isActive: true };
    } else if (Array.isArray(sellerIds) && sellerIds.length) {
      if (!sellerIds.every((id) => mongoose.isValidObjectId(id))) {
        return handleResponse(res, 400, "Invalid seller id in list");
      }
      filter = { _id: { $in: sellerIds } };
    } else {
      return handleResponse(res, 400, "Provide sellerIds or all: true");
    }

    const update = closed
      ? {
          adminClosed: true,
          adminClosedReason: String(reason || "").trim().slice(0, 200),
          adminClosedAt: new Date(),
        }
      : { adminClosed: false, adminClosedReason: "", adminClosedAt: null };

    // Only sellers whose state actually changes get notified.
    const changing = await Seller.find({
      ...filter,
      adminClosed: closed ? { $ne: true } : true,
    })
      .select("_id")
      .lean();

    const result = await Seller.updateMany(filter, { $set: update });
    await invalidateSellerSelectionCache();

    if (changing.length) {
      emitNotificationEvent(
        closed
          ? NOTIFICATION_EVENTS.STORE_CLOSED_BY_ADMIN
          : NOTIFICATION_EVENTS.STORE_REOPENED_BY_ADMIN,
        {
          sellerIds: changing.map((s) => String(s._id)),
          reason: update.adminClosedReason || "",
          // unique per action so a close followed by a reopen is not deduped
          messageId: `${closed ? "close" : "open"}:${Date.now()}`,
        },
      );
    }

    return handleResponse(
      res,
      200,
      closed ? "Outlet(s) closed" : "Outlet(s) reopened",
      { matched: result.matchedCount, modified: result.modifiedCount, closed },
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getSellers = async (req, res) => {
  try {
    const sellers = await getSellerOptions();
    return handleResponse(res, 200, "Sellers fetched", sellers);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
