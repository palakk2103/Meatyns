import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Leaf } from "lucide-react";
import meatSeafoodBoard from "@/assets/meat_seafood_board.jpg";

// Grid icon with 4 rounded squares matching the reference screenshot
const CategoryGridIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-[#1A1A1A]"
  >
    <rect
      x="3"
      y="3"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <rect
      x="14"
      y="3"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <rect
      x="3"
      y="14"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <rect
      x="14"
      y="14"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
  </svg>
);

// Curated Meatyns meat categories fallback matching reference
const TOP_CATEGORIES = [
  {
    id: "chicken",
    name: "Chicken",
    count: "16+ Cuts",
    query: "chicken",
    image: "/categories/chicken.png",
  },
  {
    id: "fish-seafood",
    name: "Fish & Seafood",
    count: "10+ Types",
    query: "fish",
    image: "/categories/fish.png",
  },
  {
    id: "mutton",
    name: "Mutton",
    count: "8+ Cuts",
    query: "mutton",
    image: "/categories/mutton.png",
  },
  {
    id: "eggs",
    name: "Classic & Farm Eggs",
    count: "5+ Varieties",
    query: "egg",
    image: "/categories/eggs.jpg",
  },
  {
    id: "prawns",
    name: "Prawns & Crabs",
    count: "6+ Sizes",
    query: "prawn",
    image: "/categories/prawns.png",
  },
  {
    id: "cold-cuts",
    name: "Cold Cuts & Sausages",
    count: "8+ Options",
    query: "cold cut",
    image: "/categories/coldcuts.jpg",
  },
  {
    id: "ready-to-cook",
    name: "Ready to Cook & Marinated",
    count: "12+ Dishes",
    query: "ready to cook",
    image: "/categories/marinades.jpg",
  },
  {
    id: "ready-to-eat-spreads",
    name: "Spreads & Ready to Eat",
    count: "5+ Flavors",
    query: "spread",
    image: "/categories/steaks.jpg",
  },
];

const ExploreTopCategoriesSection = ({ categories = [] }) => {
  const navigate = useNavigate();

  const displayCategories = React.useMemo(() => {
    const valid = (categories || []).filter(
      (c) => c && c.name && c.id !== "all" && c._id !== "all"
    );
    if (valid.length > 0) {
      return valid.map((cat, idx) => ({
        id: cat._id || cat.id || `cat-${idx}`,
        name: cat.name,
        count: cat.productCount ? `${cat.productCount}+ Products` : "Fresh & Safe",
        image:
          cat.image ||
          cat.icon ||
          "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350",
        raw: cat,
      }));
    }
    return TOP_CATEGORIES;
  }, [categories]);

  const handleCategoryClick = (cat) => {
    if (cat.raw) {
      navigate(`/category/${cat.raw._id || cat.raw.id}`);
      return;
    }
    const match = categories?.find((c) =>
      c.name?.toLowerCase().includes((cat.query || cat.name).toLowerCase())
    );
    if (match) {
      navigate(`/category/${match._id || match.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(cat.name)}`);
    }
  };

  return (
    <section className="w-full mt-3 mb-6 select-none">
      {/* ──── SECTION HEADER ──── */}
      <div className="mb-3 px-0.5">
        {/* Top Row: Icon + Divider + Title + View All */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryGridIcon />
            <div className="w-[1.5px] h-4 bg-[#CDB5AA]/70 rounded-full shrink-0" />
            <h2 className="text-[17px] sm:text-[20px] font-normal font-anton tracking-wide text-slate-900 leading-none truncate uppercase">
              Explore Top Categories
            </h2>
          </div>

          <button
            onClick={() => navigate("/categories")}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors border-0 bg-transparent p-0 shrink-0"
          >
            <span>View All</span>
            <span className="hidden min-[420px]:inline">Categories</span>
            <ArrowRight size={13} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Bottom: Subtitle with full-width breathing room */}
        <p className="text-[11.5px] sm:text-xs text-[#7A6B66] font-normal leading-relaxed mt-1.5 pl-0.5">
          Find your daily essentials, fresh produce, premium meats and more — all in one place.
        </p>
      </div>

      {/* ──── DYNAMIC CATEGORY CARDS (RESPONSIVE GRID) ──── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {displayCategories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat)}
            className="group bg-[#FFF9F5] border border-[#F3E5DC] rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#FDCE04]/60 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-[0.97] transition-all cursor-pointer"
          >
            {/* Soft Peach Circular Container for Image */}
            <div className="relative w-full aspect-square rounded-full bg-[#FEEAE1] flex items-center justify-center overflow-hidden mb-1.5 p-1 transition-transform duration-300 group-hover:scale-105">
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                className="w-[88%] h-[88%] object-contain drop-shadow-sm pointer-events-none select-none rounded-full"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350";
                }}
              />
            </div>

            {/* Bottom Title, Subtitle, & Arrow Button */}
            <div className="flex items-end justify-between gap-1 mt-0.5">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-[11.5px] sm:text-[13px] leading-tight line-clamp-1 group-hover:text-amber-600 transition-colors tracking-tight">
                  {cat.name}
                </h3>
                <p className="text-[9.5px] sm:text-[10px] text-[#8C7A75] font-medium leading-tight mt-0.5 truncate">
                  {cat.count}
                </p>
              </div>

              {/* Round Arrow Button */}
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-[#FDCE04]/20 text-[#1A1A1A] group-hover:bg-[#FDCE04] group-hover:text-[#1A1A1A] transition-colors flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <ArrowRight size={10} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ──── BOTTOM PROMOTIONAL BANNER ("FRESHNESS IN EVERY CATEGORY") ──── */}
      <div
        className="relative w-full mt-3.5 sm:mt-4 rounded-2xl overflow-hidden p-4 sm:p-5 shadow-md text-white select-none"
        style={{
          background:
            "linear-gradient(100deg, #1C1917 0%, #292524 45%, #18181B 100%)",
        }}
      >
        {/* Right side meat board visual */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-1/2 bg-no-repeat bg-right bg-cover pointer-events-none opacity-85"
          style={{
            backgroundImage: `url(${meatSeafoodBoard})`,
            maskImage:
              "linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* Content on the left */}
        <div className="relative z-10 max-w-[210px] sm:max-w-xs flex flex-col items-start gap-1">
          {/* Leaf + Premium Quality Badge */}
          <div className="flex items-center gap-1.5 text-[#FDCE04]">
            <Leaf size={12} className="shrink-0 stroke-[2.5]" />
            <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest leading-none">
              - PREMIUM QUALITY
            </span>
          </div>

          {/* Main Title */}
          <h3 className="font-bold text-white text-[16px] sm:text-[19px] leading-tight tracking-tight mt-0.5 drop-shadow-sm">
            Freshness in Every Category
          </h3>

          {/* Subtitle */}
          <p className="text-white/80 text-[11px] sm:text-xs font-normal leading-relaxed mt-0.5">
            From farm to your doorstep — fresh, safe and trusted.
          </p>

          {/* CTA Pill Button */}
          <button
            onClick={() => navigate("/category/all")}
            className="mt-2.5 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-[#FDCE04] text-[#1A1A1A] font-extrabold text-xs shadow-md hover:bg-[#E5B800] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Shop Now</span>
            <ArrowRight size={12} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ExploreTopCategoriesSection);
