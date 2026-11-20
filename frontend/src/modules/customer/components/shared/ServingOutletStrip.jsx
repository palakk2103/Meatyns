import React from "react";
import { Store, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServingOutlet, formatOutletDistance } from "../../hooks/useServingOutlet";

/**
 * Tells the customer which outlet the products they are viewing come from,
 * how far that outlet is from their delivery address, and the delivery ETA.
 * Renders nothing until the serving outlet is known.
 */
const ServingOutletStrip = ({ className = "", compact = false }) => {
  const outlet = useServingOutlet();
  if (!outlet) return null;

  const area = [outlet.locality, outlet.city].filter(Boolean).join(", ");
  const distance = formatOutletDistance(outlet.distanceKm);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-red-100 bg-white/90 text-slate-700",
        compact ? "px-3 py-2 text-[11px]" : "px-4 py-2.5 text-xs md:text-sm",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        <Store size={compact ? 14 : 16} className="shrink-0 text-[#C81017]" />
        <span className="text-slate-500 shrink-0">From</span>
        <span className="font-bold text-slate-900 truncate" title={area ? `${outlet.name}, ${area}` : outlet.name}>
          {outlet.name}
        </span>
        {area && !compact && <span className="text-slate-500 truncate hidden sm:inline">({area})</span>}
      </span>
      {distance && (
        <span className="flex items-center gap-1 shrink-0">
          <MapPin size={compact ? 13 : 15} className="text-slate-500" />
          <span className="font-semibold">{distance}</span>
          <span className="text-slate-500">from your address</span>
        </span>
      )}
      {outlet.etaLabel && (
        <span className="flex items-center gap-1 shrink-0">
          <Clock size={compact ? 13 : 15} className="text-slate-500" />
          <span className="text-slate-500">Delivery in</span>
          <span className="font-semibold">{outlet.etaLabel}</span>
        </span>
      )}
    </div>
  );
};

export default ServingOutletStrip;
