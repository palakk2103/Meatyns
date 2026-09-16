import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useInViewAnimation } from "@/core/hooks/useInViewAnimation";
import { useCart } from "../context/CartContext";
import { useAuth } from "../../../core/context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { customerApi } from "../services/customerApi";
import { useLocation as useAppLocation } from "../context/LocationContext";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import {
  MapPin,
  Clock,
  CreditCard,
  Banknote,
  ChevronRight,
  ChevronLeft,
  Share2,
  Gift,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Heart,
  Truck,
  Tag,
  Sparkles,
  Plus,
  Minus,
  Search,
  X,
  Clipboard,
  Check,
  Contact2,
  Wallet,
  ArrowLeft,
  Bike,
  ShieldCheck,
  Lock,
} from "lucide-react";
import Header from "../components/layout/Header";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@shared/components/ui/Toast";
import { useSettings } from "@core/context/SettingsContext";
import SlideToPay from "../components/shared/SlideToPay";
import { getCachedGeocode, setCachedGeocode } from "@/core/utils/geocodeCache";
import { getJSON, setJSON, STORAGE_KEYS } from "@core/utils/storage";
import { createSocketTokenReader } from "@core/utils/authStorage";
import {
  getOrderSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderStatusUpdate,
} from "@/core/services/orderSocket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// Sub-components
import CheckoutAddressSection from "./checkout/components/CheckoutAddressSection";

import CheckoutCartSummary from "./checkout/components/CheckoutCartSummary";
import CheckoutPricingBreakdown from "./checkout/components/CheckoutPricingBreakdown";
import CheckoutPaymentSelector from "./checkout/components/CheckoutPaymentSelector";
import CheckoutCouponSection from "./checkout/components/CheckoutCouponSection";
import CheckoutRecommendedProducts from "./checkout/components/CheckoutRecommendedProducts";
import CheckoutWishlistSection from "./checkout/components/CheckoutWishlistSection";
import CheckoutOrderSuccess from "./checkout/components/CheckoutOrderSuccess";
import FishEmptyCartIllustration from "../components/shared/FishEmptyCartIllustration";

