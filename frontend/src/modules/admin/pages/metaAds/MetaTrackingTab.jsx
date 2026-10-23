import React, { useState, useEffect } from "react";
import {
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Filter,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { metaAdminApi } from "../../services/metaAdminApi";
import { useToast } from "@shared/components/ui/Toast";

const MetaTrackingTab = ({ status }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;

      const res = await metaAdminApi.getConversionEvents(params);
      if (res.data?.success) {
        setEvents(res.data.result?.events || []);
        setPagination({
          page: res.data.result?.page || 1,
          totalPages: res.data.result?.totalPages || 1,
          total: res.data.result?.total || 0,
        });
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to load conversion event logs.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
  }, [statusFilter]);

  const handleRetry = async (eventId, mongoId) => {
    try {
      setRetryingId(mongoId);
      const res = await metaAdminApi.retryConversionEvent(mongoId);
      if (res.data?.success) {
        showToast("Conversion event re-dispatched to Meta CAPI.", "success");
        fetchEvents(pagination.page);
      } else {
        showToast(res.data?.message || "Retry failed.", "error");
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to retry conversion event.",
        "error"
      );
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Delivery Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Events ({pagination.total})</option>
            <option value="SENT">Sent Successfully</option>
            <option value="FAILED">Failed Deliveries</option>
            <option value="PENDING">Pending / Queued</option>
          </select>
        </div>

        <button
          onClick={() => fetchEvents(pagination.page)}
          disabled={loading}
          className="p-2 self-start sm:self-auto rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Event ID / Order</th>
                <th className="py-3 px-4">Event Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Retries</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {events.length > 0 ? (
                events.map((evt) => {
                  const isSent = evt.status === "SENT";
                  const isFailed = evt.status === "FAILED";
                  return (
                    <tr key={evt._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {evt.orderId ? `Order #${evt.orderId}` : "Browser Action"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {evt.eventId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                        {evt.eventName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            isSent
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : isFailed
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {isSent && <CheckCircle2 className="w-3 h-3" />}
                          {isFailed && <XCircle className="w-3 h-3" />}
                          {!isSent && !isFailed && <Clock className="w-3 h-3" />}
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {evt.value > 0 ? `₹${evt.value.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3.5 px-4">{evt.retryCount || 0}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                          title="Inspect payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isFailed && (
                          <button
                            type="button"
                            disabled={retryingId === evt._id}
                            onClick={() => handleRetry(evt.eventId, evt._id)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 transition-colors"
                            title="Retry dispatch"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${retryingId === evt._id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500 text-xs">
                    {loading ? "Loading CAPI events..." : "No conversion events recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total events)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchEvents(pagination.page - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchEvents(pagination.page + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                CAPI Event Details
              </h4>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Deterministic Event ID:</span>
                <p className="font-mono text-gray-500 mt-0.5">{selectedEvent.eventId}</p>
              </div>

              {selectedEvent.error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                  <strong>Delivery Error:</strong> {selectedEvent.error}
                </div>
              )}

              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Payload Sent to Meta:</span>
                <pre className="mt-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-[11px] font-mono overflow-x-auto text-gray-800 dark:text-gray-200 max-h-48">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {selectedEvent.response && (
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Meta API Response:</span>
                  <pre className="mt-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-[11px] font-mono overflow-x-auto text-emerald-800 dark:text-emerald-300 max-h-48">
                    {JSON.stringify(selectedEvent.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaTrackingTab;
