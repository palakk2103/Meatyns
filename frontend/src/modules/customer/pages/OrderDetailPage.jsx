import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import InvoiceModal from "../components/order/InvoiceModal";
import HelpModal from "../components/order/HelpModal";
import LiveTrackingMap from "../components/order/LiveTrackingMap";
import DeliveryOtpDisplay from "../components/DeliveryOtpDisplay";
import OrderProgressTracker from "../components/order/OrderProgressTracker";
import ReturnProgressTracker from "../components/order/ReturnProgressTracker";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  Download,
  HelpCircle,
  Phone,
  MessageSquare,
  ArrowRight,
  User,
  Loader2,
  Store,
  Navigation2,
  Camera,
  X,
  Bike,
  ShieldCheck,
  Check,
  Zap,
  CalendarDays,
  RotateCcw,
  AlertCircle,
  Heart,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { toast } from "sonner";
import { subscribeToOrderLocation, subscribeToOrderTrail, subscribeToOrderRoute } from "@/core/services/trackingClient";
import {
  useOrderIdentifiers,
  resolveOrderIdentifiers,
} from "../hooks/useOrderIdentifiers";
import {
  getOrderSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderStatusUpdate,
  onCustomerOtp,
  onReturnPickupOtp,
  onReturnDropOtp,
} from "@/core/services/orderSocket";
import { getLegacyStatusFromOrder } from "@/shared/utils/orderStatus";
import { createSocketTokenReader } from "@core/utils/authStorage";
import { STORAGE_KEYS } from "@core/utils/storage";

const coordsToLatLng = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
};

const hasValidLatLng = (location) =>
  location &&
  typeof location.lat === "number" &&
  typeof location.lng === "number" &&
  Number.isFinite(location.lat) &&
  Number.isFinite(location.lng);

const DEFAULT_CITY_SPEED_KMPH = 24;
const ROUTE_REFRESH_THRESHOLD_M = 150;
const ROUTE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const toRadians = (value) => (value * Math.PI) / 180;