const CheckoutPage = () => {
  const {
    cart,
    addToCart,
    cartTotal,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { wishlist, addToWishlist, fetchFullWishlist, isFullDataFetched } =
    useWishlist();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();

  const wishlistSectionRef = useRef(null);
  const wishlistFetchedRef = useRef(false);

  // useInViewAnimation for floating/particle animation containers
  const { ref: emptyCartAnimRef, isVisible: emptyCartVisible } = useInViewAnimation();

  // Lazy-load wishlist via IntersectionObserver
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!("IntersectionObserver" in window)) {
      if (!wishlistFetchedRef.current) {
        wishlistFetchedRef.current = true;
        fetchFullWishlist();
      }
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wishlistFetchedRef.current) {
          wishlistFetchedRef.current = true;
          fetchFullWishlist();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (wishlistSectionRef.current) observer.observe(wishlistSectionRef.current);
    return () => observer.disconnect();
  }, [isAuthenticated]);

  const appName = settings?.appName || "App";
  const {
    savedAddresses: locationSavedAddresses,
    currentLocation,
    refreshLocation,
    isFetchingLocation,
    updateLocation,
  } = useAppLocation();
  const navigate = useNavigate();

  // State management
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("now");
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [desktopPaymentChoice, setDesktopPaymentChoice] = useState("upi");
  const [selectedTip, setSelectedTip] = useState(0);
  const [showAllCartItems, setShowAllCartItems] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isResolvingAddressCoords, setIsResolvingAddressCoords] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const postOrderNavigateRef = useRef(null);
  const previewDebounceRef = useRef(null);
  const [currentAddress, setCurrentAddress] = useState({
    type: "Home",
    name: "Harshvardhan Panchal",
    address: "81 Pipliyahana Road, Near 214",
    landmark: "",
    city: "Indore - 452018",
    phone: "6268423925",
  });
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState({
    type: "Home",
    name: "Harshvardhan Panchal",
    address: "81 Pipliyahana Road, Near 214",
    landmark: "",
    city: "Indore - 452018",
    phone: "6268423925",
  });
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [recipientData, setRecipientData] = useState({
    completeAddress: "",
    landmark: "",
    pincode: "",
    name: "",
    phone: "",
  });
  const [savedRecipient, setSavedRecipient] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [manualCode, setManualCode] = useState("");
  const [emptyBoxData, setEmptyBoxData] = useState(null);

  // Dynamically load empty-box Lottie only when cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      import("../../../assets/lottie/Empty box.json")
        .then((m) => setEmptyBoxData(m.default))
        .catch(() => {});
    }
  }, [cart.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const paymentMethods = [
    ...(settings?.onlineEnabled === false
      ? []
      : [
          {
            id: "razorpay",
            label: "Pay Online (Razorpay)",
            icon: CreditCard,
            sublabel: "Cards, UPI, NetBanking",
          },
        ]),
    ...(settings?.codEnabled === false
      ? []
      : [
          {
            id: "cash",
            label: "Cash on Delivery",
            icon: Banknote,
            sublabel: "Pay after delivery",
          },
        ]),
  ];

  const tipAmounts = [
    { value: 0, label: "No Tip" },
    { value: 10, label: "Rs.10" },
    { value: 20, label: "Rs.20" },
    { value: 30, label: "Rs.30" },
  ];

  const discountAmount = selectedCoupon
    ? selectedCoupon.discountAmount || selectedCoupon.discount || 0
    : 0;

  const RECIPIENT_STORAGE_KEY = STORAGE_KEYS.RECIPIENT_ADDRESS;

  // Derived display values for primary delivery card
  const displayName = savedRecipient?.name || currentAddress.name;
  const displayPhone =
    savedRecipient?.phone || currentAddress.phone || "6268423925";
  const displayAddress = savedRecipient
    ? `${savedRecipient.completeAddress}${savedRecipient.landmark ? `, ${savedRecipient.landmark}` : ""}${savedRecipient.pincode ? ` - ${savedRecipient.pincode}` : ""}`
    : `${currentAddress.address}${currentAddress.landmark ? `, ${currentAddress.landmark}` : ""}, ${currentAddress.city}`;

  useEffect(() => {
    if (!paymentMethods.length) return;
    const exists = paymentMethods.some((method) => method.id === selectedPayment);
    if (!exists) {
      setSelectedPayment(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPayment]);

  useEffect(() => {
    if (useWallet && user?.walletBalance && pricingPreview?.grandTotal) {
      const maxAvailable = Number(user.walletBalance || 0);
      const totalToPay = Number(pricingPreview.grandTotal || 0);
      const maxAllowedFromWallet = Math.floor(maxAvailable * 0.25);
      setWalletAmountToUse(Math.min(totalToPay, maxAllowedFromWallet));
    } else {
      setWalletAmountToUse(0);
    }
  }, [useWallet, user?.walletBalance, pricingPreview?.grandTotal]);

  const finalAmountToPay = Math.max(0, (pricingPreview?.grandTotal || 0) - walletAmountToUse);

  const buildAddressForOrder = () => {
    if (savedRecipient) {
      return {
        type: "Other",
        name: savedRecipient.name,
        address: savedRecipient.completeAddress,
        landmark: savedRecipient.landmark || "",
        city: savedRecipient.pincode ? `${savedRecipient.pincode}` : "",
        phone: savedRecipient.phone,
        location:
          currentLocation?.latitude && currentLocation?.longitude
            ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
            : undefined,
      };
    }

    const addrLoc = currentAddress?.location;
    const hasAddrLoc =
      addrLoc &&
      typeof addrLoc.lat === "number" &&
      typeof addrLoc.lng === "number" &&
      Number.isFinite(addrLoc.lat) &&
      Number.isFinite(addrLoc.lng);

    return {
      ...currentAddress,
      location: hasAddrLoc ? { lat: addrLoc.lat, lng: addrLoc.lng } : undefined,
    };
  };

  const handleSaveRecipient = () => {
    if (
      !recipientData.completeAddress ||
      !recipientData.name ||
      recipientData.phone.length !== 10
    ) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSavedRecipient(recipientData);
    setShowRecipientForm(false);
    setJSON(RECIPIENT_STORAGE_KEY, recipientData);
    showToast("Recipient details saved!", "success");
  };

  const handleMoveToWishlist = (item) => {
    addToWishlist(item);
    removeFromCart(item.id, item.variantSku);
    showToast(`${item.name} moved to wishlist`, "success");
  };

  const handleOpenEditAddress = () => {
    setEditAddressForm(currentAddress);
    setIsEditAddressOpen(true);
  };

  const isValidLatLng = (loc) =>
    loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng);

  const resolveAddressCoords = async (addressText) => {
    const q = String(addressText || "").trim();
    if (!q) return null;

    const cacheKey = `addr:${q}`;
    const cached = getCachedGeocode(cacheKey);
    if (cached?.location?.lat && cached?.location?.lng) {
      return cached.location;
    }

    try {
      const resp = await customerApi.geocodeAddress(q);
      const loc = resp.data?.result?.location;
      if (isValidLatLng(loc)) {
        setCachedGeocode(cacheKey, { location: { lat: loc.lat, lng: loc.lng } });
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (e) {
      const serverMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error?.message ||
        e?.message ||
        null;
      const err = new Error(serverMsg || "Could not geocode address");
      err.__serverMsg = serverMsg;
      throw err;
    }

    return null;
  };

  const handleSelectSavedAddress = async (addr) => {
    const rawText = addr?.address || "";
    const addrLoc = addr?.location;
    const hasLoc = isValidLatLng(addrLoc);
    const pid = typeof addr?.placeId === "string" ? addr.placeId.trim() : "";

    setIsResolvingAddressCoords(true);
    try {
      let resolvedLoc = null;
      try {
        if (hasLoc) {
          resolvedLoc = addrLoc;
        } else if (pid) {
          const cacheKey = `pid:${pid}`;
          const cached = getCachedGeocode(cacheKey);
          if (cached?.location?.lat && cached?.location?.lng) {
            resolvedLoc = cached.location;
          } else {
            const resp = await customerApi.geocodePlaceId(pid);
            const loc = resp.data?.result?.location;
            if (isValidLatLng(loc)) {
              resolvedLoc = { lat: loc.lat, lng: loc.lng };
              setCachedGeocode(cacheKey, { location: resolvedLoc });
            }
          }
        } else {
          resolvedLoc = await resolveAddressCoords(rawText);
        }
      } catch (e) {
        showToast(
          e?.__serverMsg ||
            e?.message ||
            "Could not fetch coordinates for this address. Delivery charges may not update.",
          "error",
        );
      }

      if (!resolvedLoc) {
        showToast(
          "Could not fetch coordinates for this address. Please edit the address or choose a different one.",
          "error",
        );
        return;
      }

      setCurrentAddress({
        type: addr.label,
        name: user?.name || currentAddress.name,
        address: rawText,
        city: "",
        phone: addr.phone || currentAddress.phone,
        landmark: "",
        ...(pid ? { placeId: pid } : {}),
        ...(resolvedLoc ? { location: resolvedLoc } : {}),
      });

      if (resolvedLoc) {
        updateLocation(
          {
            name: rawText,
            time: currentLocation?.time || "12-15 mins",
            city: currentLocation?.city,
            state: currentLocation?.state,
            pincode: currentLocation?.pincode,
            latitude: resolvedLoc.lat,
            longitude: resolvedLoc.lng,
          },
          { persist: true, updateSavedHome: false },
        );
      }

      setIsAddressModalOpen(false);
    } finally {
      setIsResolvingAddressCoords(false);
    }
  };

  const handleSaveEditedAddress = async () => {
    if (
      !editAddressForm.name.trim() ||
      !editAddressForm.address.trim() ||
      !editAddressForm.city.trim()
    ) {
      showToast("Please fill name, address and city", "error");
      return;
    }

    let location = null;
    let placeId = null;
    let formattedAddress = null;
    try {
      const query = [
        editAddressForm.address,
        editAddressForm.landmark,
        editAddressForm.city,
      ]
        .filter(Boolean)
        .join(", ");
      const resp = await customerApi.geocodeAddress(query);
      const loc = resp.data?.result?.location;
      if (
        loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
      ) {
        location = { lat: loc.lat, lng: loc.lng };
        placeId = resp.data?.result?.placeId || null;
        formattedAddress = resp.data?.result?.formattedAddress || null;
        updateLocation(
          {
            name: resp.data?.result?.formattedAddress || query,
            time: currentLocation?.time || "12-15 mins",
            city: currentLocation?.city,
            state: currentLocation?.state,
            pincode: currentLocation?.pincode,
            latitude: loc.lat,
            longitude: loc.lng,
          },
          { persist: true, updateSavedHome: false },
        );
      }
    } catch (e) {
      showToast(
        e.response?.data?.message ||
          "Could not fetch coordinates for this address. Delivery charges may be inaccurate.",
        "error",
      );
    }

    setCurrentAddress({
      ...editAddressForm,
      ...(location ? { location } : {}),
      ...(placeId ? { placeId } : {}),
      ...(formattedAddress ? { formattedAddress } : {}),
    });
    setIsEditAddressOpen(false);
    showToast("Delivery address updated", "success");
  };

  const handleUseCurrentLiveLocation = async () => {
    const result = await refreshLocation();

    if (result?.ok && result.location) {
      const liveLocation = result.location;
      setCurrentAddress((prev) => ({
        ...prev,
        address: liveLocation.name,
        landmark: "",
        city: [liveLocation.city, liveLocation.state, liveLocation.pincode]
          .filter(Boolean)
          .join(", "),
        ...(typeof liveLocation.latitude === "number" &&
        typeof liveLocation.longitude === "number"
          ? { location: { lat: liveLocation.latitude, lng: liveLocation.longitude } }
          : {}),
      }));
      showToast("Using your current live location", "success");
      return;
    }

    if (currentLocation?.name) {
      setCurrentAddress((prev) => ({
        ...prev,
        address: currentLocation.name,
        landmark: "",
        city: [currentLocation.city, currentLocation.state, currentLocation.pincode]
          .filter(Boolean)
          .join(", "),
        ...(typeof currentLocation.latitude === "number" &&
        typeof currentLocation.longitude === "number"
          ? { location: { lat: currentLocation.latitude, lng: currentLocation.longitude } }
          : {}),
      }));
      showToast("Using your last detected location", "success");
      return;
    }

    showToast(result?.error || "Unable to detect current location", "error");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${appName} Checkout`,
          text: `Hey! I am ordering some goodies from ${appName}.`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!", "success");
    }
  };

  const handleApplyCoupon = async (coupon) => {
    try {
      const payload = {
        code: coupon.code,
        cartTotal,
        items: cart,
        customerId: user?._id,
      };
      const res = await customerApi.validateCoupon(payload);
      if (res.data.success) {
        const data = res.data.result;
        setSelectedCoupon({
          ...coupon,
          ...data,
        });
        setIsCouponModalOpen(false);
        showToast(`Coupon ${coupon.code} applied!`, "success");
      } else {
        showToast(res.data.message || "Unable to apply coupon", "error");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to apply coupon",
        "error",
      );
    }
  };

  const handleApplyManualCode = async () => {
    if (!manualCode.trim()) {
      showToast("Please enter a coupon code", "error");
      return;
    }
    try {
      const res = await customerApi.validateCoupon({
        code: manualCode.trim(),
        cartTotal,
        items: cart,
        customerId: user?._id,
      });
      if (res.data.success) {
        const data = res.data.result;
        setSelectedCoupon({
          code: manualCode.trim(),
          description: "Applied manually",
          ...data,
        });
        showToast(`Coupon ${manualCode.trim()} applied!`, "success");
      } else {
        showToast(res.data.message || "Invalid coupon", "error");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Invalid coupon",
        "error",
      );
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast(`${product.name} added to cart!`, "success");
  };

  const getCartItem = (productId) => cart.find((item) => item.id === productId);

  // Stable key for recommended products effect — only changes when product IDs change
  const cartProductIdKey = useMemo(
    () =>
      cart
        .map((i) => i.id || i._id)
        .sort()
        .join(","),
    [cart]
  );

  // Load recipient from localStorage + fetch coupons on mount
  useEffect(() => {
    const parsed = getJSON(RECIPIENT_STORAGE_KEY, null);
    if (parsed && parsed.completeAddress && parsed.name && parsed.phone) {
      setRecipientData(parsed);
      setSavedRecipient(parsed);
    }

    const fetchCoupons = async () => {
      try {
        const res = await customerApi.getActiveCoupons();
        if (res.data.success) {
          const list = res.data.result || res.data.results || [];
          setCoupons(list);
        }
      } catch {
        // silently ignore
      }
    };
    fetchCoupons();
  }, []);

  // Debounced checkoutPreview — fires 400 ms after last dependency change
  useEffect(() => {
    if (!isAuthenticated || cart.length === 0) {
      setPricingPreview(null);
      return;
    }

    const buildPreviewPayload = () => ({
      items: cart.map((item) => ({
        product: item.id || item._id,
        name: item.name,
        variantSku: String(item.variantSku || "").trim(),
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      address: buildAddressForOrder(),
      discountTotal: discountAmount,
      taxTotal: 0,
      tipAmount: selectedTip,
      paymentMode: (selectedPayment === "razorpay") ? "ONLINE" : "COD",
      timeSlot: selectedTimeSlot,
    });

    const fetchPreview = async () => {
      try {
        setIsPreviewLoading(true);
        const res = await customerApi.checkoutPreview(buildPreviewPayload());
        if (res.data?.success) {
          setPricingPreview(res.data.result?.breakdown ?? null);
        }
      } catch (error) {
        console.error("Checkout preview failed", error);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(fetchPreview, 400);

    return () => clearTimeout(previewDebounceRef.current);
  }, [
    isAuthenticated,
    cart,
    selectedPayment,
    selectedTip,
    selectedTimeSlot,
    discountAmount,
    savedRecipient,
    currentAddress,
    currentLocation,
  ]);

  // Recommended products — only re-fetches when the set of product IDs changes
  useEffect(() => {
    if (cart.length === 0) {
      setRecommendedProducts([]);
      return;
    }
    const categoryId = cart[0]?.categoryId?._id || cart[0]?.categoryId;
    if (!categoryId) return;

    const cartIds = new Set(cart.map((i) => i.id || i._id));
    customerApi
      .getProducts({ categoryId, limit: 10 })
      .then((res) => {
        if (res.data?.success) {
          const items = (res.data.result?.items || [])
            .map((p) => ({ ...p, id: p._id }))
            .filter((p) => !cartIds.has(p.id));
          setRecommendedProducts(items.slice(0, 8));
        }
      })
      .catch(() => {});
  }, [cartProductIdKey]);

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      const taxAmount = pricingPreview?.taxTotal || 0;
      const orderData = {
        address: buildAddressForOrder(),
        paymentMode: (selectedPayment === "razorpay") ? "ONLINE" : "COD",
        discountTotal: discountAmount,
        taxTotal: taxAmount,
        tipAmount: selectedTip,
        timeSlot: selectedTimeSlot,
        walletAmount: walletAmountToUse,
        items: cart.map((item) => ({
          product: item.id || item._id,
          name: item.name,
          variantSku: String(item.variantSku || "").trim(),
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
      };

      const response = await customerApi.createOrder(orderData);

      if (response.data.success) {
        const result = response.data.result;
        const mainOrder =
          result.order ||
          (Array.isArray(result.orders) ? result.orders[0] : null);
        const mainOrderId = mainOrder?.orderId || result.orderId;
        const paymentRef =
          result.paymentRef || result.checkoutGroupId || mainOrderId;

        if (!mainOrderId) {
          setIsPlacingOrder(false);
          showToast(
            "Order placed but ID not received. Checking order history...",
            "warning"
          );
          navigate("/orders");
          return;
        }

        if (selectedPayment === "razorpay" && finalAmountToPay > 0) {
          try {
            const paymentRes = await customerApi.createRazorpayOrder({
              orderRef: paymentRef,
              orderId: mainOrderId,
            });
            if (!paymentRes.data.success) {
              throw new Error(paymentRes.data.message || "Failed to initiate Razorpay order");
            }
            
            const { key, orderId: rpOrderId, amount, currency } = paymentRes.data.result;

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
              name: settings?.appName || "Anita Megamart",
              description: `Order Payment for #${mainOrderId}`,
              order_id: rpOrderId,
              handler: async function (response) {
                try {
                  setIsPlacingOrder(true);
                  showToast("Verifying payment...", "info");
                  
                  const verifyRes = await customerApi.verifyRazorpayPayment({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                  });

                  if (verifyRes.data.success) {
                    clearCart();
                    showToast("Order placed successfully!", "success");
                    setOrderId(mainOrderId);
                    setShowSuccess(true);
                    
                    if (postOrderNavigateRef.current) {
                      clearTimeout(postOrderNavigateRef.current);
                    }
                    postOrderNavigateRef.current = setTimeout(() => {
                      postOrderNavigateRef.current = null;
                      setIsPlacingOrder(false);
                      navigate(`/orders/${mainOrderId}`);
                    }, 3000);
                  } else {
                    throw new Error(verifyRes.data.message || "Payment verification failed");
                  }
                } catch (err) {
                  setIsPlacingOrder(false);
                  showToast(err.message || "Payment verification failed. Please check order details.", "error");
                  navigate(`/orders/${mainOrderId}`);
                }
              },
              prefill: {
                name: user?.name || "",
                email: user?.email || "",
                contact: user?.phone || "",
              },
              theme: {
                color: "#15803d",
              },
              modal: {
                ondismiss: function () {
                  setIsPlacingOrder(false);
                  showToast("Payment cancelled by user.", "warning");
                },
              },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (resp) {
              setIsPlacingOrder(false);
              showToast(resp.error?.description || "Payment failed. Please try again.", "error");
            });
            rzp.open();
            return;
          } catch (payError) {
            setIsPlacingOrder(false);
            showToast(
              payError.message ||
                "Order created but Razorpay checkout failed. Please pay from order details.",
              "error"
            );
            navigate(`/orders/${mainOrderId}`);
            return;
          }
        }

        if ((selectedPayment === "phonepe" || selectedPayment === "online") && finalAmountToPay > 0) {
          try {
            const paymentRes = await customerApi.createPaymentOrder({
              orderRef: paymentRef,
              orderId: mainOrderId,
            });
            if (paymentRes.data.success && paymentRes.data.result?.redirectUrl) {
              clearCart();
              window.location.href = paymentRes.data.result.redirectUrl;
              return;
            } else {
              throw new Error(
                paymentRes.data.message || "Failed to initiate payment gateway"
              );
            }
          } catch (payError) {
            setIsPlacingOrder(false);
            showToast(
              payError.message ||
                "Order created but payment gateway failed. Please pay from order details.",
              "error"
            );
            navigate(`/orders/${mainOrderId}`);
            return;
          }
        }

        // COD flow
        clearCart();
        showToast("Order placed — waiting for seller to accept.", "success");
        setOrderId(mainOrderId);
        setShowSuccess(true);

        if (postOrderNavigateRef.current) {
          clearTimeout(postOrderNavigateRef.current);
        }
        postOrderNavigateRef.current = setTimeout(() => {
          postOrderNavigateRef.current = null;
          setIsPlacingOrder(false);
          navigate(`/orders/${mainOrderId}`);
        }, 3000);
      } else {
        setIsPlacingOrder(false);
        showToast(response.data.message || "Could not place order.", "error");
      }
    } catch (error) {
      setIsPlacingOrder(false);
      showToast(
        error.response?.data?.message ||
          "Failed to place order. Please try again.",
        "error"
      );
    }
  };

  // After order placement: WebSocket listener + single fallback fetch
  useEffect(() => {
    if (!orderId || !showSuccess) return undefined;

    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_CUSTOMER);
    getOrderSocket(getToken);
    joinOrderRoom(orderId, getToken);

    const applyCancelled = (order) => {
      if (order.workflowStatus === "CANCELLED" || order.status === "cancelled") {
        if (postOrderNavigateRef.current) {
          clearTimeout(postOrderNavigateRef.current);
          postOrderNavigateRef.current = null;
        }
        setShowSuccess(false);
        showToast("Order cancelled — seller did not accept in time.", "error");
        navigate(`/orders/${orderId}`, { replace: true });
        return true;
      }
      return false;
    };

    // Single immediate check (covers WebSocket-unavailable case)
    customerApi
      .getOrderDetails(orderId)
      .then((r) => {
        if (r.data?.result) applyCancelled(r.data.result);
      })
      .catch(() => {});

    const off = onOrderStatusUpdate(getToken, (order) => applyCancelled(order));

    return () => {
      off();
      leaveOrderRoom(orderId, getToken);
    };
  }, [orderId, showSuccess]);

  // ─── Empty cart state ────────────────────────────────────────────────────────
  if (cart.length === 0 && !showSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-outfit">
        {/* Top Header Bar */}
        <header
          className="sticky top-0 z-50 text-white px-4 h-14 flex items-center gap-3.5 shadow-sm select-none"
          style={{ background: "#741721" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex items-center justify-center w-8 h-8 rounded-full text-white active:scale-90 transition-transform"
          >
            <ArrowLeft size={22} strokeWidth={2.4} />
          </button>
          <h1 className="text-[17px] sm:text-lg font-bold text-white tracking-wide">
            My Cart
          </h1>
        </header>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center -mt-6 sm:-mt-10">
          {/* Fresh Catch Fish Empty Cart Illustration */}
          <div className="mb-6">
            <FishEmptyCartIllustration />
          </div>

          {/* Heading */}
          <h2 className="text-[17.5px] sm:text-[20px] font-bold text-[#2D3748] tracking-tight mb-1">
            Ohhh... Your cart is empty
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-[13.5px] text-[#94A3B8] font-normal mb-8">
            but it doesn&apos;t have to be.
          </p>

          {/* Action Button */}
          <Link
            to="/"
            className="inline-flex items-center justify-center px-10 py-3 sm:px-12 sm:py-3.5 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-md hover:opacity-95 active:scale-95 transition-all select-none"
            style={{ background: "#741721" }}
          >
            SHOP NOW
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main checkout return ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-32 font-sans">
      {/* Order Success Overlay */}
      <CheckoutOrderSuccess orderId={orderId} show={showSuccess} />

      {/* Mobile View - 100% Unchanged */}
      <div className="lg:hidden">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-[var(--brand-700)] via-[var(--brand-600)] to-[var(--brand-400)] pt-6 pb-12 md:pb-24 relative z-10 shadow-lg md:rounded-b-[4rem] rounded-b-[2rem] overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -mr-32 -mt-64 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-brand-400/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all active:scale-95">
                <ChevronLeft size={28} className="text-white" />
              </button>
              <div className="flex flex-col items-center">
                <h1 className="text-xl md:text-3xl font-[1000] text-white tracking-tight uppercase">Checkout</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-1.5 w-1.5 bg-brand-400 rounded-full animate-pulse" />
                  <p className="text-brand-100/90 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase">
                    {cartCount} {cartCount === 1 ? "Item" : "Items"} in cart
                  </p>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="h-12 px-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all active:scale-95">
                <Share2 size={20} className="text-white" />
                <span className="text-xs font-black text-white uppercase tracking-widest hidden sm:block">Share</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 md:-mt-16 lg:-mt-20 relative z-20">
          <div className="space-y-6 pb-8">
            {/* Delivery Time Banner */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Delivery in 12-15 mins</h3>
                  <p className="text-sm text-slate-500">Shipment of {cartCount} items</p>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <CheckoutAddressSection
              currentAddress={currentAddress}
              savedRecipient={savedRecipient}
              savedAddresses={locationSavedAddresses}
              onSelectAddress={() => setIsAddressModalOpen(true)}
              onEditAddress={handleOpenEditAddress}
              onUseCurrentLocation={handleUseCurrentLiveLocation}
              isFetchingLocation={isFetchingLocation}
              showRecipientForm={showRecipientForm}
              onToggleRecipientForm={() => setShowRecipientForm((v) => !v)}
              recipientData={recipientData}
              onRecipientDataChange={setRecipientData}
              onSaveRecipient={handleSaveRecipient}
              onRemoveRecipient={() => setSavedRecipient(null)}
              displayName={displayName}
              displayPhone={displayPhone}
              displayAddress={displayAddress}
            />

            {/* Cart Summary */}
            <CheckoutCartSummary
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              onMoveToWishlist={handleMoveToWishlist}
              showAll={showAllCartItems}
              onToggleShowAll={() => setShowAllCartItems((v) => !v)}
            />

            {/* Wishlist Section */}
            <CheckoutWishlistSection
              wishlist={wishlist}
              sectionRef={wishlistSectionRef}
            />

            {/* Recommended Products */}
            <CheckoutRecommendedProducts
              products={recommendedProducts}
              cart={cart}
              onAddToCart={handleAddToCart}
              onGetCartItem={getCartItem}
            />

            {/* Coupon Section */}
            <CheckoutCouponSection
              coupons={coupons}
              selectedCoupon={selectedCoupon}
              manualCode={manualCode}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={() => setSelectedCoupon(null)}
              onManualCodeChange={setManualCode}
              isOpen={isCouponModalOpen}
              onOpenChange={setIsCouponModalOpen}
              onApplyManualCode={handleApplyManualCode}
            />

            {/* Pricing Breakdown */}
            <CheckoutPricingBreakdown
              pricingPreview={pricingPreview}
              isPreviewLoading={isPreviewLoading}
              selectedTip={selectedTip}
              onSelectTip={setSelectedTip}
              tipAmounts={tipAmounts}
              walletAmountToUse={walletAmountToUse}
              finalAmountToPay={finalAmountToPay}
              cartTotal={cartTotal}
              selectedCoupon={selectedCoupon}
              discountAmount={discountAmount}
            />

            {/* Payment Selector */}
            {finalAmountToPay > 0 ? (
              <CheckoutPaymentSelector
                paymentMethods={paymentMethods}
                selectedPayment={selectedPayment}
                onSelectPayment={setSelectedPayment}
                useWallet={useWallet}
                onToggleWallet={() => setUseWallet((v) => !v)}
                walletBalance={user?.walletBalance || 0}
                walletAmountToUse={walletAmountToUse}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="text-emerald-600" size={20} />
                    <span className="font-bold text-slate-800 text-sm">Payment Method</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg">Wallet Applied</span>
                </div>
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">Wallet Balance Used</p>
                    <p className="text-xs text-emerald-600/80 mt-0.5">No additional payment required</p>
                  </div>
                  <span className="text-lg font-black text-emerald-700">₹{walletAmountToUse}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">Remaining Wallet Balance</span>
                  <span className="text-xs font-semibold text-slate-700">₹{((user?.walletBalance || 0) - walletAmountToUse).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer — Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 rounded-t-3xl">
          <div className="max-w-4xl mx-auto">
            <SlideToPay
              amount={finalAmountToPay}
              onSuccess={handlePlaceOrder}
              isLoading={isPlacingOrder || isPreviewLoading || !pricingPreview}
              text={finalAmountToPay === 0 ? "Place Free Order" : "Slide to Pay"}
            />
          </div>
        </div>
      </div>

      {/* Desktop View - Matching Image 3 */}
      <div className="hidden lg:block">
        <Header />
        <div className="min-h-screen bg-[#FBF8F5] pt-28 pb-16 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 items-start">
            {/* Left Column: Numbered Checkout Steps */}
            <div className="col-span-7 xl:col-span-8 space-y-6">
              {/* Step 1. Delivery Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    1. Delivery Address
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="text-xs font-semibold text-[#741721] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-[#741721] flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      {displayName || "Palak Patel"}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed truncate">
                      {displayAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2. Delivery Slot */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  2. Delivery Slot
                </h2>

                <div className="grid grid-cols-4 gap-3">
                  {/* Slot 1: Today 15 - 30 mins (Default Active) */}
                  <div
                    onClick={() => setSelectedTimeSlot("now")}
                    className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      selectedTimeSlot === "now"
                        ? "bg-[#741721] text-white shadow-sm"
                        : "bg-white border border-[#ede5df] text-slate-700 hover:border-[#741721]"
                    }`}
                  >
                    <Bike size={20} className="mb-1" />
                    <span className="text-xs font-bold">Today</span>
                    <span className="text-[11px] opacity-90">15 - 30 mins</span>
                  </div>

                  {/* Slot 2: Tomorrow 9 AM - 12 PM */}
                  <div
                    onClick={() => setSelectedTimeSlot("slot_9_12")}
                    className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      selectedTimeSlot === "slot_9_12"
                        ? "bg-[#741721] text-white shadow-sm"
                        : "bg-white border border-[#ede5df] text-slate-700 hover:border-[#741721]"
                    }`}
                  >
                    <span className="text-xs font-bold">Tomorrow</span>
                    <span className={`text-[11px] ${selectedTimeSlot === "slot_9_12" ? "opacity-90" : "text-slate-500"}`}>
                      9 AM - 12 PM
                    </span>
                  </div>

                  {/* Slot 3: Tomorrow 12 PM - 3 PM */}
                  <div
                    onClick={() => setSelectedTimeSlot("slot_12_3")}
                    className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      selectedTimeSlot === "slot_12_3"
                        ? "bg-[#741721] text-white shadow-sm"
                        : "bg-white border border-[#ede5df] text-slate-700 hover:border-[#741721]"
                    }`}
                  >
                    <span className="text-xs font-bold">Tomorrow</span>
                    <span className={`text-[11px] ${selectedTimeSlot === "slot_12_3" ? "opacity-90" : "text-slate-500"}`}>
                      12 PM - 3 PM
                    </span>
                  </div>

                  {/* Slot 4: Tomorrow 3 PM - 6 PM */}
                  <div
                    onClick={() => setSelectedTimeSlot("slot_3_6")}
                    className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      selectedTimeSlot === "slot_3_6"
                        ? "bg-[#741721] text-white shadow-sm"
                        : "bg-white border border-[#ede5df] text-slate-700 hover:border-[#741721]"
                    }`}
                  >
                    <span className="text-xs font-bold">Tomorrow</span>
                    <span className={`text-[11px] ${selectedTimeSlot === "slot_3_6" ? "opacity-90" : "text-slate-500"}`}>
                      3 PM - 6 PM
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3. Payment Method */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  3. Payment Method
                </h2>

                <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs space-y-4">
                  {/* Option 1: UPI */}
                  <label
                    onClick={() => {
                      setDesktopPaymentChoice("upi");
                      setSelectedPayment("razorpay");
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="desktop_payment"
                        checked={desktopPaymentChoice === "upi"}
                        onChange={() => {}}
                        className="accent-[#741721] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        UPI (PhonePe / GPay / Paytm)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-black text-[10px] rounded">GPay</span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-black text-[10px] rounded">PhonePe</span>
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 font-black text-[10px] rounded">Paytm</span>
                    </div>
                  </label>

                  {/* Option 2: Cards */}
                  <label
                    onClick={() => {
                      setDesktopPaymentChoice("card");
                      setSelectedPayment("razorpay");
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="desktop_payment"
                        checked={desktopPaymentChoice === "card"}
                        onChange={() => {}}
                        className="accent-[#741721] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Cards (Credit / Debit)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold text-[10px] rounded">VISA</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-900 font-bold text-[10px] rounded">Mastercard</span>
                    </div>
                  </label>

                  {/* Option 3: Net Banking */}
                  <label
                    onClick={() => {
                      setDesktopPaymentChoice("netbanking");
                      setSelectedPayment("razorpay");
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="desktop_payment"
                        checked={desktopPaymentChoice === "netbanking"}
                        onChange={() => {}}
                        className="accent-[#741721] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Net Banking
                      </span>
                    </div>
                  </label>

                  {/* Option 4: Cash on Delivery */}
                  <label
                    onClick={() => {
                      setDesktopPaymentChoice("cash");
                      setSelectedPayment("cash");
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="desktop_payment"
                        checked={desktopPaymentChoice === "cash"}
                        onChange={() => {}}
                        className="accent-[#741721] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Cash on Delivery
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-900 text-white font-bold text-[10px] rounded">COD</span>
                  </label>
                </div>
              </div>

              {/* Big Maroon Place Order CTA */}
              <div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || isPreviewLoading}
                  className="w-full py-4 rounded-xl bg-[#741721] hover:bg-[#5e121a] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>{isPlacingOrder ? "Placing Order..." : "Place Order"}</span>
                </button>
                <p className="text-center text-xs text-slate-500 mt-2 flex items-center justify-center gap-1.5">
                  <Lock size={13} className="text-slate-400" />
                  Your payment information is safe and secure
                </p>
              </div>
            </div>

            {/* Right Column: Order Summary, Price Breakdown, Banner */}
            <div className="col-span-5 xl:col-span-4 space-y-4 select-none">
              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Order Summary
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {cartCount} items &bull; ₹{pricingPreview?.subtotal || cartTotal}
                  </span>
                </div>

                {/* Mini Item List */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={`${item.id}::${String(item.variantSku || "")}`} className="flex items-center gap-3">
                      <img
                        src={applyCloudinaryTransform(item.image)}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {item.weight || "500 g"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 flex-shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <hr className="border-slate-100" />

                {/* Price Details */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-slate-800 text-xs mb-1">Price Details</h3>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">₹{pricingPreview?.subtotal || cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <div>
                      <span>Delivery Charges</span>
                      <p className="text-[10px] text-slate-400">Free delivery above ₹499</p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {(pricingPreview?.deliveryFee ?? 0) === 0 ? (
                        <span className="text-emerald-700 font-bold">FREE</span>
                      ) : (
                        `₹${pricingPreview?.deliveryFee || 30}`
                      )}
                    </span>
                  </div>
                  <hr className="border-slate-100 my-1.5" />
                  <div className="flex justify-between text-sm font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-base text-slate-900">₹{finalAmountToPay || cartTotal}</span>
                  </div>
                </div>

                {/* Freshness Guaranteed Card */}
                <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#FADCDD] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#741721] flex-shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#741721]">Freshness Guaranteed</p>
                    <p className="text-[11px] text-slate-500">or your money back</p>
                  </div>
                </div>
              </div>

              {/* Appetizing Meat Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-[#ede5df] shadow-xs bg-[#fbf5f2] min-h-[160px] flex flex-col justify-end p-4">
                <img
                  src="https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80"
                  alt="Quality Meat"
                  className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.9]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="relative z-10 text-center">
                  <p className="font-serif italic text-base text-white font-bold drop-shadow-md">
                    Quality Meat <span className="text-[#ffd3d8]">for a Healthier You</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Selection Modal */}
      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Delivery Address</DialogTitle>
            <DialogDescription>Choose where you want your order delivered.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {locationSavedAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => handleSelectSavedAddress(addr)}
                disabled={isResolvingAddressCoords}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                  currentAddress.id === addr.id
                    ? "border-primary bg-brand-50 shadow-sm"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${currentAddress.id === addr.id ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-500"}`}>
                    <MapPin size={16} />
                  </div>
                  <span className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{addr.label}</span>
                </div>
                <p className="text-sm font-bold text-slate-800">{user?.name || currentAddress.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-1">{addr.address}</p>
                {addr.phone && (
                  <p className="text-[11px] text-slate-400 font-medium">Phone: {addr.phone}</p>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full border-brand-600 text-brand-600 hover:bg-brand-50"
              onClick={() => navigate("/addresses")}>
              <Plus size={16} className="mr-2" /> Add New Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Current Address Modal */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden p-0">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="p-6">
            <DialogHeader>
              <DialogTitle>Edit Delivery Address</DialogTitle>
              <DialogDescription>Update the details of your current delivery address.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-address" className="text-xs font-semibold text-slate-700">Address</Label>
                <Input
                  id="edit-address"
                  value={editAddressForm.address}
                  onChange={(e) => setEditAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="h-10"
                  placeholder="House, street, area"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-landmark" className="text-xs font-semibold text-slate-700">Nearest Landmark (optional)</Label>
                <Input
                  id="edit-landmark"
                  value={editAddressForm.landmark || ""}
                  onChange={(e) => setEditAddressForm((prev) => ({ ...prev, landmark: e.target.value }))}
                  className="h-10"
                  placeholder="e.g. Near City Mall, Opp. Temple"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city" className="text-xs font-semibold text-slate-700">City / Pincode</Label>
                <Input
                  id="edit-city"
                  value={editAddressForm.city}
                  onChange={(e) => setEditAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="h-10"
                  placeholder="City - Pincode"
                />
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditAddressOpen(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditedAddress}
                className="bg-primary hover:bg-[#0b721b] text-white font-bold">
                Save changes
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </div>
  );
};

export default CheckoutPage;
