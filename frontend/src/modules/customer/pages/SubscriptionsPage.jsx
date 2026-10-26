import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Package,
  Plus,
  Play,
  Pause,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useToast } from "@shared/components/ui/Toast";

const SubscriptionsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      const res = await customerApi.getMySubscriptions();
      const payload = res?.data?.result || res?.data?.data || res?.data?.results || [];
      setSubscriptions(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      showToast("Unable to load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handlePause = async (id) => {
    setActionLoading(id);
    try {
      await customerApi.pauseSubscription(id);
      showToast("Subscription paused", "info");
      await fetchSubscriptions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to pause", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id) => {
    setActionLoading(id);
    try {
      await customerApi.resumeSubscription(id);
      showToast("Subscription resumed", "success");
      await fetchSubscriptions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to resume", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this meat subscription?")) return;
    setActionLoading(id);
    try {
      await customerApi.cancelSubscription(id, { reason: "User cancelled from web app" });
      showToast("Subscription cancelled", "info");
      await fetchSubscriptions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to cancel", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] font-poppins">
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-sm border border-[#EBE3D5]">
          <Loader2 className="animate-spin text-[#FDCE04]" size={22} />
          <span className="text-sm font-semibold text-[#1A1A1A]">Loading subscriptions…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] pb-24 font-poppins text-[#1A1A1A]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between shadow-sm select-none"
        style={{ background: "#FDCE04" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform rounded-full hover:bg-black/5 -ml-1"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <h1 className="text-[17px] sm:text-lg font-normal font-anton tracking-wide text-[#1A1A1A] uppercase">
            My Subscriptions
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-4 space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF08A]/40 rounded-2xl p-4 border border-[#FDE68A] shadow-sm flex items-start gap-3">
          <Calendar className="text-[#B45309] shrink-0 mt-0.5" size={22} />
          <div className="text-xs text-[#7A6A60] leading-relaxed">
            <p className="font-bold text-[#1A1A1A] text-[13px] mb-0.5">
              Fresh Meat On Your Schedule
            </p>
            Scheduled deliveries arrive automatically on your selected day. We never auto-charge your card; payment is handled via Cash on Delivery or Wallet upon arrival.
          </div>
        </div>

        {/* Empty State */}
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#EBE3D5] text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#FEF08A] flex items-center justify-center mx-auto mb-3 text-[#1A1A1A]">
              <Package size={30} />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A] mb-1">No Active Subscriptions</h3>
            <p className="text-xs text-[#7A6A60] max-w-sm mx-auto mb-5">
              Subscribe to your weekly chicken, mutton, or seafood staples so you never run out of fresh cuts.
            </p>
            <Link
              to="/categories"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {subscriptions.map((sub) => {
              const isActive = sub.status === "active";
              const isPaused = sub.status === "paused";
              const nextDeliveryDate = sub.nextOrderDate
                ? new Date(sub.nextOrderDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "TBD";

              return (
                <div
                  key={sub._id}
                  className="bg-white rounded-2xl p-4 border border-[#EBE3D5] shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#1A1A1A]">{sub.title}</h3>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isPaused
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A6A60] mt-0.5 font-medium flex items-center gap-2">
                        <span className="capitalize">{sub.frequency}</span> • Every {sub.deliveryDayOfWeek}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#A39282] uppercase block">
                        Next Delivery
                      </span>
                      <span className="text-xs font-extrabold text-[#1A1A1A]">
                        {nextDeliveryDate}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="bg-[#FAF6F0] rounded-xl p-2.5 space-y-1.5 border border-[#EBE3D5]/60">
                    <p className="text-[10px] font-bold uppercase text-[#7A6A60] tracking-wider">
                      Included Items ({sub.items?.length || 0})
                    </p>
                    <div className="space-y-1">
                      {sub.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-[#1A1A1A]"
                        >
                          <span className="font-medium truncate max-w-[200px]">
                            {it.productId?.name || "Product"}
                          </span>
                          <span className="font-bold text-[#7A6A60]">
                            {it.quantity} {it.unit || "pack"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery & Payment details */}
                  <div className="flex items-center justify-between text-[11px] text-[#7A6A60] pt-1 border-t border-[#F2EDE4]">
                    <div className="flex items-center gap-1.5 truncate max-w-[260px]">
                      <Clock size={13} className="shrink-0 text-[#B45309]" />
                      <span>{sub.deliveryTimeSlot}</span>
                    </div>
                    <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[10px] bg-[#FEF08A] px-2 py-0.5 rounded">
                      {sub.paymentPreference || "COD"}
                    </span>
                  </div>

                  {/* Controls */}
                  {sub.status !== "cancelled" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2EDE4]">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => handlePause(sub._id)}
                          disabled={actionLoading === sub._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBE3D5] text-xs font-semibold text-[#7A6A60] hover:bg-slate-50 active:scale-95 transition-all"
                        >
                          <Pause size={13} />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResume(sub._id)}
                          disabled={actionLoading === sub._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                          <Play size={13} />
                          <span>Resume</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCancel(sub._id)}
                        disabled={actionLoading === sub._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold active:scale-95 transition-all"
                      >
                        <XCircle size={13} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPage;
