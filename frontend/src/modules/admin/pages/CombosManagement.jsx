import React, { useEffect, useState } from "react";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Percent,
  Loader2,
  X,
} from "lucide-react";
import { adminRetentionApi } from "../services/api/retentionApi";
import { adminCatalogApi } from "../services/api/catalogApi";
import { useToast } from "@shared/components/ui/Toast";

const CombosManagement = () => {
  const { showToast } = useToast();
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    tag: "Meal Prep Saver",
    comboPrice: 499,
    originalPrice: 599,
    status: "active",
    items: [
      { productId: "", quantity: 1, unit: "pack" },
      { productId: "", quantity: 1, unit: "pack" },
    ],
  });

  const fetchCombosAndCatalog = async () => {
    setLoading(true);
    try {
      const [comboRes, prodRes] = await Promise.all([
        adminRetentionApi.getAllCombos(),
        adminCatalogApi.getProducts({ limit: 100 }),
      ]);

      const comboData = comboRes?.data?.result || comboRes?.data?.data || {};
      setCombos(comboData.items || (Array.isArray(comboData) ? comboData : []));

      const prodData = prodRes?.data?.result || prodRes?.data?.data || {};
      setProducts(prodData.items || (Array.isArray(prodData) ? prodData : []));
    } catch (err) {
      console.error("Failed to load combos:", err);
      showToast("Failed to load combos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCombosAndCatalog();
  }, []);

  const openCreateModal = () => {
    setEditingCombo(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image: "",
      tag: "Meal Prep Saver",
      comboPrice: 499,
      originalPrice: 599,
      status: "active",
      items: [
        { productId: products[0]?._id || "", quantity: 1, unit: "pack" },
        { productId: products[1]?._id || "", quantity: 1, unit: "pack" },
      ],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCombo(c);
    setFormData({
      name: c.name || "",
      slug: c.slug || "",
      description: c.description || "",
      image: c.image || "",
      tag: c.tag || "Meal Prep Saver",
      comboPrice: c.comboPrice || 0,
      originalPrice: c.originalPrice || 0,
      status: c.status || "active",
      items: c.items?.map((it) => ({
        productId: it.productId?._id || it.productId || "",
        quantity: it.quantity || 1,
        unit: it.unit || "pack",
      })) || [
        { productId: "", quantity: 1, unit: "pack" },
        { productId: "", quantity: 1, unit: "pack" },
      ],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this combo?")) return;
    try {
      await adminRetentionApi.deleteCombo(id);
      showToast("Combo deleted successfully", "info");
      await fetchCombosAndCatalog();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete combo", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length < 2) {
      showToast("A combo must have at least 2 items", "error");
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        ...formData,
        slug: formData.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        items: formData.items.filter((it) => it.productId),
      };

      if (editingCombo) {
        await adminRetentionApi.updateCombo(editingCombo._id, payload);
        showToast("Combo updated successfully", "success");
      } else {
        await adminRetentionApi.createCombo(payload);
        showToast("Combo created successfully", "success");
      }
      setIsModalOpen(false);
      await fetchCombosAndCatalog();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save combo", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: "", quantity: 1, unit: "pack" },
      ],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const filtered = combos.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.tag?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="text-amber-500" size={24} />
            <span>Meal Prep Packages & Combos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bundle complementary meat cuts into discounted packages with automatic stock revalidation.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
        >
          <Plus size={15} />
          <span>Create New Combo</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search combo packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Grid of Combos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-amber-500" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Boxes size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No combos created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((combo) => (
            <div
              key={combo._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    {combo.tag || "Combo Saver"}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1.5 leading-snug">
                    {combo.name}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    combo.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {combo.status}
                </span>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bundled Products ({combo.items?.length || 0})
                </p>
                {combo.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between truncate">
                    <span>• {it.productId?.name || "Product"}</span>
                    <span className="font-semibold text-slate-500">
                      {it.quantity} {it.unit || "pack"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price & Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-sm font-black text-slate-900">
                    ₹{combo.comboPrice}
                  </span>
                  {combo.originalPrice > combo.comboPrice && (
                    <span className="text-xs text-slate-400 line-through ml-1.5 font-semibold">
                      ₹{combo.originalPrice}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(combo)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(combo._id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingCombo ? "Edit Meal Prep Combo" : "Create Meal Prep Combo"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Combo Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekend Biryani Pack"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                      }));
                    }}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="weekend-biryani-pack"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Contains 1kg tender mutton curry cut + 500g chicken..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Combo Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.comboPrice}
                    onChange={(e) => setFormData({ ...formData, comboPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marketing Tag</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Items Picker */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Bundled Products (Minimum 2 required)
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-amber-600 font-bold hover:underline"
                  >
                    + Add Product
                  </button>
                </div>

                {formData.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                    <select
                      required
                      value={it.productId}
                      onChange={(e) => {
                        const copy = [...formData.items];
                        copy[idx].productId = e.target.value;
                        setFormData({ ...formData, items: copy });
                      }}
                      className="flex-1 px-2 py-1.5 border rounded-lg border-slate-200 bg-white"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} (Stock: {p.stock}, ₹{p.price})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={0.01}
                      step={0.1}
                      required
                      value={it.quantity}
                      onChange={(e) => {
                        const copy = [...formData.items];
                        copy[idx].quantity = Number(e.target.value);
                        setFormData({ ...formData, items: copy });
                      }}
                      className="w-16 px-2 py-1.5 border rounded-lg border-slate-200 bg-white"
                      placeholder="Qty"
                    />

                    {formData.items.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {modalSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Combo Package</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombosManagement;
