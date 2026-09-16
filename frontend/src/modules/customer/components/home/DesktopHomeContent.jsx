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
        {/* Top Hero Banner */}
        <div
          className="relative w-full rounded-2xl overflow-hidden p-6 sm:p-8 lg:p-10 shadow-md text-white"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, rgba(130, 20, 40, 0.95) 0%, rgba(70, 10, 24, 0.98) 45%, #2B050E 100%)",
          }}
        >
          {/* Meat and Fish background artwork on the right */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1/2 bg-no-repeat bg-right bg-cover opacity-80 mix-blend-screen pointer-events-none"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800')",
              maskImage:
                "linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
            }}
          />

          {/* 100% Fresh Round Badge on top right */}
          <div className="absolute top-6 right-8 z-10 hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-md text-center">
            <span className="text-[10px] font-black tracking-wider uppercase leading-none">
              100%
            </span>
            <span className="text-[9px] font-semibold tracking-tight text-white/80 leading-none mt-0.5">
              FRESH
            </span>
            <Sparkles size={9} className="text-amber-300 mt-0.5" />
          </div>

          <div className="relative z-10 max-w-xl flex flex-col items-start gap-2.5">
            {/* Tagline */}
            <span className="text-[10.5px] font-black uppercase tracking-[0.25em] text-amber-300/95 font-sans">
              PREMIUM QUALITY MEAT &amp; FISH
            </span>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
              Fresh Meat &amp; Seafood
            </h2>

            {/* Subtitle */}
            <p className="text-white/80 text-sm sm:text-base font-normal max-w-md leading-relaxed">
              Directly sourced daily from certified farms &amp; local ports.
            </p>

            {/* 3 Value Props */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-7 mt-2 pt-1">
              <div className="flex items-center gap-2 text-white/90">
                <ShieldCheck size={18} className="text-amber-400 shrink-0" />
                <span className="text-[11.5px] font-medium leading-tight">
                  Hygienically
                  <br />
                  Packed
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Snowflake size={18} className="text-cyan-300 shrink-0" />
                <span className="text-[11.5px] font-medium leading-tight">
                  Chilled
                  <br />
                  Always
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Truck size={18} className="text-amber-400 shrink-0" />
                <span className="text-[11.5px] font-medium leading-tight">
                  Fast Delivery
                  <br />
                  15–30 mins
                </span>
              </div>
            </div>

            {/* Shop Now Action Button */}
            <button
              onClick={() => navigate("/category/all")}
              className="mt-3 px-6 py-2.5 rounded-xl bg-[#520e1e] hover:bg-[#681327] border border-white/25 text-white font-semibold text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <span>Shop All Deals</span>
              <span>&rarr;</span>
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
        <div className="relative bg-[#F7EFE8] rounded-2xl p-5 border border-[#ECE0D5] overflow-hidden shadow-xs">
          <div className="relative z-10 max-w-[170px] flex flex-col items-start gap-2">
            <h4 className="text-xl font-serif font-bold text-slate-900 leading-tight">
              Good Food
              <br />
              <span className="italic text-[#520e1e]">Good Health</span>
            </h4>
            <p className="text-[11.5px] text-slate-600 font-medium leading-relaxed">
              Clean, fresh &amp; safe meat and fish for your family.
            </p>
            <button
              onClick={() => navigate("/about")}
              className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#520e1e] hover:bg-[#681327] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border-0"
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
              <Clock size={16} className="text-rose-600" />
              <span className="text-sm font-bold text-slate-900">
                Today's Deal
              </span>
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
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
                <span className="text-xs font-bold text-slate-800 truncate">
                  Chicken Breast
                </span>
                <ChevronRight size={13} className="text-slate-400 shrink-0" />
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                (Boneless)
              </span>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-bold text-slate-900">₹149</span>
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
                id: "deal-chicken-breast",
                name: "Chicken Breast (Boneless)",
                price: 149,
                originalPrice: 179,
                weight: "500 g",
              })
            }
            className="w-full py-2 px-3 rounded-xl bg-[#520e1e] hover:bg-[#681327] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0"
          >
            <span>Add to Cart</span>
          </button>
        </div>

        {/* Card 3: 4 Trust Features Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FCE8EA] flex items-center justify-center text-[#520e1e] shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 leading-tight">
                Premium Quality
              </h5>
              <p className="text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">
                Only the best, always.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FCE8EA] flex items-center justify-center text-[#520e1e] shrink-0">
              <Award size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 leading-tight">
                Freshly Sourced
              </h5>
              <p className="text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">
                From trusted vendors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FCE8EA] flex items-center justify-center text-[#520e1e] shrink-0">
              <Snowflake size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 leading-tight">
                Chilled &amp; Safe
              </h5>
              <p className="text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">
                Maintains freshness.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FCE8EA] flex items-center justify-center text-[#520e1e] shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 leading-tight">
                Quick Delivery
              </h5>
              <p className="text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">
                In just 15–30 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: "Fresh Seafood" Mini Banner */}
        <div
          className="relative rounded-2xl p-4 overflow-hidden text-white shadow-xs cursor-pointer group"
          onClick={() => navigate("/category/seafood")}
          style={{
            background: "linear-gradient(135deg, #1C0308 0%, #3B0610 100%)",
          }}
        >
          <div className="relative z-10 max-w-[150px]">
            <h4 className="text-base font-serif font-bold text-white leading-tight">
              Fresh Seafood
            </h4>
            <p className="text-[10.5px] text-white/70 font-medium mt-1 leading-tight">
              Prawns, Crab, Lobster &amp; more
            </p>
          </div>
          {/* Right seafood dish image */}
          <div
            className="absolute right-0 top-0 bottom-0 w-28 bg-cover bg-no-repeat opacity-90 group-hover:scale-105 transition-transform duration-300"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=240')",
              maskImage:
                "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(DesktopHomeContent);
