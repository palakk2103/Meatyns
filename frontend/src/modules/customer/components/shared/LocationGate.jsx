import React, { useEffect, useState } from "react";
import { MapPin, MapPinOff, LocateFixed, Search, Loader2 } from "lucide-react";
import { useLocation as useAppLocation } from "../../context/LocationContext";
import { customerApi } from "../../services/customerApi";
import LocationDrawer from "./LocationDrawer";

/**
 * Asks the backend whether any outlet's delivery radius covers (lat, lng).
 * Returns true / false, or null while unknown. Fails open (null) on errors so
 * a network hiccup never blanks the whole app.
 */
const useLocationServiceable = (lat, lng, enabled) => {
  const [state, setState] = useState({ key: null, serviceable: null });
  const key = enabled ? `${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    customerApi
      .getLocationServiceability(Number(lat), Number(lng))
      .then((res) => {
        if (cancelled) return;
        const value = res?.data?.result?.serviceable;
        setState({ key, serviceable: typeof value === "boolean" ? value : null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, serviceable: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state.serviceable : null;
};

/**
 * Prices and stock come from the ONE outlet that serves the customer's
 * location. Until we know that location (live GPS, a stored/manual pick),
 * don't render the catalogue at all: otherwise it would be priced from the
 * hardcoded default area (Indore), which is how a Pune customer ended up
 * seeing another city's prices.
 */
const LocationGate = ({ children }) => {
  const {
    currentLocation,
    locationStatus,
    hasRealLocation,
    refreshLocation,
    isFetchingLocation,
    locationError,
  } = useAppLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const locationReady = hasRealLocation && locationStatus === "ready";
  const serviceable = useLocationServiceable(
    currentLocation?.latitude,
    currentLocation?.longitude,
    locationReady,
  );

  if (locationReady && serviceable !== false) return children;

  if (locationReady && serviceable === false) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <MapPinOff size={28} />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">We don't deliver here yet</h2>
          <p className="text-sm text-slate-500 mb-1">
            {currentLocation?.name || currentLocation?.address
              ? `${currentLocation?.name || currentLocation?.address} is outside our delivery area.`
              : "Your location is outside our delivery area."}{" "}
            Please choose an address near a Meatyns outlet.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-bold text-sm py-3"
            >
              <Search size={18} />
              Change delivery location
            </button>
            <button
              type="button"
              onClick={() => refreshLocation()}
              disabled={isFetchingLocation}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 text-slate-800 font-bold text-sm py-3 disabled:opacity-60"
            >
              <LocateFixed size={18} />
              Use my current location
            </button>
          </div>
        </div>
        <LocationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    );
  }

  const detecting = locationStatus === "detecting" || isFetchingLocation;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          {detecting ? <Loader2 size={28} className="animate-spin" /> : <MapPin size={28} />}
        </div>

        {detecting ? (
          <>
            <h2 className="text-lg font-black text-slate-900 mb-1">Detecting your location…</h2>
            <p className="text-sm text-slate-500">
              We show prices and products from the store nearest to you.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-black text-slate-900 mb-1">Set your delivery location</h2>
            <p className="text-sm text-slate-500 mb-1">
              We couldn't detect your location. Prices and products depend on the store that
              delivers to you.
            </p>
            {locationError && (
              <p className="text-xs text-slate-400 mb-1">{locationError}</p>
            )}
          </>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => refreshLocation()}
            disabled={isFetchingLocation}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-bold text-sm py-3 disabled:opacity-60"
          >
            <LocateFixed size={18} />
            Use my current location
          </button>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 text-slate-800 font-bold text-sm py-3"
          >
            <Search size={18} />
            Search delivery address
          </button>
        </div>
      </div>

      <LocationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

export default LocationGate;
