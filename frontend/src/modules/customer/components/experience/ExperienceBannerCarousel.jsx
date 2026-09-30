import React from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionValue } from "framer-motion";
import {
  applyCloudinaryTransform,
  buildCloudinarySrcSet,
  isCloudinaryUrl,
} from "@/core/utils/imageUtils";

import { isMobileOrWebView } from "@/core/utils/deviceUtils";

const BANNER_CHUNK_SIZE = 20;

const ExperienceBannerCarousel = ({ section, items, fullWidth = false, slideGap = 0, edgeToEdge = false }) => {
  if (!items.length) return null;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.min(items.length, BANNER_CHUNK_SIZE)
  );
  const visibleItems = items.slice(0, visibleCount);
  const totalItems = visibleItems.length;
  const x = useMotionValue(0);
  const containerRef = React.useRef(null);
  const hasMore = visibleCount < items.length;

  const loadMore = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(items.length, prev + BANNER_CHUNK_SIZE));
  }, [items.length]);

  React.useEffect(() => {
    setVisibleCount(Math.min(items.length, BANNER_CHUNK_SIZE));
    setActiveIndex(0);
  }, [items.length]);

  // Auto-play logic
  React.useEffect(() => {
    if (totalItems <= 1) return;

    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalItems);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [totalItems]);

  React.useEffect(() => {
    if (!hasMore) return;
    if (activeIndex >= totalItems - 2) {
      loadMore();
    }
  }, [activeIndex, totalItems, hasMore, loadMore]);

  const handleDragEnd = (_, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      // Swipe left -> Next
      setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (info.offset.x > threshold) {
      // Swipe right -> Prev
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const getBannerOptimizedSrc = React.useCallback((url) => {
    if (!url) return url;
    if (!isCloudinaryUrl(url)) return url;
    return applyCloudinaryTransform(url, "f_auto,q_auto,c_fill,g_auto,w_824,h_380");
  }, []);

  return (
    <div className={cn("overflow-hidden touch-pan-y", fullWidth && "w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]")}>
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: `-${(activeIndex / totalItems) * 100}%` }}
        transition={isMobileOrWebView() ? { type: "tween", ease: "easeInOut", duration: 0.3 } : { type: "spring", stiffness: 300, damping: 30 }}
        className="flex"
        style={{ width: `${totalItems * 100}%` }}
      >
        {visibleItems.map((banner, idx) => (
          <div
            key={idx}
            className={cn(
              "relative shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center box-border",
              fullWidth ? "h-[190px] rounded-none px-0" : "h-[190px] px-4 md:px-8"
            )}
            style={{ width: `${100 / totalItems}%` }}
          >
            {fullWidth ? (
              <div className="relative w-full h-full">
                <img
                  src={getBannerOptimizedSrc(banner.imageUrl)}
                  srcSet={
                    isCloudinaryUrl(banner.imageUrl)
                      ? buildCloudinarySrcSet(banner.imageUrl, [
                          { w: 412, h: 190 },
                          { w: 824, h: 380 },
                          { w: 1248, h: 570 },
                        ])
                      : undefined
                  }
                  sizes="100vw"
                  alt={banner.headline || banner.title || section?.title || "Banner"}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  width={412}
                  height={190}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                />
                {Boolean(banner.headline || banner.title || banner.subheadline || banner.subtitle) && (
                  <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 text-white pointer-events-none">
                    {(banner.headline || banner.title) && (
                      <h3 className="text-base md:text-xl font-anton uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1">
                        {banner.headline || banner.title}
                      </h3>
                    )}
                    {(banner.subheadline || banner.subtitle) && (
                      <p className="text-[11px] md:text-xs text-amber-50/90 font-medium line-clamp-1 mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {banner.subheadline || banner.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative h-full w-full max-w-[560px] overflow-hidden rounded-3xl bg-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <img
                  src={getBannerOptimizedSrc(banner.imageUrl)}
                  srcSet={
                    isCloudinaryUrl(banner.imageUrl)
                      ? buildCloudinarySrcSet(banner.imageUrl, [
                          { w: 560, h: 190 },
                          { w: 1120, h: 380 },
                        ])
                      : undefined
                  }
                  sizes="(max-width: 768px) 100vw, 560px"
                  alt={banner.headline || banner.title || section?.title || "Banner"}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  width={560}
                  height={190}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                />
                {Boolean(banner.headline || banner.title || banner.subheadline || banner.subtitle) && (
                  <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 text-white pointer-events-none">
                    {(banner.headline || banner.title) && (
                      <h3 className="text-base md:text-xl font-anton uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-1">
                        {banner.headline || banner.title}
                      </h3>
                    )}
                    {(banner.subheadline || banner.subtitle) && (
                      <p className="text-[11px] md:text-xs text-amber-50/90 font-medium line-clamp-1 mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {banner.subheadline || banner.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default ExperienceBannerCarousel;
