import React, { useState } from "react";
import {
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { metaAdminApi } from "../../services/metaAdminApi";
import { useToast } from "@shared/components/ui/Toast";

const MetaConnectTab = ({ status, onRefresh }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedAccId, setSelectedAccId] = useState(
    status?.selectedAdAccount?.id || ""
  );
  const [selectedPixId, setSelectedPixId] = useState(
    status?.selectedPixel?.id || ""
  );
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const isConnected = status?.isConnected;

  const handleInitiateOAuth = async () => {
    try {
      setLoading(true);
      const res = await metaAdminApi.getOAuthUrl();
      if (res.data?.success && res.data.result?.authUrl) {
        window.location.href = res.data.result.authUrl;
      } else {
        showToast("Could not generate Meta OAuth URL.", "error");
      }
    } catch (err) {
      showToast(
        "Real Meta App ID is not configured yet. Click 'Connect Demo / Test Account' to test the full integration with live data!",
        "info"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelection = async () => {
    try {
      setLoading(true);
      await metaAdminApi.selectAccount({
        adAccountId: selectedAccId,
        pixelId: selectedPixId,
      });
      showToast("Ad account and Pixel selection saved successfully.", "success");
      onRefresh();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update account selection.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await metaAdminApi.disconnect();
      setShowDisconnectModal(false);
      showToast("Meta account disconnected securely.", "info");
      onRefresh();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to disconnect Meta account.",
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
      onRefresh();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to connect demo Meta account.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OAuth Connection Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Meta OAuth 2.0 Connection
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">
                  Disconnected
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Connect via official Meta Business login to automatically sync your ad accounts, campaigns, and pixel datasets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <button
                type="button"
                onClick={() => setShowDisconnectModal(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" /> Disconnect
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleConnectDemo}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all"
                  title="Simulate full Meta integration with live metrics & campaigns for client showcase"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" /> Connect Demo / Test Account
                </button>
                <button
                  type="button"
                  onClick={handleInitiateOAuth}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <Link2 className="w-4 h-4" /> Connect with Meta
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh connection status"
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connected Account Details */}
        {isConnected ? (
          <div className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Connected User</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {status?.connectedUser?.name || "Meta User"}
                </p>
                <p className="text-xs text-gray-500">ID: {status?.connectedUser?.id || "N/A"}</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Active Ad Account</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {status?.selectedAdAccount?.name || "None Selected"}
                </p>
                <p className="text-xs text-gray-500">
                  {status?.selectedAdAccount?.id ? `ID: ${status.selectedAdAccount.id}` : "Please select an account below"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Active Pixel / Dataset</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {status?.selectedPixel?.name || status?.selectedPixel?.id || "None Selected"}
                </p>
                <p className="text-xs text-gray-500">
                  {status?.selectedPixel?.id ? `ID: ${status.selectedPixel.id}` : "Configure pixel ID below"}
                </p>
              </div>
            </div>

            {/* Account & Pixel Selectors */}
            <div className="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Select Business Assets
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Ad Account
                  </label>
                  <select
                    value={selectedAccId}
                    onChange={(e) => setSelectedAccId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="">-- Select Ad Account --</option>
                    {(status?.adAccounts || []).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.id}) — {acc.currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tracking Pixel
                  </label>
                  <select
                    value={selectedPixId}
                    onChange={(e) => setSelectedPixId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="">-- Select Pixel --</option>
                    {(status?.pixels || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSelection}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 transition-colors shadow-xs"
              >
                Save Selected Assets
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-6">
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                <strong>External Meta Setup Checklist:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-blue-800 dark:text-blue-300">
                  <li>Create a Meta App in <code>developers.facebook.com</code> of type <strong>Business</strong>.</li>
                  <li>Add <strong>Marketing API</strong> product to the Meta App.</li>
                  <li>Set Valid OAuth Redirect URI to: <code>{window.location.origin}/api/admin/meta/oauth/callback</code></li>
                  <li>Configure <code>META_APP_ID</code> and <code>META_APP_SECRET</code> in <code>backend/.env</code>.</li>
                  <li>If your app is in Development Mode, add your Facebook account as an Administrator or Developer under App Roles.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Disconnect Meta Integration?
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Disconnecting will revoke server access tokens and halt automatic campaign synchronization.
              Historical order attribution data in Meatyns will remain intact.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaConnectTab;
