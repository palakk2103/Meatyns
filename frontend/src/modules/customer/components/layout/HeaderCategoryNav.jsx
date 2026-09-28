import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tag, ChevronRight, ChevronLeft } from "lucide-react";

// Clean 4-square Grid icon matching reference design
const GridIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" fill="currentColor" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" fill="currentColor" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" fill="currentColor" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2.2" fill="currentColor" />
  </svg>
);

// Fallback images for authentic meat items
const CATEGORY_IMAGE_MAP = {
  chicken: "/categories/chicken.png",
  mutton: "/categories/mutton.png",
  goat: "/categories/mutton.png",
  lamb: "/categories/mutton.png",
  fish: "/categories/fish.png",
  seafood: "/categories/prawns.png",
  prawn: "/categories/prawns.png",
  steak: "/categories/steaks.jpg",
  "fresh cut": "/categories/steaks.jpg",
  "ready to cook": "/categories/marinades.jpg",
  marinade: "/categories/marinades.jpg",
  coldcut: "/categories/coldcuts.jpg",
  egg: "/categories/eggs.jpg",
  crab: "/categories/crab.png",
  meat: "/categories/mutton.png",
};

const resolveImage = (cat) => {
  if (cat.image && typeof cat.image === "string" && cat.image.trim() !== "") {
    return cat.image;
  }
  const lower = (cat.name || "").toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (lower.includes(key)) return url;
  }
  return "/categories/chicken.png";
};

// Default items if backend categories are empty or loading
const DEFAULT_HEADER_ITEMS = [
  { id: "chicken", name: "Chicken", image: "/categories/chicken.png" },
  { id: "mutton", name: "Mutton", image: "/categories/mutton.png" },
  { id: "fish", name: "Fish", image: "/categories/fish.png" },
  { id: "seafood", name: "Seafood", image: "/categories/prawns.png" },
  { id: "fresh-cuts", name: "Fresh Cuts", image: "/categories/steaks.jpg" },
  { id: "ready-to-cook", name: "Ready to Cook", image: "/categories/marinades.jpg" },
];

const HeaderCategoryNav = ({
  categories = [],
  activeCategory,
  onCategorySelect,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Check scroll position & overflow to dynamically adjust spacing and show/hide chevron arrows
  const checkScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const overflowing = el.scrollWidth > el.clientWidth + 10;
    setIsOverflowing(overflowing);
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(overflowing && el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScrollState();
    const handleResize = () => checkScrollState();
    window.addEventListener("resize", handleResize);
    const timeout = setTimeout(checkScrollState, 150);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [categories]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -280 : 280;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  // Filter out "all" category from dynamic list
  const displayCategories = React.useMemo(() => {
    const valid = (categories || []).filter((c) => {
      const id = String(c._id || c.id || "").toLowerCase();
      const slug = String(c.slug || "").toLowerCase();
      const name = String(c.name || "").toLowerCase();
      return id !== "all" && slug !== "all" && name !== "all";
    });
    return valid.length > 0 ? valid : DEFAULT_HEADER_ITEMS;
  }, [categories]);

  // Is "All" button currently active?
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
      navigate(`/category/${targetId}`);
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
      className="hidden md:flex items-center w-full h-[46px] min-h-[46px] bg-[#FCF8F5] border border-[#EFE4D8] rounded-2xl px-3.5 py-1 shadow-2xs relative select-none"
      aria-label="Header Categories Section"
    >
      {/* Scroll Left Button (if overflowed & scrolled) */}
      {isOverflowing && canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-1 z-20 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-900 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} strokeWidth={2.4} />
        </button>
      )}

      {/* Main Container: Automatically spreads evenly (justify-between) when <= 8 items, or scrolls horizontally when > 8 items */}
      <div
        ref={scrollRef}
        onScroll={checkScrollState}
        className={`flex items-center h-full flex-1 min-w-0 px-0.5 ${
          isOverflowing
            ? "overflow-x-auto no-scrollbar scroll-smooth justify-start gap-4"
            : "justify-between w-full"
        }`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* 1. "All" Pill Button */}
        <button
          type="button"
          onClick={handleAllClick}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer border-0 select-none ${
            isAllActive
              ? "bg-[#FDCE04] shadow-xs text-slate-950"
              : "bg-transparent hover:bg-stone-200/50 text-slate-950"
          }`}
        >
          <GridIcon className="w-4 h-4 shrink-0 text-slate-950" />
          <span
            className="text-[14px] font-extrabold tracking-tight text-slate-950 leading-none"
            style={{ color: "#111111" }}
          >
            All
          </span>
        </button>

        {/* 2. Dynamic Categories from Admin */}
        {displayCategories.map((cat) => {
          const active = isCatActive(cat);
          const imgSrc = resolveImage(cat);
          return (
            <button
              key={cat._id || cat.id || cat.name}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`shrink-0 flex items-center gap-2.5 px-3 py-1 rounded-xl transition-all cursor-pointer border-0 select-none whitespace-nowrap ${
                active
                  ? "bg-[#FDCE04] shadow-xs text-slate-950"
                  : "bg-transparent hover:bg-stone-200/50 text-slate-950"
              }`}
            >
              {/* Prominent food avatar (36px) */}
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white border border-slate-200 shadow-2xs">
                <img
                  src={imgSrc}
                  alt={cat.name}
                  className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => {
                    e.currentTarget.src = "/categories/chicken.png";
                  }}
                />
              </div>
              <span
                className="text-[14px] font-bold tracking-tight text-slate-950 leading-none"
                style={{ color: "#111111" }}
              >
                {cat.name}
              </span>
            </button>
          );
        })}

        {/* 3. Offers Item */}
        <button
          type="button"
          onClick={() => navigate("/offers")}
          className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-xl transition-all cursor-pointer border-0 select-none whitespace-nowrap bg-transparent hover:bg-stone-200/50 text-slate-950"
        >
          <Tag size={18} className="text-slate-950 shrink-0 stroke-[2.2]" style={{ color: "#111111" }} />
          <span
            className="text-[14px] font-bold tracking-tight text-slate-950 leading-none"
            style={{ color: "#111111" }}
          >
            Offers
          </span>
        </button>
      </div>

      {/* 4. Scroll Right Button (Chevron >) - Only shown when content overflows! */}
      {isOverflowing && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="shrink-0 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-2xs flex items-center justify-center text-slate-900 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all ml-1.5"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
};

export default HeaderCategoryNav;