const distanceMeters = (from, to) => {
  if (!hasValidLatLng(from) || !hasValidLatLng(to)) return null;
  const r = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatArrivalTime = (arrivalMs) =>
  new Date(arrivalMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const formatArrivingIn = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return "Soon";
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} min${rounded === 1 ? "" : "s"}`;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  if (meters < 1000) {
    return `${Math.max(50, Math.round(meters / 10) * 10)} m`;
  }
  return `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km`;
};

const estimateMinutesFromDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return (meters * 60) / (DEFAULT_CITY_SPEED_KMPH * 1000);
};

const getTrackingRoutePhase = (order) => {
  if (!order) return "pickup";

  const workflowStatus = String(order.workflowStatus || "").toUpperCase();
  const legacyStatus = String(order.status || "").toLowerCase();
  const riderStep = Number(order.deliveryRiderStep) || 0;

  const isDeliveryPhase =
    workflowStatus === "OUT_FOR_DELIVERY" ||
    workflowStatus === "DELIVERED" ||
    legacyStatus === "out_for_delivery" ||
    legacyStatus === "delivered" ||
    riderStep >= 3 ||
    Boolean(order.pickupConfirmedAt);

  return isDeliveryPhase ? "delivery" : "pickup";
};

const matchesOrderIdentifier = (payloadOrderId, identifiers = []) => {
  const normalizedPayloadId = String(payloadOrderId || "").trim();
  if (!normalizedPayloadId) return false;
  return identifiers
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .includes(normalizedPayloadId);
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const [showInvoice, setShowInvoice] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnDetails, setReturnDetails] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [selectedReturnItems, setSelectedReturnItems] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonDetail, setReturnReasonDetail] = useState("");
  const [returnConditionAssurance, setReturnConditionAssurance] = useState(false);
  const [returnImages, setReturnImages] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [trail, setTrail] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [handoffOtp, setHandoffOtp] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());
  const parsedReturnWindowMinutes = parseInt(
    import.meta.env.VITE_RETURN_WINDOW_MINUTES || "2",
    10,
  );
  const returnWindowMinutes =
    Number.isFinite(parsedReturnWindowMinutes) && parsedReturnWindowMinutes > 0
      ? parsedReturnWindowMinutes
      : 2;
  const routeOriginRef = useRef(null);
  const routeRequestRef = useRef({ phase: "", startedAt: 0 });
  const [returnCountdown, setReturnCountdown] = useState(null);
  const refreshRef = useRef({ inFlight: false, lastAt: 0 });
  const extraRoomRef = useRef("");

  // Single source of truth for the various ids that may refer to this
  // order (URL param vs canonical order.orderId vs checkoutGroupId). The
  // hook exposes:
  //   - canonicalOrderId : id to use for realtime fan-out (RTDB + sockets)
  //   - identifiersRef   : .current array kept in sync for socket callbacks
  //   - extraRoomId      : canonical id when it differs from the URL param
  // `lookupId` is also available from the hook for callers that need a
  // REST-friendly id; this page derives it ad hoc via `resolveOrderLookupId`
  // because the value is needed against freshly-fetched data before state
  // settles, which the pure helper handles directly.
  const {
    canonicalOrderId,
    identifiersRef,
    extraRoomId,
  } = useOrderIdentifiers(orderId, order);

  const navigate = useNavigate();
  // Pure helper for resolving the lookup id from a freshly-fetched order
  // before React state has settled (e.g. inside the initial fetch effect).
  const resolveOrderLookupId = (ord) =>
    resolveOrderIdentifiers(ord, orderId).lookupId || "";

  const handleBack = () => {
    const idx = window?.history?.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/orders");
  };

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId || orderId === "undefined" || orderId === "null") return;
    try {
      refreshRef.current.inFlight = true;
      const response = await customerApi.getOrderDetails(orderId);
      const ord = response.data.result;
      setOrder(ord);

      try {
        const retRes = await customerApi.getReturnDetails(resolveOrderLookupId(ord));
        const ret = retRes.data.result;
        setReturnDetails(ret);
        if (ret?.returnPickupOtp) {
          setHandoffOtp(ret.returnPickupOtp);
        }
      } catch {
        setReturnDetails(null);
      }
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Failed to load order details");
    } finally {
      refreshRef.current.inFlight = false;
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const isInvalid = !orderId || orderId === "undefined" || orderId === "null";
    if (isInvalid) {
      console.warn(`[OrderDetailPage] Invalid orderId from URL: ${orderId}. Redirecting...`);
      navigate("/orders", { replace: true });
      return;
    }

    fetchOrderDetails();
  }, [orderId, fetchOrderDetails, navigate]);

  useEffect(() => {
    if (!orderId) return undefined;
    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_CUSTOMER);
    getOrderSocket(getToken);
    joinOrderRoom(orderId, getToken);

    // Also join using the canonical order.orderId once loaded (may differ from URL param)
    if (order?.orderId && order.orderId !== orderId) {
      joinOrderRoom(order.orderId, getToken);
    }

    const refresh = () => {
      const now = Date.now();
      if (refreshRef.current.inFlight) return;
      if (now - refreshRef.current.lastAt < 2000) return;
      refreshRef.current.lastAt = now;
      refreshRef.current.inFlight = true;
      customerApi
        .getOrderDetails(orderId)
        .then(async (r) => {
          const ord = r.data.result;
          setOrder(ord);
          try {
            const retRes = await customerApi.getReturnDetails(resolveOrderLookupId(ord));
            setReturnDetails(retRes.data.result);
          } catch {
            setReturnDetails(null);
          }
        })
        .catch(() => { })
        .finally(() => {
          refreshRef.current.inFlight = false;
        });
    };

    const offStatus = onOrderStatusUpdate(getToken, (payload) => {
      // Immediately update order state from socket payload — no waiting for API re-fetch
      const ws = String(payload?.workflowStatus || "").toUpperCase();
      if (ws) {
        setOrder((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            workflowStatus: ws,
            // Keep legacy status in sync for components that read order.status
            ...(ws === "DELIVERED" && { status: "delivered" }),
            ...(ws === "DELIVERY_SEARCH" && { status: "confirmed" }),
            ...(ws === "OUT_FOR_DELIVERY" && { status: "out_for_delivery" }),
            ...(ws === "CANCELLED" && { status: "cancelled" }),
          };
        });
      }
      refresh();
    });
    const offOtp = onCustomerOtp(getToken, (payload) => {
      if (matchesOrderIdentifier(payload?.orderId, identifiersRef.current) && (payload?.code || payload?.otp)) {
        setHandoffOtp(payload.code || payload.otp);
        toast.info("Delivery OTP received — share with rider if asked.");
      }
    });
    const offReturnOtp = onReturnPickupOtp(getToken, (payload) => {
      if (matchesOrderIdentifier(payload?.orderId, identifiersRef.current) && payload?.otp) {
        setHandoffOtp(payload.otp);
        toast.info("Return pickup OTP received — share with rider.");
      }
    });

    return () => {
      offStatus();
      offOtp();
      offReturnOtp();
      leaveOrderRoom(orderId, getToken);
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return undefined;
    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_CUSTOMER);

    const nextExtraRoom = extraRoomId;

    if (extraRoomRef.current && extraRoomRef.current !== nextExtraRoom) {
      leaveOrderRoom(extraRoomRef.current, getToken);
      extraRoomRef.current = "";
    }

    if (nextExtraRoom && extraRoomRef.current !== nextExtraRoom) {
      joinOrderRoom(nextExtraRoom, getToken);
      extraRoomRef.current = nextExtraRoom;
    }

    return () => {
      if (extraRoomRef.current) {
        leaveOrderRoom(extraRoomRef.current, getToken);
        extraRoomRef.current = "";
      }
    };
  }, [orderId, extraRoomId]);

  // Subscribe to live tracking from Firebase (if available).
  //
  // Realtime DB writes from the rider/server are keyed on the canonical
  // `order.orderId`. The URL param may be a checkoutGroupId / alias / Mongo
  // _id, so subscribing on the raw URL produces zero updates for those
  // surfaces. We re-pin the subscriptions whenever the resolved canonical
  // id changes (i.e. once the order has loaded).
  useEffect(() => {
    const trackingId = canonicalOrderId;
    if (!trackingId) return;

    console.log(`[OrderDetailPage] Setting up Firebase subscriptions for order ${trackingId}`);
    const offLocation = subscribeToOrderLocation(trackingId, (loc) => {
      console.log(`[OrderDetailPage] Location update:`, loc);
      setLiveLocation(loc);
    });
    const offTrail = subscribeToOrderTrail(trackingId, (t) => {
      console.log(`[OrderDetailPage] Trail update: ${t.length} points`);
      setTrail(t);
    });
    const offRoute = subscribeToOrderRoute(trackingId, (route) => {
      console.log(`[OrderDetailPage] Route update:`, route);
      setRoutePolyline(route);
    });

    return () => {
      console.log(`[OrderDetailPage] Cleaning up Firebase subscriptions for order ${trackingId}`);
      offLocation && offLocation();
      offTrail && offTrail();
      offRoute && offRoute();
    };
  }, [canonicalOrderId]);

  useEffect(() => {
    const iv = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!order) {
      setReturnCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      if (order.status !== "delivered") {
        setReturnCountdown(null);
        return;
      }
      const windowStart = new Date(order.deliveredAt || order.createdAt).getTime();
      const now = Date.now();
      const windowMs = returnWindowMinutes * 60 * 1000;
      const remaining = Math.max(0, (windowStart + windowMs) - now);

      if (remaining <= 0) {
        setReturnCountdown(0);
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setReturnCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    calculateCountdown();
    const iv = setInterval(calculateCountdown, 1000);
    return () => clearInterval(iv);
  }, [order, returnWindowMinutes]);

  const handleOpenInMaps = () => {
    const loc = order?.address?.location;
    const dest =
      loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
        ? loc
        : null;

    const rider =
      liveLocation &&
        typeof liveLocation.lat === "number" &&
        typeof liveLocation.lng === "number"
        ? liveLocation
        : null;

    if (rider && dest) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${rider.lat},${rider.lng}&destination=${dest.lat},${dest.lng}`,
        "_blank",
      );
      return;
    }

    if (dest) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`,
        "_blank",
      );
      return;
    }

    window.open("https://maps.google.com", "_blank");
  };

  const status = order ? getLegacyStatusFromOrder(order) : null;
  const isDelivered =
    status === "delivered" ||
    String(order?.workflowStatus || "").toUpperCase() === "DELIVERED";
  const isOutForDelivery =
    !isDelivered &&
    (status === "out_for_delivery" ||
      String(order?.workflowStatus || "").toUpperCase() === "OUT_FOR_DELIVERY" ||
      Boolean(order?.outForDeliveryAt) ||
      Boolean(order?.pickupConfirmedAt));
  const isPacked =
    isDelivered ||
    isOutForDelivery ||
    Boolean(
      order?.packedAt ||
        order?.pickupReadyAt ||
        status === "packed" ||
        ["PICKUP_READY"].includes(
          String(order?.workflowStatus || "").toUpperCase(),
        ),
    );

  const formatOrderDateTime = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  };

  const isAwaitingOnlinePayment =
    Boolean(order) &&
    order.paymentMode === "ONLINE" &&
    order.paymentStatus !== "PAID" &&
    status !== "cancelled";
  const sellerLocation = coordsToLatLng(order?.seller?.location?.coordinates);
  const routePhase = getTrackingRoutePhase(order);
  const routeMatchesPhase =
    routePhase === "pickup"
      ? routePolyline?.phase
        ? routePolyline.phase === routePhase
        : !!routePolyline?.polyline
      : routePolyline?.phase === routePhase;
  const activeRoutePolyline = routeMatchesPhase ? routePolyline : null;
  const estimatedArrival = useMemo(() => {
    if (!order) {
      return {
        arrivalTimeText: "--",
        arrivingInText: "--",
      };
    }

    if (status === "delivered") {
      return {
        arrivalTimeText: "Arrived",
        arrivingInText: "Delivered",
      };
    }

    const targetLocation =
      routePhase === "delivery" ? order?.address?.location : sellerLocation;

    let minutes = null;
    const routeDurationSeconds = Number(activeRoutePolyline?.duration);
    if (Number.isFinite(routeDurationSeconds) && routeDurationSeconds > 0) {
      minutes = routeDurationSeconds / 60;
    } else {
      const routeDistanceMeters = Number(activeRoutePolyline?.distanceMeters);
      minutes =
        estimateMinutesFromDistance(routeDistanceMeters) ??
        estimateMinutesFromDistance(distanceMeters(liveLocation, targetLocation));
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      minutes = status === "confirmed" ? 12 : 8;
    }

    const arrivalMs = clockTick + minutes * 60 * 1000;
    const routeDistanceMeters = Number(
      activeRoutePolyline?.distanceMeters ?? activeRoutePolyline?.distance,
    );
    return {
      arrivalTimeText: formatArrivalTime(arrivalMs),
      arrivingInText: formatArrivingIn(minutes),
      totalDistanceText: formatDistance(
        routeDistanceMeters ||
        distanceMeters(liveLocation, targetLocation),
      ),
    };
  }, [
    activeRoutePolyline?.distanceMeters,
    activeRoutePolyline?.duration,
    liveLocation,
    order,
    routePhase,
    sellerLocation,
    status,
    clockTick,
  ]);

  useEffect(() => {
    if (!orderId || status === "delivered" || status === "cancelled") return;
    if (!hasValidLatLng(liveLocation)) return;

    const currentOrigin = {
      lat: liveLocation.lat,
      lng: liveLocation.lng,
    };
    const originDrift =
      routeOriginRef.current && hasValidLatLng(routeOriginRef.current)
        ? distanceMeters(routeOriginRef.current, currentOrigin)
        : null;
    const routeIsFresh =
      activeRoutePolyline?.polyline &&
      originDrift !== null &&
      originDrift < ROUTE_REFRESH_THRESHOLD_M &&
      routePhase === activeRoutePolyline?.phase;

    if (routeIsFresh) return;

    const now = Date.now();
    if (
      routeRequestRef.current.phase === routePhase &&
      now - routeRequestRef.current.startedAt < ROUTE_REFRESH_INTERVAL_MS &&
      (originDrift === null || originDrift < ROUTE_REFRESH_THRESHOLD_M)
    ) {
      return;
    }

    routeRequestRef.current = { phase: routePhase, startedAt: now };
    let ignore = false;

    customerApi
      .getOrderRoute(orderId, {
        phase: routePhase,
        originLat: liveLocation.lat,
        originLng: liveLocation.lng,
        _t: now,
      })
      .then((response) => {
        if (ignore) return;
        const nextRoute = response.data?.result;
        if (nextRoute?.polyline) {
          setRoutePolyline(nextRoute);
          routeOriginRef.current = currentOrigin;
        }
      })
      .catch(() => { });

    return () => {
      ignore = true;
    };
  }, [
    activeRoutePolyline?.polyline,
    liveLocation,
    orderId,
    routePhase,
    status,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  const canRequestReturn = () => {
    if (!order) return false;
    if (order.status === "cancelled") return false;
    if (order.status !== "delivered") return false;
    if (
      returnDetails &&
      returnDetails.returnStatus &&
      returnDetails.returnStatus !== "none" &&
      returnDetails.returnStatus !== null
    ) {
      return false;
    }

    const windowStart = new Date(order.deliveredAt || order.createdAt).getTime();
    const now = Date.now();
    const windowMs = returnWindowMinutes * 60 * 1000;
    return now - windowStart <= windowMs;
  };

  const toggleItemSelection = (index) => {
    setSelectedReturnItems((prev) => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index];
      } else {
        next[index] = { quantity: order.items?.[index]?.quantity || 1 };
      }
      return next;
    });
  };

  const handleReturnSubmit = async () => {
    if (!order) return;
    if (!Object.keys(selectedReturnItems).length) {
      toast.error("Please select at least one item to return.");
      return;
    }
    if (!returnReason.trim()) {
      toast.error("Please provide a reason for return.");
      return;
    }
    if (!returnConditionAssurance) {
      toast.error("Please confirm that the product is in good condition with accessories.");
      return;
    }
    if (returnImages.length === 0) {
      toast.error("Please upload at least 1 image of the product.");
      return;
    }

    const payload = {
      items: Object.entries(selectedReturnItems).map(([idx, val]) => ({
        itemIndex: Number(idx),
        quantity: val.quantity,
      })),
      reason: returnReason,
      reasonDetail: returnReasonDetail,
      conditionAssurance: returnConditionAssurance,
      images: returnImages,
    };

    try {
      setRequestingReturn(true);
      await customerApi.requestReturn(order.orderId, payload);
      toast.success("Return request submitted");
      setShowReturnModal(false);
      setSelectedReturnItems({});
      setReturnReason("");
      setReturnReasonDetail("");
      setReturnConditionAssurance(false);
      setReturnImages([]);

      const [orderRes, retRes] = await Promise.all([
        customerApi.getOrderDetails(orderId),
        customerApi.getReturnDetails(resolveOrderLookupId(order)),
      ]);
      setOrder(orderRes.data.result);
      setReturnDetails(retRes.data.result);
    } catch (error) {
      console.error("Failed to submit return request", error);
      toast.error(
        error.response?.data?.message || "Failed to submit return request",
      );
    } finally {
      setRequestingReturn(false);
    }
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 5 - returnImages.length;
    const toProcess = files.slice(0, remaining);

    setIsUploadingImage(true);
    const newImages = [];

    for (const file of toProcess) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        let url;
        try {
          const { default: axiosInstance } = await import("@core/api/axios");
          const uploadRes = await axiosInstance.post("/media/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          url =
            uploadRes.data?.result?.url ||
            uploadRes.data?.data?.url ||
            uploadRes.data?.url;
        } catch {
          url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }
        if (url) newImages.push(url);
      } catch (err) {
        toast.error("Failed to process image.");
      }
    }

    setReturnImages((prev) => [...prev, ...newImages].slice(0, 5));
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index) => {
    setReturnImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRetryPayment = async () => {
    try {
      if (!order) return;
      const paymentRef =
        Number(order.checkoutGroupSize || 1) > 1
          ? (order.checkoutGroupId || order.orderId)
          : order.orderId;
      const response = await customerApi.createRazorpayOrder({
        orderRef: paymentRef,
      });
      if (!response.data.success || !response.data.result) {
        toast.error(response.data.message || "Failed to initiate payment");
        return;
      }
      const { key, orderId: rpOrderId, amount, currency } = response.data.result;

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || "",
        amount: amount,
        currency: currency || "INR",
        name: "Meatyns",
        description: `Order Payment for #${order.orderId}`,
        order_id: rpOrderId,
        handler: async function (resp) {
          try {
            toast.info("Verifying payment...");
            const verifyRes = await customerApi.verifyRazorpayPayment({
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success("Payment successful!");
              await fetchOrderDetails();
            } else {
              throw new Error(verifyRes.data.message || "Payment verification failed");
            }
          } catch (err) {
            toast.error(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: order.deliveryAddress?.name || "",
          contact: order.deliveryAddress?.phone || "",
        },
        theme: {
          color: "#15803d",
        },
        modal: {
          ondismiss: function () {
            toast.warning("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        toast.error(resp.error?.description || "Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      console.error("[OrderDetailPage] Retry payment error:", err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to start payment. Please try again later.",
      );
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    try {
      const res = await customerApi.reorderOrder(order.orderId || order._id);
      const data = res?.data?.result || res?.data?.data || {};
      toast.success(data.summaryMessage || "Items reordered to your cart!");
      navigate("/cart");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reorder items");
    } finally {
      setReordering(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Package size={64} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Order not found</h3>
        <Link to="/orders" className="text-brand-600 font-bold mt-4 hover:text-brand-700">
          Back to my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 font-sans">
      {/* Mobile View - 100% Unchanged */}
      <div className="lg:hidden">
        {/* Minimal Header */}
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-800" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-normal font-anton tracking-wide text-slate-800 uppercase">Order</h1>
            <p className="text-xs text-slate-500 font-medium">#{order?.orderId ? (order.orderId.length > 8 ? order.orderId.slice(-8) : order.orderId) : (order?._id ? String(order._id).slice(-8) : String(orderId || "").slice(-8))}</p>
          </div>
          <button
            type="button"
            onClick={handleReorder}
            disabled={reordering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDCE04] text-[#1A1A1A] text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {reordering ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            <span>Reorder</span>
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Payment Required Card - Only for Online Pending Orders */}
          {isAwaitingOnlinePayment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-50 rounded-3xl p-5 shadow-sm border border-brand-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CreditCard size={64} className="text-brand-600" />
              </div>
              <div className="flex items-center justify-between gap-4 relative z-10">
                <div>
                  <h4 className="font-black text-brand-900 text-sm tracking-wide">
                    Payment Incomplete
                  </h4>
                  <p className="text-xs text-brand-700/80 mt-0.5">
                    Your order is placed, but payment is still pending.
                  </p>
                </div>
                <button
                  onClick={handleRetryPayment}
                  className="bg-black hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide shrink-0"
                >
                  Pay Now <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Delivery Method Banner (Mobile) */}
          <div className="rounded-2xl p-4 border shadow-xs transition-all bg-white border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  order.deliveryMethod === "EXPRESS"
                    ? "bg-[#FDCE04] text-[#1A1A1A]"
                    : order.deliveryMethod === "SCHEDULED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {order.deliveryMethod === "EXPRESS" ? (
                  <Zap size={20} strokeWidth={2.4} />
                ) : order.deliveryMethod === "SCHEDULED" ? (
                  <CalendarDays size={20} strokeWidth={2.4} />
                ) : (
                  <Truck size={20} strokeWidth={2.4} />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  {order.deliveryMethod === "EXPRESS"
                    ? "Express Delivery"
                    : order.deliveryMethod === "SCHEDULED"
                    ? "Scheduled Delivery"
                    : "Normal Delivery"}
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {order.deliveryMethod === "EXPRESS"
                    ? "Deliver as soon as possible"
                    : order.deliveryMethod === "SCHEDULED"
                    ? `${order.scheduledDate ? order.scheduledDate : ""}${order.timeSlot && order.timeSlot !== "now" ? `, ${order.timeSlot}` : ""}`
                    : "Estimated arrival: 1–2 hours"}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                order.deliveryMethod === "EXPRESS"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : order.deliveryMethod === "SCHEDULED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              {order.deliveryMethod === "EXPRESS"
                ? "⚡ ASAP"
                : order.deliveryMethod === "SCHEDULED"
                ? "📅 Slot"
                : "Standard"}
            </span>
          </div>

          {/* Enhanced Map with Cleaner Design - Hide when delivered or cancelled */}
          {!isAwaitingOnlinePayment && status !== "delivered" && status !== "cancelled" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden shadow-lg border border-slate-200/50"
            >
              <LiveTrackingMap
                status={order.workflowStatus || order.status}
                eta={estimatedArrival.arrivingInText}
                riderName={order.deliveryBoy?.name || "Delivery Partner"}
                riderLocation={liveLocation}
                sellerLocation={sellerLocation}
                destinationLocation={
                  order.address?.location?.lat
                    ? order.address?.location
                    : activeRoutePolyline?.destination || null
                }
                routePhase={routePhase}
                routePolyline={activeRoutePolyline}
                onOpenInMaps={handleOpenInMaps}
              />
            </motion.div>
          )}

          {/* Order Progress Tracker - New Component */}
          {!isAwaitingOnlinePayment && (
            <OrderProgressTracker
              order={order}
              estimatedArrivalText={estimatedArrival.arrivalTimeText}
              arrivingInText={estimatedArrival.arrivingInText}
              totalDistanceText={estimatedArrival.totalDistanceText}
            />
          )}

          {/* Proximity-based Delivery OTP Display */}
          <DeliveryOtpDisplay
            orderId={order?.orderId || orderId}
            checkoutGroupId={order?.checkoutGroupId || orderId}
          />

          {/* Delivery Partner Card - Redesigned */}
          {order.deliveryBoy && status !== "delivered" && status !== "cancelled" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-5 shadow-lg text-white"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden border-2 border-white/40 shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60"
                      alt="Rider"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white text-brand-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                    4.8 ★
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Your Courier</p>
                  <h3 className="font-bold text-white text-lg">{order.deliveryBoy?.name || "Delivery Partner"}</h3>
                  <p className="text-xs text-white/90 mt-0.5">On the way to you</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30">
                    <MessageSquare size={20} className="text-white" />
                  </button>
                  <button className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30">
                    <Phone size={20} className="text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pickup Location Card - Redesigned */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Store size={24} className="text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Pickup Location</p>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">Store Location</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {order.address?.address || "Address not available"}
                </p>
              </div>
              <button
                onClick={handleOpenInMaps}
                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
              >
                <Navigation2 size={18} className="text-slate-700" />
              </button>
            </div>
          </motion.div>

          {/* Delivery Method & Slot Card */}
          {order.deliveryMethod && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className={`rounded-3xl p-5 shadow-sm border ${
                order.deliveryMethod === "EXPRESS"
                  ? "bg-amber-500/10 border-amber-300 text-amber-950"
                  : order.deliveryMethod === "SCHEDULED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-blue-50 border-blue-200 text-blue-950"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold ${
                    order.deliveryMethod === "EXPRESS"
                      ? "bg-[#FDCE04] text-[#1A1A1A]"
                      : order.deliveryMethod === "SCHEDULED"
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {order.deliveryMethod === "EXPRESS" ? (
                    <Zap size={22} strokeWidth={2.4} />
                  ) : order.deliveryMethod === "SCHEDULED" ? (
                    <CalendarDays size={22} strokeWidth={2.4} />
                  ) : (
                    <Clock size={22} strokeWidth={2.4} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {order.deliveryMethod === "EXPRESS"
                        ? "Express Delivery"
                        : order.deliveryMethod === "SCHEDULED"
                        ? "Scheduled Booking"
                        : "Standard Delivery"}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        order.deliveryMethod === "EXPRESS"
                          ? "bg-amber-200 text-amber-900 border border-amber-300"
                          : order.deliveryMethod === "SCHEDULED"
                          ? "bg-emerald-200 text-emerald-900 border border-emerald-300"
                          : "bg-blue-200 text-blue-900 border border-blue-300"
                      }`}
                    >
                      {order.deliveryMethod}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">
                    {order.deliveryMethod === "SCHEDULED"
                      ? `Slot: ${order.timeSlot || "Scheduled Slot"}`
                      : order.deliveryMethod === "EXPRESS"
                      ? `Priority Dispatch (ETA: ${order.timeSlot || "15–30 mins"})`
                      : `Standard SLA: ${order.timeSlot || "1–2 hours"}`}
                  </h4>
                  {order.scheduledDate && (
                    <p className="text-sm text-slate-600 font-medium">
                      Scheduled Date: {order.scheduledDate}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Delivery Address Card - Redesigned */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">Delivery Address</p>
                  <span className="bg-brand-50 text-brand-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {order.address?.type || "Delivery"}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">{order.address?.name || "Customer"}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {order.address?.address ? `${order.address.address}${order.address.city ? `, ${order.address.city}` : ""}` : (order.address?.fullAddress || order.address?.city || "Address not available")}
                </p>
                {order.address?.location &&
                  typeof order.address.location.lat === "number" &&
                  typeof order.address.location.lng === "number" && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
                      <CheckCircle size={14} className="text-brand-600" />
                      Precise location confirmed
                    </p>
                  )}
                {order.address?.phone && (
                  <p className="text-sm text-slate-800 font-semibold mt-3 flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    {order.address.phone}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Branded Meatyns Chef Delivery Banner (matching mockup screen 7) */}
          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-[#FFF5ED] via-[#FFF1E8] to-[#FFEFE6] border border-[#FCD9C8] flex items-center gap-3.5 sm:gap-4 shadow-xs">
            <div className="w-16 sm:w-20 h-16 sm:h-20 shrink-0 flex items-center justify-center">
              <img
                src="/mascot/chef_mascot.png"
                alt="Meatyns Chef Mascot"
                className="max-h-full max-w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
                loading="lazy"
              />
            </div>
            <div className="min-w-0">
              <h4 className="font-anton uppercase tracking-wide text-base sm:text-lg text-slate-900 leading-tight flex items-center gap-1.5">
                Fresh Meat on the way! <Heart size={15} className="fill-[#C81017] text-[#C81017] inline-block shrink-0" />
              </h4>
              <p className="text-[11.5px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-snug">
                100% fresh &amp; hygienic cuts packed with love from Meatyns kitchen.
              </p>
            </div>
          </div>

          {/* Partial Fulfillment Notice */}
          {order.partialFulfillment?.hasUnavailableItems && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-amber-50/90 rounded-3xl p-5 shadow-sm border border-amber-200/80 mb-4 text-left"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">Partial Order Fulfillment Update</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    One or more items in your order were unavailable and could not be packed.
                    {order.partialFulfillment.refundTotal > 0 && (
                      <span className="font-semibold"> A refund of ₹{order.partialFulfillment.refundTotal} has been credited to your {order.paymentMode === 'ONLINE' ? 'original payment method' : (order.paymentMode === 'WALLET' ? 'wallet' : 'COD invoice deduction')}.</span>
                    )}
                    {" "}The remaining available items are being fulfilled and will be delivered shortly!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Order Items Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 text-base">Order Items ({order.items?.length || 0})</h4>
            </div>
            <div className="space-y-3">
              {order.items?.map((item, idx) => {
                const isUnavailable = item.status === 'UNAVAILABLE';
                return (
                  <div key={idx} className={`flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0 ${isUnavailable ? 'opacity-80' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 relative">
                        <img src={applyCloudinaryTransform(item.image)} alt={item.name} className={`h-full w-full object-cover ${isUnavailable ? 'grayscale opacity-60' : ''}`} />
                        {isUnavailable && (
                          <div className="absolute inset-0 bg-rose-950/20 flex items-center justify-center">
                            <span className="text-[8px] font-black uppercase text-white bg-rose-600 px-1 rounded">OOS</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-xs ${isUnavailable ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
                          {isUnavailable && (
                            <span className="bg-rose-50 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-100">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400 font-medium">Qty: {item.quantity}</p>
                          {isUnavailable && item.refundStatus === 'COMPLETED' && (
                            <span className="text-[9px] text-emerald-600 font-semibold">
                              • Refunded ₹{item.refundAmount || 0}
                            </span>
                          )}
                          {isUnavailable && item.refundStatus === 'PENDING' && (
                            <span className="text-[9px] text-amber-600 font-semibold">
                              • Refund Pending ₹{item.refundAmount || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-xs ${isUnavailable ? 'line-through text-slate-400' : 'text-slate-900'}`}>₹{item.price * item.quantity}</span>
                      {isUnavailable && item.refundAmount > 0 && (
                        <div className="text-[10px] font-bold text-emerald-600">
                          -₹{item.refundAmount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Return Policy Section */}
          {returnDetails?.policyEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 text-base">Return Policy</h4>
                {returnDetails.returnStatus && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {returnDetails.returnStatus.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {returnDetails.returnStatus &&
                returnDetails.returnStatus !== "none" ? (
                <div className="space-y-4 text-sm">
                  <ReturnProgressTracker returnStatus={returnDetails.returnStatus} />
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  You can request a return within the first {returnWindowMinutes} minutes after delivery.
                </p>
              )}

              {canRequestReturn() && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98]">
                  Request Return
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Desktop View - Matching Image 5 */}
      <div className="hidden lg:block">
        <div className="min-h-screen bg-[#FBF8F5] pt-8 pb-16 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 items-start">
            {/* Left Column: Order Header & Vertical Timeline Tracker */}
            <div className="col-span-7 xl:col-span-8 space-y-4">
              {/* Order Info & Status Badge Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl lg:text-2xl font-normal font-anton tracking-wide text-slate-900 uppercase">
                    Order #{order.orderId ? (order.orderId.startsWith('#') ? order.orderId : order.orderId.slice(-8).toUpperCase()) : "FK123456"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Placed on {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : "16 Sep, 2025 • 11:24 AM"}
                  </p>
                </div>

                {(() => {
                  if (status === 'cancelled' || order.workflowStatus === 'CANCELLED') {
                    return (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-2 text-right">
                        <p className="text-xs font-bold leading-tight">Order Cancelled</p>
                        <p className="text-[11px] text-rose-600/80 font-medium">Cancelled</p>
                      </div>
                    );
                  }
                  if (isDelivered) {
                    return (
                      <div className="bg-[#E7F7ED] border border-[#C5EBD2] text-[#15803D] rounded-2xl px-4 py-2 text-right">
                        <p className="text-xs font-bold leading-tight">Delivered</p>
                        <p className="text-[11px] text-[#15803D]/80 font-medium">Delivered successfully</p>
                      </div>
                    );
                  }
                  if (isOutForDelivery) {
                    return (
                      <div className="bg-[#E7F7ED] border border-[#C5EBD2] text-[#15803D] rounded-2xl px-4 py-2 text-right">
                        <p className="text-xs font-bold leading-tight">Out for Delivery</p>
                        <p className="text-[11px] text-[#15803D]/80 font-medium">
                          {estimatedArrival?.arrivingInText ? `Expected in ${estimatedArrival.arrivingInText}` : 'Expected in 14 mins'}
                        </p>
                      </div>
                    );
                  }
                  if (isPacked) {
                    return (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-2 text-right">
                        <p className="text-xs font-bold leading-tight">Packed &amp; Ready</p>
                        <p className="text-[11px] text-amber-700/80 font-medium">Waiting for pickup</p>
                      </div>
                    );
                  }
                  if (status === 'confirmed' || order.workflowStatus === 'SELLER_ACCEPTED' || order.workflowStatus === 'DELIVERY_SEARCH') {
                    return (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-4 py-2 text-right">
                        <p className="text-xs font-bold leading-tight">Order Confirmed</p>
                        <p className="text-[11px] text-blue-700/80 font-medium">Preparing your items</p>
                      </div>
                    );
                  }
                  if (isAwaitingOnlinePayment) {
                    return (
                      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl px-4 py-2 text-right">
                        <p className="text-xs font-bold leading-tight">Payment Pending</p>
                        <p className="text-[11px] text-amber-700 font-medium">Complete payment to confirm</p>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-2 text-right">
                      <p className="text-xs font-bold leading-tight">Order Placed</p>
                      <p className="text-[11px] text-emerald-700/80 font-medium">Waiting for confirmation</p>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Pending Alert & Retry (Desktop) */}
              {isAwaitingOnlinePayment && (
                <div className="rounded-2xl p-5 border border-amber-200 bg-amber-50/70 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-amber-950 text-sm">Payment Pending</h4>
                      <p className="text-xs text-amber-800 mt-0.5">Your order is created, but online payment has not been completed yet.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRetryPayment}
                    className="bg-[#15803D] hover:bg-[#166534] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide shrink-0"
                  >
                    Pay with Razorpay <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Delivery Method Banner (Desktop) */}
              <div className="rounded-2xl p-4 border shadow-xs transition-all bg-white border-[#ede5df] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      order.deliveryMethod === "EXPRESS"
                        ? "bg-[#FDCE04] text-[#1A1A1A]"
                        : order.deliveryMethod === "SCHEDULED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {order.deliveryMethod === "EXPRESS" ? (
                      <Zap size={20} strokeWidth={2.4} />
                    ) : order.deliveryMethod === "SCHEDULED" ? (
                      <CalendarDays size={20} strokeWidth={2.4} />
                    ) : (
                      <Truck size={20} strokeWidth={2.4} />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      {order.deliveryMethod === "EXPRESS"
                        ? "Express Delivery"
                        : order.deliveryMethod === "SCHEDULED"
                        ? "Scheduled Delivery"
                        : "Normal Delivery"}
                    </span>
                    <p className="text-sm font-extrabold text-slate-800">
                      {order.deliveryMethod === "EXPRESS"
                        ? "Deliver as soon as possible"
                        : order.deliveryMethod === "SCHEDULED"
                        ? `${order.scheduledDate ? order.scheduledDate : ""}${order.timeSlot && order.timeSlot !== "now" ? `, ${order.timeSlot}` : ""}`
                        : "Estimated delivery: 1–2 hours"}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    order.deliveryMethod === "EXPRESS"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : order.deliveryMethod === "SCHEDULED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-blue-50 border-blue-200 text-blue-900"
                  }`}
                >
                  {order.deliveryMethod === "EXPRESS"
                    ? "⚡ Express"
                    : order.deliveryMethod === "SCHEDULED"
                    ? "📅 Advance Slot"
                    : "Standard"}
                </span>
              </div>

              {/* Live Tracking Map (Desktop) */}
              {!isAwaitingOnlinePayment && status !== "delivered" && status !== "cancelled" && (
                <div className="rounded-2xl overflow-hidden shadow-xs border border-[#ede5df] bg-white">
                  <LiveTrackingMap
                    status={order.workflowStatus || order.status}
                    eta={estimatedArrival.arrivingInText}
                    riderName={order.deliveryBoy?.name || "Delivery Partner"}
                    riderLocation={liveLocation}
                    sellerLocation={sellerLocation}
                    destinationLocation={
                      order.address?.location?.lat
                        ? order.address?.location
                        : activeRoutePolyline?.destination || null
                    }
                    routePhase={routePhase}
                    routePolyline={activeRoutePolyline}
                    onOpenInMaps={handleOpenInMaps}
                  />
                </div>
              )}

              {/* Delivery OTP Display (Desktop) */}
              <DeliveryOtpDisplay
                orderId={order?.orderId || orderId}
                checkoutGroupId={order?.checkoutGroupId || orderId}
              />

              {/* Vertical Step Tracker Card */}
              <div className="bg-white rounded-2xl p-8 border border-[#ede5df] shadow-xs space-y-8">
                {/* Step 1: Order Placed */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-[#15803D] text-white flex items-center justify-center flex-shrink-0 z-10">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  {/* Vertical line connecting to Step 2 */}
                  <div className={`absolute left-3.5 top-7 w-[2px] h-12 ${isPacked ? 'bg-[#15803D]' : 'bg-slate-200'}`} />

                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Order Placed</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.createdAt ? formatOrderDateTime(order.createdAt) : "Recently"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 lowercase">completed</span>
                  </div>
                </div>

                {/* Step 2: Packed & Ready */}
                <div className="flex items-start gap-4 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    isPacked
                      ? 'bg-[#15803D] text-white'
                      : 'border-2 border-slate-300 bg-white text-slate-300'
                  }`}>
                    {isPacked ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  {/* Vertical line connecting to Step 3 */}
                  <div className={`absolute left-3.5 top-7 w-[2px] h-12 ${
                    isOutForDelivery || isDelivered ? 'bg-[#15803D]' : 'bg-slate-200'
                  }`} />

                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Packed &amp; Ready</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.packedAt
                          ? formatOrderDateTime(order.packedAt)
                          : isPacked
                          ? "Completed"
                          : "Pending"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 lowercase">
                      {isPacked ? 'completed' : 'pending'}
                    </span>
                  </div>
                </div>

                {/* Step 3: Out for Delivery */}
                <div className="flex items-start gap-4 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    isDelivered
                      ? 'bg-[#15803D] text-white'
                      : isOutForDelivery
                      ? 'bg-[#15803D] text-white ring-4 ring-[#E7F7ED]'
                      : 'border-2 border-slate-300 bg-white'
                  }`}>
                    {isDelivered || isOutForDelivery ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  {/* Vertical line connecting to Step 4 */}
                  <div className={`absolute left-3.5 top-7 w-[2px] h-12 ${
                    isDelivered ? 'bg-[#15803D]' : 'bg-slate-200'
                  }`} />

                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Out for Delivery</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.outForDeliveryAt
                          ? formatOrderDateTime(order.outForDeliveryAt)
                          : isOutForDelivery
                          ? "In Transit"
                          : "Pending"}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${
                      isOutForDelivery ? 'text-[#B45309] font-bold' : 'text-slate-400 lowercase'
                    }`}>
                      {isOutForDelivery ? (
                        <>Current <span className="w-1.5 h-1.5 rounded-full bg-[#FDCE04] animate-ping" /></>
                      ) : isDelivered ? 'completed' : 'pending'}
                    </span>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex items-start gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    isDelivered
                      ? 'bg-[#15803D] text-white'
                      : 'border-2 border-slate-300 bg-white'
                  }`}>
                    {isDelivered ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Delivered</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.deliveredAt
                          ? formatOrderDateTime(order.deliveredAt)
                          : isDelivered
                          ? 'Delivered successfully'
                          : 'Pending'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 lowercase">
                      {isDelivered ? 'completed' : 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Rider Details, Address & Guarantee */}
            <div className="col-span-5 xl:col-span-4 space-y-4 select-none">
              {/* Rider / Order Status Card */}
              {order.deliveryBoy ? (
                <div className="bg-white rounded-2xl p-6 border border-[#ede5df] shadow-xs text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#FFFBEB] flex items-center justify-center text-[#1A1A1A] border border-[#FDE68A]">
                    <Bike size={32} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isDelivered
                        ? "Delivered by Rider"
                        : isOutForDelivery
                        ? "Your order is on the way!"
                        : "Delivery Partner Assigned"}
                    </h3>
                  </div>

                  {/* Rider Info Row */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-left">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        Rider: {order.deliveryBoy?.name || "Delivery Partner"}
                      </p>
                      {order.deliveryBoy?.vehicleNumber && (
                        <p className="text-[11px] text-slate-500">
                          Vehicle: {order.deliveryBoy.vehicleNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Call & WhatsApp */}
                  {order.deliveryBoy?.phone && !isDelivered && (
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href={`tel:${order.deliveryBoy.phone}`}
                        className="flex-1 py-2.5 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] font-extrabold text-xs flex items-center justify-center gap-2 transition-colors no-underline shadow-xs border border-[#E5B800]"
                      >
                        <Phone size={14} />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${String(order.deliveryBoy.phone).replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 rounded-xl border border-[#FDCE04] text-[#1A1A1A] hover:bg-[#FFFBEB] font-bold text-xs flex items-center justify-center gap-2 transition-colors no-underline"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-[#ede5df] shadow-xs text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
                    <Package size={30} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isDelivered
                        ? "Order Delivered"
                        : isPacked
                        ? "Looking for Rider"
                        : status === "confirmed"
                        ? "Preparing Your Order"
                        : "Order Placed Successfully"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {isDelivered
                        ? "Hope you loved your order!"
                        : isPacked
                        ? "Your order is packed. A delivery partner will be assigned shortly."
                        : status === "confirmed"
                        ? "The store is preparing and packing your items."
                        : "The store will accept and prepare your items shortly."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-left flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isPacked
                          ? "Ready for pickup"
                          : status === "confirmed"
                          ? "In preparation"
                          : "Received by store"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {order.deliveryMethod === "EXPRESS" ? "⚡ Express Delivery" : "Standard Delivery"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-slate-700 tracking-tight">
                  Delivery Address
                </h3>
                <div className="flex items-start gap-3 pt-1">
                  <div className="w-8 h-8 rounded-full bg-[#FFFBEB] flex items-center justify-center text-[#1A1A1A] border border-[#FDE68A] flex-shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      {order.address?.name || "Customer"}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {order.address?.address || order.address?.fullAddress || order.address?.city || "Delivery address"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Freshness Guaranteed Card */}
              <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] flex-shrink-0 shadow-xs border border-[#FDE68A]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A]">Freshness Guaranteed</p>
                  <p className="text-[11px] text-slate-600">We ensure your order is fresh and safe</p>
                </div>
              </div>

              {/* Branded Meatyns Chef Mascot Card (Desktop) */}
              <div className="rounded-2xl p-4 bg-gradient-to-r from-[#FFF5ED] via-[#FFF1E8] to-[#FFEFE6] border border-[#FCD9C8] flex items-center gap-3.5 shadow-xs">
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img
                    src="/mascot/chef_mascot.png"
                    alt="Meatyns Chef Mascot"
                    className="max-h-full max-w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-anton uppercase tracking-wide text-sm font-normal text-slate-900 leading-tight flex items-center gap-1">
                    Fresh Meat on the way! <Heart size={13} className="fill-[#C81017] text-[#C81017] inline-block shrink-0" />
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    100% fresh, chemical-free &amp; hygienically packed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        order={order}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !requestingReturn && setShowReturnModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4"
          >
            <h3 className="text-lg font-black text-slate-900">
              Request Return
            </h3>
            <p className="text-xs text-slate-500">
              Select the items you want to return and tell us why.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-3">
              {(order.items || []).map((item, idx) => {
                const checked = !!selectedReturnItems[idx];
                return (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItemSelection(idx)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Qty: {item.quantity} • ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">
                  Reason for return
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Defective product">Defective product</option>
                  <option value="Wrong item delivered">Wrong item delivered</option>
                  <option value="Not as expected">Not as expected</option>
                  <option value="Size issue">Size issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">
                  Detailed Issue Mention
                </label>
                <textarea
                  rows={2}
                  value={returnReasonDetail}
                  onChange={(e) => setReturnReasonDetail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Describe the issue with the product..."
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">
                  Photos ({returnImages.length}/5) *
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {returnImages.map((img, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={img} alt="proof" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {returnImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors shrink-0"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnConditionAssurance}
                  onChange={(e) => setReturnConditionAssurance(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600"
                />
                <span className="text-xs font-semibold text-amber-900 leading-tight">
                  I confirm the product is returned with proper accessories and is in good condition.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => !requestingReturn && setShowReturnModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={requestingReturn}>
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-70 transition-all"
                disabled={requestingReturn}>
                {requestingReturn ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
