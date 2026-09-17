import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";

const TRENDING_CATEGORIES = [
  {
    id: "prawns",
    name: "Prawns",
    subtitle: "Fresh & Juicy",
    route: "/category/prawns",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=240",
  },
  {
    id: "seafood",
    name: "Seafood",
    subtitle: "Premium Quality",
    route: "/category/seafood",
    image:
      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&q=80&w=240",
  },
  {
    id: "chicken",
    name: "Chicken",
    subtitle: "Farm Fresh",
    route: "/category/chicken",
    image:
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=240",
  },
  {
    id: "fish",
    name: "Fish",
    subtitle: "Rich in Omega-3",
    route: "/category/fish",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=240",
  },
];

const TrendingCategoriesSection = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full mb-6 sm:mb-8 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A]">
            <TrendingUp size={18} className="text-[#1A1A1A] sm:w-5 sm:h-5" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Trending Now
          </h2>
        </div>

        <button
          onClick={() => navigate("/categories")}
          className="text-xs sm:text-sm font-bold text-[#1A1A1A] hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors border-0 bg-transparent p-0"
        >
          <span>View All</span>
          <span className="text-sm font-bold">&rarr;</span>
        </button>
      </div>

      {/* 4 Cards Single Row */}
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-0.5">
        {TRENDING_CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => navigate(cat.route)}
            className="w-[180px] sm:w-[200px] md:w-[220px] lg:flex-1 shrink-0 lg:shrink bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#FDCE04] transition-all flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group"
          >
            {/* Circular Thumbnail */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform duration-300">
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            {/* Category Info */}
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors leading-tight truncate">
                {cat.name}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                {cat.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default React.memo(TrendingCategoriesSection);
