import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Images, Loader2, RefreshCw } from "lucide-react";
import { customerApi } from "../services/customerApi";
import GalleryCard, { GalleryCardSkeleton } from "../components/gallery/GalleryCard";
import GalleryImage from "../components/gallery/GalleryImage";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

/**
 * Single dedicated Gallery page. Reached from the homepage "View All" and from
 * Profile → Gallery (both link to /gallery). Categories come from the backend.
 */
const GalleryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [collage, setCollage] = useState([]);

  useEffect(() => {
    customerApi.getGallerySettings().then((res) => setSettings(res?.data?.result || null)).catch(() => {});
    customerApi
      .getGalleryCategories()
      .then((res) => {
        const rows = res?.data?.results || res?.data?.result || [];
        setCategories(Array.isArray(rows) ? rows.filter((c) => c.galleryCount > 0) : []);
      })
      .catch(() => setCategories([]));
  }, [reloadKey]);

  const fetchPage = useCallback(
    async (nextPage) => {
      const params = { page: nextPage, limit: PAGE_SIZE };
      if (activeCategory !== "all") params.category = activeCategory;
      const res = await customerApi.getGalleries(params);
      const result = res?.data?.result || {};
      return { rows: Array.isArray(result.items) ? result.items : [], hasMore: Boolean(result.pagination?.hasMore) };
    },
    [activeCategory],
  );

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setItems([]);
    fetchPage(1)
      .then(({ rows, hasMore: more }) => {
        if (!alive) return;
        setItems(rows);
        setCollage((prev) => {
          if (prev.length) return prev;
          const covers = rows.map((g) => g.coverImage).filter(Boolean);
          return covers.length ? Array.from({ length: 6 }, (_, i) => covers[i % covers.length]) : [];
        });
        setHasMore(more);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [fetchPage, reloadKey]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const { rows, hasMore: more } = await fetchPage(page + 1);
      setItems((prev) => {
        const seen = new Set(prev.map((g) => g._id));
        return [...prev, ...rows.filter((g) => !seen.has(g._id))];
      });
      setHasMore(more);
      setPage((p) => p + 1);
    } catch {
      setHasMore(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const selectCategory = (slug) => {
    const next = new URLSearchParams(searchParams);
    if (slug === "all") next.delete("category");
    else next.set("category", slug);
    setSearchParams(next, { replace: true });
  };

  const chips = [{ _id: "all", slug: "all", name: "All" }, ...categories];

  return (
    <div className="min-h-screen bg-[#FFF9F4] md:bg-white font-poppins" data-testid="gallery-page">
      <div className="w-full max-w-[1400px] mx-auto px-3.5 sm:px-4 md:px-8 lg:px-[50px] pt-[112px] md:pt-[118px] pb-24 md:pb-12">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#1A1A1A] hover:text-[#C81017] mb-3 -ml-1"
        >
          <ChevronLeft size={20} strokeWidth={2.4} /> Back
        </button>
        {/* Hero banner: title over a faded collage of the latest gallery covers */}
        <div className="relative overflow-hidden rounded-2xl bg-[#FBEFEA] border border-[#F3D2CF] mb-4 md:mb-6 min-h-[118px] md:min-h-[180px]" data-testid="gallery-hero">
          {collage.length > 0 && (
            <div className="absolute inset-y-0 right-0 w-[72%] md:w-[60%] grid grid-cols-3 grid-rows-2 gap-1 opacity-70" aria-hidden="true">
              {collage.map((src, i) => (
                <GalleryImage key={src + i} src={src} width={320} eager className="w-full h-full" />
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFF6F1] via-[#FFF6F1]/90 to-[#FFF6F1]/10" aria-hidden="true" />
          <div className="relative p-4 md:p-8 max-w-[68%] md:max-w-[55%]">
            <h1 className="text-[22px] md:text-4xl font-bold text-[#1A1A1A] leading-tight">
              {settings?.pageTitle || "Our Journey & Moments"}
            </h1>
            <p className="text-[#3F3A36] text-xs md:text-base font-medium mt-1.5 md:mt-2 leading-snug">
              {settings?.pageDescription ||
                "Explore the journey, milestones, franchise openings, events and memorable moments of Meatyns."}
            </p>
          </div>
        </div>

        {/* Dynamic category filters */}
        <div
          role="tablist"
          aria-label="Gallery categories"
          className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 md:mb-6 -mx-1 px-1 pt-1"
        >
          {chips.map((c) => {
            const active = activeCategory === c.slug;
            return (
              <button
                key={c._id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid="gallery-category-chip"
                onClick={() => selectCategory(c.slug)}
                className={cn(
                  "shrink-0 px-3.5 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold border transition-all whitespace-nowrap",
                  active
                    ? "bg-[#C81017] border-[#C81017] text-white shadow-sm"
                    : "bg-white border-[#E8DFC8] text-[#1A1A1A] hover:border-[#C81017]/50 hover:text-[#C81017]",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <GalleryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center text-center py-16" data-testid="gallery-error">
            <p className="text-sm font-semibold text-slate-700">We couldn't load the gallery right now.</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold"
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="flex flex-col items-center text-center py-16" data-testid="gallery-empty">
            <div className="w-14 h-14 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-3">
              <Images size={26} className="text-[#B45309]" />
            </div>
            <p className="text-sm font-bold text-slate-800">No moments here yet</p>
            <p className="text-xs text-slate-500 mt-1">Check back soon for new photos.</p>
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5" data-testid="gallery-grid">
              {items.map((g) => (
                <GalleryCard key={g._id} gallery={g} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6 md:mt-8">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#E8DFC8] bg-white text-xs md:text-sm font-bold text-[#1A1A1A] hover:border-[#C81017]/50 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;
