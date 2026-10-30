/**
 * Client-side image downscaling utility using HTML5 Canvas.
 *
 * Only shrinks images that are genuinely oversized (dimensions or bytes); images
 * that are already reasonable are uploaded untouched so no generation loss occurs.
 * Cloudinary handles delivery-time optimisation (f_auto/q_auto), so we keep the
 * stored master copy high quality and preserve PNG/WebP transparency.
 * Returns a new File object (or the original if compression is unnecessary or fails).
 */
const PASSTHROUGH_TYPES = ["image/svg+xml", "image/gif"];
const ALPHA_TYPES = ["image/png", "image/webp"];
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;

export const compressImage = (file, maxWidth = 2000, maxHeight = 2000, quality = 0.92) => {
  if (!file || !file.type.startsWith("image/") || PASSTHROUGH_TYPES.includes(file.type)) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const needsResize = width > maxWidth || height > maxHeight;

        // Small enough already: re-encoding would only lose quality.
        if (!needsResize && file.size <= SKIP_BELOW_BYTES) {
          resolve(file);
          return;
        }

        // Clamp dimensions while keeping aspect ratio
        if (needsResize) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG/WebP in their own format so transparent backgrounds survive.
        const outputType = ALPHA_TYPES.includes(file.type) ? file.type : "image/jpeg";

        canvas.toBlob(
          (blob) => {
            // Fallback to original if encoding failed or didn't actually help
            if (!blob || (!needsResize && blob.size >= file.size)) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: blob.type || outputType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
