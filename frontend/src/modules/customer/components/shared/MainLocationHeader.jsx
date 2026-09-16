import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ShoppingCart,
  Search,
  MapPin,
  ChevronDown,
  Zap,
  CircleUserRound,
} from "lucide-react";
import LocationDrawer from "./LocationDrawer";
import { useLocation } from "../../context/LocationContext";
import { useProductDetail } from "../../context/ProductDetailContext";
import { useSettings } from "@core/context/SettingsContext";
import { useCart } from "../../context/CartContext";
import { cn } from "@/lib/utils";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import {
  buildHeaderGradient,
  buildMiniCartColor,
  buildSearchBarBackgroundColor,
  shiftHex,
} from "../../utils/headerTheme";
import LogoImage from "../../../../assets/Logo.png";

// MUI Icons
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import MicIcon from "@mui/icons-material/Mic";
import ChevronDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";


// Leaf outline emblem matching brand logo design
export const LeafLogo = ({ className = "w-8 h-8 text-white shrink-0" }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Left curved petal / leaf */}
    <path
      d="M10 27C9 21 11.5 15.5 16 12C18 10.5 20.5 10 20.5 10C20.5 10 19.5 14.5 17 18C14.8 21 13 24 10 27Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right main leaf */}
    <path
      d="M11 26C14 23 20 18 24 13C27.5 8.5 30 8 30 8C30 8 29.5 12.5 26 17.5C21.5 23.5 16 26.5 11 26Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center vein */}
    <path
      d="M15 22C19 18 23.5 14.5 27.5 11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const MainLocationHeader = ({
  categories = [],
  activeCategory,
  onCategorySelect,
  disableCollapse = false,
  variant = "default",
}) => {
  const isLight = variant === "light";
  const { scrollY } = useScroll();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const { cartCount } = useCart();
  const { currentLocation, refreshLocation, isFetchingLocation } =
    useLocation();
  const { isOpen: isProductDetailOpen } = useProductDetail();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";
  const logoUrl = settings?.logoUrl || LogoImage;
  const navigate = useNavigate();

  // Search Logic
  const handleSearchClick = () => {
    navigate("/search");
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      navigate("/search", { state: { query: e.target.value } });
    }
  };

  // Search placeholder animation
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search ");
  const [typingState, setTypingState] = useState({
    textIndex: 0,
    charIndex: 0,
    isDeleting: false,
    isPaused: false,
  });

  const staticText = "Search ";
  const typingPhrases = [
    '"mutton"',
    '"chicken"',
    '"fish fillets"',
    '"prawns"',
    '"goat meat"',
    '"beef"',
    '"lamb chops"',
  ];

  useEffect(() => {
    const { textIndex, charIndex, isDeleting, isPaused } = typingState;
    const currentPhrase = typingPhrases[textIndex];

    if (isPaused) {
      const timeout = setTimeout(() => {
        setTypingState((prev) => ({
          ...prev,
          isPaused: false,
          isDeleting: true,
        }));
      }, 2000); // Pause after full phrase
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Typing
          if (charIndex < currentPhrase.length) {
            setSearchPlaceholder(
              staticText + currentPhrase.substring(0, charIndex + 1),
            );
            setTypingState((prev) => ({
              ...prev,
              charIndex: prev.charIndex + 1,
            }));
          } else {
            // Finished typing
            setTypingState((prev) => ({ ...prev, isPaused: true }));
          }
        } else {
          // Deleting
          if (charIndex > 0) {
            setSearchPlaceholder(
              staticText + currentPhrase.substring(0, charIndex - 1),
            );
            setTypingState((prev) => ({
              ...prev,
              charIndex: prev.charIndex - 1,
            }));
          } else {
            // Finished deleting -> Move to next phrase
            setTypingState({
              textIndex: (textIndex + 1) % typingPhrases.length,
              charIndex: 0,
              isDeleting: false,
              isPaused: false,
            });
          }
        }
      },
      isDeleting ? 40 : 80,
    );

    return () => clearTimeout(timeout);
  }, [typingState, typingPhrases]);

  // Handle manual scroll update for location drawer
  useEffect(() => {
    if (isLocationOpen) {
      refreshLocation?.();
    }
  }, [isLocationOpen, refreshLocation]);

  // Responsive Hook: detect mobile vs desktop
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useLayoutEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Motion transforms
  const headerTopPadding = disableCollapse ? (isMobile ? "14px" : "12px") : useTransform(scrollY, [0, 160], isMobile ? ["14px", "8px"] : ["12px", "12px"]);
  const headerBottomPadding = disableCollapse ? (isMobile ? "10px" : "12px") : useTransform(scrollY, [0, 160], isMobile ? ["10px", "6px"] : ["12px", "12px"]);
  const headerRoundness = disableCollapse ? "0px" : useTransform(scrollY, [0, 160], isMobile ? ["0px", "16px"] : ["0px", "0px"]);
  const bgOpacity = disableCollapse ? 1 : useTransform(scrollY, [0, 160], [1, 0.98]);

  // Content animations
  const contentHeight = disableCollapse ? (isMobile ? "44px" : "64px") : useTransform(scrollY, [0, 160], isMobile ? ["44px", "0px"] : ["64px", "0px"]);
  const contentOpacity = disableCollapse ? 1 : useTransform(scrollY, [0, 160], [1, 0]);

  // Helper to hide elements completely when collapsed to prevent clicks
  const displayContent = disableCollapse ? "block" : useTransform(scrollY, (value) =>
    value > 160 ? "none" : "block",
  );

  const baseHeaderColor = isLight ? "#FAF5EE" : (activeCategory?.headerColor || "#520e1e");
  const headerFontColor = isLight ? "#1A1A1A" : (activeCategory?.headerFontColor || "#FFFFFF");
  const headerIconColor = isLight ? "#1A1A1A" : (activeCategory?.headerIconColor || "#FFFFFF");
  
  const headerGradient = buildHeaderGradient(baseHeaderColor);
  const searchBarBg = isLight ? "#FAF5EC" : buildSearchBarBackgroundColor(baseHeaderColor);
  const categoryAccent = headerIconColor;

  useEffect(() => {
    if (!isLight) {
      const c = buildMiniCartColor(baseHeaderColor);
      document.documentElement.style.setProperty("--customer-mini-cart-color", c);
    }
    return () => {
      document.documentElement.style.removeProperty(
        "--customer-mini-cart-color",
      );
    };
  }, [baseHeaderColor, isLight]);

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-200",
          isProductDetailOpen && "hidden md:block",
        )}>
        <motion.div
          initial={false}
          style={{
            paddingTop: headerTopPadding,
            paddingBottom: headerBottomPadding,
            borderBottomLeftRadius: headerRoundness,
            borderBottomRightRadius: headerRoundness,
            opacity: bgOpacity,
            backgroundImage: isLight ? undefined : headerGradient,
            backgroundColor: isLight ? "#FAF5EE" : undefined,
          }}
          className={cn(
            "px-4 overflow-hidden transform-gpu will-change-transform",
            isLight
              ? "border-b border-[#EFE5D8] shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              : "shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          )}>
          {/* Subtle Contrast Overlay (dark mode only) */}
          {!isLight && <div className="absolute inset-0 bg-black/5 pointer-events-none" />}

          {/* Desktop/Tablet Header Layout (md and above) */}
          <div className="hidden md:flex items-center justify-between relative z-20 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-1.5">
            {/* Left Section: Leaf Logo + Meatyns Brand */}
            <div
              onClick={() => navigate("/")}
              className="flex items-center gap-3 cursor-pointer group shrink-0 select-none"
            >
              <div className="group-hover:scale-105 transition-transform duration-200">
                <LeafLogo className="w-8 h-8 lg:w-9 lg:h-9 text-white shrink-0 drop-shadow-sm" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[24px] lg:text-[27px] font-serif font-bold text-white tracking-tight leading-none drop-shadow-sm">
                  Meatyns
                </span>
                <span className="text-[10.5px] lg:text-[11px] font-normal text-white/80 tracking-wide mt-1 leading-none">
                  Fresh &bull; Fast &bull; Everyday
                </span>
              </div>
            </div>

            {/* Center Section: Pill Search Bar */}
            <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
              <div
                onClick={handleSearchClick}
                className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 cursor-pointer shadow-sm hover:shadow transition-shadow"
              >
                <Search size={18} className="text-[#520e1e] shrink-0 stroke-[2.2]" />
                <input
                  type="text"
                  placeholder="Search for meat, fish, seafood, etc..."
                  readOnly
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-normal text-[13.5px] cursor-pointer select-none"
                />
              </div>
            </div>

            {/* Right Section: Delivery & Actions */}
            <div className="flex items-center gap-6 lg:gap-8 shrink-0">
              {/* Deliver to */}
              <button
                type="button"
                data-lenis-prevent
                data-lenis-prevent-touch
                onClick={() => {
                  refreshLocation?.();
                  setIsLocationOpen(true);
                }}
                className="flex items-center gap-2 text-left text-white bg-transparent border-0 p-0 cursor-pointer group hover:opacity-90 transition-opacity"
              >
                <MapPin size={20} className="text-white shrink-0 stroke-[1.8]" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-white/75 font-normal tracking-wide leading-tight">
                    Deliver to
                  </span>
                  <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-white leading-tight">
                    <span className="max-w-[110px] lg:max-w-[140px] truncate">
                      {isFetchingLocation
                        ? "Detecting..."
                        : (currentLocation?.name || "Indore")}
                    </span>
                    <ChevronDown size={13} className="text-white/80 shrink-0" />
                  </div>
                </div>
              </button>

              {/* Delivery in */}
              <div className="flex items-center gap-2 text-white">
                <Zap size={18} className="text-white fill-white shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-white/75 font-normal tracking-wide leading-tight">
                    Delivery in
                  </span>
                  <span className="text-[13px] lg:text-sm font-bold text-white whitespace-nowrap leading-tight">
                    {currentLocation?.time || "15–30 mins"}
                  </span>
                </div>
              </div>

              {/* Profile Icon */}
              <button
                type="button"
                onClick={() => navigate("/profile")}
                aria-label="Profile"
                className="text-white hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
              >
                <CircleUserRound size={28} className="text-white stroke-[1.7]" />
              </button>

              {/* Cart Icon with badge */}
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                aria-label="Shopping Cart"
                className="relative text-white hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
              >
                <ShoppingCart size={24} className="text-white stroke-[2]" />
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#e53935] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                  {cartCount || 0}
                </span>
              </button>
            </div>
          </div>

          {/* ──── Mobile View Navbar (Strictly md:hidden) matching reference screenshot ──── */}
          <div className="md:hidden pt-1">
            <motion.div
              style={{
                height: contentHeight,
                opacity: contentOpacity,
                marginBottom: 2,
                display: displayContent,
                overflow: "hidden",
              }}
              className="relative z-10"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-0.5 min-h-[36px]">
                {/* 1. Left: Delivery Address */}
                <button
                  type="button"
                  data-lenis-prevent
                  data-lenis-prevent-touch
                  onClick={() => {
                    refreshLocation?.();
                    setIsLocationOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-left text-white bg-transparent border-0 p-0 cursor-pointer group active:scale-95 transition-transform min-w-0 max-w-full"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-white shrink-0"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                  </svg>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-[9.5px] font-semibold text-white/90 leading-tight">
                      Delivery
                    </span>
                    <div className="flex items-center gap-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-white leading-tight truncate">
                        {isFetchingLocation
                          ? "Detecting..."
                          : (currentLocation?.name || "Address")}
                      </span>
                      <ChevronDown size={11} className="text-white/80 shrink-0" />
                    </div>
                  </div>
                </button>

                {/* 2. Center: Meatyns Brand (Safely spaced with guaranteed margins) */}
                <div
                  onClick={() => navigate("/")}
                  className="flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 transition-transform shrink-0"
                >
                  <LeafLogo className="w-5 h-5 text-white shrink-0 drop-shadow-xs" />
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[17px] sm:text-[19px] font-serif font-bold text-white tracking-tight leading-none drop-shadow-xs">
                      Meatyns
                    </span>
                    <span className="text-[7.5px] font-normal text-white/80 tracking-wider leading-none mt-0.5 whitespace-nowrap">
                      Fresh &bull; Fast &bull; Everyday
                    </span>
                  </div>
                </div>

                {/* 3. Right: Cart Action (Right aligned with padding) */}
                <div className="flex items-center justify-end shrink-0 pr-1.5">
                  {/* Cart */}
                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    aria-label="Cart"
                    className="relative flex flex-col items-center justify-center text-white bg-transparent border-0 p-0 cursor-pointer active:scale-90 transition-transform select-none"
                  >
                    <div className="relative inline-flex items-center justify-center">
                      <ShoppingCart size={19} className="text-white stroke-[2]" />
                      <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-[#e53935] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm leading-none">
                        {cartCount || 0}
                      </span>
                    </div>
                    <span className="text-[8.5px] font-medium text-white/90 leading-none mt-0.5">
                      Cart
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ──── Search Bar (MOBILE ONLY) matching reference screenshot pill style ──── */}
          <div className="relative z-10 mt-0.5 flex items-center md:hidden">
            <motion.div
              onClick={handleSearchClick}
              whileTap={{ scale: 0.98 }}
              className="w-full h-[34px] bg-white rounded-full px-3 flex items-center gap-2 shadow-xs cursor-pointer active:scale-[0.99] transition-transform"
            >
              <Search size={15} className="text-slate-500 shrink-0 stroke-[2.2]" />
              <input
                type="text"
                placeholder={searchPlaceholder || "Search for meat, fish, seafood, etc..."}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-normal text-[12.5px] cursor-pointer select-none"
              />
              <div className="flex items-center pl-1">
                <MicIcon sx={{ color: "#9ca3af", fontSize: 16 }} />
              </div>
            </motion.div>
          </div>

          {/* Background Decorative patterns (dark mode only) */}
          {!isLight && (
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
          )}
        </motion.div>
      </div>

      <LocationDrawer
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
    </>
  );
};

export default MainLocationHeader;
