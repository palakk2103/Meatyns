import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { customerApi } from "../../services/customerApi";

// Clean outline SVGs matching Meatyns design aesthetic
const MeatIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M19 5c-1.5-1.5-3.5-1.5-5 0l-8.5 8.5c-1.5 1.5-1.5 3.5 0 5s3.5 1.5 5 0l8.5-8.5c1.5-1.5 1.5-3.5 0-5z" />
    <circle cx="8.5" cy="15.5" r="1.5" />
  </svg>
);

const FishIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M2 16s4.5-5 11-3c3 1 7 4 9 3-2-2-2-6-4-7-3-2-8-2-12 2l-4 5z" />
    <circle cx="17" cy="11" r="0.8" fill="currentColor" />
  </svg>
);

const ChickenIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M15.5 5.5a4 4 0 0 0-5.5 0c-2.5 2.5-3 6.5-1 9l-3 3a1.5 1.5 0 0 0 2 2l3-3c2.5 2 6.5 1.5 9-1a4 4 0 0 0-4.5-9.5z" />
  </svg>
);

const SeafoodIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M12 10a4 4 0 0 0-4 4c0 2 1.5 3.5 4 3.5s4-1.5 4-3.5a4 4 0 0 0-4-4z" />
    <path d="M6 14c-2 0-3-1-4-2m4 4c-2 1-3 2-4 4m16-8c2 0 3-1 4-2m-4 4c2 1 3 2 4 4M9 10L7 6m8 4l2-4" />
  </svg>
);

const MuttonIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M18 5c-1.8 0-3.5 1-4.3 2.5C12.5 6.4 11 6 9.5 6 6.5 6 4 8.5 4 11.5c0 2 1.1 3.8 2.8 4.7L6 20h3l1-3h4l1 3h3l-.8-3.8c1.7-.9 2.8-2.7 2.8-4.7 0-3.5-2.5-6.5-6-6.5z" />
    <circle cx="9" cy="11" r="1" fill="currentColor" />
  </svg>
);

const EggsIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M12 3C8 3 5 8 5 13a7 7 0 0 0 14 0c0-5-3-10-7-10z" />
  </svg>
);

const ColdCutsIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <rect x="3" y="8" width="18" height="8" rx="4" />
    <line x1="7" y1="8" x2="7" y2="16" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="17" y1="8" x2="17" y2="16" />
  </svg>
);

const FreshCutsIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M6 18L17 7c.8-.8 2-.8 2.8 0 .8.8.8 2 0 2.8L9 20" />
    <line x1="14" y1="7" x2="17" y2="10" />
    <line x1="3" y1="21" x2="6" y2="18" />
  </svg>
);

const ReadyToCookIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M4 11h16a1 1 0 0 1 1 1v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1 1 0 0 1 1-1z" />
    <path d="M2 11h20M9 4v3m3-3v3m3-3v3" />
  </svg>
);

const OffersIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2.5" />
  </svg>
);

const MyOrdersIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const WishlistIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SupportIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const DefaultCategoryIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`}>
    <path d="M19 5c-1.5-1.5-3.5-1.5-5 0l-8.5 8.5c-1.5 1.5-1.5 3.5 0 5s3.5 1.5 5 0l8.5-8.5c1.5-1.5 1.5-3.5 0-5z" />
    <circle cx="8.5" cy="15.5" r="1.5" />
  </svg>
);

const getCategoryIconComponent = (name = "") => {
  const n = (name || "").toLowerCase();
  if (n.includes("chicken") || n.includes("poultry") || n.includes("murga")) return ChickenIcon;
  if (n.includes("fish") || n.includes("machli") || n.includes("surmai")) return FishIcon;
  if (n.includes("mutton") || n.includes("goat") || n.includes("lamb") || n.includes("gosht")) return MuttonIcon;
  if (n.includes("seafood") || n.includes("prawn") || n.includes("shrimp") || n.includes("crab")) return SeafoodIcon;
  if (n.includes("egg") || n.includes("anda")) return EggsIcon;
  if (n.includes("ready") || n.includes("cook") || n.includes("marinad") || n.includes("tikka") || n.includes("kebab")) return ReadyToCookIcon;
  if (n.includes("cut") || n.includes("fresh")) return FreshCutsIcon;
  if (n.includes("cold") || n.includes("salami") || n.includes("sausage")) return ColdCutsIcon;
  if (n.includes("meat")) return MeatIcon;
  return DefaultCategoryIcon;
};

// Helper to get fallback category image if not uploaded in admin
const getCategoryFallbackImage = (name = "") => {
  const n = (name || "").toLowerCase();
  if (n.includes("chicken") || n.includes("poultry") || n.includes("murga")) return "/categories/chicken.png";
  if (n.includes("fish") || n.includes("machli") || n.includes("surmai")) return "/categories/fish.png";
  if (n.includes("mutton") || n.includes("goat") || n.includes("lamb") || n.includes("gosht")) return "/categories/mutton.png";
  if (n.includes("prawn") || n.includes("shrimp")) return "/categories/prawns.png";
  if (n.includes("crab")) return "/categories/crab.png";
  if (n.includes("seafood")) return "/categories/other_seafood.png";
  if (n.includes("egg") || n.includes("anda")) return "/categories/eggs.jpg";
  if (n.includes("marinad") || n.includes("tikka") || n.includes("kebab") || n.includes("ready")) return "/categories/marinades.jpg";
  if (n.includes("cold") || n.includes("salami") || n.includes("sausage")) return "/categories/coldcuts.jpg";
  if (n.includes("steak")) return "/categories/steaks.jpg";
  if (n.includes("meat")) return "/categories/mutton.png";
  return null;
};

// Component to render dynamic food photo avatar or outline SVG icon
const CategoryItemIcon = ({ cat, isActive }) => {
  const [imgError, setImgError] = useState(false);
  const IconComp = getCategoryIconComponent(cat.name);
  const imageUrl = (!imgError && cat.image) ? cat.image : (!imgError ? getCategoryFallbackImage(cat.name) : null);

  if (imageUrl) {
    return (
      <div className={`w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center border transition-all ${
        isActive ? "border-white shadow-xs" : "border-slate-200/90 bg-slate-50"
      }`}>
        <img
          src={imageUrl}
          alt={cat.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 flex items-center justify-center shrink-0">
      <IconComp className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-700"}`} />
    </div>
  );
};

