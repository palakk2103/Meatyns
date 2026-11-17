import React from "react";

/**
 * "Click it and Get it!" ribbon shown under the Meatyns chef mascot.
 * Positions itself at the bottom-centre of the nearest positioned parent.
 * size: "sm" (tiny mascots, two lines) | "md" (default) | "lg" (hero mascots)
 */
const SIZES = {
  sm: "text-[6.5px] leading-[8px] px-1.5 py-[2px]",
  md: "text-[9px] leading-3 px-2.5 py-[3px]",
  lg: "text-[11px] sm:text-xs leading-4 px-3 py-1",
};

const MascotTagline = ({ size = "md", below = false, className = "" }) => (
  <span
    className={`absolute ${below ? "top-full mt-1" : "bottom-0"} left-1/2 -translate-x-1/2 z-20 pointer-events-none rounded-full bg-[#C81017] text-white font-bold uppercase tracking-wide text-center shadow-md ring-1 ring-white/70 ${
      "whitespace-nowrap"
    } ${SIZES[size] || SIZES.md} ${className}`}
  >
    {size === "sm" ? (
      <>
        Click it and
        <br />
        Get it!
      </>
    ) : (
      "Click it and Get it!"
    )}
  </span>
);

export default MascotTagline;
