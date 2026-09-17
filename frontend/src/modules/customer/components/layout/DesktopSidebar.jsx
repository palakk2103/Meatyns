import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

// SVGs meticulously matched to reference design icons
const MeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M18.5 8C17 5.5 14.5 5 12.5 5.5C10 6 8 8 6.5 11C5 14 5 17 6.5 18.5C8 20 11 20 14 18.5C17 17 19 15 19.5 12.5C20 10.5 19.5 9 18.5 8Z"
      fill="#E53E3E"
      stroke="#9B1C1C"
      strokeWidth="1.5"
    />
    <path
      d="M16 9C14.5 7.5 13 7.5 11.5 8C9.5 8.5 8 10 7 12C6 14 6 16 7 17"
      stroke="#FEB2B2"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <ellipse cx="11.5" cy="13.5" rx="2" ry="1.5" fill="#FFF5F5" stroke="#E53E3E" strokeWidth="0.8" />
  </svg>
);

const FishIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M3 13C6 15 11 16 16 14C19.5 12.5 21 9.5 21 8C19 6.5 14.5 6 10.5 8C6.5 10 4 12 3 13Z"
      fill="#EBF8FF"
      stroke="#2B6CB0"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M19 7L22 4V12L19 9" fill="#63B3ED" stroke="#2B6CB0" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M9 10C9.5 11.5 11.5 12 12.5 11.5" stroke="#2B6CB0" strokeWidth="1" strokeLinecap="round" />
    <circle cx="6.5" cy="11" r="1" fill="#2B6CB0" />
  </svg>
);

const ChickenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M16 6.5C15 5 13.5 5 13.5 5C13.5 5 13 4 11.5 4C10.5 4 10 4.5 10 4.5C9.5 4 8.5 4 8 4.5C7.5 5 7.5 6 7.5 6.5C6 7.5 5.5 9 5.5 10.5C5.5 14 8 17.5 11.5 18C15 18 18 15 18.5 11.5C18.5 10 18 8 16 6.5Z"
      stroke="#C53030"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5.5 10.5L3 11L5 12" stroke="#C53030" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 13C6.5 14.5 7.5 16 8.5 16.5" stroke="#C53030" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="8" cy="8.5" r="0.8" fill="#C53030" />
  </svg>
);

const SeafoodIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M18 6C15 5 11 6 8.5 9C6 12 6.5 16.5 9.5 19C12 21 16 21 18.5 18.5C20.5 16.5 20.5 13 18 10.5C16 8.5 12.5 9.5 11.5 12C11 14 12.5 15.5 14 15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M18 6L21 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M19 8L22 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const FreshCutsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M6 18L17 7C17.5 6.5 18 5 17 4C16 3 14.5 3.5 14 4L3 15C2.5 15.5 2 17 3 18C4 19 5.5 18.5 6 18Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="8" y1="13" x2="11" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="14" y1="7" x2="17" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ReadyToCookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M4 11C4 16 7.5 19 12 19C16.5 19 20 16 20 11H4Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2 11H22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 5C8 6 9 7 9 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M12 4C12 5.5 13 6.5 13 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M16 5C16 6 17 7 17 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const OffersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MyOrdersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WishlistIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SupportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
    <path
      d="M3 18v-6a9 9 0 0 1 18 0v6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DeliveryRiderIcon = () => (
  <svg viewBox="0 0 48 36" fill="none" className="w-10 h-8 text-[#1A1A1A] shrink-0">
    <circle cx="10" cy="27" r="5" stroke="currentColor" strokeWidth="2" />
    <circle cx="38" cy="27" r="5" stroke="currentColor" strokeWidth="2" />
    <circle cx="10" cy="27" r="1.5" fill="currentColor" />
    <circle cx="38" cy="27" r="1.5" fill="currentColor" />
    <path d="M10 27h6l6-8h10l6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="7" y="13" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M38 27l-4-13h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="26" cy="9" r="3.5" stroke="currentColor" strokeWidth="2" />
    <path d="M24 13l2 5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 17l4-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const DesktopSidebar = ({ activeCategory, onCategorySelect, categories = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState("home");

  // Determine which item is currently active
  const isHomeActive =
    location.pathname === "/" &&
    (selectedId === "home" || !activeCategory || activeCategory?.id === "all" || activeCategory?.slug === "all");

  const handleNavClick = (id, label) => {
    setSelectedId(id);

    if (id === "home") {
      if (onCategorySelect) {
        const allCat = categories?.find((c) => c.slug === "all" || c.id === "all");
        if (allCat) onCategorySelect(allCat);
      }
      if (location.pathname !== "/") {
        navigate("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (id === "offers") {
      navigate("/offers");
      return;
    }

    if (id === "orders") {
      navigate("/orders");
      return;
    }

    if (id === "wishlist") {
      navigate("/wishlist");
      return;
    }

    if (id === "support") {
      navigate("/support");
      return;
    }

    // Category click
    const match = categories?.find(
      (c) =>
        c.name?.toLowerCase().includes(label.toLowerCase()) ||
        c.slug?.toLowerCase().includes(label.toLowerCase())
    );

    if (match) {
      if (onCategorySelect && location.pathname === "/") {
        onCategorySelect(match);
      } else {
        navigate(`/category/${match._id || match.id}`);
      }
    } else {
      navigate(`/search?q=${encodeURIComponent(label)}`);
    }
  };

  const navItems = [
    { id: "meat", label: "Meat", icon: MeatIcon },
    { id: "fish", label: "Fish", icon: FishIcon },
    { id: "chicken", label: "Chicken", icon: ChickenIcon },
    { id: "seafood", label: "Seafood", icon: SeafoodIcon },
    { id: "fresh-cuts", label: "Fresh Cuts", icon: FreshCutsIcon },
    { id: "ready-to-cook", label: "Ready to Cook", icon: ReadyToCookIcon },
    { id: "offers", label: "Offers", icon: OffersIcon },
  ];

  const utilityItems = [
    { id: "orders", label: "My Orders", icon: MyOrdersIcon },
    { id: "wishlist", label: "Wishlist", icon: WishlistIcon },
    { id: "support", label: "Help & Support", icon: SupportIcon },
  ];

  return (
    <aside
      className="hidden md:flex flex-col justify-between w-56 lg:w-60 xl:w-64 shrink-0 bg-[#FAF7F2] border-r border-[#ECE4DA] px-3.5 pt-6 pb-6 lg:px-4 lg:pt-8 lg:pb-8 sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto no-scrollbar select-none z-30"
      aria-label="Desktop Sidebar"
    >
      <div className="flex flex-col gap-1.5">
        {/* Home Item */}
        <button
          type="button"
          onClick={() => handleNavClick("home", "Home")}
          className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-[14px] transition-colors text-left border-0 cursor-pointer ${
            isHomeActive
              ? "bg-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
              : "bg-transparent text-slate-700 hover:text-slate-900 hover:bg-[#FFFBEB] font-medium"
          }`}
        >
          <Home
            size={18}
            className={`shrink-0 ${isHomeActive ? "fill-current text-[#1A1A1A]" : "text-slate-600"}`}
          />
          <span>Home</span>
        </button>

        {/* Category List */}
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive =
            selectedId === item.id &&
            activeCategory?.name?.toLowerCase().includes(item.label.toLowerCase());

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id, item.label)}
              className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-[14px] transition-colors text-left border-0 cursor-pointer ${
                isActive
                  ? "bg-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
                  : "bg-transparent text-slate-700 hover:text-slate-900 hover:bg-[#FFFBEB] font-medium"
              }`}
            >
              <IconComp />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Subtle separator */}
        <div className="my-2 border-t border-[#ECE3D8]" />

        {/* Utility Items */}
        {utilityItems.map((item) => {
          const IconComp = item.icon;
          const isRouteActive =
            (item.id === "orders" && location.pathname.startsWith("/orders")) ||
            (item.id === "wishlist" && location.pathname.startsWith("/wishlist")) ||
            (item.id === "support" && location.pathname.startsWith("/support"));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id, item.label)}
              className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-[14px] transition-colors text-left border-0 cursor-pointer ${
                isRouteActive
                  ? "bg-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
                  : "bg-transparent text-slate-700 hover:text-slate-900 hover:bg-[#FFFBEB] font-medium"
              }`}
            >
              <IconComp />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Promo Card */}
      <div className="pt-4 mt-auto">
        <div
          onClick={() => navigate("/checkout")}
          className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-center flex flex-col items-center justify-center cursor-pointer hover:bg-[#FEF9C3] hover:shadow-sm transition-all group"
        >
          <div className="group-hover:scale-105 transition-transform duration-200">
            <DeliveryRiderIcon />
          </div>
          <span className="text-xs font-bold text-slate-900 tracking-tight mt-1">
            Free Delivery
          </span>
          <span className="text-[10.5px] font-medium text-slate-500 mt-0.5">
            on orders above ₹499
          </span>
          <ChevronRight size={14} className="text-slate-400 mt-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </aside>
  );
};

export default React.memo(DesktopSidebar);
