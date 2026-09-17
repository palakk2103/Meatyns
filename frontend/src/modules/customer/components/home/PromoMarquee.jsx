import React from "react";
import { MARQUEE_MESSAGES } from "../../constants/homeConstants";

const PromoMarquee = () => {
  return (
    <div className="w-full -mt-0.5 mb-1">
      <div
        className="relative overflow-hidden border-y shadow-xs"
        style={{ background: "#1A1A1A", borderColor: "#262626" }}
      >
        {/* Edge fade — left */}
        <div
          className="absolute inset-y-0 left-0 w-10 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, #1A1A1A, transparent)" }}
        />
        {/* Edge fade — right */}
        <div
          className="absolute inset-y-0 right-0 w-10 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, #1A1A1A, transparent)" }}
        />

        <div className="classic-marquee-track flex w-max items-center gap-4 px-3 py-[3px] md:px-6 md:py-1.5">
          {[...MARQUEE_MESSAGES, ...MARQUEE_MESSAGES].map((message, idx) => (
            <React.Fragment key={`${message}-${idx}`}>
              <span
                className="whitespace-nowrap text-[10px] md:text-[12px] font-bold tracking-wide"
                style={{ color: "#FFF9F4" }}
              >
                {message}
              </span>
              <span
                className="text-[9px] md:text-[11px] font-black"
                style={{ color: "#FDCE04" }}
              >
                ✦
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PromoMarquee);
