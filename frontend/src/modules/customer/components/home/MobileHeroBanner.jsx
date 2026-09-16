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
        className="relative w-full h-[175px] sm:h-[195px] rounded-xl overflow-hidden shadow-md cursor-pointer border border-[#520E18]/40 flex items-center group"
        style={{
          background: "#240408",
        }}
      >
        {/* Background Image: Fresh meat on cutting board on right */}
        <img
          src="/hero_banner_fresh_meat.jpg"
          alt="Fresh Meat & Seafood"
          className="absolute inset-0 w-full h-full object-cover object-right sm:object-center group-hover:scale-[1.02] transition-transform duration-700"
          loading="eager"
        />

        {/* Deep Wine-Red Gradient Overlay on Left to guarantee crisp text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(36, 4, 8, 0.96) 0%, rgba(46, 6, 12, 0.92) 42%, rgba(56, 8, 16, 0.65) 65%, rgba(40, 5, 10, 0.15) 85%, transparent 100%)",
          }}
        />

        {/* Banner Content (Left side) */}
        <div className="relative z-10 w-[62%] sm:w-[58%] pl-4 sm:pl-6 pr-2 flex flex-col justify-center gap-1.5 sm:gap-2">
          {/* Eyebrow Label */}
          <span className="text-[9px] sm:text-[10.5px] font-bold tracking-[0.2em] uppercase text-[#E5A83B]">
            PREMIUM QUALITY
          </span>

          {/* Headline */}
          <h2
            className="text-[19px] sm:text-[23px] font-black text-white leading-[1.15] tracking-tight font-serif"
            style={{
              fontFamily: "'Playfair Display', 'Merriweather', 'Georgia', serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            Fresh Meat &amp;<br />
            <span>Seafood</span>
          </h2>

          {/* Subtitle */}
          <p className="text-[10px] sm:text-[11.5px] text-[#F3E8E2]/90 font-normal leading-tight line-clamp-2">
            Clean, hygienic &amp; farm fresh — delivered to your doorstep.
          </p>

          {/* Action Button */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={handleShopNow}
              className="inline-flex items-center gap-1 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-[#E5A83B] text-[#E5A83B] hover:bg-[#E5A83B]/15 text-[10px] sm:text-[11.5px] font-bold tracking-wide transition-all active:scale-95 bg-black/25 backdrop-blur-xs"
            >
              <span>Shop Now</span>
              <span className="text-xs">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Carousel Pagination Dots at Bottom Center */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
          {[0, 1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={`transition-all duration-300 rounded-full ${
                activeDot === dot
                  ? "w-2 h-2 bg-[#E52535] ring-2 ring-[#E52535]/30"
                  : "w-1.5 h-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobileHeroBanner);
