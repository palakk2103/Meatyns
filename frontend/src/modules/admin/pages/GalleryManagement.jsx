import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Images,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  X,
  Star,
  ArrowUp,
  ArrowDown,
  Upload,
  RefreshCw,
  Eye,
  FolderTree,
  Settings2,
  CheckCircle2,
  FileText,
  ImagePlus,
  Tags,
} from "lucide-react";
import { adminContentApi as api } from "../services/api/contentApi";
import { useToast } from "@shared/components/ui/Toast";
import ConfirmDialog from "@shared/components/ui/ConfirmDialog";

const MAX_IMAGE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const UPLOAD_BATCH = 10;
const PAGE_SIZE = 12;

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const toSlug = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const inputCls =
  "w-full px-3 py-2 border rounded-xl border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-rose-500 bg-white";
const labelCls = "font-semibold text-slate-700 block mb-1 text-xs";

const validateFile = (file) => {
  if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: only JPEG, PNG or WebP allowed`;
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `${file.name}: must be under ${MAX_IMAGE_MB} MB`;
  return null;
};

/** Uploads File objects in batches through the existing media storage; returns URLs in order. */
async function uploadFiles(files) {
  const urls = [];
  for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
    const fd = new FormData();
    files.slice(i, i + UPLOAD_BATCH).forEach((f) => fd.append("images", f));
    const res = await api.uploadGalleryImages(fd);
    (res?.data?.result?.images || []).forEach((img) => urls.push(img.url));
  }
  return urls;
}

const Toggle = ({ checked, onChange, disabled, label, testId }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    data-testid={testId}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
      checked ? "bg-emerald-500" : "bg-slate-300"
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
  </button>
);

/* =====================================================================
   Gallery form (create / edit) with image manager
===================================================================== */

const emptyForm = (categories) => ({
  title: "",
  slug: "",
  category: categories.find((c) => c.isActive)?._id || categories[0]?._id || "",
  franchiseName: "",
  location: "",
  city: "",
  state: "",
  eventDate: "",
  shortDescription: "",
  description: "",
  isFeatured: false,
  showOnHomepage: true,
  isPublished: false,
  displayOrder: "",
});

let tempId = 0;
const newKey = () => `tmp-${Date.now()}-${tempId++}`;

const GalleryFormModal = ({ open, galleryId, categories, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(() => emptyForm(categories));
  const [slugTouched, setSlugTouched] = useState(false);
  // images: { key, url?, file?, preview, caption, altText }
  const [images, setImages] = useState([]);
  const [coverKey, setCoverKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTarget = useRef(null);

  // Revoke object URLs when images leave the form.
  const previewsRef = useRef(new Set());
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    if (!open) return;
    setSlugTouched(Boolean(galleryId));
    if (!galleryId) {
      setForm(emptyForm(categories));
      setImages([]);
      setCoverKey(null);
      return;
    }
    setLoading(true);
    api
      .getGallery(galleryId)
      .then((res) => {
        const g = res?.data?.result || {};
        setForm({
          title: g.title || "",
          slug: g.slug || "",
          category: g.category?._id || g.category || "",
          franchiseName: g.franchiseName || "",
          location: g.location || "",
          city: g.city || "",
          state: g.state || "",
          eventDate: toDateInput(g.eventDate),
          shortDescription: g.shortDescription || "",
          description: g.description || "",
          isFeatured: Boolean(g.isFeatured),
          showOnHomepage: g.showOnHomepage !== false,
          isPublished: Boolean(g.isPublished),
          displayOrder: g.displayOrder ?? "",
        });
        const imgs = (g.images || []).map((img) => ({
          key: img._id || newKey(),
          _id: img._id,
          url: img.url,
          preview: img.url,
          caption: img.caption || "",
          altText: img.altText || "",
        }));
        setImages(imgs);
        setCoverKey(imgs.find((i) => i.url === g.coverImage)?.key || imgs[0]?.key || null);
      })
      .catch((err) => {
        showToast(errMsg(err, "Failed to load gallery"), "error");
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, galleryId]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const errors = files.map(validateFile).filter(Boolean);
    if (errors.length) showToast(errors[0], "error");
    const valid = files.filter((f) => !validateFile(f));
    const added = valid.map((file) => {
      const preview = URL.createObjectURL(file);
      previewsRef.current.add(preview);
      return { key: newKey(), file, preview, caption: "", altText: "" };
    });
    setImages((prev) => {
      const next = [...prev, ...added];
      if (!coverKey && next[0]) setCoverKey(next[0].key);
      return next;
    });
  };

  const replaceImage = (file) => {
    const error = validateFile(file);
    if (error) return showToast(error, "error");
    const preview = URL.createObjectURL(file);
    previewsRef.current.add(preview);
    setImages((prev) =>
      prev.map((img) => (img.key === replaceTarget.current ? { ...img, file, url: undefined, _id: undefined, preview } : img)),
    );
    return undefined;
  };

  const removeImage = (key) => {
    setImages((prev) => {
      const next = prev.filter((i) => i.key !== key);
      if (coverKey === key) setCoverKey(next[0]?.key || null);
      return next;
    });
  };

  const moveImage = (index, delta) => {
    setImages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateImage = (key, patch) => setImages((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const submit = async (e, publishOverride) => {
    e?.preventDefault?.();
    if (!form.title.trim()) return showToast("Title is required", "error");
    if (!form.category) return showToast("Select a category", "error");
    const isPublished = publishOverride !== undefined ? publishOverride : form.isPublished;
    if (isPublished && images.length === 0) return showToast("Add at least one image before publishing", "error");

    setSaving(true);
    try {
      const pending = images.filter((i) => i.file);
      const uploadedUrls = pending.length ? await uploadFiles(pending.map((i) => i.file)) : [];
      if (uploadedUrls.length !== pending.length) throw new Error("Some images failed to upload");
      const urlByKey = new Map(pending.map((img, idx) => [img.key, uploadedUrls[idx]]));
      const finalImages = images.map((img, idx) => ({
        ...(img._id ? { _id: img._id } : {}),
        url: img.file ? urlByKey.get(img.key) : img.url,
        caption: img.caption.trim(),
        altText: img.altText.trim(),
        order: idx,
      }));
      const coverIdx = Math.max(0, images.findIndex((i) => i.key === coverKey));
      const payload = {
        ...form,
        title: form.title.trim(),
        slug: toSlug(form.slug),
        eventDate: form.eventDate || null,
        displayOrder: form.displayOrder === "" ? undefined : Number(form.displayOrder),
        isPublished,
        images: finalImages,
        coverImage: finalImages[coverIdx]?.url || "",
      };
      if (payload.displayOrder === undefined) delete payload.displayOrder;

      if (galleryId) await api.updateGallery(galleryId, payload);
      else await api.createGallery(payload);
      showToast(galleryId ? "Gallery updated successfully" : "Gallery created successfully", "success");
      onSaved();
    } catch (err) {
      showToast(errMsg(err, err?.message || "Failed to save gallery"), "error");
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto overscroll-contain shadow-xl" data-testid="gallery-form-modal" data-lenis-prevent>
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-900">{galleryId ? "Edit Gallery" : "Add New Gallery"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-rose-600" size={26} />
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="g-title">Gallery / Event Title *</label>
                <input
                  id="g-title"
                  name="title"
                  required
                  maxLength={150}
                  placeholder="e.g. Meatyns Franchise Opening – Pune"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: toSlug(e.target.value) }) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="g-slug">URL Slug</label>
                <input
                  id="g-slug"
                  name="slug"
                  placeholder="auto-generated-from-title"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: e.target.value });
                  }}
                  onBlur={() => set({ slug: toSlug(form.slug) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="g-category">Gallery Category *</label>
                <select id="g-category" name="category" value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.isActive ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="g-franchise">Franchise Name (optional)</label>
                <input id="g-franchise" name="franchiseName" maxLength={120} placeholder="e.g. Meatyns Pune" value={form.franchiseName} onChange={(e) => set({ franchiseName: e.target.value })} className={inputCls} />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} htmlFor="g-location">Location / Venue</label>
                  <input id="g-location" name="location" maxLength={160} placeholder="e.g. FC Road" value={form.location} onChange={(e) => set({ location: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="g-city">City</label>
                  <input id="g-city" name="city" maxLength={80} placeholder="Pune" value={form.city} onChange={(e) => set({ city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="g-state">State</label>
                  <input id="g-state" name="state" maxLength={80} placeholder="Maharashtra" value={form.state} onChange={(e) => set({ state: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="g-date">Event Date</label>
                <input id="g-date" name="eventDate" type="date" value={form.eventDate} onChange={(e) => set({ eventDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="g-order">Display Order</label>
                <input id="g-order" name="displayOrder" type="number" min={0} placeholder="Auto" value={form.displayOrder} onChange={(e) => set({ displayOrder: e.target.value })} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="g-short">Short Description</label>
                <input id="g-short" name="shortDescription" maxLength={300} placeholder="One-line summary shown on cards" value={form.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="g-desc">Detailed Description</label>
                <textarea id="g-desc" name="description" rows={4} maxLength={5000} placeholder="Highlights from the event..." value={form.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} />
              </div>
            </div>

            {/* Image manager */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">Images ({images.length})</p>
                  <p className="text-[11px] text-slate-500">JPEG, PNG or WebP · max {MAX_IMAGE_MB} MB each · ★ marks the cover image · files upload when you save</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100"
                >
                  <ImagePlus size={14} /> Add Images
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  data-testid="gallery-image-input"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  data-testid="gallery-replace-input"
                  onChange={(e) => {
                    if (e.target.files?.[0]) replaceImage(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-10 flex flex-col items-center gap-2 text-slate-400 hover:border-rose-300 hover:text-rose-500"
                >
                  <Upload size={26} />
                  <span className="text-xs font-semibold">Click to select event photographs</span>
                </button>
              ) : (
                <div className="space-y-2" data-testid="gallery-image-list">
                  {images.map((img, idx) => (
                    <div key={img.key} data-testid="gallery-image-row" className={`flex flex-col sm:flex-row gap-3 p-2.5 rounded-xl border ${coverKey === img.key ? "border-amber-400 bg-amber-50/40" : "border-slate-200 bg-slate-50/50"}`}>
                      <div className="relative w-full sm:w-28 h-28 sm:h-20 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <img src={img.preview} alt={img.altText || `Image ${idx + 1}`} className="w-full h-full object-cover" />
                        {img.file && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-sky-600 text-white text-[9px] font-bold">NEW</span>}
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input aria-label={`Caption for image ${idx + 1}`} placeholder="Caption" maxLength={200} value={img.caption} onChange={(e) => updateImage(img.key, { caption: e.target.value })} className={inputCls} />
                        <input aria-label={`Alt text for image ${idx + 1}`} placeholder="Alt text (accessibility)" maxLength={200} value={img.altText} onChange={(e) => updateImage(img.key, { altText: e.target.value })} className={inputCls} />
                      </div>
                      <div className="flex items-center gap-1 sm:flex-col sm:justify-center">
                        <div className="flex gap-1">
                          <button type="button" title="Set as cover" aria-label={`Set image ${idx + 1} as cover`} data-testid="gallery-set-cover" onClick={() => setCoverKey(img.key)} className={`p-1.5 rounded-lg ${coverKey === img.key ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}>
                            <Star size={15} className={coverKey === img.key ? "fill-amber-400" : ""} />
                          </button>
                          <button type="button" title="Move up" aria-label={`Move image ${idx + 1} up`} disabled={idx === 0} onClick={() => moveImage(idx, -1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30">
                            <ArrowUp size={15} />
                          </button>
                          <button type="button" title="Move down" aria-label={`Move image ${idx + 1} down`} disabled={idx === images.length - 1} onClick={() => moveImage(idx, 1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30">
                            <ArrowDown size={15} />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Replace image"
                            aria-label={`Replace image ${idx + 1}`}
                            data-testid="gallery-replace-image"
                            onClick={() => {
                              replaceTarget.current = img.key;
                              replaceInputRef.current?.click();
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
                          >
                            <RefreshCw size={15} />
                          </button>
                          <button type="button" title="Remove image" aria-label={`Remove image ${idx + 1}`} onClick={() => removeImage(img.key)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4">
              {[
                ["isFeatured", "Featured gallery", "Shown first in the homepage preview"],
                ["showOnHomepage", "Eligible for homepage", "Can appear in the homepage preview"],
                ["isPublished", "Published", "Visible to customers"],
              ].map(([key, label, hint]) => (
                <label key={key} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer">
                  <span>
                    <span className="block text-xs font-bold text-slate-800">{label}</span>
                    <span className="block text-[10.5px] text-slate-500">{hint}</span>
                  </span>
                  <Toggle checked={form[key]} onChange={(v) => set({ [key]: v })} label={label} testId={`gallery-form-${key}`} />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={(e) => submit(e, false)} data-testid="gallery-save-draft" className="px-4 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
                Save as Draft
              </button>
              <button type="button" disabled={saving} onClick={(e) => submit(e, true)} data-testid="gallery-save-publish" className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save & Publish
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* =====================================================================
   Galleries tab
===================================================================== */

const GalleriesTab = ({ categories, onChanged, refreshKey, onEdit }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState({ category: "", status: "", featured: "", sort: "order" });
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE, sort: filters.sort };
      if (debounced) params.search = debounced;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.featured) params.featured = filters.featured;
      const res = await api.getGalleries(params);
      const result = res?.data?.result || {};
      setItems(result.items || []);
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      showToast(errMsg(err, "Failed to load galleries"), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, filters]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const patchStatus = async (g, patch) => {
    setBusyId(g._id);
    try {
      await api.updateGalleryStatus(g._id, patch);
      setItems((prev) => prev.map((x) => (x._id === g._id ? { ...x, ...patch } : x)));
      onChanged();
    } catch (err) {
      showToast(errMsg(err, "Failed to update status"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const canReorder = filters.sort === "order" && !debounced && !filters.category && !filters.status && !filters.featured;

  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const base = (page - 1) * PAGE_SIZE + 1;
    const reordered = next.map((g, i) => ({ ...g, displayOrder: base + i }));
    setItems(reordered);
    try {
      await api.reorderGalleries(reordered.map((g) => ({ id: g._id, displayOrder: g.displayOrder })));
    } catch (err) {
      showToast(errMsg(err, "Failed to reorder"), "error");
      load();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteGallery(toDelete._id);
      showToast("Gallery deleted", "success");
      setToDelete(null);
      onChanged();
      load();
    } catch (err) {
      showToast(errMsg(err, "Failed to delete gallery"), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, franchise, city..."
            aria-label="Search galleries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select aria-label="Filter by category" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select aria-label="Filter featured" value={filters.featured} onChange={(e) => setFilters((f) => ({ ...f, featured: e.target.value }))} className={inputCls}>
            <option value="">Featured & regular</option>
            <option value="true">Featured only</option>
          </select>
          <select aria-label="Sort galleries" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className={inputCls}>
            <option value="order">Display order</option>
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="eventDate">Event date</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      {!canReorder && <p className="text-[11px] text-slate-400">Clear search/filters and sort by "Display order" to reorder galleries.</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-rose-600" size={26} />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Images size={34} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No galleries found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs min-w-[860px]" data-testid="gallery-admin-table">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left px-3 py-2.5 w-16">Order</th>
                <th className="text-left px-3 py-2.5">Gallery</th>
                <th className="text-left px-3 py-2.5">Category</th>
                <th className="text-center px-3 py-2.5">Published</th>
                <th className="text-center px-3 py-2.5">Featured</th>
                <th className="text-center px-3 py-2.5">Homepage</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((g, idx) => (
                <tr key={g._id} data-testid="gallery-admin-row" data-title={g.title} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-0.5">
                      <button type="button" aria-label={`Move ${g.title} up`} disabled={!canReorder || idx === 0} onClick={() => move(idx, -1)} className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-25">
                        <ArrowUp size={13} />
                      </button>
                      <button type="button" aria-label={`Move ${g.title} down`} disabled={!canReorder || idx === items.length - 1} onClick={() => move(idx, 1)} className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-25">
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        {g.coverImage ? <img src={g.coverImage} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Images size={16} className="m-auto mt-3 text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate max-w-[260px]">{g.title}</p>
                        <p className="text-[10.5px] text-slate-500 truncate max-w-[260px]">
                          {[g.franchiseName, g.city].filter(Boolean).join(" · ") || "—"} · {g.imageCount} images
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {g.category?.name || <span className="text-rose-500">Missing</span>}
                    {g.category && g.category.isActive === false && <span className="ml-1 text-[9px] text-amber-600 font-bold">(inactive)</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={g.isPublished} disabled={busyId === g._id} onChange={(v) => patchStatus(g, { isPublished: v })} label={`Published: ${g.title}`} testId="row-toggle-published" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={g.isFeatured} disabled={busyId === g._id} onChange={(v) => patchStatus(g, { isFeatured: v })} label={`Featured: ${g.title}`} testId="row-toggle-featured" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={g.showOnHomepage} disabled={busyId === g._id} onChange={(v) => patchStatus(g, { showOnHomepage: v })} label={`Homepage: ${g.title}`} testId="row-toggle-homepage" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {g.isPublished && (
                        <a href={`/gallery/${g.slug}`} target="_blank" rel="noreferrer" title="View on site" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                          <Eye size={14} />
                        </a>
                      )}
                      <button type="button" aria-label={`Edit ${g.title}`} onClick={() => onEdit(g._id)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" aria-label={`Delete ${g.title}`} onClick={() => setToDelete(g)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} galleries
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        title="Delete gallery?"
        message={toDelete ? `"${toDelete.title}" and its ${toDelete.imageCount} images will be removed permanently. Images still used by other galleries are kept.` : ""}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

/* =====================================================================
   Categories tab
===================================================================== */

const CategoriesTab = ({ categories, reload, onChanged }) => {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null); // null | {} (new) | category
  const [form, setForm] = useState({ name: "", slug: "", description: "", image: "", isActive: true });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteState, setDeleteState] = useState(null); // { category, reassignTo }
  const [deleting, setDeleting] = useState(false);

  const openEditor = (cat) => {
    setEditing(cat || {});
    setImageFile(null);
    setForm({
      name: cat?.name || "",
      slug: cat?.slug || "",
      description: cat?.description || "",
      image: cat?.image || "",
      isActive: cat ? cat.isActive : true,
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return showToast("Category name is required", "error");
    setSaving(true);
    try {
      let image = form.image;
      if (imageFile) [image] = await uploadFiles([imageFile]);
      const payload = { ...form, name: form.name.trim(), slug: toSlug(form.slug), image };
      if (editing?._id) await api.updateGalleryCategory(editing._id, payload);
      else await api.createGalleryCategory(payload);
      showToast(editing?._id ? "Category updated" : "Category created", "success");
      setEditing(null);
      reload();
      onChanged();
    } catch (err) {
      showToast(errMsg(err, "Failed to save category"), "error");
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const toggleActive = async (cat) => {
    try {
      await api.updateGalleryCategory(cat._id, { isActive: !cat.isActive });
      reload();
      onChanged();
    } catch (err) {
      showToast(errMsg(err, "Failed to update category"), "error");
    }
  };

  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await api.reorderGalleryCategories(next.map((c, i) => ({ id: c._id, displayOrder: i + 1 })));
      reload();
    } catch (err) {
      showToast(errMsg(err, "Failed to reorder categories"), "error");
    }
  };

  const confirmDelete = async () => {
    const { category, reassignTo } = deleteState;
    if (category.galleryCount > 0 && !reassignTo) return showToast("Choose a category to move its galleries to", "error");
    setDeleting(true);
    try {
      await api.deleteGalleryCategory(category._id, category.galleryCount > 0 ? reassignTo : undefined);
      showToast("Category deleted", "success");
      setDeleteState(null);
      reload();
      onChanged();
    } catch (err) {
      showToast(errMsg(err, "Failed to delete category"), "error");
    } finally {
      setDeleting(false);
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => openEditor(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold">
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100" data-testid="gallery-category-list">
        {categories.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No categories yet</p>}
        {categories.map((c, idx) => (
          <div key={c._id} data-testid="gallery-category-row" data-name={c.name} className="flex items-center gap-3 px-3 sm:px-4 py-3">
            <div className="flex flex-col">
              <button type="button" aria-label={`Move ${c.name} up`} disabled={idx === 0} onClick={() => move(idx, -1)} className="p-0.5 text-slate-500 disabled:opacity-25"><ArrowUp size={13} /></button>
              <button type="button" aria-label={`Move ${c.name} down`} disabled={idx === categories.length - 1} onClick={() => move(idx, 1)} className="p-0.5 text-slate-500 disabled:opacity-25"><ArrowDown size={13} /></button>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 overflow-hidden shrink-0 flex items-center justify-center">
              {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : <Tags size={18} className="text-rose-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
              <p className="text-[11px] text-slate-500 truncate">/{c.slug} · {c.galleryCount} galleries{c.description ? ` · ${c.description}` : ""}</p>
            </div>
            <Toggle checked={c.isActive} onChange={() => toggleActive(c)} label={`Active: ${c.name}`} testId="category-toggle-active" />
            <button type="button" aria-label={`Edit ${c.name}`} onClick={() => openEditor(c)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"><Edit2 size={14} /></button>
            <button type="button" aria-label={`Delete ${c.name}`} onClick={() => setDeleteState({ category: c, reassignTo: "" })} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 shadow-xl" data-testid="gallery-category-form">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{editing._id ? "Edit Category" : "Add Category"}</h3>
              <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div>
              <label className={labelCls} htmlFor="c-name">Name *</label>
              <input id="c-name" name="name" required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, ...(editing._id ? {} : { slug: toSlug(e.target.value) }) }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-slug">Slug</label>
              <input id="c-slug" name="slug" maxLength={100} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} onBlur={() => setForm((f) => ({ ...f, slug: toSlug(f.slug) }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-desc">Description</label>
              <textarea id="c-desc" name="description" rows={2} maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-image">Category Image (optional)</label>
              <div className="flex items-center gap-3">
                {(imageFile || form.image) && (
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <input
                  id="c-image"
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const error = validateFile(f);
                    if (error) showToast(error, "error");
                    else setImageFile(f);
                  }}
                  className="text-xs"
                />
                {(imageFile || form.image) && (
                  <button type="button" onClick={() => { setImageFile(null); setForm((f) => ({ ...f, image: "" })); }} className="text-[11px] text-rose-600 font-semibold">Remove</button>
                )}
              </div>
            </div>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">Active</span>
              <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Category active" />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-xl text-slate-600 text-xs font-semibold">Cancel</button>
              <button type="submit" disabled={saving} data-testid="gallery-category-save" className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteState && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 shadow-xl" data-testid="gallery-category-delete">
            <h3 className="text-base font-bold text-slate-900">Delete "{deleteState.category.name}"?</h3>
            {deleteState.category.galleryCount > 0 ? (
              <>
                <p className="text-xs text-slate-600">
                  This category has <strong>{deleteState.category.galleryCount}</strong> galleries. Choose where to move them — no gallery will be deleted.
                </p>
                <select aria-label="Move galleries to" value={deleteState.reassignTo} onChange={(e) => setDeleteState((s) => ({ ...s, reassignTo: e.target.value }))} className={inputCls}>
                  <option value="">Select target category</option>
                  {categories.filter((c) => c._id !== deleteState.category._id).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-xs text-slate-600">This category has no galleries and can be removed safely.</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteState(null)} className="px-4 py-2 border rounded-xl text-slate-600 text-xs font-semibold">Cancel</button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                {deleting && <Loader2 size={14} className="animate-spin" />} {deleteState.category.galleryCount > 0 ? "Move & Delete" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =====================================================================
   Display settings tab
===================================================================== */

const SettingsTab = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getGallerySettings()
      .then((res) => setSettings(res?.data?.result || {}))
      .catch((err) => showToast(errMsg(err, "Failed to load settings"), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { homepageGalleryEnabled, profileGalleryEnabled, homepageItemLimit, homepageTitle, homepageSubtitle, pageTitle, pageDescription } = settings;
      const res = await api.updateGallerySettings({
        homepageGalleryEnabled,
        profileGalleryEnabled,
        homepageItemLimit: Number(homepageItemLimit),
        homepageTitle,
        homepageSubtitle,
        pageTitle,
        pageDescription,
      });
      setSettings(res?.data?.result || settings);
      showToast("Gallery display settings saved", "success");
    } catch (err) {
      showToast(errMsg(err, "Failed to save settings"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-rose-600" size={26} />
      </div>
    );
  }
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 max-w-2xl" data-testid="gallery-settings-form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200">
          <span>
            <span className="block text-xs font-bold text-slate-800">Show on customer homepage</span>
            <span className="block text-[10.5px] text-slate-500">Compact "Our Journey & Moments" preview</span>
          </span>
          <Toggle checked={settings.homepageGalleryEnabled} onChange={(v) => set({ homepageGalleryEnabled: v })} label="Show gallery on homepage" testId="settings-homepage-toggle" />
        </label>
        <label className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200">
          <span>
            <span className="block text-xs font-bold text-slate-800">Show in customer Profile</span>
            <span className="block text-[10.5px] text-slate-500">"Gallery" option in the Profile menu</span>
          </span>
          <Toggle checked={settings.profileGalleryEnabled} onChange={(v) => set({ profileGalleryEnabled: v })} label="Show gallery in profile" testId="settings-profile-toggle" />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls} htmlFor="s-limit">Homepage items (1–12)</label>
          <input id="s-limit" type="number" min={1} max={12} value={settings.homepageItemLimit} onChange={(e) => set({ homepageItemLimit: e.target.value })} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="s-htitle">Homepage heading</label>
          <input id="s-htitle" maxLength={80} value={settings.homepageTitle || ""} onChange={(e) => set({ homepageTitle: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="s-hsub">Homepage subtitle</label>
        <input id="s-hsub" maxLength={200} value={settings.homepageSubtitle || ""} onChange={(e) => set({ homepageSubtitle: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="s-ptitle">Gallery page heading</label>
        <input id="s-ptitle" maxLength={80} value={settings.pageTitle || ""} onChange={(e) => set({ pageTitle: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="s-pdesc">Gallery page description</label>
        <textarea id="s-pdesc" rows={2} maxLength={300} value={settings.pageDescription || ""} onChange={(e) => set({ pageDescription: e.target.value })} className={inputCls} />
      </div>
      <p className="text-[11px] text-slate-500">
        The homepage preview shows published galleries marked "Eligible for homepage", featured ones first, then by display order.
      </p>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} data-testid="gallery-settings-save" className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />} Save Settings
        </button>
      </div>
    </form>
  );
};

/* =====================================================================
   Page shell
===================================================================== */

const TABS = [
  { id: "galleries", label: "Galleries", icon: Images },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "settings", label: "Display Settings", icon: Settings2 },
];

const GalleryManagement = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState("galleries");
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState({ open: false, id: null });
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStats = useCallback(() => {
    api.getGalleryStats().then((res) => setStats(res?.data?.result || null)).catch(() => {});
  }, []);
  const loadCategories = useCallback(() => {
    api
      .getGalleryCategories()
      .then((res) => setCategories(res?.data?.results || res?.data?.result || []))
      .catch((err) => showToast(errMsg(err, "Failed to load categories"), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStats();
    loadCategories();
  }, [loadStats, loadCategories]);

  const onChanged = () => {
    loadStats();
    loadCategories();
  };

  const statCards = useMemo(
    () => [
      { label: "Total Galleries", value: stats?.totalGalleries, icon: Images, cls: "text-slate-700 bg-slate-100" },
      { label: "Published", value: stats?.publishedGalleries, icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50" },
      { label: "Drafts", value: stats?.draftGalleries, icon: FileText, cls: "text-amber-700 bg-amber-50" },
      { label: "Total Images", value: stats?.totalImages, icon: ImagePlus, cls: "text-sky-700 bg-sky-50" },
      { label: "Active Categories", value: stats?.activeCategories, icon: Tags, cls: "text-rose-700 bg-rose-50" },
    ],
    [stats],
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 font-poppins" data-testid="admin-gallery-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Images className="text-rose-600" size={24} />
            <span>Gallery Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Openings, franchises, visitors, events and milestones shown in the customer app's "Our Journey & Moments".
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!categories.length) return showToast("Create a gallery category first", "error");
            setModal({ open: true, id: null });
            return undefined;
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
        >
          <Plus size={15} /> Add New Gallery
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="gallery-stats">
        {statCards.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}>
              <Icon size={17} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-none">{value ?? "–"}</p>
              <p className="text-[10.5px] text-slate-500 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              tab === id ? "border-rose-600 text-rose-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "galleries" && (
        <GalleriesTab categories={categories} refreshKey={refreshKey} onChanged={onChanged} onEdit={(id) => setModal({ open: true, id })} />
      )}
      {tab === "categories" && <CategoriesTab categories={categories} reload={loadCategories} onChanged={() => { loadStats(); setRefreshKey((k) => k + 1); }} />}
      {tab === "settings" && <SettingsTab />}

      <GalleryFormModal
        open={modal.open}
        galleryId={modal.id}
        categories={categories}
        onClose={() => setModal({ open: false, id: null })}
        onSaved={() => {
          setModal({ open: false, id: null });
          setRefreshKey((k) => k + 1);
          onChanged();
        }}
      />
    </div>
  );
};

export default GalleryManagement;
