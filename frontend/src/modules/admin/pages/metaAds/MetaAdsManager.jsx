import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Layers,
  TrendingUp,
  Radio,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { metaAdminApi } from "../../services/metaAdminApi";
import MetaOverviewTab from "./MetaOverviewTab";
import MetaConnectTab from "./MetaConnectTab";
import MetaCampaignsTab from "./MetaCampaignsTab";
import MetaAnalyticsTab from "./MetaAnalyticsTab";
import MetaTrackingTab from "./MetaTrackingTab";
import MetaSettingsTab from "./MetaSettingsTab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/admin/meta-ads" },
  { id: "connect", label: "Account Connection", icon: Link2, path: "/admin/meta-ads/connect" },
  { id: "campaigns", label: "Campaigns", icon: Layers, path: "/admin/meta-ads/campaigns" },
  { id: "analytics", label: "Performance Analytics", icon: TrendingUp, path: "/admin/meta-ads/analytics" },
  { id: "tracking", label: "Pixel & CAPI Tracking", icon: Radio, path: "/admin/meta-ads/tracking" },
  { id: "settings", label: "Integration Settings", icon: Sliders, path: "/admin/meta-ads/settings" },
];

const MetaAdsManager = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const currentPath = location.pathname;
  let activeTabId = "overview";
  if (currentPath.includes("/connect")) activeTabId = "connect";
  else if (currentPath.includes("/campaigns")) activeTabId = "campaigns";
  else if (currentPath.includes("/analytics")) activeTabId = "analytics";
  else if (currentPath.includes("/tracking")) activeTabId = "tracking";
  else if (currentPath.includes("/settings")) activeTabId = "settings";

  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatusAndOverview = async () => {
    try {
      setLoading(true);
      const [statusRes, analyticsRes] = await Promise.allSettled([
        metaAdminApi.getStatus(),
        metaAdminApi.getAnalytics({ datePreset: "last_30d" }),
      ]);

      if (statusRes.status === "fulfilled" && statusRes.value.data?.success) {
        setStatus(statusRes.value.data.result);
      }
      if (analyticsRes.status === "fulfilled" && analyticsRes.value.data?.success) {
        setAnalytics(analyticsRes.value.data.result);
      }
    } catch (err) {
      console.error("Failed to fetch Meta status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndOverview();
  }, []);

  const handleTabChange = (tabId) => {
    const target = TABS.find((t) => t.id === tabId);
    if (target) {
      navigate(target.path);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-outfit">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Marketing &amp; Meta Ads
            {status?.isConnected && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                Connected
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage Meta Marketing API connection, campaign drafts, real-time Conversions API (CAPI) events, and blended ROAS analytics.
          </p>
        </div>

        <button
          onClick={fetchStatusAndOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 sm:space-x-2 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Body */}
      <div>
        {activeTabId === "overview" && (
          <MetaOverviewTab
            status={status}
            analytics={analytics}
            onTabChange={handleTabChange}
          />
        )}
        {activeTabId === "connect" && (
          <MetaConnectTab
            status={status}
            onRefresh={fetchStatusAndOverview}
          />
        )}
        {activeTabId === "campaigns" && (
          <MetaCampaignsTab
            status={status}
            onNavigateToConnect={() => handleTabChange("connect")}
            onRefresh={fetchStatusAndOverview}
          />
        )}
        {activeTabId === "analytics" && (
          <MetaAnalyticsTab
            status={status}
          />
        )}
        {activeTabId === "tracking" && (
          <MetaTrackingTab
            status={status}
          />
        )}
        {activeTabId === "settings" && (
          <MetaSettingsTab
            status={status}
            onRefresh={fetchStatusAndOverview}
          />
        )}
      </div>
    </div>
  );
};

export default MetaAdsManager;
