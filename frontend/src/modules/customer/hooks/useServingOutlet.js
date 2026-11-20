import { useEffect, useState } from "react";
import { useLocation as useAppLocation } from "../context/LocationContext";
import { customerApi } from "../services/customerApi";

/**
 * The ONE outlet that serves the customer's current delivery location:
 * { id, name, locality, city, distanceKm, etaLabel, etaMinMinutes, etaMaxMinutes }
 * or null while unknown / not serviceable. Uses the same deduped + cached
 * `/products/serviceability` call as LocationGate, so it adds no extra request.
 */
export const useServingOutlet = () => {
  const { currentLocation, hasRealLocation, locationStatus } = useAppLocation();
  const lat = currentLocation?.latitude;
  const lng = currentLocation?.longitude;
  const enabled =
    hasRealLocation &&
    locationStatus === "ready" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));
  const key = enabled ? `${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}` : null;
  const [state, setState] = useState({ key: null, outlet: null });

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    customerApi
      .getLocationServiceability(Number(lat), Number(lng))
      .then((res) => {
        if (cancelled) return;
        setState({ key, outlet: res?.data?.result?.outlet || null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, outlet: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state.outlet : null;
};

/** "850 m" under 1 km, otherwise "2.4 km". */
export const formatOutletDistance = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n)) return "";
  if (n < 1) return `${Math.max(Math.round(n * 1000), 50)} m`;
  return `${n.toFixed(1)} km`;
};

export default useServingOutlet;
