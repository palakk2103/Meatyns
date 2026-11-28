import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, ChevronLeft, ChevronRight, ArrowRight, Image as ImageIcon } from "lucide-react";
import { customerApi } from "../../services/customerApi";
import GalleryImage from "./GalleryImage";

/**
 * Premium homepage gallery strip: soft blush card with a header (icon, title,
 * subtitle swoosh, "View All" pill), a snap-scrolling row of photo cards with
 * dark caption overlays, side arrows and page dots. Renders nothing when the
 * admin disabled it, when no eligible published galleries exist, or when the
 * request fails — so it never disturbs the shopping sections around it.
 */

const FilmStrip = ({ className = "" }) => (
  <svg viewBox="0 0 320 90" className={className} aria-hidden="true" fill="none">
    <path
      d="M0 60 C 70 10, 140 95, 210 45 S 300 20, 320 30"
      stroke="currentColor"
      strokeWidth="26"
      strokeLinecap="round"
    />
    <path
      d="M0 60 C 70 10, 140 95, 210 45 S 300 20, 320 30"
      stroke="#fff"
      strokeWidth="14"
      strokeDasharray="10 9"
      strokeLinecap="butt"
      opacity="0.85"
    />
  </svg>
);

const Swoosh = () => (
  <svg viewBox="0 0 120 10" className="block w-24 md:w-28 h-2 mt-1" aria-hidden="true" fill="none">
    <path d="M2 7 C 35 1, 80 1, 118 5" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const GalleryPreviewSection = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", items: [], settings: null });
  const trackRef = useRef(null);
  const [pager, setPager] = useState({ pages: 1, page: 0, canPrev: false, canNext: false });

  useEffect(() => {
    let alive = true;
    customerApi
      .getHomeGallery()
      .then((res) => {
        if (!alive) return;
        const result = res?.data?.result || {};
        setState({ status: "ready", items: Array.isArray(result.items) ? result.items : [], settings: result.settings || null });
      })
      .catch(() => alive && setState({ status: "error", items: [], settings: null }));
    return () => {
      alive = false;
    };
  }, []);

  const updatePager = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05));
    const page = max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (pages - 1));
    setPager((p) =>
      p.pages === pages && p.page === page && p.canPrev === el.scrollLeft > 4 && p.canNext === el.scrollLeft < max - 4
        ? p
        : { pages, page, canPrev: el.scrollLeft > 4, canNext: el.scrollLeft < max - 4 },
    );
  }, []);

  useEffect(() => {
    if (state.status !== "ready") return undefined;
    updatePager();
    window.addEventListener("resize", updatePager);
    return () => window.removeEventListener("resize", updatePager);
  }, [state.status, state.items.length, updatePager]);

  const scrollByPage = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const scrollToPage = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: pager.pages > 1 ? (max * i) / (pager.pages - 1) : 0, behavior: "smooth" });
  };

  if (state.status === "loading") {
    return (
      <section className="w-full mb-4 sm:mb-6 rounded-3xl border border-[#F6D9D6] bg-gradient-to-br from-[#FFF4F2] to-[#FFFAF8] p-4 md:p-6" aria-hidden="true">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-[#F9E1DE] animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-[#F3E2DE] animate-pulse" />
            <div className="h-3 w-64 rounded bg-[#F7EAE7] animate-pulse hidden md:block" />
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-[44%] md:w-[calc((100%-48px)/5)] shrink-0 aspect-[4/3.3] rounded-2xl bg-[#F3E2DE] animate-pulse ${i > 2 ? "hidden md:block" : ""}`}
            />
          ))}
        </div>
      </section>
    );
  }

  const { items, settings } = state;
  if (state.status !== "ready" || !settings?.homepageGalleryEnabled || items.length === 0) return null;

  return (
    <section
      className="relative w-full mb-4 sm:mb-6 rounded-3xl border border-[#F6D9D6] bg-gradient-to-br from-[#FFF1EF] via-[#FFF8F6] to-[#FFF3F1] px-3 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 shadow-[0_10px_30px_-12px_rgba(200,16,23,0.18)] overflow-hidden select-none"
      data-testid="home-gallery-preview"
    >
      {/* decorative background */}
      <FilmStrip className="pointer-events-none absolute -top-2 right-[18%] w-56 md:w-80 text-[#C81017] opacity-[0.05] hidden sm:block" />
      <div className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[#FFD9D4] opacity-40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-[#FFE3DE] opacity-50 blur-3xl" />

      {/* header */}
      <div className="relative flex items-center justify-between gap-3 mb-3 md:mb-5">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="shrink-0 h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-[#FDE2DF] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(200,16,23,0.08)]">
            <Camera size={22} strokeWidth={2.2} className="text-[#D7141B] md:w-6 md:h-6" />
          </div>
          <span className="hidden md:block h-11 w-px bg-[#E9CFCB]" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-[15px] md:text-[21px] font-extrabold text-[#1A1A1A] leading-tight truncate tracking-tight">
              <span className="hidden md:inline">Gallery – </span>
              <span className="text-[#D7141B]">{settings.homepageTitle}</span>
            </h2>
            {settings.homepageSubtitle && (
              <p className="text-[11px] md:text-[13px] text-slate-500 font-medium truncate mt-0.5">{settings.homepageSubtitle}</p>
            )}
            <Swoosh />
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/gallery")}
          data-testid="home-gallery-view-all"
          className="group shrink-0 flex items-center gap-1.5 md:gap-2 rounded-full border-[1.5px] border-[#D7141B] bg-white pl-3 pr-1 py-1 md:pl-4 md:pr-1.5 md:py-1.5 text-xs md:text-sm font-bold text-[#1A1A1A] cursor-pointer shadow-sm hover:bg-[#D7141B] hover:text-white transition-colors"
        >
          <span>View All</span>
          <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-[#D7141B] text-white group-hover:bg-white group-hover:text-[#D7141B] transition-colors">
            <ArrowRight size={13} strokeWidth={2.6} />
          </span>
        </button>
      </div>

      {/* carousel */}
      <div className="relative">
        {pager.canPrev && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByPage(-1)}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white text-[#1A1A1A] shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:text-[#D7141B] transition-colors cursor-pointer border-0"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
        )}
        {pager.canNext && (
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByPage(1)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white text-[#1A1A1A] shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:text-[#D7141B] transition-colors cursor-pointer border-0"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        )}

        <div
          ref={trackRef}
          onScroll={updatePager}
          className="flex gap-2.5 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {items.map((g) => (
            <Link
              key={g._id}
              to={`/gallery/${g.slug}`}
              data-testid="home-gallery-card"
              title={g.title}
              className="group relative w-[44%] sm:w-[31%] md:w-[calc((100%-48px)/5)] shrink-0 snap-start rounded-2xl overflow-hidden no-underline shadow-[0_6px_18px_-6px_rgba(0,0,0,0.3)] ring-1 ring-black/5"
            >
              <GalleryImage
                src={g.coverImage}
                alt={g.title}
                width={800}
                showFull
                className="aspect-[4/3.3] w-full"
                imgClassName="group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-md bg-white/90 text-[#1A1A1A] shadow-sm">
                <ImageIcon size={11} strokeWidth={2.2} />
              </span>
              {/* Short, light fade only behind the caption so the photo stays clear. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 pb-1.5 md:px-2.5 md:pb-2">
                <span className="h-3 w-[2px] shrink-0 rounded-full bg-[#E3141C]" aria-hidden="true" />
                <span className="text-[10px] md:text-[11px] font-semibold text-white leading-tight line-clamp-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                  {g.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* dots */}
      {pager.pages > 1 && (
        <div className="flex justify-center gap-1.5 mt-3 md:mt-4">
          {Array.from({ length: pager.pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to page ${i + 1}`}
              onClick={() => scrollToPage(i)}
              className={`h-2 rounded-full border-0 p-0 cursor-pointer transition-all duration-300 ${
                i === pager.page ? "w-5 bg-[#D7141B]" : "w-2 bg-[#D9CFCD] hover:bg-[#BFB2AF]"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default React.memo(GalleryPreviewSection);
