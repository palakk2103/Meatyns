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

// 15 curated top categories matching the reference image layout and style
const TOP_CATEGORIES = [
  {
    id: "meat",
    name: "Meat",
    count: "12+ Products",
    query: "meat",
    image:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "chicken",
    name: "Chicken",
    count: "10+ Products",
    query: "chicken",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "fish-seafood",
    name: "Fish & Seafood",
    count: "8+ Products",
    query: "fish",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "prawns",
    name: "Prawns",
    count: "6+ Products",
    query: "prawns",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "mutton",
    name: "Mutton",
    count: "8+ Products",
    query: "mutton",
    image:
      "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "ready-to-cook",
    name: "Ready to Cook",
    count: "14+ Products",
    query: "ready to cook",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "frozen-foods",
    name: "Frozen Foods",
    count: "15+ Products",
    query: "frozen",
    image:
      "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "dairy-eggs",
    name: "Dairy & Eggs",
    count: "10+ Products",
    query: "egg",
    image:
      "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "bakery-bread",
    name: "Bakery & Bread",
    count: "8+ Products",
    query: "bread",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "fruits-veg",
    name: "Fruits & Vegetables",
    count: "20+ Products",
    query: "vegetable",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "beverages",
    name: "Beverages",
    count: "12+ Products",
    query: "beverage",
    image:
      "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "snacks-more",
    name: "Snacks & More",
    count: "18+ Products",
    query: "snack",
    image:
      "https://images.unsplash.com/photo-1621939514649-28b12e81658b?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "spices-masalas",
    name: "Spices & Masalas",
    count: "10+ Products",
    query: "spice",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "household-essentials",
    name: "Household Essentials",
    count: "16+ Products",
    query: "clean",
    image:
      "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&q=80&w=350&h=350",
  },
  {
    id: "personal-care",
    name: "Personal Care",
    count: "12+ Products",
    query: "personal",
    image:
      "https://images.unsplash.com/photo-1556228578-8d84f5ae1d41?auto=format&fit=crop&q=80&w=350&h=350",
  },
];

const ExploreTopCategoriesSection = ({ categories = [] }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (cat) => {
    // Try matching backend category by query or name
    const match = categories?.find((c) =>
      c.name?.toLowerCase().includes(cat.query.toLowerCase())
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
            <h2 className="text-[17px] sm:text-[20px] font-bold text-slate-900 tracking-tight leading-none truncate">
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

      {/* ──── 15 CATEGORY CARDS (RESPONSIVE GRID) ──── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {TOP_CATEGORIES.map((cat) => (
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
