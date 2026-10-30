import React, { useState, useEffect } from "react";
import {
  Plus,
  Play,
  Pause,
  Layers,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { metaAdminApi } from "../../services/metaAdminApi";
import { useToast } from "@shared/components/ui/Toast";

const OBJECTIVES = [
  { value: "OUTCOME_SALES", label: "Sales & Conversions (Recommended for E-Commerce)" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic (Drive visitors to Meatyns)" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
  { value: "OUTCOME_AWARENESS", label: "Brand Awareness" },
];

const MetaCampaignsTab = ({ status, onNavigateToConnect, onRefresh }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    objective: "OUTCOME_SALES",
    dailyBudget: "500",
  });

  // Status Change Confirmation State
  const [statusTarget, setStatusTarget] = useState(null); // { id, name, nextStatus }

  const isConnected = status?.isConnected && status?.selectedAdAccount?.id;

  const fetchCampaigns = async () => {
    if (!isConnected) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await metaAdminApi.getCampaigns();
      if (res.data?.success) {
        setCampaigns(res.data.result?.campaigns || []);
        if (res.data.result?.error) {
          setErrorMsg(res.data.result.error);
        }
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to load Meta campaigns."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [isConnected]);

  // Submit Draft Campaign after user confirmation
  const handleConfirmCreateDraft = async () => {
    try {
      setLoading(true);
      setShowConfirmModal(false);
      setShowCreateModal(false);

      const res = await metaAdminApi.createCampaignDraft({
        name: newCampaign.name,
        objective: newCampaign.objective,
        dailyBudget: Number(newCampaign.dailyBudget),
        confirmed: true,
      });

      showToast(
        res.data?.message || "Campaign draft created in PAUSED status.",
        "success"
      );
      setNewCampaign({ name: "", objective: "OUTCOME_SALES", dailyBudget: "500" });
      fetchCampaigns();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to create campaign draft on Meta.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit Status Change after user confirmation
  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    try {
      setLoading(true);
      const res = await metaAdminApi.updateCampaignStatus(statusTarget.id, {
        status: statusTarget.nextStatus,
        confirmed: true,
      });
      showToast(
        `Campaign status changed to ${statusTarget.nextStatus}.`,
        "success"
      );
      setStatusTarget(null);
      fetchCampaigns();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update campaign status.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDemo = async () => {
    try {
      setLoading(true);
      await metaAdminApi.connectDemo();
      showToast("Demo Meta account connected with live test data!", "success");
      if (onRefresh) onRefresh();
      fetchCampaigns();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to connect demo Meta account.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          No Meta Ad Account Connected
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-6">
          To view and manage campaigns, please connect your Meta Business Account via OAuth and select an authorized Ad Account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleConnectDemo}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all"
            title="Simulate full Meta integration with live metrics & campaigns for client showcase"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" /> Connect Demo / Test Account
          </button>
          <button
            type="button"
            onClick={onNavigateToConnect}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Connect Meta Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCampaigns}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Create Campaign Draft
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Objective</th>
                <th className="py-3 px-4">Daily Budget</th>
                <th className="py-3 px-4">Spend</th>
                <th className="py-3 px-4">Impressions</th>
                <th className="py-3 px-4">Clicks (CTR)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((c) => {
                  const isActive = c.status === "ACTIVE";
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                        {c.name}
                        <div className="text-[10px] text-gray-400 font-normal">ID: {c.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                        {c.objective || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {c.dailyBudget ? `₹${c.dailyBudget.toLocaleString("en-IN")}/day` : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">
                        ₹{(c.metrics?.spend || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4">
                        {(c.metrics?.impressions || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {(c.metrics?.clicks || 0).toLocaleString()}{" "}
                        <span className="text-[10px] text-gray-400">
                          ({Number(c.metrics?.ctr || 0).toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setStatusTarget({
                              id: c.id,
                              name: c.name,
                              nextStatus: isActive ? "PAUSED" : "ACTIVE",
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            isActive
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-400"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Pause className="w-3 h-3" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" /> Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500 text-xs">
                    {loading ? "Loading campaigns from Meta..." : "No campaigns found for this ad account."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Draft Modal (Step 1: Input) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Create Campaign Draft
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meatyns Fresh Cuts - Weekend Promo"
                  value={newCampaign.name}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, name: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objective
                </label>
                <select
                  value={newCampaign.objective}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, objective: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {OBJECTIVES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Daily Budget (INR)
                </label>
                <input
                  type="number"
                  min="100"
                  placeholder="500"
                  value={newCampaign.dailyBudget}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, dailyBudget: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Note: Campaign will be created in <strong>PAUSED</strong> state as a safety measure. It will not spend real budget until explicitly published and activated.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newCampaign.name.trim()}
                onClick={() => {
                  setShowCreateModal(false);
                  setShowConfirmModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Review & Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Step 2: Explicit Safety Confirmation) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Confirm Campaign Draft Creation
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Please confirm the proposed campaign details before sending to Meta:
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Ad Account:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {status?.selectedAdAccount?.name} ({status?.selectedAdAccount?.id})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Campaign Name:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {newCampaign.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Objective:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {newCampaign.objective}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Proposed Daily Budget:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₹{Number(newCampaign.dailyBudget).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Initial Status:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  PAUSED (Draft mode)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmCreateDraft}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                Confirm & Create Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Status Change
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Are you sure you want to change campaign <strong>{statusTarget.name}</strong> to{" "}
              <strong className={statusTarget.nextStatus === "ACTIVE" ? "text-emerald-600" : "text-amber-600"}>
                {statusTarget.nextStatus}
              </strong>
              ?
              {statusTarget.nextStatus === "ACTIVE" && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  Warning: Activating this campaign will enable real Meta ad delivery and consume budget.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmStatusChange}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs ${
                  statusTarget.nextStatus === "ACTIVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                Confirm {statusTarget.nextStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaCampaignsTab;
