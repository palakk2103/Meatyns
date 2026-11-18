import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import GalleryImage from "./GalleryImage";
import { formatGalleryDate } from "./galleryFormat";

/** Gallery page card: photo, bold title, event date. Full details live on the detail page. */
const GalleryCard = ({ gallery }) => {
  const date = formatGalleryDate(gallery.eventDate);
  return (
    <Link
      to={`/gallery/${gallery.slug}`}
      data-testid="gallery-card"
      data-category={gallery.category?.slug || ""}
      className="group bg-white rounded-xl overflow-hidden border border-[#EFE6DA] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.09)] transition-shadow duration-300 flex flex-col no-underline"
    >
      <GalleryImage
        src={gallery.coverImage}
        alt={gallery.title}
        width={520}
        className="aspect-[4/3] w-full"
        imgClassName="group-hover:scale-[1.04] transition-transform duration-500"
      />
      <div className="px-2.5 py-2 md:px-3.5 md:py-3 flex flex-col gap-1 flex-1">
        <h3 className="text-[12.5px] md:text-[15px] font-bold text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#C81017] transition-colors">
          {gallery.title}
        </h3>
        {date && (
          <p className="flex items-center gap-1.5 text-[11px] md:text-xs text-slate-500 font-medium mt-auto">
            <CalendarDays size={13} className="shrink-0" /> {date}
          </p>
        )}
      </div>
    </Link>
  );
};

export const GalleryCardSkeleton = () => (
  <div className="bg-white rounded-xl overflow-hidden border border-[#EFE6DA]">
    <div className="aspect-[4/3] w-full animate-pulse bg-[#EFE6D8]" />
    <div className="p-3 space-y-2">
      <div className="h-3.5 w-4/5 rounded bg-[#EFE6D8] animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-[#F3ECE1] animate-pulse" />
    </div>
  </div>
);

export default React.memo(GalleryCard);
