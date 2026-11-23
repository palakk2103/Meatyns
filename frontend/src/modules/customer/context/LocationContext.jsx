import { pickBestGeocodeResult } from "@/core/utils/geocodeResult";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { customerApi } from "../services/customerApi";
import { hasValidStoredAuthToken } from "@core/utils/authStorage";
import { getJSON, setJSON, STORAGE_KEYS } from "@core/utils/storage";
import { toast } from "sonner";

const LocationContext = createContext(undefined);
const STORAGE_KEY = STORAGE_KEYS.LOCATION;
// 30 days — refresh the cached coordinates if a user comes back to a stale tab
// after roughly a month so we don't keep serving locations from a previous
// address indefinitely.
const LOCATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Human-readable reason for a GeolocationPositionError.
const describeGeolocationError = (error) => {
  switch (error?.code) {
    case 1:
      return "Location permission is blocked. Allow location for this site from the address bar (lock icon) and try again.";
    case 2:
      return "Your device couldn't determine its location. Turn on location services on your device and try again.";
    case 3:
      return "Location request timed out. Please try again or set your address manually.";
    default:
      return error?.message || "Unable to fetch your location";
  }
};

// Fallback shown only until the real location is detected. It is never
// persisted, so it can't "stick" as if it were the user's address.
// Neutral placeholder: no city, address or coordinates. The UI gates on
// locationStatus and never prices/serves from this, so it must not point at
// any real place (it used to be an Indore address).
const DEFAULT_LOCATION = {
  name: "",
  time: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: true,
};

// Older builds persisted a hardcoded Indore address as if it were the user's
// location. Recognise (and discard) that exact legacy entry only.
const LEGACY_DEFAULT_COORDS = { latitude: 22.711140989838025, longitude: 75.9001552518043 };

// Older builds saved the default address to storage on first visit; treat
// such an entry as "no location" so it doesn't override real detection.
const isStoredDefault = (stored) =>
  Math.abs(Number(stored?.latitude) - LEGACY_DEFAULT_COORDS.latitude) < 1e-6 &&
  Math.abs(Number(stored?.longitude) - LEGACY_DEFAULT_COORDS.longitude) < 1e-6;

const readStoredLocation = () => {
  const stored = getJSON(STORAGE_KEY, null);
  const name = stored?.address || stored?.name;
  const lat = Number(stored?.latitude);
  const lng = Number(stored?.longitude);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (isStoredDefault(stored)) return null;
  return {
    name,
    time: stored.time || "",
    city: stored.city,
    state: stored.state,
    pincode: stored.pincode,
    latitude: lat,
    longitude: lng,
  };
};

