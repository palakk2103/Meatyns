import { Zap, Truck, CalendarDays, Clock, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CheckoutDeliverySelector
 * 
 * Provides selection between:
 * 1. Express Delivery (dynamic ASAP ETA)
 * 2. Normal Delivery (1-2 hours)
 * 3. Scheduled Delivery (Future Date + 1-hour Time Slot)
 */
const CheckoutDeliverySelector = ({
  deliveryMethod = "NORMAL",
  onSelectDeliveryMethod,
  deliveryOptions = {},
  availableDates = [],
  selectedDate,
  onSelectDate,
  slots = [],
  selectedSlot = null,
  onSelectSlot,
  isLoadingSlots = false,
  error = null,
}) => {
  const express = deliveryOptions?.EXPRESS || {
    available: true,
    title: "Express Delivery",
    tagline: "Deliver as soon as possible",
    estimatedLabel: "15–30 mins",
  };

  const normal = deliveryOptions?.NORMAL || {
    available: true,
    title: "Normal Delivery",
    tagline: "Delivery within 1–2 hours",
    estimatedLabel: "1–2 hours",
  };

  const scheduled = deliveryOptions?.SCHEDULED || {
    available: true,
    title: "Schedule Delivery",
    tagline: "Choose date and time slot",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Delivery Option</span>
        </h2>
        {deliveryMethod === "SCHEDULED" && selectedSlot && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Check size={12} strokeWidth={3} />
            {selectedSlot.label}
          </span>
        )}
      </div>

      {/* 3 Main Delivery Method Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. EXPRESS DELIVERY */}
        <div
          onClick={() => {
            if (express.available) onSelectDeliveryMethod("EXPRESS");
          }}
          className={`relative p-4 rounded-2xl flex flex-col justify-between border transition-all cursor-pointer select-none ${
            deliveryMethod === "EXPRESS"
              ? "bg-[#FDCE04]/10 border-[#FDCE04] ring-2 ring-[#FDCE04] shadow-xs"
              : express.available
              ? "bg-white border-[#ede5df] hover:border-[#FDCE04]/60"
              : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  deliveryMethod === "EXPRESS"
                    ? "bg-[#FDCE04] text-[#1A1A1A]"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <Zap size={18} strokeWidth={2.4} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Express
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  Deliver ASAP
                </p>
              </div>
            </div>
            {deliveryMethod === "EXPRESS" && (
              <span className="w-5 h-5 rounded-full bg-[#FDCE04] flex items-center justify-center text-[#1A1A1A]">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              ⚡ {express.estimatedLabel || "20–30 mins"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Fastest</span>
          </div>

          {express.disabledReason && (
            <p className="text-[10px] text-red-600 mt-1.5 font-medium leading-tight">
              {express.disabledReason}
            </p>
          )}
        </div>

        {/* 2. NORMAL DELIVERY */}
        <div
          onClick={() => {
            if (normal.available) onSelectDeliveryMethod("NORMAL");
          }}
          className={`relative p-4 rounded-2xl flex flex-col justify-between border transition-all cursor-pointer select-none ${
            deliveryMethod === "NORMAL"
              ? "bg-[#FDCE04]/10 border-[#FDCE04] ring-2 ring-[#FDCE04] shadow-xs"
              : normal.available
              ? "bg-white border-[#ede5df] hover:border-[#FDCE04]/60"
              : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  deliveryMethod === "NORMAL"
                    ? "bg-[#FDCE04] text-[#1A1A1A]"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <Truck size={18} strokeWidth={2.4} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Normal
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  Standard priority
                </p>
              </div>
            </div>
            {deliveryMethod === "NORMAL" && (
              <span className="w-5 h-5 rounded-full bg-[#FDCE04] flex items-center justify-center text-[#1A1A1A]">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 flex items-center gap-1">
              <Clock size={11} /> 1–2 hours
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Standard</span>
          </div>
        </div>

        {/* 3. SCHEDULED DELIVERY */}
        <div
          onClick={() => {
            if (scheduled.available) onSelectDeliveryMethod("SCHEDULED");
          }}
          className={`relative p-4 rounded-2xl flex flex-col justify-between border transition-all cursor-pointer select-none ${
            deliveryMethod === "SCHEDULED"
              ? "bg-[#FDCE04]/10 border-[#FDCE04] ring-2 ring-[#FDCE04] shadow-xs"
              : scheduled.available
              ? "bg-white border-[#ede5df] hover:border-[#FDCE04]/60"
              : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  deliveryMethod === "SCHEDULED"
                    ? "bg-[#FDCE04] text-[#1A1A1A]"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <CalendarDays size={18} strokeWidth={2.4} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Schedule
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  Pick date & time
                </p>
              </div>
            </div>
            {deliveryMethod === "SCHEDULED" && (
              <span className="w-5 h-5 rounded-full bg-[#FDCE04] flex items-center justify-center text-[#1A1A1A]">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              📅 Future Slot
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Advance</span>
          </div>
        </div>
      </div>

      {/* SCHEDULED DELIVERY DATE & SLOT PICKER */}
      <AnimatePresence>
        {deliveryMethod === "SCHEDULED" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ede5df] shadow-xs space-y-4 mt-2">
              {/* Date Selection Header */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Select Date
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {availableDates.map((d) => {
                    const isSelected = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => onSelectDate(d.date)}
                        className={`px-3.5 py-2 rounded-xl text-left flex-shrink-0 transition-all border ${
                          isSelected
                            ? "bg-[#FDCE04] border-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
                            : "bg-slate-50 border-slate-200/80 text-slate-700 hover:border-[#FDCE04]"
                        }`}
                      >
                        <p className="text-xs font-bold leading-tight">{d.label}</p>
                        <p
                          className={`text-[10px] leading-tight mt-0.5 ${
                            isSelected ? "text-[#1A1A1A]/80 font-medium" : "text-slate-400"
                          }`}
                        >
                          {d.dayName}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slot Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Select Time Slot
                  </span>
                  {selectedSlot && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Slot duration: 1 hour
                    </span>
                  )}
                </div>

                {isLoadingSlots ? (
                  <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                    <div className="w-5 h-5 border-2 border-[#FDCE04] border-t-transparent rounded-full animate-spin" />
                    <span>Loading available slots...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-6 px-4 bg-amber-50/60 rounded-xl border border-amber-200/60 text-center">
                    <p className="text-xs text-amber-800 font-medium">
                      No delivery slots available for the selected date. Store may be closed.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.slotId === slot.slotId;
                      const isUnavailable = !slot.available;

                      return (
                        <button
                          key={slot.slotId}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => onSelectSlot(slot)}
                          className={`p-2.5 rounded-xl border text-center transition-all relative flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-[#FDCE04] border-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
                              : isUnavailable
                              ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200/80 text-slate-700 hover:border-[#FDCE04] cursor-pointer"
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">
                            {slot.label}
                          </span>
                          {slot.isFull && (
                            <span className="text-[9px] font-semibold text-red-600 mt-0.5">
                              Slot Full
                            </span>
                          )}
                          {slot.isPast && (
                            <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                              Passed
                            </span>
                          )}
                          {!isUnavailable && !isSelected && (
                            <span className="text-[9px] text-emerald-600 font-medium mt-0.5">
                              Available
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] text-[#1A1A1A] font-extrabold mt-0.5 flex items-center gap-0.5">
                              <Check size={10} strokeWidth={3} /> Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirmation Alert */}
              {selectedSlot && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <div>
                      <p className="font-bold">
                        Scheduled for {availableDates.find((d) => d.date === selectedDate)?.formattedDate || selectedDate}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Delivery window: {selectedSlot.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckoutDeliverySelector;
