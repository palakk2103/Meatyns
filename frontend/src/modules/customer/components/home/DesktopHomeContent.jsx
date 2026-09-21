import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Snowflake,
  Truck,
  Sparkles,
  Clock,
  ChevronRight,
  Award,
  Heart,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import HotDealsSection from "./HotDealsSection";
import TopPicksSection from "./TopPicksSection";
import TrendingCategoriesSection from "./TrendingCategoriesSection";
import TrustFeaturesBanner from "./TrustFeaturesBanner";
import QuickCategoryRow from "./QuickCategoryRow";

const DesktopHomeContent = ({ products = [], categories = [] }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleAddToCart = (item) => {
    addToCart({
      id: item.id,
      _id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.image,
      weight: item.weight,
    });
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 p-4 lg:p-6 select-none">
      {/* ──── CENTER / MAIN COLUMN ──── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Top Hero Banner matching Reference Screenshot */}
        <div
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-10 shadow-xs border border-slate-100 bg-[#F9F6F0]"
        >
          {/* Fresh Meat & Seafood Platter Artwork on the right */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1/2 lg:w-3/5 bg-no-repeat bg-right bg-cover pointer-events-none opacity-100"
            style={{
              backgroundImage: "url('/banners/hero_platter_clean.jpg')",
              maskImage:
                "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 4%, rgba(0,0,0,1) 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 4%, rgba(0,0,0,1) 100%)",
            }}
          />

          {/* Script Accent Top Right */}
          <div className="absolute top-6 right-8 z-10 hidden sm:flex flex-col items-end pointer-events-none">
            <span className="font-serif italic text-sm lg:text-base font-black text-[#111111] drop-shadow-xs flex items-center gap-1">
              Good Food Good Health <Heart size={14} className="fill-[#C81017] text-[#C81017]" />
            </span>
          </div>

          {/* Hero Left Content */}
          <div className="relative z-10 max-w-sm sm:max-w-md lg:max-w-lg flex flex-col items-start gap-2">
            {/* Tagline Pill */}
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white bg-[#C81017] px-3 py-1 rounded-full shadow-xs">
              PREMIUM QUALITY
            </span>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#111111] uppercase leading-[1.12]">
              FRESH CHICKEN, MEAT &amp;
              <br />
              SEAFOOD
            </h2>

            {/* Small yellow accent bar */}
            <div className="w-12 h-1 bg-[#FAB82C] rounded-full my-0.5" />

            {/* Subtitle */}
            <p className="text-slate-600 text-xs sm:text-sm font-semibold max-w-md leading-relaxed">
              Farm fresh &bull; Hygienically packed &bull; Delivered to your doorstep
            </p>

            {/* 3 Value Props */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-7 mt-2 pt-2 border-t border-slate-200/60 w-full">
              <div className="flex items-center gap-2 text-[#111111]">
                <div className="w-7 h-7 rounded-full border border-slate-300 bg-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} className="text-[#111111] stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold leading-tight">
                  100% Fresh
                  <br />
                  &amp; Natural
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#111111]">
                <div className="w-7 h-7 rounded-full border border-slate-300 bg-white flex items-center justify-center shrink-0">
                  <Snowflake size={15} className="text-[#111111] stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold leading-tight">
                  Chilled
                  <br />
                  Always
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#111111]">
                <div className="w-7 h-7 rounded-full border border-slate-300 bg-white flex items-center justify-center shrink-0">
                  <Truck size={15} className="text-[#111111] stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold leading-tight">
                  Fast Delivery
                  <br />
                  15–30 mins
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate("/category/all")}
              className="mt-2.5 px-6 py-2.5 rounded-full bg-[#FAB82C] hover:bg-[#E5A720] text-[#111111] font-black text-xs tracking-wider uppercase shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 border-0"
            >
              <span>SHOP NOW</span>
              <span className="text-sm font-black">&rarr;</span>
            </button>
          </div>
        </div>

        {/* ──── QUICK CATEGORIES ROW (SINGLE ROW ON DESKTOP) ──── */}
        <div className="-mt-1">
          <QuickCategoryRow categories={categories} singleRow={true} />
        </div>

        {/* ──── 1. 🔥 HOT DEALS SECTION ──── */}
        <HotDealsSection products={products} />

        {/* ──── 2. ⭐ TOP PICKS FOR YOU SECTION ──── */}
        <TopPicksSection products={products} />

        {/* ──── 3. 📈 TRENDING NOW SECTION ──── */}
        <TrendingCategoriesSection />

        {/* ──── 4. 🛡️ TRUST & VALUE PROPOSITIONS BANNER ──── */}
        <TrustFeaturesBanner />
      </div>

      {/* ──── RIGHT COLUMN (SIDEBAR RAIL) ──── */}
      <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">
        {/* Card 1: "Good Food Good Health" Promo Card */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 overflow-hidden shadow-xs">
          <div className="relative z-10 max-w-[170px] flex flex-col items-start gap-1.5">
            <h4 className="text-xl font-black text-[#111111] leading-tight">
              Good Food
              <br />
              <span className="text-[#C81017]">Good Health</span>
            </h4>
            <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
              Clean, fresh &amp; safe meat and fish for your family.
            </p>
            <button
              onClick={() => navigate("/about")}
              className="mt-1.5 px-4 py-1.5 rounded-full bg-[#FAB82C] hover:bg-[#E5A720] text-[#111111] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border-0 shadow-xs"
            >
              <span>Know More</span>
              <span>&rarr;</span>
            </button>
          </div>
          {/* Right illustration image */}
          <div
            className="absolute -right-3 -bottom-2 w-32 h-32 bg-contain bg-no-repeat pointer-events-none"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=250')",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 80%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 80%)",
            }}
          />
        </div>

        {/* Card 2: "Today's Deal" Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#C81017] stroke-[2.4]" />
              <span className="text-sm font-bold text-[#111111]">
                Today's Deal
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#C81017] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
              Up to 20% OFF
            </span>
          </div>

          {/* Deal Item */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <img
              src="https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=160&h=160"
              alt="Chicken Breast"
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] truncate">
                  Chicken Breast
                </span>
                <ChevronRight size={13} className="text-slate-400 shrink-0" />
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                (Boneless)
              </span>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-bold text-[#111111]">₹149</span>
                <span className="text-[11px] text-slate-400 line-through">
                  ₹179
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              handleAddToCart({
                id: "6a8740d900d8659486c095e3",
                name: "Chicken Breast (Boneless)",
                price: 169,
                originalPrice: 199,
                weight: "500 g",
              })
            }
            className="w-full py-2.5 px-3 rounded-xl bg-[#C81017] hover:bg-[#B30E14] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 shadow-xs"
          >
            <span>Add to Cart</span>
          </button>
        </div>

        {/* Card 3: 3 Trust Features Card matching reference */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FAB82C]/20 flex items-center justify-center text-[#B45309] shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#111111] leading-tight">
                Premium Quality
              </h5>
              <p className="text-[10.5px] text-slate-500 font-medium leading-none mt-0.5">
                Only the best, always.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FAB82C]/20 flex items-center justify-center text-[#B45309] shrink-0">
              <Award size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#111111] leading-tight">
                Freshly Sourced
              </h5>
              <p className="text-[10.5px] text-slate-500 font-medium leading-none mt-0.5">
                From trusted vendors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FAB82C]/20 flex items-center justify-center text-[#B45309] shrink-0">
              <Snowflake size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#111111] leading-tight">
                Chilled &amp; Safe
              </h5>
              <p className="text-[10.5px] text-slate-500 font-medium leading-none mt-0.5">
                Maintains freshness.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DesktopHomeContent);
