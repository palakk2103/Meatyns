import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  RefreshCw,
  Info,
  DollarSign,
  MousePointer,
  Eye,
  Target,
} from "lucide-react";
import { metaAdminApi } from "../../services/metaAdminApi";
import { useToast } from "@shared/components/ui/Toast";

const DATE_PRESETS = [
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "last_90d", label: "Last 90 Days" },
];

const MetaAnalyticsTab = ({ status }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState("last_30d");
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await metaAdminApi.getAnalytics({ datePreset });
      if (res.data?.success) {
        setAnalyticsData(res.data.result);
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to load Meta analytics.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [datePreset]);

  const meta = analyticsData?.metaAdvertising || {};
  const internal = analyticsData?.internalAttribution || {};
  const isMetaConnected = analyticsData?.metaConnected;

  return (
    <div className="space-y-6">
      {/* Date Filter & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Reporting Period:
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  datePreset === p.value
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="p-2 self-start sm:self-auto rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!isMetaConnected && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Meta Marketing API Notice:</strong>{" "}
            {analyticsData?.metaApiMessage || "Meta Account is not connected. Meta-reported spend and impressions are unavailable. Internal Meatyns order attribution is shown below."}
          </div>
        </div>
      )}

      {/* Main KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ad Spend */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Meta Ad Spend</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {isMetaConnected ? `₹${(meta.spend || 0).toLocaleString("en-IN")}` : "—"}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Source: Meta Graph API</p>
        </div>

        {/* Meatyns Attributed Revenue */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Attributed Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ₹{(internal.attributedRevenue || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Source: {internal.attributedOrdersCount || 0} Meatyns verified orders
          </p>
        </div>

        {/* Blended ROAS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Blended ROAS</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {internal.blendedRoas ? `${internal.blendedRoas}x` : "—"}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {meta.spend > 0 ? "Attributed Revenue / Meta Spend" : "Zero spend denominator"}
          </p>
        </div>

        {/* Cost Per Click */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. CPC</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600">
              <MousePointer className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {isMetaConnected && meta.cpc ? `₹${meta.cpc.toFixed(2)}` : "—"}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {isMetaConnected ? `CTR: ${meta.ctr ? meta.ctr.toFixed(2) : 0}%` : "Source: Meta API"}
          </p>
        </div>
      </div>

      {/* Comparison Grid: Meta-Reported vs Meatyns-Verified */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Advertising Platform Stats */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              Meta Platform Insights (Top-of-Funnel)
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-medium">
              Meta Graph API
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Impressions</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {isMetaConnected ? (meta.impressions || 0).toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Reach</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {isMetaConnected ? (meta.reach || 0).toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Link Clicks</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {isMetaConnected ? (meta.clicks || 0).toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Click-Through Rate (CTR)</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {isMetaConnected && meta.ctr ? `${meta.ctr.toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Meta Reported Conversions</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {isMetaConnected ? (meta.metaPurchases || 0).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Meatyns Internal Attribution Stats */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Meatyns Internal Attribution (Bottom-of-Funnel)
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium">
              Meatyns Database
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Attributed Orders Count</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {(internal.attributedOrdersCount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Attributed Revenue</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{(internal.attributedRevenue || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Average Order Value (AOV)</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {internal.attributedOrdersCount > 0
                  ? `₹${Math.round(internal.attributedRevenue / internal.attributedOrdersCount).toLocaleString("en-IN")}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
              <span className="text-gray-500">Calculated Return on Ad Spend (ROAS)</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {internal.blendedRoas ? `${internal.blendedRoas}x` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Attribution Model</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Last-Touch (fbclid / Meta UTMs)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attribution Methodology Note */}
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 text-xs text-gray-500 leading-relaxed">
        <strong>Attribution Transparency:</strong> Meatyns records click identifiers (<code>fbclid</code>) and campaign UTMs when visitors land on the store. Meta-reported purchases and Meatyns-attributed orders may differ due to iOS private click measurements, browser cookie consent opt-outs, and Meta's 7-day click / 1-day view attribution window.
      </div>
    </div>
  );
};

export default MetaAnalyticsTab;
