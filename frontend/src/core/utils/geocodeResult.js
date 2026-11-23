/**
 * Google reverse-geocoding returns results ordered by specificity, and for a
 * dropped pin results[0] is frequently a plus-code / unnamed place
 * (e.g. "HPSBA-C407138, Manganwlar Peth ...") — useless to a rider.
 * Pick the most human-readable result instead.
 */
const PREFERRED_TYPES = [
  "street_address",
  "premise",
  "subpremise",
  "establishment",
  "point_of_interest",
  "route",
  "neighborhood",
  "sublocality_level_1",
  "sublocality",
];

// Matches plus codes ("8FVC9G8F+6X") and Google's short code style ("HPSBA-C407138").
const CODE_LIKE = /^[A-Z0-9]{4,8}[+-][A-Z0-9]{2,}\b/i;

export function isCodeLikeAddress(text) {
  return CODE_LIKE.test(String(text || "").trim());
}

export function pickBestGeocodeResult(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  const usable = results.filter(
    (r) =>
      r &&
      !(r.types || []).includes("plus_code") &&
      !isCodeLikeAddress(r.formatted_address),
  );
  for (const type of PREFERRED_TYPES) {
    const hit = usable.find((r) => (r.types || []).includes(type));
    if (hit) return hit;
  }
  return usable[0] || results[0];
}

/** Strip a leading plus-code/short-code token from an address string. */
export function stripLeadingCode(text) {
  const s = String(text || "").trim();
  if (!isCodeLikeAddress(s)) return s;
  return s.replace(/^[^,]*,\s*/, "").trim() || s;
}
