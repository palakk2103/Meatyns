import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { galleryImageUrl } from "./galleryFormat";

/**
 * Lazy image with a skeleton while loading and a branded fallback when the file is broken.
 * `showFull` never crops: the whole photo is fitted inside the frame over a blurred copy of itself.
 */
const GalleryImage = ({ src, alt = "", width = 480, className = "", imgClassName = "", eager = false, showFull = false }) => {
  const [state, setState] = useState(src ? "loading" : "error");
  return (
    <div className={cn("relative overflow-hidden bg-[#F3ECE1]", className)}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-[#EFE6D8]" />}
      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#B9A58C]" data-testid="gallery-image-fallback">
          <ImageOff size={22} />
          <span className="text-[10px] font-semibold">Image unavailable</span>
        </div>
      ) : (
        <>
        {showFull && state === "loaded" && (
          <img
            src={galleryImageUrl(src, width)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
          />
        )}
        <img
          src={galleryImageUrl(src, width)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "relative w-full h-full transition-opacity duration-300",
            showFull ? "object-contain" : "object-cover",
            state === "loaded" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
        </>
      )}
    </div>
  );
};

export default GalleryImage;
