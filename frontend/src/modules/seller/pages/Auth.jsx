import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { UserRole } from "@core/constants/roles";
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Store,
  ShoppingBag,
  TrendingUp,
  Rocket,
  Globe,
  MapPin,
  LayoutList,
  FileText,
  Upload,
  CheckCircle,
  Navigation,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import Lottie from "lottie-react";
import sellerAnimation from "../../../assets/INSTANT_6.json";
import { sellerApi } from "../services/sellerApi";
import MapPicker from "../../../shared/components/MapPicker";
import meatBoardImg from "@/assets/meat_seafood_board.jpg";

// Stylized Meatyns Animal Crest Logo (Cow head, Rooster, Fish)
const MeatynsSellerBrandLogo = () => (
  <div className="flex items-center gap-3 select-none">
    <div className="w-14 h-14 rounded-full border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center p-2 shadow-lg shrink-0">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
        <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
        <path d="M28 34 C26 22, 42 20, 50 28 C58 20, 74 22, 72 34 C69 44, 60 52, 50 54 C40 52, 31 44, 28 34 Z" fill="white" />
        <ellipse cx="50" cy="46" rx="9" ry="6" fill="#3B0710" />
        <circle cx="47" cy="46" r="1.5" fill="white" />
        <circle cx="53" cy="46" r="1.5" fill="white" />
        <path d="M46 22 C47 16, 53 16, 54 22 Z" fill="#E5A93C" />
        <path d="M30 68 C38 60, 62 60, 70 68 C62 76, 38 76, 30 68 Z" fill="white" opacity="0.95" />
        <polygon points="68,68 76,64 76,72" fill="white" />
      </svg>
    </div>
    <div className="flex flex-col">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl lg:text-4xl font-serif font-bold text-white tracking-wide leading-none">
          Meatyns
        </span>
        <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">TM</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="w-5 h-[1px] bg-white/40"></span>
        <span className="text-[9px] font-bold text-white/80 tracking-[2.5px] uppercase">
          SELLER PARTNER PORTAL
        </span>
        <span className="w-5 h-[1px] bg-white/40"></span>
      </div>
    </div>
  </div>
);

// Faint Botanical Leaf Illustration for Top-Left
const BotanicalLeaf = () => (
  <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#C98A7D]/30">
    <path d="M10 80 C20 45, 50 25, 85 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M32 60 C38 48, 52 46, 58 52 C54 62, 40 66, 32 60 Z" fill="currentColor" opacity="0.4" />
    <path d="M48 44 C56 32, 70 32, 74 40 C68 48, 54 50, 48 44 Z" fill="currentColor" opacity="0.4" />
    <path d="M68 28 C74 18, 86 18, 90 24 C86 32, 74 34, 68 28 Z" fill="currentColor" opacity="0.4" />
  </svg>
);

// Faint Cow Line-Art Watermark for Bottom-Right
const CowWatermark = () => (
  <svg width="220" height="220" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8B2D3B]/10">
    <path d="M40 30 C30 18, 20 20, 15 35 C12 45, 18 55, 25 65 C32 75, 45 85, 60 90 C75 88, 85 75, 88 60 C90 45, 82 32, 70 25 C62 20, 52 18, 40 30 Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M15 35 C8 30, 6 22, 10 16 C16 12, 22 18, 24 25" stroke="currentColor" strokeWidth="1.2" />
    <path d="M70 25 C78 18, 86 16, 90 20 C92 26, 84 32, 78 35" stroke="currentColor" strokeWidth="1.2" />
    <ellipse cx="60" cy="72" rx="14" ry="10" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="55" cy="72" r="2" fill="currentColor" />
    <circle cx="65" cy="72" r="2" fill="currentColor" />
    <ellipse cx="38" cy="48" rx="3" ry="2" fill="currentColor" />
  </svg>
);

const createInitialVerificationState = () => ({
  status: "idle",
  otp: "",
  token: "",
  isOtpVisible: false,
  isSending: false,
  isVerifying: false,
  verifiedValue: "",
});

