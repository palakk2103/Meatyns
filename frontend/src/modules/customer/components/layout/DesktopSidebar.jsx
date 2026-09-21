import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

// Clean outline icons matching reference design
const MeatIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 5c-1.5-1.5-3.5-1.5-5 0l-8.5 8.5c-1.5 1.5-1.5 3.5 0 5s3.5 1.5 5 0l8.5-8.5c1.5-1.5 1.5-3.5 0-5z" />
    <circle cx="8.5" cy="15.5" r="1.5" />
  </svg>
);

const FishIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 16s4.5-5 11-3c3 1 7 4 9 3-2-2-2-6-4-7-3-2-8-2-12 2l-4 5z" />
    <circle cx="17" cy="11" r="0.8" fill="currentColor" />
  </svg>
);

const ChickenIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15.5 5.5a4 4 0 0 0-5.5 0c-2.5 2.5-3 6.5-1 9l-3 3a1.5 1.5 0 0 0 2 2l3-3c2.5 2 6.5 1.5 9-1a4 4 0 0 0-4.5-9.5z" />
  </svg>
);

const SeafoodIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 10a4 4 0 0 0-4 4c0 2 1.5 3.5 4 3.5s4-1.5 4-3.5a4 4 0 0 0-4-4z" />
    <path d="M6 14c-2 0-3-1-4-2m4 4c-2 1-3 2-4 4m16-8c2 0 3-1 4-2m-4 4c2 1 3 2 4 4M9 10L7 6m8 4l2-4" />
  </svg>
);

const FreshCutsIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 18L17 7c.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8L9 20" />
    <line x1="14" y1="7" x2="17" y2="10" />
    <line x1="3" y1="21" x2="6" y2="18" />
  </svg>
);

const ReadyToCookIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 11h16a1 1 0 0 1 1 1v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1 1 0 0 1 1-1z" />
    <path d="M2 11h20M9 4v3m3-3v3m3-3v3" />
  </svg>
);

const OffersIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2.5" />
  </svg>
);

const MyOrdersIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const WishlistIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SupportIcon = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
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
      className="hidden md:flex flex-col justify-between w-56 lg:w-60 xl:w-64 shrink-0 bg-white border-r border-slate-100 px-3.5 pt-6 pb-6 lg:px-4 lg:pt-8 lg:pb-8 sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto no-scrollbar select-none z-30"
      aria-label="Desktop Sidebar"
    >
      <div className="flex flex-col gap-1.5">
        {/* Home Item */}
        <button
          type="button"
          onClick={() => handleNavClick("home", "Home")}
          className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-[14px] transition-colors text-left border-0 cursor-pointer ${
            isHomeActive
              ? "bg-[#C81017] text-white font-bold shadow-xs"
              : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
          }`}
        >
          <Home
            size={18}
            className={`shrink-0 ${isHomeActive ? "fill-current text-white" : "text-slate-700"}`}
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
                  ? "bg-[#C81017] text-white font-bold shadow-xs"
                  : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
              }`}
            >
              <IconComp />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Subtle separator */}
        <div className="my-2.5 border-t border-slate-100" />

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
                  ? "bg-[#C81017] text-white font-bold shadow-xs"
                  : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
              }`}
            >
              <IconComp />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default React.memo(DesktopSidebar);
