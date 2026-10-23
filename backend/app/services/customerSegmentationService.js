import mongoose from "mongoose";
import User from "../models/customer.js";
import Order from "../models/order.js";

export const SEGMENT_KEYS = Object.freeze({
  NEW: "new",
  ACTIVE: "active",
  REPEAT: "repeat",
  VIP: "vip",
  AT_RISK: "at_risk",
});

export const SEGMENT_DEFINITIONS = Object.freeze({
  [SEGMENT_KEYS.NEW]: {
    key: SEGMENT_KEYS.NEW,
    name: "New Customers",
    description: "Joined within the last 30 days with at most 1 completed order",
    badgeColor: "indigo",
    criteria: "Registered in last 30 days, <= 1 valid order",
  },
  [SEGMENT_KEYS.ACTIVE]: {
    key: SEGMENT_KEYS.ACTIVE,
    name: "Active Shoppers",
    description: "Placed at least one valid order within the last 30 days",
    badgeColor: "emerald",
    criteria: "Last valid order within past 30 days",
  },
  [SEGMENT_KEYS.REPEAT]: {
    key: SEGMENT_KEYS.REPEAT,
    name: "Repeat Customers",
    description: "Customers who have completed 2 or more lifetime orders",
    badgeColor: "blue",
    criteria: "Total lifetime valid orders >= 2",
  },
  [SEGMENT_KEYS.VIP]: {
    key: SEGMENT_KEYS.VIP,
    name: "High Value (VIP)",
    description: "Lifetime spend of ₹5,000 or more, or 5+ completed orders",
    badgeColor: "amber",
    criteria: "Total spend >= ₹5,000 OR total orders >= 5",
  },
  [SEGMENT_KEYS.AT_RISK]: {
    key: SEGMENT_KEYS.AT_RISK,
    name: "At-Risk / Lapsed",
    description: "Previously purchased, but has had zero orders in the last 60 days",
    badgeColor: "rose",
    criteria: ">= 1 lifetime order, but last order > 60 days ago",
  },
});

export const VALID_ORDER_STATUSES = Object.freeze([
  "delivered",
  "confirmed",
  "packed",
  "out_for_delivery",
]);

/**
 * Builds the base customer metrics aggregation pipeline.
 * Computes totalOrders, totalSpent, and lastOrderDate using valid order statuses.
 */
function buildCustomerMetricsPipeline(now = new Date()) {
  return [
    {
      $match: {
        role: "user",
      },
    },
    {
      $lookup: {
        from: "orders",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$customer", "$$userId"] },
              status: { $in: VALID_ORDER_STATUSES },
            },
          },
          {
            $project: {
              createdAt: 1,
              orderTotal: { $ifNull: ["$pricing.total", "$totalAmount", 0] },
            },
          },
        ],
        as: "validOrders",
      },
    },
    {
      $project: {
        _id: 1,
        name: { $ifNull: ["$name", "Unnamed Customer"] },
        email: 1,
        phone: 1,
        createdAt: 1,
        isActive: { $ifNull: ["$isActive", true] },
        totalOrders: { $size: "$validOrders" },
        totalSpent: { $round: [{ $sum: "$validOrders.orderTotal" }, 2] },
        lastOrderDate: { $max: "$validOrders.createdAt" },
      },
    },
  ];
}

/**
 * Get summary counts for all behavioral customer segments.
 */
export async function getSegmentSummary({ now = new Date() } = {}) {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000);

  const pipeline = [
    ...buildCustomerMetricsPipeline(now),
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        newCustomers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", thirtyDaysAgo] },
                  { $lte: ["$totalOrders", 1] },
                ],
              },
              1,
              0,
            ],
          },
        },
        activeCustomers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ["$totalOrders", 0] },
                  { $gte: ["$lastOrderDate", thirtyDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
        repeatCustomers: {
          $sum: {
            $cond: [{ $gte: ["$totalOrders", 2] }, 1, 0],
          },
        },
        vipCustomers: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $gte: ["$totalSpent", 5000] },
                  { $gte: ["$totalOrders", 5] },
                ],
              },
              1,
              0,
            ],
          },
        },
        atRiskCustomers: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ["$totalOrders", 0] },
                  { $lt: ["$lastOrderDate", sixtyDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  const [aggResult] = await User.aggregate(pipeline);

  const raw = aggResult || {
    totalCustomers: 0,
    newCustomers: 0,
    activeCustomers: 0,
    repeatCustomers: 0,
    vipCustomers: 0,
    atRiskCustomers: 0,
  };

  return {
    totalCustomers: raw.totalCustomers,
    segments: [
      {
        ...SEGMENT_DEFINITIONS[SEGMENT_KEYS.NEW],
        count: raw.newCustomers,
      },
      {
        ...SEGMENT_DEFINITIONS[SEGMENT_KEYS.ACTIVE],
        count: raw.activeCustomers,
      },
      {
        ...SEGMENT_DEFINITIONS[SEGMENT_KEYS.REPEAT],
        count: raw.repeatCustomers,
      },
      {
        ...SEGMENT_DEFINITIONS[SEGMENT_KEYS.VIP],
        count: raw.vipCustomers,
      },
      {
        ...SEGMENT_DEFINITIONS[SEGMENT_KEYS.AT_RISK],
        count: raw.atRiskCustomers,
      },
    ],
  };
}

/**
 * Get match condition for a given segment key.
 */
function getMatchConditionForSegment(segmentKey, now = new Date()) {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000);

  switch (segmentKey) {
    case SEGMENT_KEYS.NEW:
      return {
        createdAt: { $gte: thirtyDaysAgo },
        totalOrders: { $lte: 1 },
      };
    case SEGMENT_KEYS.ACTIVE:
      return {
        totalOrders: { $gt: 0 },
        lastOrderDate: { $gte: thirtyDaysAgo },
      };
    case SEGMENT_KEYS.REPEAT:
      return {
        totalOrders: { $gte: 2 },
      };
    case SEGMENT_KEYS.VIP:
      return {
        $or: [{ totalSpent: { $gte: 5000 } }, { totalOrders: { $gte: 5 } }],
      };
    case SEGMENT_KEYS.AT_RISK:
      return {
        totalOrders: { $gt: 0 },
        lastOrderDate: { $lt: sixtyDaysAgo },
      };
    default:
      return {};
  }
}

/**
 * Get paginated list of customers belonging to a specific segment.
 */
export async function getSegmentCustomers({
  segmentKey = "all",
  page = 1,
  limit = 20,
  search = "",
  now = new Date(),
} = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const segmentMatch = segmentKey !== "all" ? getMatchConditionForSegment(segmentKey, now) : {};

  const searchMatch = search && search.trim()
    ? {
        $or: [
          { name: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
          { phone: { $regex: search.trim(), $options: "i" } },
        ],
      }
    : {};

  const pipeline = [
    ...buildCustomerMetricsPipeline(now),
    { $match: { ...segmentMatch, ...searchMatch } },
    { $sort: { totalOrders: -1, totalSpent: -1, createdAt: -1 } },
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        items: [{ $skip: skip }, { $limit: l }],
      },
    },
  ];

  const [result] = await User.aggregate(pipeline);
  const total = result?.totalCount?.[0]?.count || 0;
  const items = result?.items || [];

  return {
    items,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1,
    segment: SEGMENT_DEFINITIONS[segmentKey] || {
      key: "all",
      name: "All Customers",
      description: "All registered customer accounts",
    },
  };
}