const REQUIRED_DOCUMENT_CONFIG = [
  { id: "tradeLicense", label: "Trade License" },
  { id: "gstCertificate", label: "GST Certificate" },
  { id: "idProof", label: "ID Proof" },
];

const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLogin = searchParams.get("mode") !== "register";
  const signupStep = parseInt(searchParams.get("step") || "1", 10);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sellerLoginMode, setSellerLoginMode] = useState("password"); // "password" | "otp"
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);

  const setIsLogin = (newIsLoginOrFn) => {
    const nextIsLogin = typeof newIsLoginOrFn === "function" ? newIsLoginOrFn(isLogin) : newIsLoginOrFn;
    const nextParams = new URLSearchParams(searchParams);
    if (nextIsLogin) {
      nextParams.delete("mode");
      nextParams.delete("step");
    } else {
      nextParams.set("mode", "register");
      nextParams.set("step", "1");
    }
    setSearchParams(nextParams);
  };

  const setSignupStep = (newStepOrFn) => {
    const nextStep = typeof newStepOrFn === "function" ? newStepOrFn(signupStep) : newStepOrFn;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("mode", "register");
    nextParams.set("step", nextStep.toString());
    setSearchParams(nextParams);
  };
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const appName = settings?.appName || "App";
  const logoUrl = settings?.logoUrl || "";
  const [verifications, setVerifications] = useState({
    email: createInitialVerificationState(),
    phone: createInitialVerificationState(),
  });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    shopName: "",
    phone: "",
    locality: "",
    pincode: "",
    city: "",
    state: "",
    category: "",
    description: "",
    lat: null,
    lng: null,
    radius: 5,
    address: "",
  });

  const handleLocationSelect = (location) => {
    setFormData((prev) => ({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      radius: location.radius,
      address: location.address,
      locality: location.locality || prev.locality,
      pincode: location.pincode || prev.pincode,
      city: location.city || prev.city,
      state: location.state || prev.state,
    }));
  };

  const [documents, setDocuments] = useState({
    tradeLicense: null,
    gstCertificate: null,
    idProof: null,
  });

  const getMissingRequiredDocuments = () =>
    REQUIRED_DOCUMENT_CONFIG.filter((doc) => !documents[doc.id]);

  const updateVerificationState = (field, updates) => {
    setVerifications((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...updates,
      },
    }));
  };

  const resetVerificationState = (field) => {
    setVerifications((prev) => ({
      ...prev,
      [field]: createInitialVerificationState(),
    }));
  };

  const getVerificationPayload = (field) => {
    const channel = field === "email" ? "email" : "phone";
    return channel === "email"
      ? { channel, email: formData.email }
      : { channel, phone: formData.phone };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      // Owner name: only alphabets and spaces
      const cleaned = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData({ ...formData, [name]: cleaned });
    } else if (name === "email") {
      // Business email: trim leading spaces, disallow spaces inside
      const cleaned = value.replace(/\s+/g, "").toLowerCase();
      if (cleaned !== formData.email) {
        resetVerificationState("email");
      }
      setFormData({ ...formData, [name]: cleaned });
    } else if (name === "phone") {
      // Contact number: only digits, max 10 characters, strictly starting with 6-9
      const digitsOnly = value.replace(/[^0-9]/g, "").replace(/^[^6-9]+/, "").slice(0, 10);
      if (digitsOnly !== formData.phone) {
        resetVerificationState("phone");
      }
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === "city" || name === "state") {
      // City & State: only alphabets and spaces
      const cleaned = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData({ ...formData, [name]: cleaned });
    } else if (name === "pincode") {
      const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 6);
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === "password") {
      // Password: allow any characters, min length 6
      setFormData({ ...formData, [name]: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDocumentChange = (e, docName) => {
    setDocuments({ ...documents, [docName]: e.target.files[0] });
  };

  const handleSendVerificationOtp = async (field) => {
    const currentValue = formData[field];
    const isEmailField = field === "email";

    if (
      (isEmailField &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentValue || "")) ||
      (!isEmailField && !/^[0-9]{10}$/.test(currentValue || ""))
    ) {
      toast.error(
        isEmailField
          ? "Enter a valid email before requesting OTP."
          : "Enter a valid 10-digit phone number before requesting OTP.",
      );
      return;
    }

    updateVerificationState(field, {
      isSending: true,
      isOtpVisible: true,
      otp: "",
      token: "",
      status: "sending",
    });

    try {
      await sellerApi.sendVerificationOtp(getVerificationPayload(field));
      updateVerificationState(field, {
        isSending: false,
        isOtpVisible: true,
        status: "otp-sent",
      });
      toast.success(
        isEmailField
          ? "Verification OTP sent to your email."
          : "Verification OTP sent to your phone.",
      );
    } catch (error) {
      updateVerificationState(field, {
        isSending: false,
        status: "idle",
      });
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async (field) => {
    const verificationState = verifications[field];
    if (!/^\d{4}$/.test(verificationState.otp || "")) {
      toast.error("Enter a valid 4-digit OTP.");
      return;
    }

    updateVerificationState(field, {
      isVerifying: true,
    });

    try {
      const response = await sellerApi.verifyVerificationOtp({
        ...getVerificationPayload(field),
        otp: verificationState.otp,
      });
      const verificationToken =
        response.data?.result?.verificationToken || "";

      updateVerificationState(field, {
        isVerifying: false,
        isOtpVisible: false,
        status: "verified",
        otp: "",
        token: verificationToken,
        verifiedValue: formData[field],
      });
      toast.success(
        field === "email"
          ? "Email verified successfully."
          : "Phone number verified successfully.",
      );
    } catch (error) {
      updateVerificationState(field, {
        isVerifying: false,
      });
      toast.error(error.response?.data?.message || "Failed to verify OTP");
    }
  };

  const handlePanelWheel = (e) => {
    const panel = e.currentTarget;
    if (panel.scrollHeight <= panel.clientHeight) {
      return;
    }

    e.preventDefault();
    panel.scrollTop += e.deltaY;
  };

  const handleSendSellerLoginOtp = async () => {
    const emailToUse = (formData.email || "").trim().toLowerCase();
    if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      toast.error("Please enter a valid business email address.");
      return;
    }
    setIsSendingLoginOtp(true);
    try {
      const res = await sellerApi.sendLoginOtp({ email: emailToUse });
      setLoginOtpSent(true);
      const mockOtp = res.data?.result?.mockOtp || "1234";
      toast.success(`Mock OTP: ${mockOtp}`, { duration: 10000 });
      toast.info(`OTP sent to ${emailToUse}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleVerifySellerLoginOtp = async (e) => {
    e?.preventDefault();
    const emailToUse = (formData.email || "").trim().toLowerCase();
    if (!loginOtp || loginOtp.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await sellerApi.verifyLoginOtp({ email: emailToUse, otp: loginOtp });
      const { token, seller } = res.data.result;
      login({
        ...seller,
        token,
        role: "seller",
      });
      toast.success("Welcome back, Partner!");
      navigate("/seller");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin && sellerLoginMode === "otp") {
      if (!loginOtpSent) {
        handleSendSellerLoginOtp();
      } else {
        handleVerifySellerLoginOtp(e);
      }
      return;
    }

    try {
      // Basic client-side validation for signup
      if (!isLogin) {
        const email = formData.email || "";
        const phone = formData.phone || "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast.error("Please enter a valid business email address.");
          setIsLoading(false);
          return;
        }
        if (!/^[0-9]{10}$/.test(phone)) {
          toast.error("Please enter a valid 10-digit contact number.");
          return;
        }
        if (verifications.email.status !== "verified" || !verifications.email.token) {
          toast.error("Please verify your business email before continuing.");
          return;
        }
        if (verifications.phone.status !== "verified" || !verifications.phone.token) {
          toast.error("Please verify your contact number before continuing.");
          return;
        }
      }
      // Password: min 6 characters
      const pwd = (formData.password || "").trim();
      if (pwd.length < 6) {
        toast.error(
          "Password must be at least 6 characters.",
        );
        return;
      }

      if (!isLogin && signupStep < 3) {
        setSignupStep((prev) => prev + 1);
        return;
      }

      if (!isLogin) {
        const missingRequiredDocuments = getMissingRequiredDocuments();
        if (missingRequiredDocuments.length > 0) {
          toast.error(
            `Please upload all required documents: ${missingRequiredDocuments
              .map((doc) => doc.label)
              .join(", ")}`,
          );
          return;
        }
      }

      setIsLoading(true);
      // Note: backend expects a single address string, derive from city + state
      const address =
        formData.address ||
        [
          formData.locality,
          formData.city,
          formData.state,
          formData.pincode,
        ]
          .filter(Boolean)
          .join(", ");

      const response = isLogin
        ? await sellerApi.login({
          email: formData.email,
          password: formData.password,
        })
        : await (() => {
          const signupPayload = new FormData();

          Object.entries({
            ...formData,
            address,
            lat: formData.lat,
            lng: formData.lng,
            radius: formData.radius,
            emailVerificationToken: verifications.email.token,
            phoneVerificationToken: verifications.phone.token,
          }).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
              signupPayload.append(key, value);
            }
          });

          Object.entries(documents).forEach(([key, file]) => {
            if (file) {
              signupPayload.append(key, file);
            }
          });

          return sellerApi.signup(signupPayload);
        })();

      if (isLogin) {
        const { token, seller } = response.data.result;
        login({
          ...seller,
          token,
          role: "seller",
        });
        toast.success("Welcome back, Partner!");
        navigate("/seller");
      } else {
        setIsLogin(true);
        setSignupStep(1);
        setDocuments({
          tradeLicense: null,
          gstCertificate: null,
          idProof: null,
        });
        setVerifications({
          email: createInitialVerificationState(),
          phone: createInitialVerificationState(),
        });
        setFormData((prev) => ({
          ...prev,
          password: "",
        }));
        toast.success(
          "Application submitted. Login is enabled only after admin approval.",
        );
        navigate("/seller/pending-approval", {
          replace: true,
          state: {
            approvalRequired: true,
            applicationStatus: "pending",
          },
        });
      }
    } catch (error) {
      if (isLogin && error.response?.status === 403) {
        const applicationStatus =
          error.response?.data?.result?.applicationStatus || "pending";
        const rejectionReason =
          error.response?.data?.result?.rejectionReason || "";
        navigate("/seller/pending-approval", {
          replace: true,
          state: {
            approvalRequired: true,
            applicationStatus,
            rejectionReason,
          },
        });
      }
      toast.error(error.response?.data?.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAF7F2] font-['Outfit',_sans-serif]">
      {/* ================================================================= */}
      {/* LEFT COLUMN: Deep Maroon Banner + Full-bleed Background Image     */}
      {/* ================================================================= */}
      <div className="hidden md:flex md:w-1/2 md:min-h-screen relative overflow-hidden text-white flex-col justify-between shrink-0">
        {/* Full-bleed Background Image with Seamless Dark Burgundy Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={meatBoardImg} 
            alt="Fresh Meat, Fish, and Seafood Selection" 
            className="w-full h-full object-cover object-bottom scale-100" 
          />
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(48,7,14,0.46) 0%, rgba(40,5,11,0.35) 32%, rgba(26,3,7,0.20) 55%, rgba(14,2,4,0.08) 75%, rgba(8,1,2,0.38) 100%)'
            }}
          />
          <div 
            className="absolute inset-0" 
            style={{ background: 'radial-gradient(circle at 75% 25%, rgba(45,6,12,0.10) 0%, rgba(10,1,2,0.22) 100%)' }} 
          />
        </div>

        {/* Fresh Green Foliage Accents in Top Corners */}
        <div className="absolute top-0 left-0 w-36 h-36 pointer-events-none opacity-80 z-10">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
            <path d="M0 0 C25 15, 35 45, 18 70 C5 55, 10 25, 0 0 Z" fill="#2E7D32" opacity="0.9" />
            <path d="M15 10 C35 5, 55 25, 45 45 C30 40, 20 25, 15 10 Z" fill="#43A047" opacity="0.8" />
            <path d="M0 25 C18 35, 20 60, 5 75 C-5 60, 2 40, 0 25 Z" fill="#1B5E20" opacity="0.85" />
          </svg>
        </div>
        <div className="absolute top-10 -right-4 w-28 h-28 pointer-events-none opacity-75 z-10">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
            <path d="M100 0 C75 10, 60 35, 75 55 C90 45, 95 20, 100 0 Z" fill="#2E7D32" opacity="0.85" />
            <path d="M85 30 C70 40, 65 65, 80 75 C92 65, 95 48, 85 30 Z" fill="#388E3C" opacity="0.75" />
          </svg>
        </div>

        {/* Top Section: Meatyns Logo */}
        <div className="relative z-10 p-8 lg:p-12 xl:p-14 pb-0">
          <MeatynsSellerBrandLogo />
        </div>

        {/* Center Section: Headline & Value Badges */}
        <div className="relative z-10 px-8 lg:px-12 xl:px-14 my-auto py-6">
          <h1 
            className="text-3xl lg:text-4xl xl:text-5xl font-serif font-bold text-white leading-[1.18] tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Grow Your Meat &amp; Seafood<br />
            <span className="text-[#E5A93C] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">With Meatyns</span>
          </h1>

          <p className="mt-4 text-white/95 text-sm lg:text-[15px] font-normal max-w-sm leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            Join India's premier fresh meat delivery network. Reach thousands of daily meat lovers with fast logistics and daily payouts.
          </p>

          {/* 3 Value Badges in a horizontal row */}
          <div className="mt-7 flex items-center gap-4 lg:gap-6 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Rocket size={18} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                Growth<br />First
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                Daily<br />Settlements
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Globe size={18} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                Pan India<br />Reach
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Cursive Typography over the cutting board */}
        <div className="relative z-10 p-8 lg:p-12 xl:p-14 pt-0 select-none">
          <span 
            className="text-[#E5A93C] text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] block -rotate-3 leading-tight tracking-wide"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Good Food<br />Good Health
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* RIGHT COLUMN: Warm Cream Form Container                           */}
      {/* ================================================================= */}
      <div 
        className="w-full md:w-1/2 min-h-screen bg-[#FAF7F2] p-6 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-between relative overflow-y-auto custom-scrollbar"
        onWheelCapture={handlePanelWheel}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Botanical leaf decoration in top-left */}
        <div className="absolute top-4 left-6 pointer-events-none">
          <BotanicalLeaf />
        </div>

        {/* Cow line watermark in bottom-right */}
        <div className="absolute -bottom-6 -right-6 pointer-events-none">
          <CowWatermark />
        </div>

        {/* Top Right: Toggle link between Login and Signup */}
        <div className="relative z-10 flex justify-end items-center text-xs lg:text-sm">
          {isLogin ? (
            <div className="text-stone-600">
              New seller?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setVerifications({
                    email: createInitialVerificationState(),
                    phone: createInitialVerificationState(),
                  });
                }}
                className="text-[#621320] hover:text-[#4A0D18] font-bold inline-flex items-center gap-1 hover:underline transition-all"
              >
                Register as Partner <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="text-stone-600">
              Already a partner?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setVerifications({
                    email: createInitialVerificationState(),
                    phone: createInitialVerificationState(),
                  });
                }}
                className="text-[#621320] hover:text-[#4A0D18] font-bold inline-flex items-center gap-1 hover:underline transition-all"
              >
                Log in <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Center Form Content */}
        <div className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login" : `signup-step-${signupStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-6">
              <div>
                <span className="inline-block px-3.5 py-1 bg-amber-50 text-[#621320] rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200/80 mb-2">
                  {isLogin
                    ? "Partner Portal"
                    : `Partner Registration — Step ${signupStep} of 3`}
                </span>
                <h1 
                  className="text-3xl lg:text-4xl font-serif font-bold text-[#2A1515] tracking-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {isLogin ? "Welcome Partner" : "Register Store"}
                </h1>
                <div className="w-12 h-1 bg-[#C98A2C] rounded-full mt-2.5 mb-3" />
                <p className="text-stone-500 font-normal text-xs lg:text-sm leading-relaxed">
                  {isLogin
                    ? "Access your unified seller dashboard to manage inventory, catalog, and orders."
                    : signupStep === 1
                      ? "Register your owner credentials to start onboarding."
                      : signupStep === 2
                        ? "Set your butcher shop address and delivery radius."
                        : "Upload verification documents to complete partner KYC."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mode Selector for Seller Login: Email & Password vs Email OTP */}
                {isLogin && (
                  <div className="flex bg-stone-100 rounded-xl p-1 gap-1 border border-stone-200/60 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSellerLoginMode("password");
                        setLoginOtpSent(false);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        sellerLoginMode === "password"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      Email &amp; Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSellerLoginMode("otp");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        sellerLoginMode === "otp"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      Email OTP
                    </button>
                  </div>
                )}

                {/* LOGIN OR SIGNUP STEP 1 */}
                {(isLogin || signupStep === 1) && (
                  <>
                    {!isLogin && (
                      <div className="space-y-4">
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                            <User size={18} />
                          </div>
                          <input
                            type="text"
                            name="name"
                            required
                            placeholder="Owner Name"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                            value={formData.name}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                            <Store size={18} />
                          </div>
                          <input
                            type="text"
                            name="shopName"
                            required
                            placeholder="Shop / Business Name"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                            value={formData.shopName}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    )}

                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        inputMode="email"
                        autoComplete="email"
                        placeholder="Business Email"
                        className="w-full pl-12 pr-28 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {!isLogin && (
                        <button
                          type="button"
                          onClick={() => handleSendVerificationOtp("email")}
                          disabled={
                            verifications.email.isSending ||
                            verifications.email.status === "verified" ||
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || "")
                          }
                          className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${verifications.email.status === "verified"
                            ? "bg-brand-100 text-brand-700 cursor-default"
                            : "bg-slate-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                            }`}>
                          {verifications.email.isSending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : verifications.email.status === "verified" ? (
                            "Verified"
                          ) : verifications.email.isOtpVisible ? (
                            "Resend"
                          ) : (
                            "Verify"
                          )}
                        </button>
                      )}
                    </div>
                    {!isLogin && verifications.email.isOtpVisible && verifications.email.status !== "verified" && (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="Enter email OTP"
                          value={verifications.email.otp}
                          onChange={(e) =>
                            updateVerificationState("email", {
                              otp: e.target.value.replace(/\D/g, "").slice(0, 4),
                            })
                          }
                          className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOtp("email")}
                          disabled={verifications.email.isVerifying || verifications.email.otp.length !== 4}
                          className="rounded-md bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {verifications.email.isVerifying ? "Checking..." : "Confirm OTP"}
                        </button>
                      </div>
                    )}
                    {!isLogin && verifications.email.status === "verified" && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Email verified successfully.</span>
                      </div>
                    )}

                    {!isLogin && (
                      <>
                        <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                            <Phone size={18} />
                          </div>
                          <input
                            type="tel"
                            name="phone"
                            required
                            placeholder="Contact Number"
                            className="w-full pl-12 pr-28 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                            value={formData.phone}
                            onChange={handleChange}
                          />
                          <button
                            type="button"
                            onClick={() => handleSendVerificationOtp("phone")}
                            disabled={
                              verifications.phone.isSending ||
                              verifications.phone.status === "verified" ||
                              !/^[0-9]{10}$/.test(formData.phone || "")
                            }
                            className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${verifications.phone.status === "verified"
                              ? "bg-brand-100 text-brand-700 cursor-default"
                              : "bg-slate-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                              }`}>
                            {verifications.phone.isSending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : verifications.phone.status === "verified" ? (
                              "Verified"
                            ) : verifications.phone.isOtpVisible ? (
                              "Resend"
                            ) : (
                              "Verify"
                            )}
                          </button>
                        </div>
                        {verifications.phone.isOtpVisible && verifications.phone.status !== "verified" && (
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="Enter phone OTP"
                              value={verifications.phone.otp}
                              onChange={(e) =>
                                updateVerificationState("phone", {
                                  otp: e.target.value.replace(/\D/g, "").slice(0, 4),
                                })
                              }
                              className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleVerifyOtp("phone")}
                              disabled={verifications.phone.isVerifying || verifications.phone.otp.length !== 4}
                              className="rounded-md bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
                            >
                              {verifications.phone.isVerifying ? "Checking..." : "Confirm OTP"}
                            </button>
                          </div>
                        )}
                        {verifications.phone.status === "verified" && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-brand-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Phone number verified successfully.</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Password Field (Shown for signup step 1 or login with password mode) */}
                    {(!isLogin || (isLogin && sellerLoginMode === "password")) && (
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          required
                          minLength={6}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className="w-full pl-12 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                          value={formData.password}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors px-2"
                          tabIndex="-1">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}

                    {/* Email OTP Field for Seller Login */}
                    {isLogin && sellerLoginMode === "otp" && loginOtpSent && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3.5 py-2.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="Enter 4-digit Mock OTP"
                            value={loginOtp}
                            onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handleSendSellerLoginOtp}
                            disabled={isSendingLoginOtp}
                            className="text-[11px] font-bold text-amber-800 hover:underline disabled:opacity-50"
                          >
                            {isSendingLoginOtp ? "Sending..." : "Resend OTP"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* SIGNUP STEP 2 (Shop address and service area) */}
                {!isLogin && signupStep === 2 && (
                  <div className="space-y-4">
                    <div className="pt-2">
                      <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                        Shop Location & Service Area
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer ${formData.lat
                          ? "border-brand-200 bg-brand-50/50"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300"
                          }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-md ${formData.lat ? "bg-brand-100 text-brand-600" : "bg-white text-slate-600 shadow-sm"}`}>
                            {formData.lat ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                          </div>
                          <div className="text-left">
                            <p
                              className={`text-xs font-bold ${formData.lat ? "text-brand-700" : "text-slate-600"}`}>
                              {formData.lat
                                ? "Location Selected"
                                : "Pin Shop on Map"}
                            </p>
                            <p className="text-xs text-slate-600 font-medium truncate max-w-[250px]">
                              {formData.lat
                                ? `${formData.address} (${formData.radius}km)`
                                : "Precisely mark your shop location"}
                            </p>
                          </div>
                        </div>
                        {formData.lat && (
                          <span className="text-[10px] font-black text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            Verified
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                          <MapPin size={18} />
                        </div>
                        <input
                          type="text"
                          name="locality"
                          required
                          placeholder="Locality / Area"
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                          value={formData.locality}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                          <MapPin size={18} />
                        </div>
                        <input
                          type="text"
                          name="pincode"
                          required
                          placeholder="Pincode"
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                          value={formData.pincode}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                          <MapPin size={18} />
                        </div>
                        <input
                          type="text"
                          name="city"
                          required
                          placeholder="City"
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                          value={formData.city}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                          <MapPin size={18} />
                        </div>
                        <input
                          type="text"
                          name="state"
                          required
                          placeholder="State"
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300"
                          value={formData.state}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute left-5 top-5 text-slate-300 group-focus-within:text-violet-600 transition-colors">
                        <MapPin size={18} />
                      </div>
                      <textarea
                        name="address"
                        rows={3}
                        required
                        placeholder="Full address"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all placeholder:text-slate-300 resize-none"
                        value={formData.address}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}

                {/* SIGNUP STEP 3 (Verification documents) */}
                {!isLogin && signupStep === 3 && (
                  <div className="space-y-4">
                    <div className="pt-2">
                      <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3">
                        Verification Documents
                      </p>
                      <div className="space-y-3">
                        {REQUIRED_DOCUMENT_CONFIG.map((doc) => (
                          <div key={doc.id} className="relative">
                            <input
                              type="file"
                              id={doc.id}
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleDocumentChange(e, doc.id)}
                            />
                            <label
                              htmlFor={doc.id}
                              className={`flex items-center justify-between p-3.5 rounded-lg border-2 border-dashed transition-all cursor-pointer ${documents[doc.id]
                                ? "border-brand-200 bg-brand-50/50"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300"
                                }`}>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-md ${documents[doc.id] ? "bg-brand-100 text-brand-600" : "bg-white text-slate-600 shadow-sm"}`}>
                                  {documents[doc.id] ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <p
                                    className={`text-xs font-bold ${documents[doc.id] ? "text-brand-700" : "text-slate-600"}`}>
                                    {doc.label}
                                  </p>
                                  <p className="text-xs text-slate-600 font-medium truncate max-w-[150px]">
                                    {documents[doc.id]
                                      ? documents[doc.id].name
                                      : "Upload secure PDF or image"}
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {!isLogin && signupStep > 1 && (
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="w-1/3 bg-slate-100 text-slate-600 rounded-lg py-4 text-sm font-black tracking-[2px] transition-all hover:bg-slate-200">
                      BACK
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || isSendingLoginOtp}
                    className={`${!isLogin && signupStep > 1 ? "w-2/3" : "w-full"} bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] rounded-xl py-3.5 text-sm font-extrabold tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 group border border-[#E5B800]`}>
                    {isLoading || isSendingLoginOtp
                      ? "Working..."
                      : isLogin
                        ? sellerLoginMode === "otp"
                          ? loginOtpSent
                            ? "Verify OTP & Login"
                            : "Send Mock OTP"
                          : "Login to Seller Dashboard"
                        : signupStep < 3
                          ? "Continue to Next Step"
                          : "Submit Partner Application"}
                    <ArrowRight
                      className="group-hover:translate-x-1 transition-transform"
                      size={16}
                    />
                  </button>
                </div>
              </form>

              {(isLogin || signupStep === 1) && (
                <div className="pt-2 border-t border-stone-200/60 flex flex-col items-center gap-1">
                  <p className="text-stone-600 text-xs">
                    {isLogin ? "New to Meatyns?" : "Already registered as seller?"}{" "}
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setVerifications({
                          email: createInitialVerificationState(),
                          phone: createInitialVerificationState(),
                        });
                      }}
                      className="text-[#621320] font-bold hover:underline transition-colors px-1">
                      {isLogin ? "Register Store" : "Log In"}
                    </button>
                  </p>
                  <div className="mt-2 text-center">
                    <p className="text-[11px] text-stone-400 font-normal">
                      By continuing, you agree to our{" "}
                      <Link to="/terms" className="text-stone-600 hover:text-stone-900 underline transition-colors">Terms & Conditions</Link>
                      {" "}and{" "}
                      <Link to="/privacy" className="text-stone-600 hover:text-stone-900 underline transition-colors">Privacy Policy</Link>.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Partner Security Badge */}
        <div className="relative z-10 flex items-center justify-center gap-2 text-stone-400 text-center text-xs pt-4">
          <ShieldCheck size={16} className="text-stone-400 shrink-0" />
          <span>Protected by Meatyns partner encryption &amp; seller security standards.</span>
        </div>
      </div>

      {isMapOpen && (
        <MapPicker
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleLocationSelect}
          preferCurrentLocationOnOpen={true}
          initialLocation={
            formData.lat ? { lat: formData.lat, lng: formData.lng } : null
          }
          initialRadius={formData.radius}
        />
      )}
    </div>
  );
};

export default Auth;
