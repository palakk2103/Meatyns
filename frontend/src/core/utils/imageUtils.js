const CLOUDINARY_REGEX = /res\.cloudinary\.com/i;
const CLOUDINARY_UPLOAD_SEGMENT_REGEX = /\/upload\/([^/]+)\//i;

/**
 * Device pixel ratio rounded for Cloudinary (1.0 – 3.0).
 * `dpr_auto` relies on Client Hints, which iOS Safari/Firefox never send and Chrome
 * only sends after an Accept-CH opt-in, so it silently resolves to 1x on most phones.
 */
function getDeviceDpr() {
  const ratio = typeof window !== "undefined" ? Number(window.devicePixelRatio) || 1 : 1;
  return Math.min(3, Math.max(1, Math.ceil(ratio))).toFixed(1);
}

/**
 * Replaces `dpr_auto` with the real DPR, and adds one to sized transforms that lack it,
 * so a `w_400` image is actually fetched at 800/1200px on retina screens.
 */
function withDeviceDpr(params) {
  const dpr = `dpr_${getDeviceDpr()}`;
  if (/(^|,)dpr_auto(,|$)/.test(params)) return params.replace("dpr_auto", dpr);
  if (/(^|,)dpr_/.test(params) || !/(^|,)[wh]_\d+/.test(params)) return params;
  return `${params},${dpr}`;
}

function insertCloudinaryTransform(url, params) {
  if (!url || typeof url !== "string") return url || "";

  // Return early for local assets, relative paths, or data URIs
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:") || !url.startsWith("http")) {
    return url;
  }

  if (!CLOUDINARY_REGEX.test(url)) return url;
  const match = url.match(CLOUDINARY_UPLOAD_SEGMENT_REGEX);
  if (!match) return url;

  const segmentAfterUpload = match[1] || "";
  const alreadyHasTransforms =
    segmentAfterUpload.includes(",") ||
    /^[a-z]{1,4}_[^/]+$/i.test(segmentAfterUpload);

  if (alreadyHasTransforms) return url;

  // Insert transform before the segment after `/upload/` (often `v123...`).
  return url.replace(CLOUDINARY_UPLOAD_SEGMENT_REGEX, `/upload/${params}/$1/`);
}

/**
 * Appends Cloudinary optimisation transforms to a URL.
 * Safe to call on any URL — non-Cloudinary URLs are returned unchanged.
 */
export function applyCloudinaryTransform(url, params = "f_auto,q_auto:good,w_400,dpr_auto") {
  return insertCloudinaryTransform(url, withDeviceDpr(params));
}

export function isCloudinaryUrl(url) {
  return !!url && CLOUDINARY_REGEX.test(url);
}

export function buildCloudinarySrcSet(
  url,
  entries,
  baseParams = "f_auto,q_auto,c_fill,g_auto",
) {
  if (!isCloudinaryUrl(url) || !Array.isArray(entries) || entries.length === 0)
    return undefined;

  return entries
    .map(({ w, h }) => {
      const params = [
        baseParams,
        typeof w === "number" ? `w_${w}` : null,
        typeof h === "number" ? `h_${h}` : null,
      ]
        .filter(Boolean)
        .join(",");

      // srcset `w` descriptors already let the browser pick for its DPR — no dpr_ here.
      const href = insertCloudinaryTransform(url, params) || url;
      const descriptor = typeof w === "number" ? `${w}w` : "";
      return descriptor ? `${href} ${descriptor}` : href;
    })
    .join(", ");
}
