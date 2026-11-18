import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import GalleryImage from "./GalleryImage";

/**
 * Full-screen viewer: next/previous via buttons, arrow keys and swipe; Esc closes.
 * Neighbouring images are preloaded so navigation feels instant.
 */
const GalleryLightbox = ({ images = [], index, onIndexChange, onClose, title = "" }) => {
  const touchStartX = useRef(null);
  const total = images.length;
  const current = images[index];

  const go = useCallback(
    (delta) => onIndexChange((index + delta + total) % total),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  if (!current) return null;

  const next = images[(index + 1) % total];
  const prev = images[(index - 1 + total) % total];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} image viewer`}
      data-testid="gallery-lightbox"
      className="fixed inset-0 z-[400] bg-black flex flex-col select-none"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50 && total > 1) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold" data-testid="gallery-lightbox-counter">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-2 md:px-16 min-h-0">
        <GalleryImage
          key={current.url}
          src={current.url}
          alt={current.altText || current.caption || title}
          width={1600}
          eager
          className="w-full h-full bg-transparent"
          imgClassName="!object-contain"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 md:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 md:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-4 min-h-[56px] text-center text-white/90 text-sm">
        {current.caption || " "}
      </div>

      {/* Preload neighbours */}
      <div className="hidden" aria-hidden="true">
        {total > 1 && next && <GalleryImage src={next.url} width={1600} eager />}
        {total > 2 && prev && <GalleryImage src={prev.url} width={1600} eager />}
      </div>
    </div>,
    document.body,
  );
};

export default GalleryLightbox;