// The native app may answer with {lat,lng}, {latitude,longitude}, numeric
// strings, or a JSON string. Returns {lat,lng} or null.
const parseNativeCoords = (data) => {
  let value = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.lon ?? value.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

// Re-detect when the app comes back to the foreground after this long.
const REDETECT_AFTER_MS = 10 * 60 * 1000;

export const LocationProvider = ({ children }) => {
  // Default location (used until we can resolve a better one)
  // Start from the persisted delivery location when there is one, so the very
  // first catalogue request resolves the correct serving seller instead of
  // briefly using the hardcoded default below.
  const [currentLocation, setCurrentLocation] = useState(
    () => readStoredLocation() || DEFAULT_LOCATION,
  );
  const lastDetectedAtRef = useRef(0);
  // "detecting" until the first live fix (or a stored/manual location) is
  // available, "ready" once we have a real location, "failed" when detection
  // failed and there is nothing real to fall back to. The catalogue must not
  // be priced from the hardcoded default, so the UI gates on this.
  const [locationStatus, setLocationStatus] = useState(() =>
    readStoredLocation() ? "ready" : "detecting",
  );
  // True once the customer picked a delivery location themselves in this
  // session; background re-detection must then not overwrite it.
  const manualSelectionRef = useRef(false);

  // Address list for drawer UI – will be hydrated from profile API.
  const [savedAddresses, setSavedAddresses] = useState([]);

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Update the current location.
  // By default this does NOT change saved addresses; only explicit
  // address actions should touch the saved list.
  const updateLocation = useCallback((
    newLoc,
    { persist = true, updateSavedHome = false, source = "manual" } = {},
  ) => {
    setCurrentLocation(newLoc);
    const hasCoords =
      Number.isFinite(Number(newLoc?.latitude)) &&
      Number.isFinite(Number(newLoc?.longitude));
    if (hasCoords && !newLoc?.isDefault) {
      setLocationStatus("ready");
      manualSelectionRef.current = source === "manual";
    }

    if (updateSavedHome) {
      setSavedAddresses((prev) =>
        prev.map((addr) =>
          addr.label === "Home" ? { ...addr, address: newLoc.name } : addr,
        ),
      );
    }

    if (persist) {
      const payload = {
        address: newLoc.name,
        city: newLoc.city,
        state: newLoc.state,
        pincode: newLoc.pincode,
        latitude: newLoc.latitude,
        longitude: newLoc.longitude,
        // Internal app properties
        time: newLoc.time,
      };
      setJSON(STORAGE_KEY, payload, { ttlMs: LOCATION_TTL_MS });
    }
  }, []);

  const addAddress = useCallback((newAddress) => {
    setSavedAddresses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: newAddress.label || "Other",
        address: newAddress.address,
        phone: newAddress.phone || "N/A",
        isCurrent: false,
      },
    ]);
  }, []);

  // Resolve location once using browser geolocation + Google Maps Geocoding.
  // Must be called directly from a user gesture (click/tap) for the browser to show the permission prompt.
  const fetchAndCacheLocation = useCallback((options = { autoDetect: false }) =>
    new Promise((resolve) => {
      const hasBrowserGeolocation =
        typeof window !== "undefined" &&
        "navigator" in window &&
        !!navigator.geolocation;
      if (typeof window === "undefined" || (!hasBrowserGeolocation && !window.Flutter)) {
        resolve({
          ok: false,
          error: "Geolocation is not supported on this device",
        });
        return;
      }

      let toastId = null;
      if (!options.autoDetect) {
        toastId = toast.loading("Detecting your location...", { position: "bottom-center" });
      }

      setIsFetchingLocation(true);
      setLocationError(null);

      const fallbackFromCoords = (latitude, longitude) => ({
        name: `Lat ${Number(latitude).toFixed(5)}, Lng ${Number(longitude).toFixed(5)}`,
        time: "",
        // Never inherit the previous/default (Indore) city, state or pincode:
        // the coordinates are the new location, so stale labels would be wrong.
        city: "",
        state: "",
        pincode: "",
        latitude,
        longitude,
      });

      const handleLocationSuccess = async (latitude, longitude) => {
        // A background fix that lands after the customer already picked a
        // delivery location must not replace their choice.
        if (options.autoDetect && manualSelectionRef.current) {
          setIsFetchingLocation(false);
          resolve({ ok: true, skipped: true });
          return;
        }
        try {
          // Always succeed with coordinates (needed for delivery fee calculation),
          // even if reverse geocoding fails (key missing / quota / restrictions).
          let liveLocation = fallbackFromCoords(latitude, longitude);

          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

          if (apiKey) {
            const params = new URLSearchParams({
              latlng: `${latitude},${longitude}`,
              key: apiKey,
            });

            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
            );

            if (response.ok) {
              const data = await response.json();
              if (data.status === "OK" && data.results && data.results.length > 0) {
                const best = pickBestGeocodeResult(data.results);
                const components = best.address_components || [];
                const getComponent = (types) =>
                  components.find((c) => types.every((t) => c.types.includes(t)))
                    ?.long_name;

                const premise = getComponent(["premise"]);
                const neighborhood = getComponent(["neighborhood"]);
                const sublocality = getComponent([
                  "sublocality_level_1",
                  "sublocality",
                ]);
                const locality =
                  getComponent(["locality"]) ||
                  getComponent(["administrative_area_level_2"]) ||
                  getComponent(["administrative_area_level_3"]);
                const state = getComponent(["administrative_area_level_1"]);
                const pincode = getComponent(["postal_code"]);
                const country = getComponent(["country"]);

                const displayParts = [];
                if (premise) displayParts.push(premise);
                if (neighborhood) displayParts.push(neighborhood);
                if (sublocality && sublocality !== neighborhood)
                  displayParts.push(sublocality);
                if (locality) displayParts.push(locality);

                let statePincode = "";
                if (state) statePincode += state;
                if (pincode) statePincode += (statePincode ? " " : "") + pincode;
                if (statePincode) displayParts.push(statePincode);

                if (country) displayParts.push(country);

                const friendlyName =
                  displayParts.join(", ") || best.formatted_address;

                liveLocation = {
                  name: friendlyName,
                  time: "",
                  city: locality || liveLocation.city,
                  state: state || liveLocation.state,
                  pincode: pincode || liveLocation.pincode,
                  latitude: latitude,
                  longitude: longitude,
                };
              } else {
                throw new Error(data.error_message || "Google Geocoding not available");
              }
            } else {
              throw new Error("Google Geocoding request failed");
            }
          }

          updateLocation(liveLocation, {
            persist: true,
            updateSavedHome: false,
            source: "gps",
          });
          
          if (toastId) {
            toast.success("Location fetched successfully", { id: toastId, position: "bottom-center" });
          }
          
          resolve({ ok: true, location: liveLocation });
        } catch (err) {
          // Fallback to OpenStreetMap Nominatim reverse geocoding
          let resolvedLocation = fallbackFromCoords(latitude, longitude);
          try {
            const osmRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { Accept: "application/json" } }
            );
            if (osmRes.ok) {
              const osmData = await osmRes.json();
              if (osmData && osmData.address) {
                const addr = osmData.address;
                const locality = addr.city || addr.town || addr.village || addr.suburb || addr.city_district;
                const state = addr.state;
                const pincode = addr.postcode;
                const nameParts = [
                  addr.suburb || addr.neighbourhood || addr.road,
                  locality,
                  state,
                  pincode,
                ].filter(Boolean);
                const friendlyName = nameParts.join(", ") || osmData.display_name;

                resolvedLocation = {
                  name: friendlyName,
                  time: "",
                  city: locality || resolvedLocation.city,
                  state: state || resolvedLocation.state,
                  pincode: pincode || resolvedLocation.pincode,
                  latitude: latitude,
                  longitude: longitude,
                };
              }
            }
          } catch {
            // Keep fallbackFromCoords
          }

          updateLocation(resolvedLocation, { persist: true, updateSavedHome: false, source: "gps" });
          
          if (toastId) {
             toast.success("Location fetched successfully", { id: toastId, position: "bottom-center" });
          }

          resolve({
            ok: true,
            location: resolvedLocation,
          });
        } finally {
          setIsFetchingLocation(false);
        }
      };

      const handleLocationError = (error) => {
        const message = typeof error === 'string' ? error : (error.message || "Location permission denied");
        setLocationError(message);
        setIsFetchingLocation(false);
        // Keep a stored/manual real location; only flag failure when all we
        // have is the hardcoded default.
        setLocationStatus((prev) => (prev === "ready" ? "ready" : "failed"));
        if (toastId) {
          toast.error(message, { id: toastId, position: "bottom-center" });
        } else if (!options.silent) {
          // Auto-detect failed (e.g. permission denied): tell the user why they
          // are still seeing the default area instead of silently showing it.
          toast.error(
            `Couldn't detect your location. ${message} Showing the default area for now.`,
            { position: "bottom-center", duration: 6000 },
          );
        }
        resolve({ ok: false, error: message });
      };

      // Standard Browser Geolocation.
      // Desktop browsers (no GPS) frequently time out or report
      // POSITION_UNAVAILABLE with enableHighAccuracy, so retry once with a
      // network-based, lower-accuracy fix before giving up.
      const useBrowserGeolocation = () => {
        if (!hasBrowserGeolocation) {
          handleLocationError("Geolocation is not supported on this device");
          return;
        }
        const onPosition = (position) =>
          handleLocationSuccess(position.coords.latitude, position.coords.longitude);

        navigator.geolocation.getCurrentPosition(
          onPosition,
          (error) => {
            if (error?.code === 1) {
              handleLocationError(describeGeolocationError(error));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              onPosition,
              (retryError) => handleLocationError(describeGeolocationError(retryError)),
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60 * 1000 },
        );
      };

      // Native app (Flutter WebView): ask the native side for GPS first; if it
      // returns nothing usable, fall back to the WebView's own geolocation
      // instead of leaving the user on the default area.
      if (window.Flutter) {
        import("../../../lib/appZetoBridge")
          .then((m) => m.default.getLocation())
          .then((data) => {
            const coords = parseNativeCoords(data);
            if (coords) handleLocationSuccess(coords.lat, coords.lng);
            else useBrowserGeolocation();
          })
          .catch(() => useBrowserGeolocation());
        return;
      }

      useBrowserGeolocation();
    }),
    [currentLocation?.city, currentLocation?.pincode, currentLocation?.state, updateLocation],
  );

  const refreshLocation = useCallback(() => {
    return fetchAndCacheLocation({ autoDetect: false });
  }, [fetchAndCacheLocation]);

  const refreshAddresses = useCallback(async () => {
    // Skip if user is not logged in – getProfile would 401 and trigger axios reload loop
    if (!hasValidStoredAuthToken("auth_customer")) return;
    try {
      const { data } = await customerApi.getProfile();
      const profile = data?.result ?? data?.data ?? data;
      const raw = Array.isArray(profile?.addresses) ? profile.addresses : [];
      setSavedAddresses(
        raw.map((addr, idx) => ({
          id: addr._id ?? String(idx),
          label:
            (addr.label || "Home").charAt(0).toUpperCase() +
            (addr.label || "home").slice(1),
          address:
            addr.fullAddress ||
            [addr.landmark, addr.city, addr.state, addr.pincode]
              .filter(Boolean)
              .join(", ") ||
            "",
          location:
            addr?.location &&
            typeof addr.location.lat === "number" &&
            typeof addr.location.lng === "number" &&
            Number.isFinite(addr.location.lat) &&
            Number.isFinite(addr.location.lng)
              ? { lat: addr.location.lat, lng: addr.location.lng }
              : null,
          placeId: typeof addr?.placeId === "string" ? addr.placeId : null,
          phone: profile?.phone ?? "",
          isCurrent: idx === 0,
        })),
      );
    } catch {
      // If API fails, keep existing in-memory addresses.
    }
  }, []);

  // On mount: hydrate saved addresses from profile (only when customer is logged in)
  useEffect(() => {
    refreshAddresses();
  }, [refreshAddresses]);

  // Auto-detect the live location as soon as the app opens, for everyone.
  // The stored/default location is only a placeholder until this resolves;
  // the default is never written to storage.
  useEffect(() => {
    fetchAndCacheLocation({ autoDetect: true }).then((res) => {
      if (res?.ok) lastDetectedAtRef.current = Date.now();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile app / PWA: the page often stays alive in the background, so also
  // re-detect when the user brings the app back to the foreground.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastDetectedAtRef.current < REDETECT_AFTER_MS) return;
      // The customer chose where to deliver; don't silently move them back
      // to their GPS position.
      if (manualSelectionRef.current) return;
      lastDetectedAtRef.current = Date.now();
      fetchAndCacheLocation({ autoDetect: true, silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchAndCacheLocation]);

  const hasRealLocation =
    !currentLocation?.isDefault &&
    Number.isFinite(Number(currentLocation?.latitude)) &&
    Number.isFinite(Number(currentLocation?.longitude));

  const locationValue = useMemo(() => ({
    currentLocation,
    locationStatus,
    hasRealLocation,
    savedAddresses,
    updateLocation,
    addAddress,
    refreshAddresses,
    isFetchingLocation,
    locationError,
    refreshLocation,
  }), [currentLocation, locationStatus, hasRealLocation, savedAddresses, updateLocation, addAddress, refreshAddresses, isFetchingLocation, locationError, refreshLocation]);

  return (
    <LocationContext.Provider value={locationValue}>
      {children}
    </LocationContext.Provider>
  );
};

// Text to show in headers for the delivery location. Never shows the
// hardcoded fallback address as if it were the user's real location.
export const getLocationLabel = (location) => {
  if (!location || location.isDefault || !location.name) {
    return "Select location";
  }
  return location.name;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
