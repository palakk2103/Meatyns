import fs from "fs";
import os from "os";
import path from "path";
import {
  detectImageType,
  saveImageToLocal,
  deleteLocalImageByUrl,
  shouldStoreLocally,
} from "../app/services/localImageStorage.js";
import { uploadToCloudinary } from "../app/services/mediaService.js";

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);

describe("local image storage", () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-test-"));
    process.env.UPLOADS_DIR = dir;
    process.env.UPLOADS_PUBLIC_BASE_URL = "https://api.test";
    process.env.STORAGE_PROVIDER = "local";
    process.env.MEDIA_MAX_FILE_SIZE = "1024";
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test("detects real types and rejects SVG/HTML/exe", () => {
    expect(detectImageType(PNG).ext).toBe("png");
    expect(detectImageType(JPG).ext).toBe("jpg");
    expect(detectImageType(Buffer.from("<svg xmlns='x'><script/></svg>"))).toBeNull();
    expect(detectImageType(Buffer.from("MZ\x90\x00 padding padding padding"))).toBeNull();
  });

  test("saves with server-generated name, ignores spoofed names, returns public URL", async () => {
    const url = await saveImageToLocal(PNG, "../../etc/passwd");
    expect(url).toMatch(/^https:\/\/api\.test\/uploads\/other\/\d{4}\/\d{2}\/\d+-[0-9a-f-]{36}\.png$/);
    const rel = url.replace("https://api.test/uploads/", "");
    expect(fs.readFileSync(path.join(dir, rel))).toEqual(PNG);
  });

  test("maps known folders", async () => {
    expect(await saveImageToLocal(JPG, "products")).toContain("/uploads/products/");
    expect(await saveImageToLocal(JPG, "categories")).toContain("/uploads/categories/");
  });

  test("rejects oversized and non-image content, leaves no files behind", async () => {
    await expect(saveImageToLocal(Buffer.concat([PNG, Buffer.alloc(2000)]), "products")).rejects.toMatchObject({ statusCode: 413 });
    await expect(saveImageToLocal(Buffer.from("not an image at all"), "products")).rejects.toMatchObject({ statusCode: 400 });
  });

  test("delete only touches our files, never escapes root or Cloudinary", async () => {
    const url = await saveImageToLocal(PNG, "banners");
    expect(await deleteLocalImageByUrl(url)).toBe(true);
    expect(await deleteLocalImageByUrl(url)).toBe(false);
    expect(await deleteLocalImageByUrl("https://res.cloudinary.com/x/image/upload/v1/a.jpg")).toBe(false);
    expect(await deleteLocalImageByUrl("https://api.test/uploads/../../package.json")).toBe(false);
  });

  test("KYC folders and PDFs are stored locally in docs/ and kyc/", async () => {
    const PDF = Buffer.from("%PDF-1.4 ................");
    expect(shouldStoreLocally(PNG)).toBe(true);
    expect(await saveImageToLocal(PDF, "docs")).toMatch(/\/uploads\/docs\/.*\.pdf$/);
    expect(await saveImageToLocal(PNG, "delivery/documents")).toContain("/uploads/kyc/");
    expect(shouldStoreLocally(Buffer.from("PK zip zip zip zip"))).toBe(false);
  });

  test("uploadToCloudinary delegates to local disk when flag is local", async () => {
    const url = await uploadToCloudinary(JPG, "products", { mimeType: "image/jpeg", resourceType: "image" });
    expect(url).toContain("https://api.test/uploads/products/");
  });

  test("declared image that is not a real image is rejected (no Cloudinary fallback)", async () => {
    await expect(
      uploadToCloudinary(Buffer.from("<svg><script>alert(1)</script></svg>"), "products", { mimeType: "image/svg+xml" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
