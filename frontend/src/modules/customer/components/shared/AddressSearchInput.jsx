import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "../../../../core/services/googleMapsLoader";
import { customerApi } from "../../services/customerApi";

const MIN_QUERY_LENGTH = 4;
const DEBOUNCE_MS = 450;
const MAX_SUGGESTIONS = 5;

const pincodeFrom = (text) => (String(text || "").match(/\b\d{6}\b/) || [])[0] || "";

// Google Places autocomplete, or null when Google isn't usable.
async function googlePredictions(query, bias, tokenRef) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    await loadGoogleMaps(apiKey);
  } catch {
    return null;
  }
  const places = window.google?.maps?.places;
  if (!places?.AutocompleteService) return null;
  if (!tokenRef.current && places.AutocompleteSessionToken) {
    tokenRef.current = new places.AutocompleteSessionToken();
  }
  const request = {
    input: query,
    types: ["geocode"],
    componentRestrictions: { country: "in" },
    sessionToken: tokenRef.current,
  };
  if (bias) {
    request.location = new window.google.maps.LatLng(bias.lat, bias.lng);
    request.radius = 30000;
  }
  return new Promise((resolve) => {
    new places.AutocompleteService().getPlacePredictions(request, (preds, status) => {
      if (status === places.PlacesServiceStatus.OK && Array.isArray(preds) && preds.length) {
        resolve(
          preds.slice(0, MAX_SUGGESTIONS).map((p) => ({
            key: p.place_id,
            placeId: p.place_id,
            main: p.structured_formatting?.main_text || p.description,
            secondary: p.structured_formatting?.secondary_text || "",
            description: p.description,
          })),
        );
      } else {
        resolve(null);
      }
    });
  });
}

// Coordinates of a Google prediction via the browser Places library (same
// path the location drawer uses). Null when unavailable.
function googlePlaceDetails(placeId, sessionToken) {
  const places = window.google?.maps?.places;
  if (!places?.PlacesService || !placeId) return Promise.resolve(null);
  return new Promise((resolve) => {
    new places.PlacesService(document.createElement("div")).getDetails(
      { placeId, fields: ["geometry", "formatted_address"], sessionToken },
      (place, status) => {
        const loc = place?.geometry?.location;
        if (status === places.PlacesServiceStatus.OK && loc) {
          resolve({ lat: loc.lat(), lng: loc.lng(), text: place.formatted_address || "" });
        } else {
          resolve(null);
        }
      },
    );
  });
}

async function backendGeocode(s) {
  try {
    const resp = s.placeId
      ? await customerApi.geocodePlaceId(s.placeId)
      : await customerApi.geocodeAddress(s.description);
    const loc = resp.data?.result?.location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
    return { lat: loc.lat, lng: loc.lng, text: resp.data?.result?.formattedAddress || "" };
  } catch {
    return null;
  }
}

async function osmGeocode(text) {
  const [first] = await osmPredictions(text);
  return first ? { lat: first.lat, lng: first.lng, text: "" } : null;
}

// OpenStreetMap fallback: results already carry coordinates.
async function osmPredictions(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&limit=${MAX_SUGGESTIONS}&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((r) => ({
      key: `osm-${r.place_id}`,
      main: String(r.display_name || "").split(",")[0],
      secondary: String(r.display_name || "").split(",").slice(1, 4).join(",").trim(),
      description: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      pincode: r.address?.postcode || "",
    }));
  } catch {
    return [];
  }
}

/**
 * Address field that resolves to real coordinates. The delivery coordinates
 * decide which outlet serves (and is notified about) an order, so a free-text
 * address is not enough.
 *
 * value:    { text, location: {lat,lng} | null }
 * onChange: ({ text, location, pincode? }) => void
 * bias:     optional {lat,lng} to rank nearby suggestions first
 */
const AddressSearchInput = ({ value, onChange, bias = null, placeholder }) => {
  const [query, setQuery] = useState(value?.text || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const tokenRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setQuery(value?.text || "");
  }, [value?.text]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }
    const id = ++requestRef.current;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const list = (await googlePredictions(q, bias, tokenRef)) || (await osmPredictions(q));
      if (id !== requestRef.current) return;
      setSuggestions(list);
      setIsSearching(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const handleType = (text) => {
    setQuery(text);
    setOpen(true);
    setError("");
    // Typing invalidates the previously picked point.
    onChange({ text, location: null });
  };

  const handlePick = async (s) => {
    setOpen(false);
    setSuggestions([]);
    setError("");
    if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
      onChange({ text: s.description, location: { lat: s.lat, lng: s.lng }, pincode: s.pincode || pincodeFrom(s.description) });
      return;
    }
    setIsResolving(true);
    try {
      const resolved =
        (await googlePlaceDetails(s.placeId, tokenRef.current)) ||
        (await backendGeocode(s)) ||
        (await osmGeocode(s.description));
      if (!resolved) throw new Error("no location");
      const text = resolved.text || s.description;
      onChange({ text, location: { lat: resolved.lat, lng: resolved.lng }, pincode: pincodeFrom(text) });
    } catch {
      setError("Couldn't locate this address. Please pick another suggestion.");
      onChange({ text: s.description, location: null });
    } finally {
      tokenRef.current = null;
      setIsResolving(false);
    }
  };

  const picked = Boolean(value?.location);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder || "Search delivery area / street*"}
        value={query}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(true)}
        className="h-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm pr-10"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        {isSearching || isResolving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : picked ? (
          <CheckCircle2 size={18} className="text-green-600" />
        ) : (
          <MapPin size={18} />
        )}
      </span>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex gap-2 items-start"
              >
                <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{s.main}</span>
                  {s.secondary && (
                    <span className="block text-xs text-slate-500 truncate">{s.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="mt-1 text-[11px] text-red-600 font-medium">{error}</p>
      ) : !picked && query.trim().length > 0 ? (
        <p className="mt-1 text-[11px] text-slate-500 font-medium">
          Pick your area from the suggestions so we can send the order to the nearest store.
        </p>
      ) : null}
    </div>
  );
};

export default AddressSearchInput;
