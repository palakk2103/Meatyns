import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * MobileHeroBanner
 * Dynamically displays banners uploaded in the Admin module (heroConfig).
 * Supports both full graphic banners (photo-only) and styled text banners.
 * Falls back to the default luxury platter artwork when no banners are configured.
 */
const MobileHeroBanner = ({ heroConfig }) => {
  const navigate = useNavigate();
  const [activeDot, setActiveDot] = useState(0);

  const bannerItems = useMemo(() => {
    return (heroConfig?.banners?.items || []).filter((b) => b && b.imageUrl);
  }, [heroConfig]);

  const totalSlides = bannerItems.length > 0 ? bannerItems.length : 1;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(timer);
  }, [totalSlides]);

  const currentBanner =
    bannerItems.length > 0 ? bannerItems[activeDot % bannerItems.length] : null;

  const handleBannerClick = (e) => {
    e.stopPropagation();
    if (!currentBanner) {
      navigate("/category/all");
      return;
    }
    if (currentBanner.linkType === "category" && currentBanner.linkValue) {
      navigate(`/category/${currentBanner.linkValue}`);
    } else if (currentBanner.linkType === "product" && currentBanner.linkValue) {
      navigate(`/product/${currentBanner.linkValue}`);
    } else {
      navigate("/category/all");
    }
  };

  const headline = (currentBanner?.headline || currentBanner?.title || "").trim();
  const subheadline = (currentBanner?.subheadline || currentBanner?.subtitle || "").trim();
  const hasText = Boolean(headline || subheadline);
  const isFullGraphicBanner = currentBanner && currentBanner.imageUrl && !hasText;

  return (
    <div className="w-full px-1.5 sm:px-2.5 pt-0 pb-1.5 select-none">
      <div
        onClick={handleBannerClick}
        className="relative w-full h-[175px] sm:h-[195px] rounded-2xl overflow-hidden shadow-xs cursor-pointer border border-slate-200/80 flex items-center group"
        style={{
          background: isFullGraphicBanner
            ? "#F8F8F8"
            : "linear-gradient(95deg, #FAF4EE 0%, #F8EFE5 50%, #F5EAE0 100%)",
        }}
      >
        {isFullGraphicBanner ? (
          // Full Graphic Banner Image from Admin (No text overlay)
          <img
            src={currentBanner.imageUrl}
            alt="Promotion Banner"
            className="w-full h-full object-cover select-none pointer-events-none group-hover:scale-[1.02] transition-transform duration-700"
            loading="eager"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/banners/hero_platter_clean.jpg";
            }}
          />
        ) : currentBanner?.imageUrl ? (
          // Custom Uploaded Banner Image WITH Headline/Subheadline Overlay
          <div className="relative w-full h-full overflow-hidden flex items-center">
            <img
              src={currentBanner.imageUrl}
              alt={headline || "Promotion Banner"}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none group-hover:scale-[1.02] transition-transform duration-700"
              loading="eager"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/banners/hero_platter_clean.jpg";
              }}
            />
            {/* Banner Text Content Over Image (no dark opacity layer over the image) */}
            <div className="relative z-10 w-[75%] sm:w-[65%] pl-4 sm:pl-5 pr-2 flex flex-col justify-center gap-1.5">
              <span className="text-[8.5px] sm:text-[9.5px] font-black tracking-wider uppercase text-[#111111] bg-[#FAB82C] px-2.5 py-0.5 rounded-full w-fit shadow-xs">
                SPECIAL OFFER
              </span>

              {headline && (
                <h2 className="text-[19px] sm:text-[22px] font-normal leading-[1.14] tracking-wide font-anton uppercase text-white drop-shadow-md line-clamp-2">
                  {headline}
                </h2>
              )}

              {subheadline && (
                <p className="text-[10px] sm:text-[11px] text-amber-50/95 font-medium leading-tight line-clamp-2 drop-shadow-sm">
                  {subheadline}
                </p>
              )}

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleBannerClick}
                  className="inline-flex items-center gap-1.5 px-4 py-1 sm:px-4.5 sm:py-1.5 rounded-full bg-[#FAB82C] hover:bg-[#F2B022] text-[#111111] text-[10px] sm:text-[11px] font-black tracking-wide uppercase transition-all active:scale-95 shadow-xs border-0 cursor-pointer"
                >
                  <span>SHOP NOW</span>
                  <span className="text-xs font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Fallback Platter Artwork when no banner image is uploaded
          <>
            <img
              src="/banners/hero_platter_clean.jpg"
              alt={headline || "Fresh Meat & Seafood"}
              className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[52%] h-full object-cover object-right pointer-events-none opacity-100 group-hover:scale-[1.02] transition-transform duration-700"
              style={{
                maskImage:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 100%)",
              }}
              loading="eager"
            />

            <div className="relative z-10 w-[58%] sm:w-[55%] pl-3.5 sm:pl-5 pr-1 flex flex-col justify-center gap-1.5 sm:gap-2">
              <span className="text-[8.5px] sm:text-[9.5px] font-black tracking-wider uppercase text-[#111111] bg-[#FAB82C] px-2.5 py-0.5 rounded-full w-fit shadow-2xs">
                PREMIUM QUALITY
              </span>

              <h2 className="text-[19px] sm:text-[22px] font-normal leading-[1.14] tracking-wide font-anton uppercase">
                {headline ? (
                  <span className="text-[#111111] line-clamp-2">
                    {headline}
                  </span>
                ) : (
                  <>
                    <span className="text-[#111111]">Fresh Chicken,</span>
                    <br />
                    <span className="text-[#C81017]">Meat &amp; Seafood</span>
                  </>
                )}
              </h2>

              <p className="text-[9.5px] sm:text-[10.5px] text-slate-600 font-medium leading-tight line-clamp-2">
                {subheadline || "Farm fresh • Hygienically packed • 100% pure"}
              </p>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleBannerClick}
                  className="inline-flex items-center gap-1.5 px-4 py-1 sm:px-4.5 sm:py-1.5 rounded-full bg-[#FAB82C] hover:bg-[#F2B022] text-[#111111] text-[10px] sm:text-[11px] font-black tracking-wide uppercase transition-all active:scale-95 shadow-2xs border-0 cursor-pointer"
                >
                  <span>SHOP NOW</span>
                  <span className="text-xs font-bold">&rarr;</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Carousel Pagination Dots at Bottom Center */}
        {totalSlides > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
            {bannerItems.map((_, dotIdx) => (
              <span
                key={dotIdx}
                className={`transition-all duration-300 rounded-full ${
                  activeDot === dotIdx
                    ? "w-3.5 h-1.5 bg-[#FAB82C]"
                    : "w-1.5 h-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MobileHeroBanner);
