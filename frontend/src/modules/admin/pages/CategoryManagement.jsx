import React, { useState, useEffect, useMemo, useRef } from "react";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Filter,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Layers,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  PlusCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "../services/adminApi";
import { toast } from "sonner";
import { compressImage } from "@/core/utils/imageCompression";

const makeSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("order"); // 'order', 'name', 'products'
  const [expandedCatIds, setExpandedCatIds] = useState([]);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catFormData, setCatFormData] = useState({
    name: "",
    slug: "",
    description: "",
    displayOrder: 1,
    status: "active",
    type: "header",
  });
  const [catImageFile, setCatImageFile] = useState(null);
  const [catImagePreview, setCatImagePreview] = useState(null);

  // Subcategory Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [subFormData, setSubFormData] = useState({
    name: "",
    slug: "",
    description: "",
    displayOrder: 1,
    status: "active",
    type: "category",
    parentId: "",
  });
  const [subImageFile, setSubImageFile] = useState(null);
  const [subImagePreview, setSubImagePreview] = useState(null);

  // Delete Safety Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { item, isSub: boolean }
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const catFileInputRef = useRef(null);
  const subFileInputRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getCategories({ withCounts: "true" });
      if (res.data?.success) {
        const raw = res.data.results || res.data.result || [];
        setCategories(raw);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  // Group into Headers (Main Categories) and Subcategories
  const mainCategories = useMemo(() => {
    return categories.filter((c) => c.type === "header" || !c.parentId);
  }, [categories]);

  const subcategoriesMap = useMemo(() => {
    const map = {};
    categories
      .filter((c) => c.type !== "header" && c.parentId)
      .forEach((sub) => {
        const pId = String(sub.parentId?._id || sub.parentId);
        if (!map[pId]) map[pId] = [];
        map[pId].push(sub);
      });

    // Sort subcategories in each category by displayOrder
    Object.keys(map).forEach((pId) => {
      map[pId].sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
    });
    return map;
  }, [categories]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCategories = mainCategories.length;
    let totalSubcategories = 0;
    let totalProducts = 0;
    let activeCategories = 0;

    mainCategories.forEach((cat) => {
      const subs = subcategoriesMap[String(cat._id)] || [];
      totalSubcategories += subs.length;
      totalProducts += Number(cat.productCount || 0);
      if (cat.status === "active") activeCategories++;
    });

    return {
      totalCategories,
      totalSubcategories,
      totalProducts,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
    };
  }, [mainCategories, subcategoriesMap]);

  // Filtering & Sorting
  const filteredMainCategories = useMemo(() => {
    return mainCategories
      .filter((cat) => {
        const matchesStatus = filterStatus === "all" || cat.status === filterStatus;
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return matchesStatus;

        const subs = subcategoriesMap[String(cat._id)] || [];
        const hasMatchingSub = subs.some(
          (s) =>
            s.name?.toLowerCase().includes(searchLower) ||
            s.slug?.toLowerCase().includes(searchLower)
        );

        const matchesCat =
          cat.name?.toLowerCase().includes(searchLower) ||
          cat.slug?.toLowerCase().includes(searchLower) ||
          cat.description?.toLowerCase().includes(searchLower);

        return matchesStatus && (matchesCat || hasMatchingSub);
      })
      .sort((a, b) => {
        if (sortBy === "order") {
          return (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0);
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "products") {
          return (Number(b.productCount) || 0) - (Number(a.productCount) || 0);
        }
        return 0;
      });
  }, [mainCategories, subcategoriesMap, searchTerm, filterStatus, sortBy]);

  const toggleExpand = (catId) => {
    setExpandedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const expandAll = () => {
    setExpandedCatIds(mainCategories.map((c) => String(c._id)));
  };

  const collapseAll = () => {
    setExpandedCatIds([]);
  };

  // Toggle Category Status (Active/Inactive)
  const handleToggleStatus = async (item, isSub = false) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    try {
      const data = new FormData();
      data.append("status", nextStatus);
      await adminApi.updateCategory(item._id, data);
      toast.success(
        `${item.name} set to ${nextStatus === "active" ? "Active" : "Inactive"}`
      );
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  // Open Create / Edit Category Modal
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormData({
        name: cat.name || "",
        slug: cat.slug || "",
        description: cat.description || "",
        displayOrder: cat.displayOrder ?? 1,
        status: cat.status || "active",
        type: "header",
      });
      setCatImagePreview(cat.image || null);
      setCatImageFile(null);
    } else {
      setEditingCategory(null);
      const nextOrder = mainCategories.length + 1;
      setCatFormData({
        name: "",
        slug: "",
        description: "",
        displayOrder: nextOrder,
        status: "active",
        type: "header",
      });
      setCatImagePreview(null);
      setCatImageFile(null);
    }
    setIsCatModalOpen(true);
  };

  // Open Create / Edit Subcategory Modal
  const openSubcategoryModal = (parentCategory = null, sub = null) => {
    if (sub) {
      setEditingSubcategory(sub);
      setSubFormData({
        name: sub.name || "",
        slug: sub.slug || "",
        description: sub.description || "",
        displayOrder: sub.displayOrder ?? 1,
        status: sub.status || "active",
        type: "category",
        parentId: String(sub.parentId?._id || sub.parentId || parentCategory?._id || ""),
      });
      setSubImagePreview(sub.image || null);
      setSubImageFile(null);
    } else {
      setEditingSubcategory(null);
      const pId = String(parentCategory?._id || mainCategories[0]?._id || "");
      const existingSubs = subcategoriesMap[pId] || [];
      const nextOrder = existingSubs.length + 1;
      setSubFormData({
        name: "",
        slug: "",
        description: "",
        displayOrder: nextOrder,
        status: "active",
        type: "category",
        parentId: pId,
      });
      setSubImagePreview(null);
      setSubImageFile(null);
    }
    setIsSubModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      return toast.error("Category name is required");
    }

    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("name", catFormData.name.trim());
      data.append("slug", catFormData.slug.trim() || makeSlug(catFormData.name));
      data.append("description", catFormData.description || "");
      data.append("displayOrder", Number(catFormData.displayOrder) || 0);
      data.append("status", catFormData.status);
      data.append("type", "header");

      if (catImageFile) {
        const compressed = await compressImage(catImageFile);
        data.append("image", compressed);
      } else if (catImagePreview && typeof catImagePreview === "string") {
        data.append("image", catImagePreview);
      }

      if (editingCategory) {
        await adminApi.updateCategory(editingCategory._id, data);
        toast.success(`Category "${catFormData.name}" updated successfully`);
      } else {
        await adminApi.createCategory(data);
        toast.success(`Category "${catFormData.name}" created successfully`);
      }

      setIsCatModalOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Subcategory
  const handleSaveSubcategory = async (e) => {
    e.preventDefault();
    if (!subFormData.name.trim()) {
      return toast.error("Subcategory name is required");
    }
    if (!subFormData.parentId) {
      return toast.error("Parent category is required");
    }

    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("name", subFormData.name.trim());
      data.append("slug", subFormData.slug.trim() || makeSlug(subFormData.name));
      data.append("description", subFormData.description || "");
      data.append("displayOrder", Number(subFormData.displayOrder) || 0);
      data.append("status", subFormData.status);
      data.append("type", "category");
      data.append("parentId", subFormData.parentId);

      if (subImageFile) {
        const compressed = await compressImage(subImageFile);
        data.append("image", compressed);
      } else if (subImagePreview && typeof subImagePreview === "string") {
        data.append("image", subImagePreview);
      }

      if (editingSubcategory) {
        await adminApi.updateCategory(editingSubcategory._id, data);
        toast.success(`Subcategory "${subFormData.name}" updated successfully`);
      } else {
        await adminApi.createCategory(data);
        toast.success(`Subcategory "${subFormData.name}" created successfully`);
      }

      setIsSubModalOpen(false);
      // Auto-expand the parent category
      if (!expandedCatIds.includes(subFormData.parentId)) {
        setExpandedCatIds((prev) => [...prev, subFormData.parentId]);
      }
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save subcategory");
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Safe Deletion Dialog
  const promptDelete = (item, isSub = false) => {
    setDeleteTarget({ item, isSub });
    setIsDeleteModalOpen(true);
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.item?._id) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteCategory(deleteTarget.item._id);
      toast.success(
        `${deleteTarget.isSub ? "Subcategory" : "Category"} deleted successfully`
      );
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Cannot delete category with associated products"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ──── Header Banner ──── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-widest rounded-full">
              Catalogue Management
            </span>
            <span className="text-xs text-slate-400">• Meatyns Dynamic Store</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Categories & Subcategories
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Manage your dynamic meat and seafood catalogue. Configure categories,
            organize subcategories, and ensure accurate customer browsing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openCategoryModal()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </button>
          <button
            onClick={() => fetchCategories()}
            disabled={isLoading}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            title="Refresh catalogue"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ──── Metric KPI Cards ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{stats.totalCategories}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Main Categories
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{stats.totalSubcategories}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Subcategories
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{stats.totalProducts}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mapped Products
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              {stats.activeCategories} <span className="text-xs text-slate-400 font-normal">/ {stats.totalCategories}</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Status
            </div>
          </div>
        </Card>
      </div>

      {/* ──── Controls Bar ──── */}
      <Card className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search category, subcategory, or slug..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-rose-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="order">Sort: Display Order</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="products">Sort: Most Products</option>
            </select>
          </div>

          {/* Expand / Collapse All */}
          <button
            onClick={expandedCatIds.length > 0 ? collapseAll : expandAll}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            {expandedCatIds.length > 0 ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </Card>

      {/* ──── Categories & Nested Subcategories Table ──── */}
      <Card className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-rose-500" />
            <p className="text-xs font-semibold">Loading catalogue data...</p>
          </div>
        ) : filteredMainCategories.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 text-slate-400 text-center">
            <FolderOpen className="h-12 w-12 text-slate-300" />
            <div className="text-base font-bold text-slate-700">No categories found</div>
            <p className="text-xs max-w-sm">
              {searchTerm
                ? "No categories or subcategories matched your search filter."
                : "Your catalogue is currently empty. Click 'Create Category' to start."}
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
                className="mt-2 text-xs font-bold text-rose-600 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMainCategories.map((category) => {
              const subs = subcategoriesMap[String(category._id)] || [];
              const isExpanded = expandedCatIds.includes(String(category._id));
              const productCount = Number(category.productCount || 0);

              return (
                <div key={category._id} className="transition-colors hover:bg-slate-50/50">
                  {/* Category Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Expand Button */}
                      <button
                        onClick={() => toggleExpand(String(category._id))}
                        className={cn(
                          "p-2 rounded-xl border transition-all shrink-0",
                          isExpanded
                            ? "bg-rose-50 border-rose-200 text-rose-600 rotate-90"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
                        )}
                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      {/* Image Thumbnail */}
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.src = "/categories/chicken.png";
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      {/* Category Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {category.name}
                          </h3>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-mono">
                            /{category.slug}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                              category.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            )}
                          >
                            {category.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {category.description || "No description provided"}
                        </p>
                      </div>
                    </div>

                    {/* Meta stats & Actions */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      {/* Display Order Badge */}
                      <div className="flex flex-col items-center px-2.5 py-1 bg-slate-100 rounded-xl">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Order</span>
                        <span className="text-xs font-black text-slate-800">
                          #{category.displayOrder ?? 0}
                        </span>
                      </div>

                      {/* Subcategories Badge */}
                      <button
                        onClick={() => toggleExpand(String(category._id))}
                        className="flex flex-col items-center px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-xl transition-all"
                      >
                        <span className="text-[9px] font-bold text-amber-700 uppercase">Subcategories</span>
                        <span className="text-xs font-black text-amber-900">{subs.length}</span>
                      </button>

                      {/* Products Count Badge */}
                      <div className="flex flex-col items-center px-3 py-1 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase">Products</span>
                        <span className="text-xs font-black text-emerald-900">{productCount}</span>
                      </div>

                      {/* Actions Buttons */}
                      <div className="flex items-center space-x-1 pl-2">
                        {/* Quick Add Subcategory */}
                        <button
                          onClick={() => openSubcategoryModal(category)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Add subcategory under this category"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </button>

                        {/* Status Toggle */}
                        <button
                          onClick={() => handleToggleStatus(category)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            category.status === "active"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100"
                          )}
                          title={category.status === "active" ? "Deactivate category" : "Activate category"}
                        >
                          {category.status === "active" ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>

                        {/* Edit Category */}
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                          title="Edit category"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete Category */}
                        <button
                          onClick={() => promptDelete(category, false)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ──── Nested Subcategories Section ──── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-50/70 border-t border-slate-100 px-6 py-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Subcategories in {category.name}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                              {subs.length}
                            </span>
                          </div>
                          <button
                            onClick={() => openSubcategoryModal(category)}
                            className="flex items-center space-x-1 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Subcategory</span>
                          </button>
                        </div>

                        {subs.length === 0 ? (
                          <div className="p-6 bg-white border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                            <p className="text-xs font-semibold text-slate-500">
                              No subcategories added under {category.name} yet.
                            </p>
                            <button
                              onClick={() => openSubcategoryModal(category)}
                              className="text-xs font-bold text-rose-600 hover:underline"
                            >
                              + Click here to add the first subcategory
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {subs.map((sub) => (
                              <div
                                key={sub._id}
                                className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                    {sub.image || category.image ? (
                                      <img
                                        src={sub.image || category.image}
                                        alt={sub.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          e.target.src = "/categories/chicken.png";
                                        }}
                                      />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-slate-400" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {sub.name}
                                      </h4>
                                      <span
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full shrink-0",
                                          sub.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                      />
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">
                                      /{sub.slug}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                                    #{sub.displayOrder ?? 0}
                                  </span>

                                  <button
                                    onClick={() => handleToggleStatus(sub, true)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                                    title={sub.status === "active" ? "Deactivate" : "Activate"}
                                  >
                                    {sub.status === "active" ? (
                                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                  </button>

                                  <button
                                    onClick={() => openSubcategoryModal(category, sub)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                                    title="Edit subcategory"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    onClick={() => promptDelete(sub, true)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                                    title="Delete subcategory"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ──── CREATE / EDIT CATEGORY MODAL ──── */}
      <AnimatePresence>
        {isCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {editingCategory ? "Edit Category" : "Create New Category"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Set category name, display order and image for Meatyns
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCatModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                {/* Category Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catFormData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCatFormData((prev) => ({
                        ...prev,
                        name,
                        slug: editingCategory ? prev.slug : makeSlug(name),
                      }));
                    }}
                    placeholder="e.g. Chicken, Mutton, Fish & Seafood"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-rose-500 transition-all"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catFormData.slug}
                    onChange={(e) =>
                      setCatFormData({ ...catFormData, slug: makeSlug(e.target.value) })
                    }
                    placeholder="e.g. chicken, fish-seafood"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold outline-none focus:bg-white focus:border-rose-500 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={catFormData.description}
                    onChange={(e) =>
                      setCatFormData({ ...catFormData, description: e.target.value })
                    }
                    placeholder="Fresh farm cuts description for Meatyns customers..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-rose-500 transition-all resize-none"
                  />
                </div>

                {/* Display Order & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={catFormData.displayOrder}
                      onChange={(e) =>
                        setCatFormData({
                          ...catFormData,
                          displayOrder: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-rose-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={catFormData.status}
                      onChange={(e) =>
                        setCatFormData({ ...catFormData, status: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:bg-white focus:border-rose-500 transition-all"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category Image
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {catImagePreview ? (
                        <img
                          src={catImagePreview}
                          alt="Category preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        ref={catFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCatImageFile(file);
                            setCatImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => catFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload File</span>
                      </button>
                      <input
                        type="text"
                        value={typeof catImagePreview === "string" && !catImageFile ? catImagePreview : ""}
                        onChange={(e) => {
                          setCatImagePreview(e.target.value);
                          setCatImageFile(null);
                        }}
                        placeholder="Or enter image URL..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 active:scale-95 flex items-center space-x-1.5"
                  >
                    {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──── CREATE / EDIT SUBCATEGORY MODAL ──── */}
      <AnimatePresence>
        {isSubModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {editingSubcategory ? "Edit Subcategory" : "Create Subcategory"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Add cuts, varieties, or preparations under a main category
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSubModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubcategory} className="p-6 space-y-4">
                {/* Parent Category Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Parent Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={subFormData.parentId}
                    onChange={(e) =>
                      setSubFormData({ ...subFormData, parentId: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:bg-white focus:border-amber-500 transition-all"
                  >
                    <option value="">Select Parent Category</option>
                    {mainCategories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Subcategory Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subFormData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSubFormData((prev) => ({
                        ...prev,
                        name,
                        slug: editingSubcategory ? prev.slug : makeSlug(name),
                      }));
                    }}
                    placeholder="e.g. Biryani Cut, Boneless Breast, Freshwater Fish"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subFormData.slug}
                    onChange={(e) =>
                      setSubFormData({ ...subFormData, slug: makeSlug(e.target.value) })
                    }
                    placeholder="e.g. biryani-cut, boneless-breast"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold outline-none focus:bg-white focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Display Order & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={subFormData.displayOrder}
                      onChange={(e) =>
                        setSubFormData({
                          ...subFormData,
                          displayOrder: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-amber-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={subFormData.status}
                      onChange={(e) =>
                        setSubFormData({ ...subFormData, status: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:bg-white focus:border-amber-500 transition-all"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Subcategory Image (Optional)
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {subImagePreview ? (
                        <img
                          src={subImagePreview}
                          alt="Subcategory preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        ref={subFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSubImageFile(file);
                            setSubImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => subFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload File</span>
                      </button>
                      <input
                        type="text"
                        value={typeof subImagePreview === "string" && !subImageFile ? subImagePreview : ""}
                        onChange={(e) => {
                          setSubImagePreview(e.target.value);
                          setSubImageFile(null);
                        }}
                        placeholder="Or enter image URL..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsSubModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 active:scale-95 flex items-center space-x-1.5"
                  >
                    {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingSubcategory ? "Save Changes" : "Create Subcategory"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──── DELETE SAFETY MODAL ──── */}
      <AnimatePresence>
        {isDeleteModalOpen && deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="p-6 text-center space-y-4">
                <div
                  className={cn(
                    "mx-auto h-14 w-14 rounded-2xl flex items-center justify-center",
                    Number(deleteTarget.item.productCount || 0) > 0
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                  )}
                >
                  <ShieldAlert className="h-7 w-7" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900">
                    Delete {deleteTarget.isSub ? "Subcategory" : "Category"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete{" "}
                    <span className="font-bold text-slate-800">
                      "{deleteTarget.item.name}"
                    </span>
                    ?
                  </p>
                </div>

                {/* SAFETY CHECK WARNING */}
                {Number(deleteTarget.item.productCount || 0) > 0 ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left space-y-1">
                    <div className="flex items-center space-x-1.5 text-rose-700 text-xs font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Deletion Blocked: Products Associated</span>
                    </div>
                    <p className="text-[11px] text-rose-600 leading-relaxed">
                      This {deleteTarget.isSub ? "subcategory" : "category"} has{" "}
                      <strong>{deleteTarget.item.productCount} product(s)</strong> assigned to it.
                      Please reassign or remove the products before deleting to prevent orphaned catalogue data.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    This action will remove the record and cannot be undone. No products are currently assigned.
                  </p>
                )}

                <div className="pt-2 flex items-center justify-center space-x-2.5">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteTarget(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting || Number(deleteTarget.item.productCount || 0) > 0}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5",
                      Number(deleteTarget.item.productCount || 0) > 0
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95"
                    )}
                  >
                    {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryManagement;
