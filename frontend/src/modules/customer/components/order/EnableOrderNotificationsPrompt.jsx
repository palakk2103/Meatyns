import { useEffect, useState } from "react";
import { Bell, Share, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  describePushSupport,
  ensureFcmTokenRegistered,
  hasRegisteredFcmToken,
} from "@core/firebase/pushClient";
import { rawGet, rawSet } from "@core/utils/storage";

const DISMISS_KEY = "order-notify-prompt:dismissed-at";
const DISMISS_FOR_MS = 3 * 24 * 60 * 60 * 1000; // ask again after 3 days

function wasRecentlyDismissed() {
  try {
    const at = Number(rawGet(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/**
 * Asks the customer to turn on order-update notifications. Shown on the
 * order page right after an order is placed. The browser only allows the
 * permission prompt from a tap, so this is a card with a button rather than
 * an automatic popup.
 *
 * Variants:
 *  - "enable": browser supports push, permission not yet granted
 *  - "ios":    iPhone/iPad Safari — push needs "Add to Home Screen" first
 *  - "denied": customer blocked notifications earlier — explain how to undo
 */
export default function EnableOrderNotificationsPrompt({ className = "" }) {
  const [variant, setVariant] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wasRecentlyDismissed()) return;
    const support = describePushSupport();

    if (!support.supported) {
      if (support.reason === "ios-safari-not-standalone") setVariant("ios");
      return;
    }
    if (support.reason === "flutter-native") return; // native app handles push

    const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
    if (permission === "granted" && hasRegisteredFcmToken("customer")) return;
    if (permission === "denied") {
      setVariant("denied");
      return;
    }
    setVariant("enable");
  }, []);

  const dismiss = () => {
    try {
      rawSet(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage unavailable — just hide for this visit
    }
    setVariant(null);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await ensureFcmTokenRegistered({ role: "customer", platform: "web" });
      toast.success("Notifications on — we'll update you about your order.");
      setVariant(null);
    } catch {
      const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
      if (permission === "denied") {
        setVariant("denied");
      } else {
        toast.error("Couldn't turn on notifications. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!variant) return null;

  return (
    <div
      className={`relative flex items-start gap-3 rounded-2xl border border-[#F5E3A0] bg-[#FFF8DC] p-4 shadow-sm ${className}`}
      role="status"
    >
      <div className="shrink-0 rounded-full bg-[#FDCE04] p-2 text-[#1A1A1A]">
        {variant === "ios" ? <Share size={18} /> : <Bell size={18} />}
      </div>

      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-bold text-[#1A1A1A]">Get order updates</p>

        {variant === "enable" && (
          <>
            <p className="mt-0.5 text-xs text-slate-600">
              Turn on notifications to know when your order is accepted, out for delivery, or if anything changes.
            </p>
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
              Turn on notifications
            </button>
          </>
        )}

        {variant === "ios" && (
          <p className="mt-0.5 text-xs text-slate-600">
            On iPhone, tap <span className="font-semibold">Share</span> then{" "}
            <span className="font-semibold">Add to Home Screen</span>, open the app from your Home Screen, and turn on
            notifications there.
          </p>
        )}

        {variant === "denied" && (
          <p className="mt-0.5 text-xs text-slate-600">
            Notifications are blocked for this site. Tap the lock icon next to the address bar, allow{" "}
            <span className="font-semibold">Notifications</span>, then reload this page.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1.5 text-slate-500 hover:bg-black/5"
      >
        <X size={16} />
      </button>
    </div>
  );
}
