import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Clean 4-square Grid icon matching reference design
const GridIcon = ({ className = "w-4 h-4 shrink-0 text-slate-950" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.15" />
    <rect x="14" y="3" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.15" />
    <rect x="3" y="14" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.15" />
    <rect x="14" y="14" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.15" />
  </svg>
);

// High-fidelity fallback mapping for authentic meat categories
const CATEGORY_IMAGE_MAP = {
  chicken: "/categories/chicken.png",
  poultry: "/categories/chicken.png",
  mutton: "/categories/mutton.png",
  goat: "/categories/mutton.png",
  lamb: "/categories/mutton.png",
  fish: "/categories/fish.png",
  seafood: "/categories/prawns.png",
  prawn: "/categories/prawns.png",
  prawns: "/categories/prawns.png",
  egg: "/categories/eggs.jpg",
  eggs: "/categories/eggs.jpg",
  crab: "/categories/crab.png",
  steak: "/categories/steaks.jpg",
  "fresh cut": "/categories/steaks.jpg",
  "ready to cook": "/categories/marinades.jpg",
  marinade: "/categories/marinades.jpg",
  marinades: "/categories/marinades.jpg",
  coldcut: "/categories/coldcuts.jpg",
  "cold cut": "/categories/coldcuts.jpg",
  coldcuts: "/categories/coldcuts.jpg",
  meat: "/categories/mutton.png",
};

const resolveImage = (cat) => {
  const lower = (cat.name || "").toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (lower.includes(key)) return url;
  }
  if (cat.image && typeof cat.image === "string" && !cat.image.includes("flaticon") && cat.image.trim() !== "") {
    return cat.image;
  }
  return "/categories/chicken.png";
};

// Default categories matching reference screenshot
const DEFAULT_HEADER_CATEGORIES = [
  { id: "chicken", _id: "chicken", name: "Chicken", image: "/categories/chicken.png" },
  { id: "mutton", _id: "mutton", name: "Mutton", image: "/categories/mutton.png" },
  { id: "fish", _id: "fish", name: "Fish", image: "/categories/fish.png" },
  { id: "seafood", _id: "seafood", name: "Seafood", image: "/categories/prawns.png" },
  { id: "eggs", _id: "eggs", name: "Eggs", image: "/categories/eggs.jpg" },
  { id: "crab", _id: "crab", name: "Crab", image: "/categories/crab.png" },
  { id: "marinades", _id: "marinades", name: "Marinades", image: "/categories/marinades.jpg" },
  { id: "cold-cuts", _id: "cold-cuts", name: "Cold Cuts", image: "/categories/coldcuts.jpg" },
];

const MobileHeaderCategoryNav = ({
  categories = [],
  activeCategory,
  onCategorySelect,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Filter out "all" from dynamic list so we can render custom "All" button
  const displayCategories = React.useMemo(() => {
    const valid = (categories || []).filter((c) => {
      const id = String(c._id || c.id || "").toLowerCase();
      const slug = String(c.slug || "").toLowerCase();
      const name = String(c.name || "").toLowerCase();
      return id !== "all" && slug !== "all" && name !== "all";
    });
    return valid.length > 0 ? valid : DEFAULT_HEADER_CATEGORIES;
  }, [categories]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [displayCategories]);

  const scrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 180, behavior: "smooth" });
  };

  const isAllActive =
    !activeCategory ||
    String(activeCategory?.id || activeCategory?._id || "").toLowerCase() === "all" ||
    String(activeCategory?.slug || "").toLowerCase() === "all" ||
    String(activeCategory?.name || "").toLowerCase() === "all";

  const handleAllClick = () => {
    if (onCategorySelect) {
      onCategorySelect({ id: "all", _id: "all", name: "All", slug: "all" });
    }
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (cat) => {
    if (onCategorySelect) {
      onCategorySelect(cat);
    }
    const targetId = cat._id || cat.id || cat.slug;
    if (targetId) {
      navigate(`/category/${targetId}`, {
        state: { categoryName: cat.name, isHeaderCategory: true },
      });
    } else {
      navigate(`/search?q=${encodeURIComponent(cat.name)}`);
    }
  };

  const isCatActive = (cat) => {
    if (isAllActive) return false;
    const activeId = String(activeCategory?._id || activeCategory?.id || "").toLowerCase();
    const catId = String(cat._id || cat.id || "").toLowerCase();
    if (activeId && catId && activeId === catId) return true;
    const activeName = (activeCategory?.name || "").trim().toLowerCase();
    const catName = (cat.name || "").trim().toLowerCase();
    return Boolean(activeName && catName && activeName === catName);
  };

  return (
    <div
      className="w-full px-2 sm:px-3 pt-0 pb-2 select-none md:hidden"
      aria-label="Mobile Header Categories"
    >
      {/* Container with top red arched line and clean white background matching reference */}
      <div className="relative w-full bg-white border-t-2 border-[#E53935] rounded-t-2xl pt-2 pb-1.5 px-1.5 shadow-2xs">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth px-0.5"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* 1. "All" Yellow Squircle Button */}
          <button
            type="button"
            onClick={handleAllClick}
            className={`shrink-0 flex flex-col items-center justify-center w-[52px] h-[64px] rounded-2xl transition-all cursor-pointer border-0 active:scale-95 ${
              isAllActive
                ? "bg-[#FDCE04] shadow-xs text-slate-950"
                : "bg-[#F7F2EA] text-slate-800 hover:bg-[#F2ECE2]"
            }`}
          >
            <GridIcon className="w-[18px] h-[18px] shrink-0 text-slate-950" />
            <span
              className="text-[12px] font-black tracking-tight mt-1 text-slate-950 leading-none"
              style={{ color: "#111111" }}
            >
              All
            </span>
          </button>

          {/* 2. Category Avatars (Chicken, Mutton, Fish, Seafood, Eggs, etc.) */}
          {displayCategories.map((cat) => {
            const active = isCatActive(cat);
            const imgSrc = resolveImage(cat);
            return (
              <button
                key={cat._id || cat.id || cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className="shrink-0 flex flex-col items-center justify-center w-[54px] min-w-[54px] transition-all cursor-pointer border-0 bg-transparent p-0 active:scale-95 group"
              >
                {/* Food Avatar Circle (Cream background) */}
                <div
                  className={`w-[48px] h-[48px] rounded-full flex items-center justify-center overflow-hidden transition-all ${
                    active
                      ? "bg-[#FEF3C7] ring-2 ring-[#FDCE04] shadow-xs"
                      : "bg-[#F7F2EA] group-hover:bg-[#F2ECE2]"
                  }`}
                >
                  <img
                    src={imgSrc}
                    alt={cat.name}
                    className="w-[36px] h-[36px] object-contain pointer-events-none drop-shadow-2xs transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "/categories/chicken.png";
                    }}
                  />
                </div>

                {/* Text Label */}
                <span
                  className={`text-[11px] text-center truncate max-w-[54px] mt-1 leading-tight tracking-tight ${
                    active ? "font-bold text-slate-950" : "font-semibold text-slate-800"
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}

          {/* 3. Scroll Right Chevron Arrow Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={scrollRight}
              className="shrink-0 flex items-center justify-center w-6 h-6 text-slate-700 hover:text-slate-950 active:scale-90 transition-all cursor-pointer border-0 bg-transparent pr-1"
              aria-label="Scroll more categories"
            >
              <ChevronRight size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobileHeaderCategoryNav);
