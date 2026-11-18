import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, Images, MapPin, Store } from "lucide-react";
import { customerApi } from "../services/customerApi";
import GalleryLightbox from "../components/gallery/GalleryLightbox";
import GalleryImage from "../components/gallery/GalleryImage";
import { formatGalleryDate, formatGalleryLocation } from "../components/gallery/galleryFormat";

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
    <div className="min-h-screen bg-[#FFF9F4] md:bg-white font-poppins" data-testid="gallery-detail-page">
      <div className="w-full max-w-[1400px] mx-auto px-3.5 sm:px-4 md:px-8 lg:px-[50px] pt-[112px] md:pt-[118px] pb-24 md:pb-12">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#1A1A1A] hover:text-[#C81017] mb-3 -ml-1"
        >
          <ChevronLeft size={20} strokeWidth={2.4} /> Back to Gallery
        </button>

        {status === "loading" && (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-8 w-2/3 rounded bg-[#EFE6D8] animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-[#F3ECE1] animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 pt-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[#EFE6D8] animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {(status === "notfound" || status === "error") && (
          <div className="text-center py-16" data-testid="gallery-detail-missing">
            <p className="text-sm font-bold text-slate-800">
              {status === "notfound" ? "This gallery is not available." : "We couldn't load this gallery right now."}
            </p>
            <Link to="/gallery" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold">
              Browse Gallery
            </Link>
          </div>
        )}

        {status === "ready" && gallery && (
          <>
            <header className="mb-5 md:mb-8 max-w-3xl">
              {gallery.category?.name && (
                <Link
                  to={`/gallery?category=${gallery.category.slug}`}
                  className="inline-block px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[10.5px] md:text-xs font-bold uppercase tracking-wide text-[#C81017] mb-2"
                >
                  {gallery.category.name}
                </Link>
              )}
              <h1 className="text-2xl md:text-4xl font-normal font-anton tracking-wide text-slate-900 uppercase leading-tight" data-testid="gallery-detail-title">
                {gallery.title}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-xs md:text-sm text-[#7A6A60]" data-testid="gallery-detail-meta">
                {gallery.franchiseName && (
                  <span className="flex items-center gap-1.5 font-semibold text-[#B45309]">
                    <Store size={14} /> {gallery.franchiseName}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} /> {location}
                  </span>
                )}
                {date && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} /> {date}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Images size={14} /> {images.length} photos
                </span>
              </div>
              {(gallery.description || gallery.shortDescription) && (
                <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed whitespace-pre-line" data-testid="gallery-detail-description">
                  {gallery.description || gallery.shortDescription}
                </p>
              )}
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4" data-testid="gallery-detail-images">
              {images.map((img, i) => (
                <button
                  key={img._id || img.url}
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  data-testid="gallery-detail-image"
                  aria-label={`Open image ${i + 1}${img.caption ? `: ${img.caption}` : ""}`}
                  className="group relative rounded-xl overflow-hidden border border-[#EBE3D5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C81017]"
                >
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
                </button>
              ))}
            </div>
          </>
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
