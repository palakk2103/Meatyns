import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import GalleryImage from "./GalleryImage";
import { formatGalleryDate, formatGalleryLocation } from "./galleryFormat";

/** Gallery page card: photo with date badge, red-accent title and location. */
const GalleryCard = ({ gallery }) => {
  const date = formatGalleryDate(gallery.eventDate);
  const location = formatGalleryLocation(gallery);
  return (
    <Link
      to={`/gallery/${gallery.slug}`}
      data-testid="gallery-card"
      data-category={gallery.category?.slug || ""}
      className="group bg-white rounded-2xl overflow-hidden ring-1 ring-black/[0.04] shadow-[0_6px_20px_-8px_rgba(0,0,0,0.18)] hover:shadow-[0_14px_30px_-10px_rgba(200,16,23,0.28)] hover:-translate-y-1 transition-all duration-300 flex flex-col no-underline"
    >
      <div className="relative">
        <GalleryImage
          src={gallery.coverImage}
          alt={gallery.title}
          width={560}
          className="aspect-[4/3] w-full"
          imgClassName="group-hover:scale-[1.06] transition-transform duration-700 ease-out"
        />
        {date && (
          <span className="absolute top-2 left-2 md:top-3 md:left-3 inline-flex items-center gap-1 md:gap-1.5 rounded-full bg-[#D7141B] px-2 py-1 md:px-2.5 text-[10px] md:text-xs font-bold text-white shadow-[0_4px_10px_rgba(215,20,27,0.35)]">
            <CalendarDays size={12} strokeWidth={2.4} className="shrink-0" /> {date}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2.5 md:px-4 md:py-3.5 flex flex-col gap-1.5 md:gap-2 flex-1">
        <div className="flex items-stretch gap-2">
          <span className="w-[3px] shrink-0 rounded-full bg-[#D7141B]" aria-hidden="true" />
          <h3 className="text-[12.5px] md:text-[15px] font-extrabold text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#C81017] transition-colors">
            {gallery.title}
          </h3>
        </div>
        {location && (
          <p className="flex items-center gap-1.5 text-[10.5px] md:text-xs text-slate-500 font-medium mt-auto truncate">
            <MapPin size={13} className="shrink-0 text-[#D7141B]/80" /> <span className="truncate">{location}</span>
          </p>
        )}
      </div>
    </Link>
  );
};

export const GalleryCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden ring-1 ring-black/[0.04]">
    <div className="aspect-[4/3] w-full animate-pulse bg-[#F3E2DE]" />
    <div className="p-3 space-y-2">
      <div className="h-3.5 w-4/5 rounded bg-[#F3E2DE] animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-[#F7EAE7] animate-pulse" />
    </div>
  </div>
);

export default React.memo(GalleryCard);
