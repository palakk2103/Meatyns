import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  List,
  ChevronRight,
  Search,
  FolderOpen,
  Folder,
  Tag,
  Layers,
  ArrowRight,
  Package,
  Trash2,
} from "lucide-react";
import { adminApi } from "../../services/adminApi";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import { toast } from "sonner";

const CategoryHierarchy = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Selection State for Miller Columns
  const [selectedHeader, setSelectedHeader] = useState(null);
  const [selectedLevel2, setSelectedLevel2] = useState(null);
  const [subProducts, setSubProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Stats
  const stats = useMemo(() => {
    let headers = 0;
    let l2 = 0;
    let subs = 0;

    const traverse = (items) => {
      items.forEach((item) => {
        if (item.type === "header") headers++;
        if (item.type === "category") l2++;
        if (item.type === "subcategory") subs++;
        if (item.children) traverse(item.children);
      });
    };
    traverse(categories);
    return { headers, l2, subs, total: headers + l2 + subs };
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getCategoryTree();
      if (res.data.success) {
        setCategories(res.data.results || res.data.result || []);
      }
    } catch (error) {
      toast.error("Failed to fetch category hierarchy");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await adminApi.deleteAllCategories({ type: "all" });
      toast.success("All categories deleted successfully");
      setIsDeleteAllModalOpen(false);
      setSelectedHeader(null);
      setSelectedLevel2(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete all categories");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter Logic
  const filteredHeaders = useMemo(() => {
    if (!searchTerm) return categories.filter((c) => c.type === "header");

    // If searching, we want to show path to matches
    // But for Miller columns, simple filtering of top level might be confusing
    // So we'll just filter the current list being viewed
    return categories.filter(
      (c) =>
        c.type === "header" &&
        c.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [categories, searchTerm]);

  const activeLevel2 = useMemo(() => {
    if (!selectedHeader) return [];
    return selectedHeader.children || [];
  }, [selectedHeader]);

  const activeSubs = useMemo(() => {
    if (!selectedLevel2) return [];
    return selectedLevel2.children || [];
  }, [selectedLevel2]);

  // Fetch products for selected subcategory
  useEffect(() => {
    if (!selectedLevel2) {
      setSubProducts([]);
      return;
    }
    const fetchSubProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const subId = selectedLevel2._id || selectedLevel2.id;
        const res = await adminApi.getProducts({ subcategoryId: subId, limit: 50 });
        const list = res.data?.results || res.data?.result?.items || res.data?.result || [];
        setSubProducts(Array.isArray(list) ? list : []);
      } catch (e) {
        setSubProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchSubProducts();
  }, [selectedLevel2]);

  // Handle Selection
  const handleHeaderSelect = (header) => {
    setSelectedHeader(header);
    setSelectedLevel2(null);
    setSubProducts([]);
  };

  const handleLevel2Select = (l2) => {
    setSelectedLevel2(l2);
  };

  // Components
  const ColumnHeader = ({ title, icon: Icon, count, color }) => (
    <div
      className={`p-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between ${color}`}>
      <div className="flex items-center gap-2 font-bold text-gray-700">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <Badge variant="neutral" className="bg-gray-100 text-gray-600 font-mono">
        {count}
      </Badge>
    </div>
  );

  const ListItem = ({ item, isSelected, onClick, hasChildren, type }) => {
    const activeClass = isSelected
      ? "bg-brand-50 border-brand-200 text-brand-700 shadow-sm z-10"
      : "hover:bg-gray-50 border-transparent text-gray-600";

    const iconColor = isSelected ? "text-brand-500" : "text-gray-400";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onClick}
        className={`
                    group flex items-center justify-between p-3 mx-2 my-1 rounded-lg border cursor-pointer transition-all duration-200
                    ${activeClass}
                `}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`
                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${isSelected ? "bg-white shadow-sm" : "bg-gray-100 group-hover:bg-white group-hover:shadow-sm"}
                    `}>
            {item.image?.url || item.image ? (
              <img
                src={item.image?.url || item.image}
                alt=""
                className="w-full h-full object-cover rounded-lg"
              />
            ) : type === "header" ? (
              <FolderOpen className={`w-4 h-4 ${iconColor}`} />
            ) : type === "category" ? (
              <Folder className={`w-4 h-4 ${iconColor}`} />
            ) : (
              <Tag className={`w-4 h-4 ${iconColor}`} />
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-sm truncate">{item.name}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 truncate">
              {item.slug}
            </span>
          </div>
        </div>

        {hasChildren && (
          <ChevronRight
            className={`w-4 h-4 ${isSelected ? "text-brand-400" : "text-gray-300"}`}
          />
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-600" />
            Category Hierarchy Explorer
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Visual overview of your catalog structure ({stats.total} items)
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500"></span>
              <span>
                Categories: <b>{stats.headers}</b>
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>
                Subcategories: <b>{stats.l2 + stats.subs}</b>
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                Mode: <b>Category &rarr; Subcategory</b>
              </span>
            </div>
          </div>
          {stats.total > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors font-medium text-sm shadow-sm">
              <Trash2 className="w-4 h-4 text-white" />
              Delete All Categories
            </button>
          )}
        </div>
      </div>

      {/* Miller Columns View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 md:grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden">
        {/* Column 1: Headers */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 h-full">
          <ColumnHeader
            title="Categories"
            icon={LayoutGrid}
            count={filteredHeaders.length}
            color="border-l-4 border-l-brand-500"
          />

          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto py-2 custom-scrollbar overscroll-contain touch-pan-y"
            tabIndex={0}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Loading structure...
              </div>
            ) : filteredHeaders.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No headers found
              </div>
            ) : (
              filteredHeaders.map((header) => (
                <ListItem
                  key={header._id || header.id}
                  item={header}
                  type="header"
                  isSelected={
                    selectedHeader &&
                    (selectedHeader._id || selectedHeader.id) ===
                    (header._id || header.id)
                  }
                  onClick={() => handleHeaderSelect(header)}
                  hasChildren={header.children && header.children.length > 0}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Subcategories */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 h-full transition-all duration-300">
          <ColumnHeader
            title="Subcategories"
            icon={Folder}
            count={activeLevel2.length}
            color="border-l-4 border-l-purple-500"
          />

          {!selectedHeader ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50">
              <ArrowRight className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">
                Select a Category
                <br />
                to view its subcategories
              </p>
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 overflow-y-auto py-2 custom-scrollbar overscroll-contain touch-pan-y"
              tabIndex={0}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {activeLevel2.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No subcategories in <br />
                  <span className="font-bold text-gray-600">
                    "{selectedHeader.name}"
                  </span>
                </div>
              ) : (
                activeLevel2.map((l2) => (
                  <ListItem
                    key={l2._id || l2.id}
                    item={l2}
                    type="category"
                    isSelected={
                      selectedLevel2 &&
                      (selectedLevel2._id || selectedLevel2.id) ===
                      (l2._id || l2.id)
                    }
                    onClick={() => handleLevel2Select(l2)}
                    hasChildren={l2.children && l2.children.length > 0}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Column 3: Products / Cuts or Level 3 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 h-full">
          <ColumnHeader
            title={activeSubs.length > 0 ? "Level 3 Subcategories" : "Products & Cuts"}
            icon={activeSubs.length > 0 ? Tag : Package}
            count={activeSubs.length > 0 ? activeSubs.length : subProducts.length}
            color="border-l-4 border-l-emerald-500"
          />

          {!selectedLevel2 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50">
              <ArrowRight className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">
                Select a Subcategory
                <br />
                to view its assigned products
              </p>
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 overflow-y-auto py-2 custom-scrollbar overscroll-contain touch-pan-y"
              tabIndex={0}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {activeSubs.length > 0 ? (
                activeSubs.map((sub) => (
                  <ListItem
                    key={sub._id || sub.id}
                    item={sub}
                    type="subcategory"
                    isSelected={false}
                    onClick={() => { }}
                    hasChildren={false}
                  />
                ))
              ) : isLoadingProducts ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Loading products...
                </div>
              ) : subProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                  <Package className="w-8 h-8 mb-2 opacity-30 text-gray-500" />
                  <p>
                    No products assigned to <br />
                    <span className="font-bold text-gray-600">
                      "{selectedLevel2.name}"
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Assign cuts from Admin &rarr; Products
                  </p>
                </div>
              ) : (
                <div className="px-3 py-1 space-y-2">
                  <div className="px-1 py-1 text-xs font-semibold text-gray-500 flex items-center justify-between">
                    <span>Mapped Products ({subProducts.length})</span>
                    <span className="text-[10px] text-brand-600 font-mono">Subcategory: {selectedLevel2.name}</span>
                  </div>
                  {subProducts.map((p) => (
                    <div
                      key={p._id || p.id}
                      className="flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-100 transition-all text-xs"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0">
                        <img
                          src={p.mainImage || p.image || "/categories/chicken.png"}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                          <span className="font-bold text-brand-700">₹{p.salePrice || p.price}</span>
                          {p.weight && <span>• {p.weight}</span>}
                          {p.stock !== undefined && (
                            <span className={p.stock > 0 ? "text-emerald-600" : "text-red-500"}>
                              • Stock: {p.stock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Delete All Categories?
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">ALL {stats.total} categories</span>? This will permanently delete all Header Categories, Main Categories, and Sub-Categories. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllModalOpen(false)}
                    disabled={isDeletingAll}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={isDeletingAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2">
                    {isDeletingAll && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {isDeletingAll ? "Deleting..." : "Delete All"}
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

export default CategoryHierarchy;
