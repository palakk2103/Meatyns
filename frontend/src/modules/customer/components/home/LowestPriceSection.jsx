import React from "react";
import { ChevronRight } from "lucide-react";
import ProductCard from "../shared/ProductCard";

/* ───────── Burgundy + Cream palette tokens ───────── */
const MEAT_PRIMARY = "#7A1F2B";
const MEAT_SECONDARY = "#A93645";

const LowestPriceSection = ({ products, onSeeAll }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="mt-0 mb-3 md:mt-2 md:mb-6">
      <div
        className="relative overflow-hidden pt-3 pb-2 md:pt-6 md:pb-4 border-y shadow-sm md:shadow-[inset_0_-10px_40px_rgba(122,31,43,0.03)]"
        style={{
          background: "linear-gradient(135deg, rgba(122,31,43,0.07) 0%, rgba(255,249,244,0.95) 40%, rgba(229,168,59,0.06) 100%)",
          borderColor: "rgba(122,31,43,0.12)",
        }}
      >
        {/* Background Decoration blobs */}
        <div
          className="absolute -top-10 -right-10 h-40 w-40 md:h-80 md:w-80 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(122,31,43,0.2) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-10 -left-10 h-40 w-40 md:h-80 md:w-80 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(229,168,59,0.25) 0%, transparent 70%)" }}
        />

        <div className="container mx-auto px-4 md:px-8 lg:px-[50px] relative z-10">
          {/* Header row */}
          <div className="flex justify-between items-center mb-3 md:mb-6 px-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                {/* Premium badge */}
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                  style={{ color: "#E5A83B", borderColor: "#E5A83B", background: "rgba(229,168,59,0.08)" }}
                >
                  ✦ Premium Picks
                </span>
              </div>
              <h3
                className="text-[16px] sm:text-lg md:text-xl font-black tracking-tight leading-none capitalize"
                style={{ color: "#24191A" }}
              >
                Top Picks{" "}
                <span style={{ color: MEAT_PRIMARY }}>for You</span>
              </h3>
              <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-3">
                <div
                  className="h-1 w-1 md:h-2 md:w-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(122,31,43,0.5)]"
                  style={{ background: MEAT_PRIMARY }}
                />
                <span
                  className="text-[10px] md:text-xs font-semibold tracking-wide opacity-80"
                  style={{ color: MEAT_SECONDARY }}
                >
                  Freshly Sourced • Updated Daily
                </span>
              </div>
            </div>

            {/* See All button */}
            <button
              onClick={onSeeAll}
              className="flex items-center gap-1 bg-white px-2.5 py-1 md:px-4 md:py-2 rounded-full font-bold text-[11px] md:text-sm cursor-pointer shadow-[0_4px_12px_rgba(122,31,43,0.12)] md:shadow-md border transition-all whitespace-nowrap active:scale-95 hover:shadow-[0_6px_16px_rgba(122,31,43,0.2)]"
              style={{ color: MEAT_PRIMARY, borderColor: "rgba(122,31,43,0.2)" }}
            >
              See All
              <ChevronRight size={12} className="ml-0.5" strokeWidth={3} />
            </button>
          </div>

          {/* Product cards horizontal scroll */}
          <div className="relative z-10 flex overflow-x-auto gap-2.5 sm:gap-3 md:gap-4 pb-3 md:pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
            {products.slice(0, 12).map((product) => (
              <div
                key={product.id}
                className="w-[134px] sm:w-[155px] md:w-[210px] shrink-0 snap-start smooth-transform"
              >
                <ProductCard
                  product={product}
                  variant="homeDesktop"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust Bar: 100% Fresh • Safe • Quality Assured ── */}
        <div
          className="mt-4 mb-2 mx-3 sm:mx-4 px-4 py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-2.5 sm:gap-3 shadow-[0_2px_8px_rgba(116,23,33,0.04)]"
          style={{
            background: "#FCEEEB",
            border: "1px solid #F5D6CF",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M12 2L4.5 5.2V11.2C4.5 16.2 7.7 20.8 12 22C16.3 20.8 19.5 16.2 19.5 11.2V5.2L12 2Z"
              fill="#741721"
              stroke="#581119"
              strokeWidth="1.2"
            />
            <path
              d="M9 11.5L11.2 13.7L15.5 9.2"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-[12px] sm:text-[13px] font-bold tracking-tight text-center"
            style={{ color: "#2B1619" }}
          >
            100% Fresh &nbsp;•&nbsp; Safe &nbsp;•&nbsp; Quality Assured
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LowestPriceSection);
