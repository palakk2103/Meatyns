import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Images } from "lucide-react";
import { customerApi } from "../../services/customerApi";
import GalleryImage from "./GalleryImage";

/**
 * Compact homepage gallery card (mobile: 3 thumbnails in a swipeable row,
 * desktop: 5-column thumbnail strip). Renders nothing when the admin disabled
 * it, when no eligible published galleries exist, or when the request fails —
 * so it never disturbs the shopping sections around it.
 */
const GalleryPreviewSection = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", items: [], settings: null });

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

  if (state.status === "loading") {
    return (
      <section className="w-full mb-4 sm:mb-6 rounded-2xl border border-[#F3D2CF] bg-[#FFF8F3] p-3 md:p-4" aria-hidden="true">
        <div className="h-4 w-44 rounded bg-[#EFE6D8] animate-pulse mb-3" />
        <div className="flex gap-2 md:grid md:grid-cols-5 md:gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`w-[31%] md:w-auto shrink-0 aspect-[16/10] rounded-lg md:rounded-xl bg-[#EFE6D8] animate-pulse ${i > 2 ? "hidden md:block" : ""}`} />
          ))}
        </div>
      </section>
    );
  }

  const { items, settings } = state;
  if (state.status !== "ready" || !settings?.homepageGalleryEnabled || items.length === 0) return null;

  return (
    <section
      className="w-full mb-4 sm:mb-6 rounded-2xl border border-[#F3D2CF] bg-[#FFF8F3] p-3 md:p-4 select-none"
      data-testid="home-gallery-preview"
    >
      <div className="flex items-center justify-between gap-3 mb-2.5 md:mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Images size={22} strokeWidth={1.8} className="md:hidden shrink-0 text-[#1A1A1A]" />
          <Camera size={22} strokeWidth={2} className="hidden md:block shrink-0 text-[#1A1A1A]" />
          <div className="min-w-0">
            <h2 className="text-[14px] md:text-[17px] font-bold text-[#1A1A1A] leading-tight truncate">
              <span className="hidden md:inline">Gallery – </span>
              {settings.homepageTitle}
            </h2>
            {settings.homepageSubtitle && (
              <p className="md:hidden text-[11px] text-slate-500 font-medium truncate">{settings.homepageSubtitle}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/gallery")}
          data-testid="home-gallery-view-all"
          className="shrink-0 text-xs md:text-sm font-bold text-[#1A1A1A] hover:text-[#C81017] flex items-center gap-1 cursor-pointer transition-colors border-0 bg-transparent p-0"
        >
          <span>View All</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar md:grid md:grid-cols-5 md:gap-3 md:overflow-visible">
        {items.map((g) => (
          <Link
            key={g._id}
            to={`/gallery/${g.slug}`}
            data-testid="home-gallery-card"
            title={g.title}
            className="group relative w-[31%] md:w-auto shrink-0 rounded-lg md:rounded-xl overflow-hidden no-underline"
          >
            <GalleryImage
              src={g.coverImage}
              alt={g.title}
              width={360}
              className="aspect-[16/10] w-full"
              imgClassName="group-hover:scale-105 transition-transform duration-500"
            />
            <span className="sr-only">{g.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default React.memo(GalleryPreviewSection);
