import User from "../../models/customer.js";
import Seller from "../../models/seller.js";
import Delivery from "../../models/delivery.js";
import Order from "../../models/order.js";
import Product from "../../models/product.js";

const DASHBOARD_CATEGORY_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444"];

export function getIstStartAndEndOfDay(targetDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(targetDate);
  const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { startOfDay, endOfDay, dateStr };
}

export async function getTodayKpis(referenceDate = new Date()) {
  const { startOfDay, endOfDay, dateStr } = getIstStartAndEndOfDay(referenceDate);

  try {
    const results = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $facet: {
          grossMetrics: [
            {
              $match: {
                status: { $ne: "cancelled" },
                paymentStatus: { $nin: ["FAILED", "REFUNDED"] },
                "payment.status": { $nin: ["failed", "refunded"] },
              },
            },
            {
              $group: {
                _id: null,
                grossSales: { $sum: { $ifNull: ["$pricing.total", 0] } },
                uniqueCheckouts: {
                  $addToSet: { $ifNull: ["$checkoutGroupId", "$_id"] },
                },
                totalSubOrders: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                grossSales: 1,
                checkoutCount: { $size: "$uniqueCheckouts" },
                subOrderCount: "$totalSubOrders",
              },
            },
          ],
          deliveredMetrics: [
            {
              $match: {
                status: "delivered",
                paymentStatus: { $nin: ["FAILED", "REFUNDED"] },
                "payment.status": { $nin: ["failed", "refunded"] },
              },
            },
            {
              $group: {
                _id: null,
                netSales: { $sum: { $ifNull: ["$pricing.total", 0] } },
                deliveredCheckouts: {
                  $addToSet: { $ifNull: ["$checkoutGroupId", "$_id"] },
                },
                deliveredSubOrders: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                netSales: 1,
                deliveredCount: { $size: "$deliveredCheckouts" },
                deliveredSubOrders: "$deliveredSubOrders",
              },
            },
          ],
          inTransitMetrics: [
            {
              $match: {
                status: { $in: ["pending", "confirmed", "packed", "out_for_delivery"] },
                paymentStatus: { $nin: ["FAILED", "REFUNDED"] },
                "payment.status": { $nin: ["failed", "refunded"] },
              },
            },
            {
              $group: {
                _id: null,
                inTransitCheckouts: {
                  $addToSet: { $ifNull: ["$checkoutGroupId", "$_id"] },
                },
                inTransitSubOrders: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                inTransitCount: { $size: "$inTransitCheckouts" },
                inTransitSubOrders: "$inTransitSubOrders",
              },
            },
          ],
          cancelledMetrics: [
            {
              $match: {
                $or: [
                  { status: "cancelled" },
                  { paymentStatus: { $in: ["FAILED", "REFUNDED"] } },
                  { "payment.status": { $in: ["failed", "refunded"] } },
                ],
              },
            },
            {
              $group: {
                _id: null,
                cancelledCheckouts: {
                  $addToSet: { $ifNull: ["$checkoutGroupId", "$_id"] },
                },
                cancelledSubOrders: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                cancelledCount: { $size: "$cancelledCheckouts" },
                cancelledSubOrders: "$cancelledSubOrders",
              },
            },
          ],
        },
      },
    ]);

    const raw = results[0] || {};
    const gross = raw.grossMetrics?.[0] || { grossSales: 0, checkoutCount: 0, subOrderCount: 0 };
    const delivered = raw.deliveredMetrics?.[0] || { netSales: 0, deliveredCount: 0, deliveredSubOrders: 0 };
    const inTransit = raw.inTransitMetrics?.[0] || { inTransitCount: 0, inTransitSubOrders: 0 };
    const cancelled = raw.cancelledMetrics?.[0] || { cancelledCount: 0, cancelledSubOrders: 0 };

    return {
      date: dateStr,
      timezone: "Asia/Kolkata (IST)",
      grossSales: Math.round(gross.grossSales * 100) / 100,
      netDeliveredSales: Math.round(delivered.netSales * 100) / 100,
      ordersCount: gross.checkoutCount,
      deliveredOrdersCount: delivered.deliveredCount,
      inTransitOrdersCount: inTransit.inTransitCount,
      cancelledOrdersCount: cancelled.cancelledCount,
      subOrdersCount: gross.subOrderCount,
    };
  } catch (error) {
    console.error("Error computing Today KPIs:", error);
    return {
      date: dateStr,
      timezone: "Asia/Kolkata (IST)",
      grossSales: 0,
      netDeliveredSales: 0,
      ordersCount: 0,
      deliveredOrdersCount: 0,
      inTransitOrdersCount: 0,
      cancelledOrdersCount: 0,
      subOrdersCount: 0,
    };
  }
}

export async function getAdminDashboardStats() {
  const [totalCustomers, totalSellers, totalRiders, totalOrders, todayKpis] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      Seller.countDocuments(),
      Delivery.countDocuments(),
      Order.countDocuments(),
      getTodayKpis(),
    ]);

  const totalUsers = totalCustomers + totalSellers + totalRiders;
  const activeSellers = await Seller.countDocuments({ isVerified: true });

  const revenueData = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $group: { _id: null, total: { $sum: "$pricing.total" } } },
  ]);
  const totalRevenue = revenueData[0]?.total || 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historyAggregation = await Order.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, status: "delivered" } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: { $sum: "$pricing.total" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Create a map of existing revenue data
  const revenueMap = new Map(historyAggregation.map(item => [item._id, item.revenue]));
  
  // Fill in the last 30 days with 0 where no data exists
  const revenueHistory = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    revenueHistory.push({
      name: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      revenue: revenueMap.get(dateStr) || 0,
      fullDate: dateStr
    });
  }

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("customer", "name");

  const categoryData = await Product.aggregate([
    { $group: { _id: "$headerId", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    { $project: { name: "$category.name", value: "$count" } },
    { $limit: 4 },
  ]);

  const topProducts = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        sales: { $sum: "$items.quantity" },
        revenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.name",
        sales: 1,
        rev: "$revenue",
        image: "$product.mainImage",
      },
    },
  ]);

  return {
    today: todayKpis,
    overview: {
      totalUsers,
      activeSellers,
      totalOrders,
      totalRevenue,
    },
    revenueHistory,
    recentOrders: recentOrders.map((order) => ({
      id: order.orderId,
      customer: order.customer?.name || "Guest",
      statusText: order.status,
      status:
        order.status === "delivered"
          ? "success"
          : order.status === "cancelled"
            ? "error"
            : "warning",
      amount: `\u20B9${order.pricing.total}`,
      time: "Recently",
    })),
    categoryData: categoryData.map((category, index) => ({
      ...category,
      color: DASHBOARD_CATEGORY_COLORS[index % DASHBOARD_CATEGORY_COLORS.length],
    })),
    topProducts: topProducts.map((product) => ({
      name: product.name,
      sales: product.sales,
      rev: `\u20B9${product.rev.toFixed(2)}`,
      trend: "+5%",
      cat: "Product",
      image: product.image,
      icon: "\u{1F4E6}", // Fallback package icon
      color: "bg-blue-50 text-blue-600",
    })),
  };
}
