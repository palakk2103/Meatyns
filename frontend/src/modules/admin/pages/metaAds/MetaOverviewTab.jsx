import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Radio,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const MetaOverviewTab = ({ status, analytics, onTabChange }) => {
  const isConnected = status?.isConnected;
  const adAccount = status?.selectedAdAccount;
  const pixel = status?.selectedPixel;
  const metaAds = analytics?.metaAdvertising || {};
  const internal = analytics?.internalAttribution || {};

  return (
    <div className="space-y-6">
      {/* Connection Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          isConnected
            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200"
            : "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200"
        }`}
      >
        <div className="flex items-start md:items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isConnected ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-white flex items-center gap-2">
              Meta Integration: {isConnected ? "Connected & Active" : "Action Required — Disconnected"}
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  isConnected
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                }`}
              >
                {isConnected ? "LIVE SYNC" : "DISCONNECTED"}
              </span>
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {isConnected
                ? `Bound to Ad Account: ${adAccount?.name || adAccount?.id} (${adAccount?.currency || "INR"}) and Pixel: ${pixel?.id || "Configured"}`
                : "Authorize your Meta Business Account via official OAuth or configure Pixel & CAPI credentials to track ad performance."}
            </p>
          </div>
        </div>

        <button
          onClick={() => onTabChange("connect")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 transition-colors shadow-sm self-start md:self-auto shrink-0"
        >
          {isConnected ? "Manage Account" : "Connect Meta Account"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meta Ad Spend */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Meta Spend (30d)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {isConnected ? `₹${(metaAds.spend || 0).toLocaleString("en-IN")}` : "—"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isConnected ? `${metaAds.impressions?.toLocaleString() || 0} impressions` : "Meta account disconnected"}
          </p>
        </div>

        {/* Meatyns Attributed Revenue */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Attributed Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ₹{(internal.attributedRevenue || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {internal.attributedOrdersCount || 0} verified Meatyns orders
          </p>
        </div>

        {/* Blended ROAS */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Blended ROAS</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {internal.blendedRoas ? `${internal.blendedRoas}x` : "—"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {metaAds.spend > 0 ? "Revenue / Meta Ad Spend" : "Requires spend data"}
          </p>
        </div>

        {/* Tracking Health */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tracking Health</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status?.pixelEnabled && status?.capiEnabled ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {status?.pixelEnabled && status?.capiEnabled ? "Pixel + CAPI Active" : "Partial Tracking"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {status?.selectedPixel?.id ? `Pixel ID: ${status.selectedPixel.id}` : "Pixel unconfigured"}
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onTabChange("campaigns")}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Campaign Manager</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            View active campaigns, create safe drafts in PAUSED state, and manage ad status with explicit confirmations.
          </p>
        </div>

        <div
          onClick={() => onTabChange("analytics")}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Performance Analytics</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Compare Meta-reported conversions against verified internal Meatyns orders and calculate authoritative ROAS.
          </p>
        </div>

        <div
          onClick={() => onTabChange("tracking")}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5" />
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Pixel & CAPI Events</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Monitor real-time server conversion dispatching, deduplicated event IDs, and manual retry of failed events.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MetaOverviewTab;
