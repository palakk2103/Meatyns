import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * MobileHeroBanner
 * Luxury mobile hero banner matching the reference design:
 * - Deep dark burgundy / wine-red backdrop
 * - Beautiful fresh cuts of meat on rustic wooden board on the right
 * - Elegant gold "PREMIUM QUALITY" subtitle
 * - "Fresh Meat & Seafood" headline
 * - "Clean, hygienic & farm fresh — delivered to your doorstep."
 * - "Shop Now →" button with gold border
 * - Carousel dots indicator at bottom
 */
const MobileHeroBanner = () => {
  const navigate = useNavigate();
  const [activeDot, setActiveDot] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleShopNow = (e) => {
    e.stopPropagation();
    navigate("/category/all");
  };

  return (
    <div className="w-full px-1.5 sm:px-2.5 pt-0 pb-1.5 select-none">
      <div
        onClick={() => navigate("/category/all")}
        className="relative w-full h-[175px] sm:h-[195px] rounded-2xl overflow-hidden shadow-xs cursor-pointer border border-slate-200/80 flex items-center group"
        style={{
          background:
            "linear-gradient(95deg, #FAF4EE 0%, #F8EFE5 50%, #F5EAE0 100%)",
        }}
      >
        {/* Background Image: Fresh meat on cutting board on right */}
        <img
          src="/banners/hero_platter_clean.jpg"
          alt="Fresh Meat & Seafood"
          className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[52%] h-full object-cover object-right pointer-events-none opacity-100 group-hover:scale-[1.02] transition-transform duration-700"
          style={{
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 100%)",
          }}
          loading="eager"
        />

        {/* Banner Content (Left side) */}
        <div className="relative z-10 w-[58%] sm:w-[55%] pl-3.5 sm:pl-5 pr-1 flex flex-col justify-center gap-1.5 sm:gap-2">
          {/* Eyebrow Label */}
          <span className="text-[8.5px] sm:text-[9.5px] font-black tracking-wider uppercase text-[#111111] bg-[#FAB82C] px-2.5 py-0.5 rounded-full w-fit shadow-2xs">
            PREMIUM QUALITY
          </span>

          {/* Headline */}
          <h2
            className="text-[18px] sm:text-[21px] font-black leading-[1.14] tracking-tight font-serif"
            style={{
              fontFamily: "'Playfair Display', 'Merriweather', 'Georgia', serif",
            }}
          >
            <span className="text-[#111111]">Fresh Chicken,</span><br />
            <span className="text-[#C81017]">Meat &amp; Seafood</span>
          </h2>

          {/* Subtitle */}
          <p className="text-[9.5px] sm:text-[10.5px] text-slate-600 font-medium leading-tight line-clamp-2">
            Farm fresh &bull; Hygienically packed &bull; 100% pure
          </p>

          {/* Action Button */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={handleShopNow}
              className="inline-flex items-center gap-1.5 px-4 py-1 sm:px-4.5 sm:py-1.5 rounded-full bg-[#FAB82C] hover:bg-[#F2B022] text-[#111111] text-[10px] sm:text-[11px] font-black tracking-wide uppercase transition-all active:scale-95 shadow-2xs border-0 cursor-pointer"
            >
              <span>SHOP NOW</span>
              <span className="text-xs font-bold">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Carousel Pagination Dots at Bottom Center */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={`transition-all duration-300 rounded-full ${
                activeDot % 3 === dot
                  ? "w-3.5 h-1.5 bg-[#FAB82C]"
                  : "w-1.5 h-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobileHeroBanner);
