import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

/** Sized URL for Cloudinary assets; non-Cloudinary URLs are returned unchanged. */
export const galleryImageUrl = (url, width = 480) =>
  applyCloudinaryTransform(url, `f_auto,q_auto:best,c_limit,w_${width},dpr_auto`);

export const formatGalleryDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const formatGalleryLocation = (g) =>
  [g?.location, g?.city, g?.state].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