const DEFAULT_FALLBACK_CATEGORIES = [
  { id: "meat", name: "Meat", image: "/categories/mutton.png" },
  { id: "fish", name: "Fish", image: "/categories/fish.png" },
  { id: "chicken", name: "Chicken", image: "/categories/chicken.png" },
  { id: "seafood", name: "Seafood", image: "/categories/other_seafood.png" },
  { id: "fresh-cuts", name: "Fresh Cuts", image: "/categories/steaks.jpg" },
  { id: "ready-to-cook", name: "Ready to Cook", image: "/categories/marinades.jpg" },
];

const DesktopSidebar = ({ activeCategory, onCategorySelect, categories = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fetchedCategories, setFetchedCategories] = useState([]);

  // Self-healing fallback: fetch dynamic categories if not provided via props
  useEffect(() => {
    if (!categories || categories.length <= 1) {
      customerApi
        .getCategories()
        .then((res) => {
          if (res?.data?.success) {
            const list = res.data.results || res.data.result || [];
            const headers = list.filter(
              (c) =>
                (c.type === "header" || (c.type === "category" && !c.parentId)) &&
                c.name?.toLowerCase() !== "all" &&
                c.slug?.toLowerCase() !== "all"
            );
            setFetchedCategories(headers);
          }
        })
        .catch(() => {});
    }
  }, [categories]);

  // Combine categories and filter out "all"
  const dynamicCategories = useMemo(() => {
    const sourceList = categories && categories.length > 1 ? categories : (fetchedCategories.length > 0 ? fetchedCategories : DEFAULT_FALLBACK_CATEGORIES);
    return sourceList.filter((c) => {
      const id = String(c._id || c.id || "").toLowerCase();
      const slug = String(c.slug || "").toLowerCase();
      const name = String(c.name || "").toLowerCase();
      return id !== "all" && slug !== "all" && name !== "all";
    });
  }, [categories, fetchedCategories]);

  // Check if Home is active
  const isHomeActive =
    location.pathname === "/" &&
    (!activeCategory ||
      String(activeCategory?.id || activeCategory?._id || "").toLowerCase() === "all" ||
      String(activeCategory?.slug || "").toLowerCase() === "all" ||
      String(activeCategory?.name || "").toLowerCase() === "all");

  const handleHomeClick = () => {
    if (onCategorySelect) {
      const allCat = categories?.find((c) => c.slug === "all" || c.id === "all");
      if (allCat) {
        onCategorySelect(allCat);
      } else {
        onCategorySelect({ id: "all", _id: "all", name: "All", slug: "all" });
      }
    }
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (cat) => {
    const realCat =
      (categories || []).concat(fetchedCategories || []).find(
        (c) =>
          (c._id && c._id === (cat._id || cat.id)) ||
          (c.name && c.name.toLowerCase() === cat.name?.toLowerCase()) ||
          (c.slug && c.slug.toLowerCase() === (cat.slug || cat.id)?.toLowerCase())
      ) || cat;

    const targetId = realCat?._id || realCat?.id || realCat?.slug || cat._id || cat.id || cat.slug;

    if (onCategorySelect) {
      onCategorySelect(realCat);
    }

    if (targetId) {
      navigate(`/category/${targetId}`, {
        state: { categoryName: realCat?.name || cat.name, isHeaderCategory: true },
      });
    } else {
      navigate(`/search?q=${encodeURIComponent(cat.name)}`);
    }
  };

  const isCatActive = (cat) => {
    if (location.pathname.startsWith("/category/")) {
      const currentCatId = decodeURIComponent(location.pathname.split("/category/")[1] || "").toLowerCase();
      if (currentCatId) {
        return (
          String(cat._id || "").toLowerCase() === currentCatId ||
          String(cat.id || "").toLowerCase() === currentCatId ||
          String(cat.slug || "").toLowerCase() === currentCatId ||
          (cat.name && cat.name.toLowerCase() === currentCatId)
        );
      }
    }
    if (location.pathname !== "/") return false;
    const activeId = String(activeCategory?._id || activeCategory?.id || "");
    const catId = String(cat._id || cat.id || "");
    if (activeId && catId && activeId === catId) return true;
    const activeName = (activeCategory?.name || "").trim().toLowerCase();
    const catName = (cat.name || "").trim().toLowerCase();
    return Boolean(activeName && catName && activeName === catName && activeName !== "all");
  };

  const utilityItems = [
    { id: "orders", label: "My Orders", icon: MyOrdersIcon, path: "/orders" },
    { id: "wishlist", label: "Wishlist", icon: WishlistIcon, path: "/wishlist" },
    { id: "support", label: "Help & Support", icon: SupportIcon, path: "/support" },
  ];

  return (
    <aside
      className="hidden md:flex flex-col justify-between w-56 lg:w-60 xl:w-64 shrink-0 bg-white border-r border-slate-100 px-3 pt-4 pb-4 sticky top-[118px] h-[calc(100vh-118px)] select-none z-30 overflow-hidden"
      style={{
        overscrollBehavior: "contain",
      }}
      aria-label="Desktop Sidebar"
    >
      {/* ──── Top Section: Home (Fixed) ──── */}
      <div className="shrink-0 pb-2 border-b border-slate-100 bg-white z-10">
        <button
          type="button"
          onClick={handleHomeClick}
          className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-[14px] transition-colors text-left border-0 cursor-pointer ${
            isHomeActive
              ? "bg-[#C81017] text-white font-bold shadow-xs"
              : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <Home
              size={18}
              className={`shrink-0 ${isHomeActive ? "fill-current text-white" : "text-slate-700"}`}
            />
          </div>
          <span className="font-bold">Home</span>
        </button>

        {/* Section Label */}
        <div className="px-3 pt-2.5 pb-0.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          <span>Categories</span>
        </div>
      </div>

      {/* ──── Middle Section: Scrollable Dynamic Categories + Offers ──── */}
      <div
        onWheel={(e) => {
          e.stopPropagation();
          const target = e.currentTarget;
          const isAtTop = target.scrollTop <= 0 && e.deltaY < 0;
          const isAtBottom =
            Math.ceil(target.scrollTop + target.clientHeight) >= target.scrollHeight &&
            e.deltaY > 0;
          if (isAtTop || isAtBottom) {
            e.preventDefault();
          }
        }}
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1 py-1.5"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overscrollBehavior: "contain",
        }}
      >
        {/* Dynamic Categories from Admin Panel */}
        {dynamicCategories.map((cat) => {
          const isActive = isCatActive(cat);
          return (
            <button
              key={cat._id || cat.id || cat.name}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`w-full px-3 py-2 rounded-xl flex items-center gap-3 text-[13.5px] transition-colors text-left border-0 cursor-pointer ${
                isActive
                  ? "bg-[#C81017] text-white font-bold shadow-xs"
                  : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
              }`}
            >
              <CategoryItemIcon cat={cat} isActive={isActive} />
              <span className="truncate">{cat.name}</span>
            </button>
          );
        })}

        {/* Offers Item */}
        <button
          type="button"
          onClick={() => navigate("/offers")}
          className={`w-full px-3 py-2 rounded-xl flex items-center gap-3 text-[13.5px] transition-colors text-left border-0 cursor-pointer ${
            location.pathname.startsWith("/offers")
              ? "bg-[#C81017] text-white font-bold shadow-xs"
              : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <OffersIcon
              className={`w-5 h-5 shrink-0 ${location.pathname.startsWith("/offers") ? "text-white" : "text-slate-700"}`}
            />
          </div>
          <span>Offers</span>
        </button>
      </div>

      {/* ──── Bottom Section: Always Visible Pinned Utility Items (My Orders, Wishlist, Support) ──── */}
      <div className="shrink-0 flex flex-col gap-1 pt-2.5 border-t border-slate-100 bg-white z-10 shadow-[0_-4px_8px_rgba(0,0,0,0.02)]">
        {utilityItems.map((item) => {
          const IconComp = item.icon;
          const isRouteActive = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-[14px] transition-colors text-left border-0 cursor-pointer ${
                isRouteActive
                  ? "bg-[#C81017] text-white font-bold shadow-xs"
                  : "bg-transparent text-slate-800 hover:text-slate-900 hover:bg-slate-50 font-medium"
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <IconComp className={`w-5 h-5 shrink-0 ${isRouteActive ? "text-white" : "text-slate-700"}`} />
              </div>
              <span className="font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default React.memo(DesktopSidebar);
