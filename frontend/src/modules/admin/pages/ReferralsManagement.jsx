import React, { useEffect, useState } from "react";
import {
  Gift,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Coins,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { adminRetentionApi } from "../services/api/retentionApi";
import { useToast } from "@shared/components/ui/Toast";

const ReferralsManagement = () => {
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [listRes, statsRes] = await Promise.all([
        adminRetentionApi.getAllReferrals(params),
        adminRetentionApi.getReferralStats(),
      ]);

      const listData = listRes?.data?.result || listRes?.data?.data || {};
      setReferrals(listData.items || (Array.isArray(listData) ? listData : []));

      const statsData = statsRes?.data?.result || statsRes?.data?.data || null;
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load referrals:", err);
      showToast("Failed to load referrals data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const filtered = referrals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const referrerName = r.referrerId?.name?.toLowerCase() || "";
    const refereeName = r.refereeId?.name?.toLowerCase() || "";
    const code = r.referralCode?.toLowerCase() || "";
    return referrerName.includes(q) || refereeName.includes(q) || code.includes(q);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 font-poppins">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Gift className="text-purple-600" size={24} />
          <span>Referral Program & Invites</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor customer invitations, qualifying order conversions, and wallet reward distribution.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Invites</span>
            <Users size={18} className="text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.totalReferrals ?? 0}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Converted</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.successfulReferrals ?? 0}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conversion Rate</span>
            <TrendingUp size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.conversionRate ?? "0.0"}%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rewards Credited</span>
            <Coins size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{stats?.totalDistributed ?? 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by referrer, friend name, or referral code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-400"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="rewarded">Rewarded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-600" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Gift size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No referral activity found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Referrer</th>
                  <th className="py-3 px-4">Invited Friend</th>
                  <th className="py-3 px-4">Code Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reward</th>
                  <th className="py-3 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {r.referrerId?.name || "Customer"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.referrerId?.phone || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {r.refereeId?.name || "Friend"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.refereeId?.phone || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {r.referralCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === "rewarded"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{r.referrerRewardAmount || 100}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
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

export default ReferralsManagement;
