import React, { useEffect, useState } from "react";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  Users,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { adminRetentionApi } from "../services/api/retentionApi";
import { adminCatalogApi } from "../services/api/catalogApi";
import { useToast } from "@shared/components/ui/Toast";

const RecipesManagement = () => {
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    image: "",
    category: "Mutton",
    difficulty: "Medium",
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    servings: 4,
    status: "active",
    ingredients: [{ name: "", quantity: 1, unit: "pack", productId: "", isOptional: false }],
    instructions: [{ step: 1, description: "" }],
  });

  const fetchRecipesAndCatalog = async () => {
    setLoading(true);
    try {
      const [recRes, prodRes] = await Promise.all([
        adminRetentionApi.getAllRecipes(),
        adminCatalogApi.getProducts({ limit: 100 }),
      ]);
      const recData = recRes?.data?.result || recRes?.data?.data || {};
      setRecipes(recData.items || (Array.isArray(recData) ? recData : []));

      const prodData = prodRes?.data?.result || prodRes?.data?.data || {};
      setProducts(prodData.items || (Array.isArray(prodData) ? prodData : []));
    } catch (err) {
      console.error("Failed to load recipes data:", err);
      showToast("Failed to load recipes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipesAndCatalog();
  }, []);

  const openCreateModal = () => {
    setEditingRecipe(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      image: "",
      category: "Mutton",
      difficulty: "Medium",
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      servings: 4,
      status: "active",
      ingredients: [{ name: "", quantity: 1, unit: "pack", productId: "", isOptional: false }],
      instructions: [{ step: 1, description: "" }],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setEditingRecipe(rec);
    setFormData({
      title: rec.title || "",
      slug: rec.slug || "",
      description: rec.description || "",
      image: rec.image || "",
      category: rec.category || "Mutton",
      difficulty: rec.difficulty || "Medium",
      prepTimeMinutes: rec.prepTimeMinutes || 15,
      cookTimeMinutes: rec.cookTimeMinutes || 30,
      servings: rec.servings || 4,
      status: rec.status || "active",
      ingredients: rec.ingredients?.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit || "pack",
        productId: i.productId?._id || i.productId || "",
        isOptional: !!i.isOptional,
      })) || [{ name: "", quantity: 1, unit: "pack", productId: "", isOptional: false }],
      instructions: rec.instructions?.map((inst, idx) => ({
        step: inst.step || idx + 1,
        description: inst.description || "",
      })) || [{ step: 1, description: "" }],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;
    try {
      await adminRetentionApi.deleteRecipe(id);
      showToast("Recipe deleted successfully", "info");
      await fetchRecipesAndCatalog();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete recipe", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      const payload = {
        ...formData,
        slug: formData.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        ingredients: formData.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            ...i,
            productId: i.productId ? i.productId : null,
          })),
        instructions: formData.instructions
          .filter((inst) => inst.description.trim())
          .map((inst, idx) => ({ step: idx + 1, description: inst.description.trim() })),
      };

      if (editingRecipe) {
        await adminRetentionApi.updateRecipe(editingRecipe._id, payload);
        showToast("Recipe updated successfully", "success");
      } else {
        await adminRetentionApi.createRecipe(payload);
        showToast("Recipe created successfully", "success");
      }
      setIsModalOpen(false);
      await fetchRecipesAndCatalog();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save recipe", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const addIngredientRow = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { name: "", quantity: 1, unit: "pack", productId: "", isOptional: false },
      ],
    }));
  };

  const removeIngredientRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index),
    }));
  };

  const addInstructionRow = () => {
    setFormData((prev) => ({
      ...prev,
      instructions: [
        ...prev.instructions,
        { step: prev.instructions.length + 1, description: "" },
      ],
    }));
  };

  const removeInstructionRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, idx) => idx !== index),
    }));
  };

  const filtered = recipes.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return rec.title?.toLowerCase().includes(q) || rec.category?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="text-emerald-600" size={24} />
            <span>Recipe-to-Cart Manager</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create educational recipes and map ingredients to store products for 1-click cart bundling.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
        >
          <Plus size={15} />
          <span>Add New Recipe</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Grid of Recipes */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <UtensilsCrossed size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No recipes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rec) => {
            const mappedCount = (rec.ingredients || []).filter((i) => i.productId).length;
            return (
              <div
                key={rec._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  {rec.image ? (
                    <img
                      src={rec.image}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <UtensilsCrossed size={36} />
                    </div>
                  )}
                  <span
                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rec.status === "active"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-500 text-white"
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {rec.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {mappedCount} Products Linked
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(rec)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rec._id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingRecipe ? "Edit Culinary Recipe" : "Create New Culinary Recipe"}
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
                  <label className="font-semibold text-slate-700 block mb-1">Recipe Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mutton Rogan Josh"
                    value={formData.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        title,
                        slug: prev.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                      }));
                    }}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="mutton-rogan-josh"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Rich, aromatic slow-cooked mutton curry..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200"
                  >
                    <option value="Mutton">Mutton</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Fish">Fish</option>
                    <option value="Curries">Curries</option>
                    <option value="Biryani">Biryani</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl border-slate-200"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Chef Special">Chef Special</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cook Time (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.cookTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, cookTimeMinutes: Number(e.target.value) })}
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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl border-slate-200"
                />
              </div>

              {/* Ingredients & Store Products Mapping */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Ingredients & Store Product Mapping
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    + Add Ingredient
                  </button>
                </div>

                {formData.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                    <input
                      type="text"
                      placeholder="Ingredient Name"
                      value={ing.name}
                      onChange={(e) => {
                        const copy = [...formData.ingredients];
                        copy[idx].name = e.target.value;
                        setFormData({ ...formData, ingredients: copy });
                      }}
                      className="w-36 px-2 py-1.5 border rounded-lg border-slate-200 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min={0.01}
                      step={0.1}
                      value={ing.quantity}
                      onChange={(e) => {
                        const copy = [...formData.ingredients];
                        copy[idx].quantity = Number(e.target.value);
                        setFormData({ ...formData, ingredients: copy });
                      }}
                      className="w-16 px-2 py-1.5 border rounded-lg border-slate-200 bg-white"
                    />
                    <select
                      value={ing.productId}
                      onChange={(e) => {
                        const copy = [...formData.ingredients];
                        copy[idx].productId = e.target.value;
                        setFormData({ ...formData, ingredients: copy });
                      }}
                      className="flex-1 px-2 py-1.5 border rounded-lg border-slate-200 bg-white truncate"
                    >
                      <option value="">-- No Linked Product (Pantry Item) --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Step-by-Step Instructions
                  </label>
                  <button
                    type="button"
                    onClick={addInstructionRow}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    + Add Step
                  </button>
                </div>

                {formData.instructions.map((inst, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-1">
                      {idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      placeholder={`Step ${idx + 1} description...`}
                      value={inst.description}
                      onChange={(e) => {
                        const copy = [...formData.instructions];
                        copy[idx].description = e.target.value;
                        setFormData({ ...formData, instructions: copy });
                      }}
                      className="flex-1 px-3 py-1.5 border rounded-xl border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeInstructionRow(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
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
                  <span>Save Recipe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipesManagement;
