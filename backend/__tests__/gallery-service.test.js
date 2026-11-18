import { normalizeImages, toCard, isObjectId, escapeRegex } from "../app/services/galleryService.js";
import {
  createGallerySchema,
  updateGallerySchema,
  gallerySettingsSchema,
  createCategorySchema,
} from "../app/validation/galleryValidation.js";

const opts = { abortEarly: false, stripUnknown: true };
const CAT = "0123456789abcdef01234567";

describe("galleryService.normalizeImages", () => {
  test("dedupes by url, renumbers order and keeps a valid cover", () => {
    const { images, coverImage } = normalizeImages(
      [{ url: "/uploads/gallery/a.png" }, { url: "/uploads/gallery/b.png", caption: "B" }, { url: "/uploads/gallery/a.png" }],
      "/uploads/gallery/b.png",
    );
    expect(images.map((i) => i.url)).toEqual(["/uploads/gallery/a.png", "/uploads/gallery/b.png"]);
    expect(images.map((i) => i.order)).toEqual([0, 1]);
    expect(images[1].caption).toBe("B");
    expect(coverImage).toBe("/uploads/gallery/b.png");
  });

  test("falls back to the first image when cover is not part of the gallery", () => {
    const { coverImage } = normalizeImages([{ url: "https://x/1.png" }], "https://evil/other.png");
    expect(coverImage).toBe("https://x/1.png");
  });

  test("empty gallery has no cover", () => {
    expect(normalizeImages([], "")).toEqual({ images: [], coverImage: "" });
  });
});

describe("galleryService.toCard", () => {
  test("strips image list and exposes count + cover fallback", () => {
    const card = toCard({ _id: "1", title: "T", images: [{ url: "u1" }, { url: "u2" }], coverImage: "" });
    expect(card).not.toHaveProperty("images");
    expect(card.imageCount).toBe(2);
    expect(card.coverImage).toBe("u1");
  });
});

describe("helpers", () => {
  test("isObjectId / escapeRegex", () => {
    expect(isObjectId(CAT)).toBe(true);
    expect(isObjectId("not-an-id")).toBe(false);
    expect(isObjectId({ $ne: null })).toBe(false);
    expect(new RegExp(escapeRegex("a.b*(c)")).test("a.b*(c)")).toBe(true);
  });
});

describe("gallery validation", () => {
  test("create requires title and category", () => {
    expect(createGallerySchema.validate({}, opts).error).toBeTruthy();
    const { error, value } = createGallerySchema.validate(
      { title: "  Pune Opening ", category: CAT, eventDate: "2026-05-04", hacker: true },
      opts,
    );
    expect(error).toBeUndefined();
    expect(value.title).toBe("Pune Opening");
    expect(value).not.toHaveProperty("hacker");
    expect(value.eventDate).toBeInstanceOf(Date);
  });

  test("rejects unsafe image URLs and bad slugs", () => {
    const bad = [
      { images: [{ url: "javascript:alert(1)" }] },
      { images: [{ url: "data:image/png;base64,xx" }] },
      { coverImage: "file:///etc/passwd" },
      { slug: "Bad Slug!" },
      { category: { $gt: "" } },
    ];
    for (const body of bad) expect(updateGallerySchema.validate(body, opts).error).toBeTruthy();
    expect(updateGallerySchema.validate({ images: [{ url: "/uploads/gallery/x.png" }] }, opts).error).toBeUndefined();
  });

  test("settings limit is bounded and categories need a name", () => {
    expect(gallerySettingsSchema.validate({ homepageItemLimit: 0 }, opts).error).toBeTruthy();
    expect(gallerySettingsSchema.validate({ homepageItemLimit: 13 }, opts).error).toBeTruthy();
    expect(gallerySettingsSchema.validate({ homepageItemLimit: 4 }, opts).error).toBeUndefined();
    expect(createCategorySchema.validate({ description: "x" }, opts).error).toBeTruthy();
  });
});
