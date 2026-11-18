import React from "react";
import { Camera } from "lucide-react";

export const FilmStrip = ({ className = "" }) => (
  <svg viewBox="0 0 320 90" className={className} aria-hidden="true" fill="none">
    <path d="M0 60 C 70 10, 140 95, 210 45 S 300 20, 320 30" stroke="currentColor" strokeWidth="26" strokeLinecap="round" />
    <path
      d="M0 60 C 70 10, 140 95, 210 45 S 300 20, 320 30"
      stroke="#fff"
      strokeWidth="14"
      strokeDasharray="10 9"
      opacity="0.85"
    />
  </svg>
);

export const Leaf = ({ className = "" }) => (
  <svg viewBox="0 0 40 60" className={className} aria-hidden="true">
    <path d="M20 2 C 38 18, 38 42, 20 58 C 2 42, 2 18, 20 2 Z" fill="#4E9A2E" />
    <path d="M20 6 C 30 20, 30 40, 20 56 C 10 40, 10 20, 20 6 Z" fill="#6DBB3F" opacity="0.7" />
    <path d="M20 8 L 20 56" stroke="#3B7A22" strokeWidth="1.4" />
  </svg>
);

/** Shared decorative background (blobs, film strip, leaves) for the gallery pages. */
const GalleryBackdrop = () => (
  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
    <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#FFD9D4] opacity-40 blur-3xl" />
    <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[#FFE3DE] opacity-50 blur-3xl" />
    <FilmStrip className="absolute top-6 right-[12%] w-60 md:w-[460px] text-[#C81017] opacity-[0.05] hidden sm:block" />
    <Camera className="absolute top-28 right-[20%] w-16 h-16 md:w-20 md:h-20 text-[#C81017] opacity-[0.05] hidden md:block" strokeWidth={1.2} />
    <Leaf className="absolute -top-1 -left-1 w-10 md:w-16 -rotate-[30deg]" />
    <Leaf className="absolute bottom-16 md:bottom-2 -left-2 w-12 md:w-20 rotate-[40deg] opacity-90 hidden sm:block" />
    <Leaf className="absolute bottom-16 md:bottom-2 -right-1 w-12 md:w-16 -rotate-[120deg] opacity-90" />
  </div>
);

export default GalleryBackdrop;
