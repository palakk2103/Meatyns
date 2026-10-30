# Local Image Storage (Cloudinary → VPS disk)

New image uploads can be stored on the server instead of Cloudinary. Controlled by one flag; existing
Cloudinary URLs are never rewritten and keep rendering.

## How it works
- All upload flows (products, categories, banners, settings logo/favicon, profile, chat/proof images)
  already call `uploadToCloudinary()` in `app/services/mediaService.js`. When `STORAGE_PROVIDER=local`
  it delegates to `app/services/localImageStorage.js`.
- Type is detected from file bytes (JPEG/PNG/WebP/GIF only; SVG rejected). Filenames are server-generated.
  Originals are stored byte-for-byte (no re-compression).
- DB stores an absolute URL: `<UPLOADS_PUBLIC_BASE_URL>/uploads/<folder>/<yyyy>/<mm>/<ts>-<uuid>.<ext>`.
- PDFs and KYC documents are stored too: seller docs in `docs/`, delivery Aadhaar/PAN/DL in `kyc/`.
  They use random UUID filenames (unguessable) but are publicly fetchable by URL, like on Cloudinary.
- Directory layout: `products/ categories/ subcategories/ banners/ users/ vendors/ brands/ offers/ settings/ docs/ kyc/ other/`.

## Production steps (manual, on the VPS)
1. Back up DB: `mongodump --uri "$MONGODB_URI" --out ~/backup-$(date +%F)`.
2. Create a persistent directory OUTSIDE the release folder, owned by the app user:
   `mkdir -p /home/<site-user>/uploads/meatyns && chmod 755 /home/<site-user>/uploads/meatyns`
3. Check space: `df -h /home` (budget ≈ expected image volume + 30%).
4. In backend `.env`:
   ```
   STORAGE_PROVIDER=local
   UPLOADS_DIR=/home/<site-user>/uploads/meatyns
   UPLOADS_PUBLIC_BASE_URL=https://<your-api-domain>
   ```
   Keep the `CLOUDINARY_*` variables (needed for old assets, PDFs, KYC docs and rollback).
5. `pm2 restart <app-name> --update-env`.
6. Nginx (CloudPanel → Site → Vhost; ADD, don't replace existing blocks). If every PM2 instance runs on this
   one VPS they share the disk already. Optional direct serving + body size:
   ```
   client_max_body_size 12m;
   location /uploads/ {
       alias /home/<site-user>/uploads/meatyns/;
       expires 365d;
       add_header Cache-Control "public, immutable";
       add_header X-Content-Type-Options nosniff;
       add_header Access-Control-Allow-Origin *;
       add_header Cross-Origin-Resource-Policy cross-origin;
       autoindex off;
   }
   ```
   Then `nginx -t && systemctl reload nginx`. (Without this block, Node serves `/uploads` itself.)
7. Backup: add a nightly cron, e.g. `rsync -a /home/<site-user>/uploads/meatyns/ /backup/uploads/`.
8. Docker/K8s only: mount a persistent volume at `UPLOADS_DIR`; multiple replicas need shared storage (RWX/NFS).

## Verify
Upload a category image in Admin → URL starts with your `/uploads/`; open it in a browser; `pm2 restart`
and re-open; confirm an old Cloudinary product still shows.

## Rollback
Set `STORAGE_PROVIDER=cloudinary` and restart. New uploads go back to Cloudinary immediately. Images already
saved locally keep working as long as `/uploads` and the directory remain — do not delete the directory.

## Known limits
- Product image replace/delete does not remove old local files (orphans are harmless; avoids deleting
  images still referenced by galleries). Category image replace does clean up.
- Existing Cloudinary images are not migrated; a separate resumable script is recommended only after disk
  capacity is confirmed.
