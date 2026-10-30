import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

/**
 * Local-disk image storage (replacement for Cloudinary as the destination of NEW uploads).
 *
 * - File type is detected from the file's magic bytes; the client MIME type / filename is never trusted.
 * - Filenames are generated server-side, so there is no client-controlled path component.
 * - The original bytes are stored untouched (no re-encoding => no quality loss).
 * - Returns an absolute public URL, so existing Cloudinary URLs and new URLs coexist in the DB
 *   and the frontend renders both without changes.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
export const UPLOADS_URL_PREFIX = "/uploads";

export const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "png", "webp", "gif", "pdf"]);

// Callers pass free-form folder names (e.g. "delivery/profiles"); map them to a fixed whitelist.
const FOLDER_MAP = {
  products: "products",
  categories: "categories",
  subcategories: "subcategories",
  banners: "banners",
  users: "users",
  "delivery/profiles": "users",
  vendors: "vendors",
  brands: "brands",
  offers: "offers",
  settings: "settings",
  docs: "docs",
  "delivery/documents": "kyc",
};

// KYC documents (seller docs, delivery Aadhaar/PAN/DL) live in docs/ and kyc/. Filenames are
// random UUIDs, so URLs are unguessable, but they are still publicly fetchable by URL.

export function getUploadsDir() {
  const configured = String(process.env.UPLOADS_DIR || "").trim();
  return path.resolve(configured || DEFAULT_UPLOADS_DIR);
}

function getMaxBytes() {
  const raw = parseInt(process.env.MEDIA_MAX_FILE_SIZE || "10485760", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10485760;
}

export function getPublicBaseUrl() {
  const configured = String(
    process.env.UPLOADS_PUBLIC_BASE_URL || process.env.API_PUBLIC_URL || "",
  ).trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `http://localhost:${process.env.PORT || 7000}`;
}

/** Detects the real file type from magic bytes (images + PDF). SVG and everything else is rejected. */
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png" };
  }
  const head6 = buffer.subarray(0, 6).toString("latin1");
  if (head6 === "GIF87a" || head6 === "GIF89a") return { ext: "gif", mime: "image/gif" };
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { ext: "pdf", mime: "application/pdf" };
  }
  return null;
}

export function isLocalStorageEnabled() {
  return String(process.env.STORAGE_PROVIDER || "cloudinary").trim().toLowerCase() === "local";
}

/** True when local provider is on and the bytes are a supported image or PDF. */
export function shouldStoreLocally(buffer) {
  if (!isLocalStorageEnabled()) return false;
  return detectImageType(buffer) !== null;
}

function resolveSubdir(folder) {
  const key = String(folder || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return FOLDER_MAP[key] || "other";
}

function uploadError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Persists an image buffer to disk and returns its public URL.
 * Written to a temp file first and renamed, so a crash/ENOSPC never leaves a truncated image.
 */
export async function saveImageToLocal(buffer, folder = "other") {
  const detected = detectImageType(buffer);
  if (!detected) throw uploadError("Unsupported or corrupt file. Allowed: JPEG, PNG, WebP, GIF, PDF", 400);

  const max = getMaxBytes();
  if (buffer.length > max) {
    throw uploadError(`File too large. Maximum allowed is ${max} bytes`, 413);
  }

  const subdir = resolveSubdir(folder);
  const now = new Date();
  const datePart = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const fileName = `${now.getTime()}-${crypto.randomUUID()}.${detected.ext}`;

  const root = getUploadsDir();
  const targetDir = path.join(root, subdir, datePart);
  const targetPath = path.join(targetDir, fileName);
  // Defence in depth: the resolved target must stay inside the uploads root.
  if (!targetPath.startsWith(root + path.sep)) throw uploadError("Invalid upload path", 400);

  const tmpPath = `${targetPath}.part`;
  try {
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(tmpPath, buffer, { flag: "wx", mode: 0o644 });
    await fs.promises.rename(tmpPath, targetPath);
  } catch (err) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    logger.error("Local image write failed", { code: err.code, message: err.message });
    if (err.code === "ENOSPC") throw uploadError("Server storage is full. Please try again later", 507);
    throw uploadError("Failed to store image on server", 500);
  }

  return `${getPublicBaseUrl()}${UPLOADS_URL_PREFIX}/${subdir}/${datePart}/${fileName}`;
}

/**
 * Maps a stored URL back to a file inside the uploads root, or null if the URL is not
 * one of ours (e.g. a Cloudinary URL) or tries to escape the root.
 */
function resolveLocalFileFromUrl(url) {
  if (typeof url !== "string") return null;
  let pathname;
  try {
    pathname = new URL(url, "http://placeholder.invalid").pathname;
  } catch {
    return null;
  }
  if (url.startsWith("http") && !url.startsWith(getPublicBaseUrl())) return null;
  if (!pathname.startsWith(`${UPLOADS_URL_PREFIX}/`)) return null;

  const rel = decodeURIComponent(pathname.slice(UPLOADS_URL_PREFIX.length + 1));
  const root = getUploadsDir();
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) return null;
  if (!ALLOWED_IMAGE_EXTENSIONS.has(path.extname(abs).slice(1).toLowerCase())) return null;
  return abs;
}

/** Best-effort delete of a locally stored image. Never touches Cloudinary URLs. Never throws. */
export async function deleteLocalImageByUrl(url) {
  const abs = resolveLocalFileFromUrl(url);
  if (!abs) return false;
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      logger.warn("Failed to delete local image", { code: err.code, message: err.message });
    }
    return false;
  }
}

export function ensureUploadsDir() {
  const dir = getUploadsDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Don't take the API down for deployments still on Cloudinary; saves will surface the error.
    logger.error("Could not create uploads directory", { dir, code: err.code, message: err.message });
  }
  return dir;
}
