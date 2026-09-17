import React from "react";
import { ShieldCheck, Truck, Clock, Heart } from "lucide-react";

const TrustFeaturesBanner = () => {
  return (
    <div className="w-full mt-2 mb-6 sm:mb-8 select-none">
      <div className="bg-[#FAF3EE] rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 border border-[#F2E5DC] shadow-xs">
        <div className="flex items-center justify-between gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-0.5">
          {/* Feature 1: 100% Fresh & Natural */}
          <div className="flex items-center gap-3 sm:gap-3.5 justify-start md:justify-center shrink-0 md:shrink">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
              <ShieldCheck size={24} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                100% Fresh
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">
                &amp; Natural
              </span>
            </div>
          </div>

          {/* Feature 2: Hygienically Packed */}
          <div className="flex items-center gap-3 sm:gap-3.5 justify-start md:justify-center shrink-0 md:shrink">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
              <Truck size={24} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Hygienically
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">
                Packed
              </span>
            </div>
          </div>

          {/* Feature 3: Fast Delivery 15–30 mins */}
          <div className="flex items-center gap-3 sm:gap-3.5 justify-start md:justify-center shrink-0 md:shrink">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
              <Clock size={24} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Fast Delivery
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">
                15–30 mins
              </span>
            </div>
          </div>

          {/* Feature 4: Quality Assured */}
          <div className="flex items-center gap-3 sm:gap-3.5 justify-start md:justify-center shrink-0 md:shrink">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
              <Heart size={24} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Quality
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">
                Assured
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TrustFeaturesBanner);
