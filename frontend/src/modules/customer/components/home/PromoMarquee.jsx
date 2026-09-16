import React from "react";
import { MARQUEE_MESSAGES } from "../../constants/homeConstants";

const PromoMarquee = () => {
  return (
    <div className="w-full -mt-[2px] md:-mt-[2px] mb-1 sm:mb-2">
      <div
        className="relative overflow-hidden border-y shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
        style={{ background: "#7A1F2B", borderColor: "#5c1520" }}
      >
        {/* Edge fade — left */}
        <div
          className="absolute inset-y-0 left-0 w-12 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, #7A1F2B, transparent)" }}
        />
        {/* Edge fade — right */}
        <div
          className="absolute inset-y-0 right-0 w-12 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, #7A1F2B, transparent)" }}
        />

        <div className="classic-marquee-track flex w-max items-center gap-5 px-3 py-[7px] md:px-6 md:py-2.5">
          {[...MARQUEE_MESSAGES, ...MARQUEE_MESSAGES].map((message, idx) => (
            <React.Fragment key={`${message}-${idx}`}>
              <span
                className="whitespace-nowrap text-[11px] md:text-[13px] font-bold tracking-wide"
                style={{ color: "#FFF9F4" }}
              >
                {message}
              </span>
              <span
                className="text-[10px] md:text-[12px] font-black"
                style={{ color: "#E5A83B" }}
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
