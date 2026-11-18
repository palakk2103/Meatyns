import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  CalendarDays,
  Camera,
  ChevronLeft,
  Handshake,
  Images,
  Loader2,
  RefreshCw,
  Star,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import GalleryCard, { GalleryCardSkeleton } from "../components/gallery/GalleryCard";
import GalleryBackdrop from "../components/gallery/GalleryBackdrop";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

/** Picks a chip icon from the category's slug/name (categories are admin-defined). */
const CATEGORY_ICONS = [
  [/memor|moment|highlight/, Star],
  [/open|launch|outlet|store/, Store],
  [/franchise|partner/, Handshake],
  [/event|program|celebrat/, CalendarDays],
  [/visit|guest|team|people/, Users],
  [/achiev|award|milestone/, Trophy],
  [/recogni|certif/, Award],
];
const categoryIcon = (c) => {
  const key = `${c.slug || ""} ${c.name || ""}`.toLowerCase();
  return CATEGORY_ICONS.find(([re]) => re.test(key))?.[1] || Images;
};

/** Renders the title with its last word in brand red ("Our Journey & <red>Moments</red>"). */
const TitleWithAccent = ({ text }) => {
  const words = String(text).trim().split(/\s+/);
  if (words.length < 2) return <span className="text-[#D7141B]">{text}</span>;
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <span className="text-[#D7141B]">{last}</span>
    </>
  );
};

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
        setCategories(Array.isArray(rows) ? rows.filter((c) => c.isActive !== false) : []);
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
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#FFF1EF] via-[#FFF8F6] to-[#FFF3F1] font-poppins"
      data-testid="gallery-page"
    >
      <GalleryBackdrop />

      <div className="relative w-full max-w-[1400px] mx-auto px-3.5 sm:px-4 md:px-8 lg:px-[50px] pt-4 md:pt-6 pb-24 md:pb-12">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#1A1A1A] hover:text-[#C81017] mb-3 md:mb-5 -ml-1 bg-transparent border-0 cursor-pointer"
        >
          <ChevronLeft size={20} strokeWidth={2.4} /> Back
        </button>
        <section className="relative md:px-2" data-testid="gallery-hero">
          {/* header */}
          <div className="relative flex items-start md:items-center justify-between gap-3 md:gap-6 mb-5 md:mb-7">
            <div className="flex items-start md:items-center gap-3 md:gap-5 min-w-0">
              <div className="shrink-0 h-11 w-11 md:h-16 md:w-16 rounded-2xl bg-[#FDE2DF] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(200,16,23,0.08)]">
                <Camera strokeWidth={2.2} className="w-6 h-6 md:w-8 md:h-8 text-[#D7141B]" />
              </div>
              <span className="hidden md:block self-stretch w-px bg-[#E9CFCB]" aria-hidden="true" />
              <div className="min-w-0">
                <h1 className="text-[20px] md:text-[34px] font-extrabold text-[#1A1A1A] leading-tight tracking-tight">
                  <TitleWithAccent text={settings?.pageTitle || "Our Journey & Moments"} />
                </h1>
                <p className="text-[#4A4440] text-[11.5px] md:text-base font-medium mt-1 md:mt-2 leading-snug max-w-[560px]">
                  {settings?.pageDescription ||
                    "Explore the journey, milestones, franchise openings, events and memorable moments of Meatyns."}
                </p>
                <span className="block h-[3px] w-16 md:w-24 rounded-full bg-[#F5B21B] mt-2 md:mt-3" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Dynamic category filters */}
          <div
            role="tablist"
            aria-label="Gallery categories"
            className="relative flex gap-2 md:gap-3 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible pb-3 mb-3 md:mb-5 -mx-1 px-1 pt-1"
          >
            {chips.map((c) => {
              const active = activeCategory === c.slug;
              const Icon = c.slug === "all" ? null : categoryIcon(c);
              return (
                <button
                  key={c._id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid="gallery-category-chip"
                  onClick={() => selectCategory(c.slug)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 md:gap-2 px-3.5 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer border",
                    active
                      ? "bg-[#D7141B] border-[#D7141B] text-white shadow-[0_6px_14px_-4px_rgba(215,20,27,0.5)]"
                      : "bg-white border-white text-[#1A1A1A] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.15)] hover:border-[#D7141B]/40 hover:text-[#D7141B]",
                  )}
                >
                  {Icon && <Icon size={16} strokeWidth={2} className="shrink-0" />}
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="relative">
        {status === "loading" && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6" data-testid="gallery-grid">
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-[1.5px] border-[#D7141B] bg-white text-xs md:text-sm font-bold text-[#1A1A1A] hover:bg-[#D7141B] hover:text-white transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GalleryPage;
