import React, { useEffect, useState } from "react";
import {
  Calendar,
  Search,
  Filter,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  User,
  Package,
} from "lucide-react";
import { adminRetentionApi } from "../services/api/retentionApi";
import { useToast } from "@shared/components/ui/Toast";

const SubscriptionsManagement = () => {
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningBatch, setRunningBatch] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await adminRetentionApi.getAllSubscriptions(params);
      const data = res?.data?.result || res?.data?.data || {};
      setSubscriptions(data.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to load admin subscriptions:", err);
      showToast("Failed to load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const handleRunBatch = async () => {
    if (!window.confirm("Execute scheduled order generation for all subscriptions due today?")) return;
    setRunningBatch(true);
    try {
      const res = await adminRetentionApi.triggerSubscriptionBatch();
      const info = res?.data?.result || {};
      showToast(
        `Batch run complete! Processed: ${info.processed || 0}, Orders Generated: ${info.ordersGenerated || 0}`,
        "success"
      );
      await fetchSubscriptions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to run batch", "error");
    } finally {
      setRunningBatch(false);
    }
  };

  const filtered = subscriptions.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = sub.customerId?.name?.toLowerCase() || "";
    const phone = sub.customerId?.phone || "";
    const title = sub.title?.toLowerCase() || "";
    return name.includes(q) || phone.includes(q) || title.includes(q);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 font-poppins">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-amber-500" size={24} />
            <span>Customer Subscriptions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage recurring scheduled meat delivery plans and batch executions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunBatch}
          disabled={runningBatch}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-50"
        >
          {runningBatch ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          <span>Execute Due Batch</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-500" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Title & Items</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Next Delivery</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filtered.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {sub.customerId?.name || "Customer"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sub.customerId?.phone || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{sub.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {sub.items?.map((it) => it.productId?.name || "Item").join(", ")}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-slate-700">
                        {sub.frequency}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        Every {sub.deliveryDayOfWeek}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {sub.nextOrderDate
                        ? new Date(sub.nextOrderDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sub.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sub.status === "paused"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsManagement;
