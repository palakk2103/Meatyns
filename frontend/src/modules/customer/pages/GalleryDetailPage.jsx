import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera, ChevronLeft, Images, MapPin, Store } from "lucide-react";
import { customerApi } from "../services/customerApi";
import GalleryLightbox from "../components/gallery/GalleryLightbox";
import GalleryImage from "../components/gallery/GalleryImage";
import GalleryBackdrop from "../components/gallery/GalleryBackdrop";
import { formatGalleryDate, formatGalleryLocation } from "../components/gallery/galleryFormat";

const pillCls =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white font-semibold text-[#1A1A1A] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.15)]";

/** Same treatment as the Gallery page title: last word in brand red. */
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

const GalleryDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  // `loaded.slug !== slug` means the current slug is still loading.
  const [loaded, setLoaded] = useState({ slug: null, status: "loading", gallery: null });
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    let alive = true;
    customerApi
      .getGalleryDetail(slug)
      .then((res) => {
        if (!alive) return;
        const result = res?.data?.result || null;
        setLoaded({ slug, status: result ? "ready" : "notfound", gallery: result });
      })
      .catch((err) => {
        if (alive) setLoaded({ slug, status: err?.response?.status === 404 ? "notfound" : "error", gallery: null });
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const status = loaded.slug === slug ? loaded.status : "loading";
  const gallery = loaded.slug === slug ? loaded.gallery : null;

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/gallery"));
  const location = formatGalleryLocation(gallery);
  const date = formatGalleryDate(gallery?.eventDate);
  const images = gallery?.images || [];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#FFF1EF] via-[#FFF8F6] to-[#FFF3F1] font-poppins"
      data-testid="gallery-detail-page"
    >
      <GalleryBackdrop />

      <div className="relative w-full max-w-[1400px] mx-auto px-3.5 sm:px-4 md:px-8 lg:px-[50px] pt-4 md:pt-6 pb-24 md:pb-12">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#1A1A1A] hover:text-[#C81017] mb-3 md:mb-5 -ml-1 bg-transparent border-0 cursor-pointer"
        >
          <ChevronLeft size={20} strokeWidth={2.4} /> Back to Gallery
        </button>

        {status === "loading" && (
          <div className="space-y-3 md:px-2" aria-hidden="true">
            <div className="h-8 w-2/3 rounded-lg bg-[#FDE2DF] animate-pulse" />
            <div className="h-4 w-1/3 rounded-lg bg-[#FDE2DF]/70 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 pt-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-white shadow-[0_4px_14px_-6px_rgba(0,0,0,0.15)] animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {(status === "notfound" || status === "error") && (
          <div className="text-center py-16" data-testid="gallery-detail-missing">
            <p className="text-sm font-bold text-slate-800">
              {status === "notfound" ? "This gallery is not available." : "We couldn't load this gallery right now."}
            </p>
            <Link
              to="/gallery"
              className="inline-block mt-4 px-6 py-2.5 rounded-full bg-[#D7141B] text-white text-xs font-bold shadow-[0_6px_14px_-4px_rgba(215,20,27,0.5)]"
            >
              Browse Gallery
            </Link>
          </div>
        )}

        {status === "ready" && gallery && (
          <section className="relative md:px-2">
            <header className="mb-5 md:mb-7 flex items-start gap-3 md:gap-5">
              <div className="shrink-0 h-11 w-11 md:h-16 md:w-16 rounded-2xl bg-[#FDE2DF] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(200,16,23,0.08)]">
                <Camera strokeWidth={2.2} className="w-6 h-6 md:w-8 md:h-8 text-[#D7141B]" />
              </div>
              <span className="hidden md:block self-stretch w-px bg-[#E9CFCB]" aria-hidden="true" />
              <div className="min-w-0 max-w-3xl">
                {gallery.category?.name && (
                  <Link
                    to={`/gallery?category=${gallery.category.slug}`}
                    className="inline-block px-3 py-1 rounded-full bg-[#D7141B] text-[10.5px] md:text-xs font-semibold uppercase tracking-wide text-white shadow-[0_6px_14px_-4px_rgba(215,20,27,0.5)] mb-2"
                  >
                    {gallery.category.name}
                  </Link>
                )}
                <h1
                  className="text-[20px] md:text-[34px] font-extrabold text-[#1A1A1A] leading-tight tracking-tight"
                  data-testid="gallery-detail-title"
                >
                  <TitleWithAccent text={gallery.title} />
                </h1>
                <span className="block h-[3px] w-16 md:w-24 rounded-full bg-[#F5B21B] mt-2 md:mt-3" aria-hidden="true" />
                <div className="flex flex-wrap gap-2 mt-3 md:mt-4 text-[11px] md:text-sm" data-testid="gallery-detail-meta">
                  {gallery.franchiseName && (
                    <span className={pillCls}>
                      <Store size={14} className="text-[#D7141B]" /> {gallery.franchiseName}
                    </span>
                  )}
                  {location && (
                    <span className={pillCls}>
                      <MapPin size={14} className="text-[#D7141B]" /> {location}
                    </span>
                  )}
                  {date && (
                    <span className={pillCls}>
                      <CalendarDays size={14} className="text-[#D7141B]" /> {date}
                    </span>
                  )}
                  <span className={pillCls}>
                    <Images size={14} className="text-[#D7141B]" /> {images.length} {images.length === 1 ? "photo" : "photos"}
                  </span>
                </div>
                {(gallery.description || gallery.shortDescription) && (
                  <p
                    className="mt-3 md:mt-4 text-[#4A4440] text-[12.5px] md:text-base font-medium leading-relaxed whitespace-pre-line"
                    data-testid="gallery-detail-description"
                  >
                    {gallery.description || gallery.shortDescription}
                  </p>
                )}
              </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6" data-testid="gallery-detail-images">
              {images.map((img, i) => (
                <button
                  key={img._id || img.url}
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  data-testid="gallery-detail-image"
                  aria-label={`Open image ${i + 1}${img.caption ? `: ${img.caption}` : ""}`}
                  className="group relative rounded-2xl overflow-hidden bg-white p-1.5 md:p-2 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_24px_-8px_rgba(215,20,27,0.35)] transition-shadow cursor-pointer border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7141B]"
                >
                  <div className="relative rounded-xl overflow-hidden">
                    <GalleryImage
                      src={img.url}
                      alt={img.altText || img.caption || gallery.title}
                      width={480}
                      eager={i < 4}
                      className="aspect-square w-full"
                      imgClassName="group-hover:scale-105 transition-transform duration-500"
                    />
                    {img.caption && (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-5 pb-1.5 text-left text-[10.5px] md:text-xs font-medium text-white line-clamp-1">
                        {img.caption}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {viewerIndex !== null && images.length > 0 && (
        <GalleryLightbox
          images={images}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          title={gallery?.title}
        />
      )}
    </div>
  );
};

export default GalleryDetailPage;
