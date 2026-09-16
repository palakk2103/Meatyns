import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QUICK_CATEGORY_PALETTES } from "../../constants/homeConstants";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import QuickCategoriesBg from "@/assets/Catagorysection_bg.png";

/* ───────── Burgundy + Cream palette tokens ───────── */
const MEAT_PRIMARY = "#7A1F2B";
const MEAT_BG = "#FFF9F4";

const QuickCategorySlider = ({ categories, onCategoryClick }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full mb-5 -mt-[24px] md:mt-3 overflow-hidden relative group z-20">
      <div
        className="relative overflow-hidden shadow-[0_14px_28px_rgba(122,31,43,0.10)]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,249,244,0.96) 0%, rgba(255,249,244,0.85) 100%), url(${QuickCategoriesBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: MEAT_BG,
        }}
      >
        {/* Subtle warm overlay */}
        <div className="absolute inset-0 bg-[#FFF9F4]/20 pointer-events-none" />

        {/* Section heading */}
        <div className="relative z-10 px-4 pt-4 pb-2.5 md:px-8 md:pt-6 md:pb-4 flex items-center justify-center gap-3">
          {/* Decorative line left */}
          <div className="hidden sm:block h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(to right, transparent, #d4a0a8)" }} />
          <h2
            className="text-center text-[16px] md:text-[19px] lg:text-[21px] font-extrabold tracking-tight leading-none"
            style={{ color: MEAT_PRIMARY }}
          >
            Quick Categories
          </h2>
          {/* Decorative line right */}
          <div className="hidden sm:block h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(to left, transparent, #d4a0a8)" }} />
        </div>

        {/* Left Scroll Button */}
        <div className="absolute left-3 lg:left-8 top-[55%] -translate-y-1/2 z-20 hidden md:flex">
          <button
            onClick={() => scroll("left")}
            className="h-10 w-10 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center border cursor-pointer transition-all active:scale-90 hover:scale-105"
            style={{
              background: "#fff",
              borderColor: "#d4a0a8",
              color: MEAT_PRIMARY,
            }}
          >
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
        </div>

        {/* Scrollable category row */}
        <div
          ref={scrollRef}
          className="relative z-10 flex items-start gap-4 md:gap-5 lg:gap-6 overflow-x-auto no-scrollbar px-4 pb-5 pt-3 md:px-8 md:pb-6 md:pt-3 snap-x scroll-smooth"
        >
          {categories.map((cat, idx) => {
            const palette = QUICK_CATEGORY_PALETTES[idx % QUICK_CATEGORY_PALETTES.length];
            return (
              <div
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex flex-col items-center gap-0.5 min-w-[100px] sm:min-w-[110px] md:min-w-[120px] lg:min-w-[136px] cursor-pointer group/item snap-start transition-transform active:scale-95"
              >
                <div
                  className="relative w-[100px] h-[112px] sm:w-[110px] sm:h-[122px] md:w-[120px] md:h-[134px] lg:w-[136px] lg:h-[150px] rounded-[18px] md:rounded-[22px] shadow-[0_8px_18px_rgba(122,31,43,0.12)] border flex items-start justify-center p-1.5 md:p-2 transition-all duration-300 group-hover/item:-translate-y-1 group-hover/item:shadow-[0_16px_30px_rgba(122,31,43,0.18)] overflow-hidden smooth-transform"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(255,249,244,0.6) 30%, rgba(255,249,244,0.15) 100%), linear-gradient(135deg, ${palette.bgFrom}, ${palette.bgVia}, ${palette.bgTo})`,
                    borderColor: palette.frameColor,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{ backgroundColor: palette.glowColor }}
                  />
                  <img
                    src={applyCloudinaryTransform(cat.image, "f_auto,q_auto,w_150")}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute left-1/2 top-2.5 md:top-3 z-10 h-[70px] w-[70px] sm:h-[72px] sm:w-[72px] md:h-[76px] md:w-[76px] lg:h-[84px] lg:w-[84px] -translate-x-1/2 object-contain drop-shadow-[0_5px_12px_rgba(122,31,43,0.15)] mix-blend-multiply group-hover/item:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-x-1.5 md:inset-x-2 bottom-1.5 z-20 text-center">
                    <span
                      className="block text-[10.5px] md:text-[11px] lg:text-[12.5px] font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] group-hover/item:font-extrabold transition-all"
                      style={{ color: MEAT_PRIMARY }}
                    >
                      {cat.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <div className="absolute right-3 lg:right-8 top-[55%] -translate-y-1/2 z-20 hidden md:flex">
          <button
            onClick={() => scroll("right")}
            className="h-10 w-10 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center border cursor-pointer transition-all active:scale-90 hover:scale-105"
            style={{
              background: "#fff",
              borderColor: "#d4a0a8",
              color: MEAT_PRIMARY,
            }}
          >
            <ChevronRight size={22} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickCategorySlider);
