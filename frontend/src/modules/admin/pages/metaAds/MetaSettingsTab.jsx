import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Radio,
  Sliders,
  CheckCircle2,
  Save,
  HelpCircle,
} from "lucide-react";
import { metaAdminApi } from "../../services/metaAdminApi";
import { useToast } from "@shared/components/ui/Toast";

const MetaSettingsTab = ({ status, onRefresh }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pixelId, setPixelId] = useState(status?.selectedPixel?.id || "");
  const [pixelEnabled, setPixelEnabled] = useState(
    status?.pixelEnabled !== false
  );
  const [capiEnabled, setCapiEnabled] = useState(
    status?.capiEnabled !== false
  );
  const [testEventCode, setTestEventCode] = useState(
    status?.testEventCode || ""
  );

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await metaAdminApi.updateSettings({
        pixelId: pixelId.trim(),
        pixelEnabled,
        capiEnabled,
        testEventCode: testEventCode.trim(),
      });
      showToast("Meta integration settings saved.", "success");
      onRefresh();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update Meta settings.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Meta Tracking & CAPI Configuration
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure dataset identifiers, toggles, and test codes for browser Pixel and server-side Conversions API.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          {/* Pixel ID */}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Meta Pixel ID / Dataset ID
            </label>
            <input
              type="text"
              placeholder="e.g. 123456789012345"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              className="w-full max-w-md p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Found under Meta Events Manager &gt; Data Sources. Used by both browser Pixel tracking and Node.js CAPI.
            </p>
          </div>

          {/* Test Event Code */}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Test Event Code (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TEST12345"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              className="w-full max-w-md p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Use this when testing Conversions API in Meta Events Manager &gt; "Test Events" tab. Leave blank for normal operations.
            </p>
          </div>

          {/* Toggles */}
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pixelEnabled}
                onChange={(e) => setPixelEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Enable Client-Side Meta Pixel Tracking
                </span>
                <p className="text-[11px] text-gray-500">
                  Injects the official Meta Pixel snippet on customer store pages to track PageView, ViewContent, Search, AddToCart, and InitiateCheckout.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={capiEnabled}
                onChange={(e) => setCapiEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Enable Node.js Conversions API (CAPI)
                </span>
                <p className="text-[11px] text-gray-500">
                  Sends verified, hashed server-side Purchase conversion events directly from the backend with deterministic deduplication event IDs.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};

export default MetaSettingsTab;
