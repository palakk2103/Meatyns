import React, { useState, useMemo, useEffect } from "react";
import Button from "@shared/components/ui/Button";
import Badge from "@shared/components/ui/Badge";
import {
  HiOutlineArrowLeft,
  HiOutlineCube,
  HiOutlineTag,
  HiOutlineCurrencyDollar,
  HiOutlineSwatch,
  HiOutlineFolderOpen,
  HiOutlinePhoto,
  HiOutlineScale,
  HiOutlineArrowPath,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineSquaresPlus,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage } from "@/core/utils/imageCompression";
import { sellerApi } from "../services/sellerApi";
import { clearAllCache, invalidateCache } from "@core/api/dedupe";


const AddProduct = () => {
  const navigate = useNavigate();
  const [modalTab, setModalTab] = useState("general");
  const [keywordInput, setKeywordInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const makeSku = (name, index = 1) => {
    const prefix =
      String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5) || "item";
    return `${prefix}-${String(index).padStart(3, "0")}`;
  };

  const isAutoSku = (sku, name, index = 1) =>
    String(sku || "").toLowerCase() === makeSku(name, index);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    seoKeywords: [],
    sku: "",
    description: "",
    price: "",
    salePrice: "",
    stock: "",
    lowStockAlert: 5,
    category: "",
    subcategory: "",
    header: "",
    status: "active",
    tags: "",
    weight: "",
    brand: "",
    mainImage: null,
    galleryImages: [],
    variants: [
      {
        id: Date.now(),
        name: "",
        price: "",
        salePrice: "",
        stock: "",
        sku: "",
      },
    ],
  });

  const [dbCategories, setDbCategories] = useState([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.name) return prev;

      const nextSku =
        !prev.sku || isAutoSku(prev.sku, prev.name, 1)
          ? makeSku(prev.name, 1)
          : prev.sku;

      const nextVariants = prev.variants.map((variant, idx) => {
        const variantIndex = idx + 1;
        const shouldAuto =
          !variant.sku || isAutoSku(variant.sku, prev.name, variantIndex);
        return shouldAuto
          ? { ...variant, sku: makeSku(prev.name, variantIndex) }
          : variant;
      });

      const changed =
        nextSku !== prev.sku ||
        nextVariants.some((variant, idx) => variant !== prev.variants[idx]);

      return changed ? { ...prev, sku: nextSku, variants: nextVariants } : prev;
    });
  }, [formData.name]);

  React.useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await sellerApi.getCategoryTree();
        if (res.data.success) {
          setDbCategories(res.data.results || res.data.result || []);
        }
      } catch (error) {
        toast.error("Failed to load categories");
      } finally {
        setIsLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  const categories = dbCategories;

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name) {
      toast.error("Please fill in the Product Title");
      return;
    }

    // Validate category and subcategory levels
    if (!(formData.category || formData.header) || !formData.subcategory) {
      toast.error("Please select Category and Subcategory");
      return;
    }
    formData.header = formData.header || formData.category;
    formData.category = formData.category || formData.header;

    const firstVariant = formData.variants[0] || {};
    if (!firstVariant.price || !firstVariant.stock) {
      toast.error("Main variant must have price and stock");
      return;
    }

    setIsSaving(true);
    try {
      const data = new FormData();

      // Basic fields
      data.append("name", formData.name);
      data.append("slug", formData.slug || "");
      data.append("metaTitle", formData.metaTitle || "");
      data.append("metaDescription", formData.metaDescription || "");
      data.append("seoKeywords", JSON.stringify(formData.seoKeywords || []));
      data.append("sku", formData.sku);
      data.append("description", formData.description);
      data.append("brand", formData.brand);
      data.append("weight", formData.weight);
      data.append("status", formData.status);

      // Map top-level price/stock from first variant for indexing/listing
      data.append("price", firstVariant.price);
      data.append("salePrice", firstVariant.salePrice || 0);
      data.append("stock", firstVariant.stock);

      // Category IDs
      data.append("headerId", formData.header);
      data.append("categoryId", formData.category);
      data.append("subcategoryId", formData.subcategory);

      // Tags
      data.append("tags", formData.tags);

      // Images
      if (formData.mainImageFile) {
        const compressedMain = await compressImage(formData.mainImageFile);
        data.append("mainImage", compressedMain);
      } else if (formData.mainImage && typeof formData.mainImage === "string") {
        data.append("mainImage", formData.mainImage);
      }

      if (formData.galleryFiles && formData.galleryFiles.length > 0) {
        const compressedGalleryPromises = formData.galleryFiles.map(file => compressImage(file));
        const compressedGalleryFiles = await Promise.all(compressedGalleryPromises);
        compressedGalleryFiles.forEach(file => {
          data.append("galleryImages", file);
        });
      } else if (formData.galleryImages && formData.galleryImages.length > 0) {
        formData.galleryImages.forEach(img => {
          if (typeof img === "string") data.append("galleryImages", img);
        });
      }

      // Variants
      data.append("variants", JSON.stringify(formData.variants));

      const response = await sellerApi.createProduct(data);
      try {
        clearAllCache();
        invalidateCache("/products");
        invalidateCache("/categories");
        invalidateCache("/offer-sections");
        invalidateCache("/experience");
        sessionStorage.setItem("clear_home_cache", "true");
      } catch (err) {
        console.error("Cache invalidation failed:", err);
      }
      const approvalStatus = response?.data?.result?.approvalStatus;
      if (approvalStatus === "pending") {
        toast.success("Product submitted for admin approval");
      } else {
        toast.success(response?.data?.message || "Product saved successfully!");
      }
      navigate("/seller/products");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "main") {
          setFormData((prev) => ({
            ...prev,
            mainImage: reader.result,
            mainImageFile: file
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            galleryImages: [...prev.galleryImages, reader.result],
            galleryFiles: [...(prev.galleryFiles || []), file]
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button
          variant="ghost"
          className="pl-0 hover:bg-transparent hover:text-primary-600"
          onClick={() => navigate(-1)}>
          <HiOutlineArrowLeft className="mr-2 h-5 w-5" />
          Back to Products
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[140px]">
            {isSaving ? (
              <>
                <HiOutlineArrowPath className="mr-2 h-5 w-5 animate-spin" />
                Publishing...
              </>
            ) : (
              "Save & Publish"
            )}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-100">
        {/* Sidebar Tabs */}
        <div className="md:w-64 bg-slate-50/50 border-r border-slate-100 p-4 space-y-1 overflow-y-auto">
          {[
            { id: "general", label: "General Info", icon: HiOutlineTag },
            { id: "variants", label: "Item Variants", icon: HiOutlineSwatch },
            { id: "category", label: "Groups", icon: HiOutlineFolderOpen },
            { id: "media", label: "Photos", icon: HiOutlinePhoto },
            { id: "seo", label: "SEO Settings", icon: HiOutlineGlobeAlt },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setModalTab(tab.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-md text-xs font-bold transition-all text-left",
                modalTab === tab.id
                  ? "bg-white text-primary shadow-sm ring-1 ring-slate-100"
                  : "text-slate-600 hover:bg-slate-100",
              )}>
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}

          <div className="pt-8 px-4">
            <div className="p-4 bg-brand-50 rounded-md border border-brand-100">
              <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest mb-1">
                Status
              </p>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full bg-transparent border-none text-xs font-bold text-brand-700 outline-none p-0 cursor-pointer focus:ring-0">
                <option value="active">PUBLISHED</option>
                <option value="inactive">DRAFT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {modalTab === "general" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Product Title
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name: nextName,
                      sku:
                        !prev.sku || isAutoSku(prev.sku, prev.name, 1)
                          ? makeSku(nextName, 1)
                          : prev.sku,
                      variants: prev.variants.map((variant, idx) => {
                        const variantIndex = idx + 1;
                        const shouldAuto =
                          !variant.sku ||
                          isAutoSku(variant.sku, prev.name, variantIndex);
                        return shouldAuto
                          ? { ...variant, sku: makeSku(nextName, variantIndex) }
                          : variant;
                      }),
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                  placeholder="e.g. Premium Basmati Rice"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  About this item
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-semibold min-h-[160px] max-h-[260px] outline-none transition-all focus:ring-2 focus:ring-primary/5 resize-none overflow-y-auto custom-scrollbar"
                  placeholder="Describe the item here..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Brand Name
                  </label>
                  <input
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="e.g. Amul"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Product Code
                  </label>
                  <input
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-mono font-bold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="AUTO-GENERATED"
                  />
                </div>
              </div>
            </div>
          )}

          {modalTab === "variants" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Product Variants
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Add different sizes, colors or weights.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: [
                        ...prev.variants,
                        {
                          id: Date.now(),
                          name: "",
                          price: "",
                          salePrice: "",
                          stock: "",
                          sku: makeSku(prev.name, prev.variants.length + 1),
                        },
                      ],
                    }))
                  }
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all">
                  <HiOutlineSquaresPlus className="h-4 w-4" />
                  <span>ADD VARIANT</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.variants || []).map((variant, index) => (
                  <div
                    key={variant.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end group relative">
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Variant Name
                      </label>
                      <input
                        value={variant.name}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setFormData((prev) => {
                            const newVariants = prev.variants.map((item, idx) => {
                              if (idx !== index) return item;
                              return { ...item, name: nextValue };
                            });
                            return {
                              ...prev,
                              variants: newVariants,
                            };
                          });
                        }}
                        placeholder="e.g. 1kg, 1 pack, 1 liter..."
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Price
                      </label>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => {
                          const newVariants = [...formData.variants];
                          newVariants[index].price = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder="500"
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <label className="text-[8px] font-bold text-brand-500 uppercase tracking-widest ml-1">
                        Sale
                      </label>
                      <input
                        type="number"
                        value={variant.salePrice}
                        onChange={(e) => {
                          const newVariants = [...formData.variants];
                          newVariants[index].salePrice = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder="450"
                        className="w-full px-3 py-2 bg-brand-50 ring-1 ring-brand-100 border-none rounded-xl text-xs font-bold text-brand-700 outline-none focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => {
                          const newVariants = [...formData.variants];
                          newVariants[index].stock = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-5 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Product Code
                      </label>
                      <input
                        value={variant.sku}
                        onChange={(e) => {
                          const newVariants = [...formData.variants];
                          newVariants[index].sku = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder={makeSku(formData.name, index + 1)}
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pb-1">
                      <button
                        onClick={() => {
                          if (formData.variants.length > 1) {
                            setFormData((prev) => {
                              const remaining = prev.variants
                                .map((variant, idx) => ({ variant, oldIndex: idx + 1 }))
                                .filter((item) => item.oldIndex !== index + 1)
                                .map((item, newIdx) => {
                                  const shouldAuto =
                                    !item.variant.sku ||
                                    isAutoSku(item.variant.sku, prev.name, item.oldIndex);
                                  return shouldAuto
                                    ? { ...item.variant, sku: makeSku(prev.name, newIdx + 1) }
                                    : item.variant;
                                });
                              return { ...prev, variants: remaining };
                            });
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modalTab === "category" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category || formData.header}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setFormData({
                        ...formData,
                        header: selectedId,
                        category: selectedId,
                        subcategory: ""
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/5 transition-all">
                    <option value="">Select Category</option>
                    {categories.map((h) => (
                      <option key={h._id || h.id} value={h._id || h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Subcategory <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) =>
                      setFormData({ ...formData, subcategory: e.target.value })
                    }
                    disabled={!(formData.category || formData.header)}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Select Subcategory</option>
                    {(() => {
                      const activeCatId = formData.category || formData.header;
                      const matchedCat = categories.find((c) => (c._id || c.id) === activeCatId);
                      if (!matchedCat || !Array.isArray(matchedCat.children)) return null;

                      const hasGrandchildren = matchedCat.children.some(
                        (c) => Array.isArray(c.children) && c.children.length > 0
                      );
                      if (hasGrandchildren) {
                        return matchedCat.children.map((group) => (
                          <optgroup key={group._id || group.id} label={group.name}>
                            {(group.children || []).map((sub) => (
                              <option key={sub._id || sub.id} value={sub._id || sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </optgroup>
                        ));
                      }

                      return matchedCat.children.map((sub) => (
                        <option key={sub._id || sub.id} value={sub._id || sub.id}>
                          {sub.name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
            </div>
          )}

          {modalTab === "media" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
              {/* Main Image Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Main Cover Photo
                </label>
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-48 aspect-square rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer overflow-hidden relative">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => handleImageUpload(e, "main")}
                    />
                    {formData.mainImage ? (
                      <img
                        src={formData.mainImage}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <HiOutlinePhoto className="h-10 w-10 text-slate-200 group-hover:text-primary transition-colors" />
                        <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase tracking-widest group-hover:text-primary">
                          Upload Cover
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 pt-2">
                    <p className="text-xs font-bold text-slate-900">
                      Choose a primary image
                    </p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      We show this image on the search page and the main
                      store listing. Make sure it is clear and bright.
                    </p>
                    <button className="text-[10px] font-black text-primary uppercase tracking-wider hover:underline">
                      Pick from Library
                    </button>
                  </div>
                </div>
              </div>

              {/* Gallery Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Gallery Photos (Max 5)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-md border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden">
                      {formData.galleryImages[i - 1] ? (
                        <img
                          src={formData.galleryImages[i - 1]}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={(e) => handleImageUpload(e, "gallery")}
                          />
                          <HiOutlinePlus className="h-5 w-5 text-slate-200 group-hover:text-primary transition-colors" />
                          <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase tracking-widest group-hover:text-primary">
                            Add
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium italic text-center pt-4 border-t border-slate-50">
                Quick Tip: Using WebP format at 800x800px makes your store load
                3x faster.
              </p>
            </div>
          )}

          {modalTab === "seo" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineGlobeAlt className="h-4 w-4 text-primary" />
                  SEO Settings &amp; Metadata
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Improve this product's visibility on Google search and social networks with tailored metadata.
                </p>
              </div>

              {/* Google Snippet Live Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Engine Preview</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">Google Result</span>
                </div>
                <div className="space-y-1 font-sans">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="text-slate-400 text-[11px]">https://meatyns.com</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-slate-500 font-medium">product</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-slate-600 font-mono text-[11px]">{formData.slug || 'product-slug'}</span>
                  </div>
                  <h5 className="text-[16px] font-medium text-blue-700 hover:underline cursor-pointer leading-snug">
                    {formData.metaTitle?.trim() || `${formData.name || 'Product Title'} | Meatyns`}
                  </h5>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {formData.metaDescription?.trim() || formData.description || 'Buy fresh, hygienic products online with fast delivery on Meatyns.'}
                  </p>
                </div>
              </div>              {/* Meta Title */}
              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Meta Title <span className="text-slate-400 font-normal lowercase">(title tag)</span>
                  </label>
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                    formData.metaTitle?.length >= 30 && formData.metaTitle?.length <= 60
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : formData.metaTitle?.length > 60
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                  )}>
                    {(formData.metaTitle || '').length} / 60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.metaTitle || ""}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="Fresh Chicken Breast Online | Meatyns"
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                />
                <p className="text-[10px] text-slate-400 ml-1">
                  Ideal length: 50–60 characters. If left empty, search engines default to the product title.
                </p>
              </div>

              {/* Meta Description */}
              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Meta Description
                  </label>
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                    formData.metaDescription?.length >= 100 && formData.metaDescription?.length <= 160
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : formData.metaDescription?.length > 160
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                  )}>
                    {(formData.metaDescription || '').length} / 160 chars
                  </span>
                </div>
                <textarea
                  value={formData.metaDescription || ""}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  rows={3}
                  placeholder="Buy fresh chicken breast online with fast delivery. Quality products at competitive prices."
                  className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2 resize-none"
                />
                <p className="text-[10px] text-slate-400 ml-1">
                  Ideal length: 140–160 characters. A concise summary that entices customers to click from search results.
                </p>
              </div>

              {/* SEO Slug */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  SEO Slug <span className="text-slate-400 font-normal lowercase">(URL path)</span>
                </label>
                <div className="flex items-center bg-slate-100 rounded-md px-4 py-2.5">
                  <span className="text-[11px] text-slate-400 font-bold mr-1">/product/</span>
                  <input
                    type="text"
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="fresh-chicken-breast"
                    className="flex-1 bg-transparent border-none text-sm text-slate-700 font-mono font-semibold outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">
                  Used for SEO-friendly URLs. Clean, lowercase words separated with hyphens.
                </p>
              </div>

              {/* SEO Keywords */}
              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    SEO Keywords <span className="text-slate-400 font-normal lowercase">(backlinks &amp; search catalog)</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {(formData.seoKeywords || []).length} keywords
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  {/* Chips container */}
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                    {(formData.seoKeywords || []).map((keyword, idx) => (
                      <span
                        key={`${keyword}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-700 rounded-lg group hover:border-rose-200 transition-all"
                      >
                        <span>{keyword}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              seoKeywords: (formData.seoKeywords || []).filter((_, i) => i !== idx)
                            });
                          }}
                          className="text-slate-400 hover:text-rose-500 rounded-full transition-colors ml-0.5 text-sm leading-none"
                          title="Remove keyword"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {(!formData.seoKeywords || formData.seoKeywords.length === 0) && (
                      <span className="text-xs text-slate-400 italic">No keywords added yet.</span>
                    )}
                  </div>

                  {/* Input row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = keywordInput.trim().replace(/^,+|,+$/g, '');
                          if (val && !(formData.seoKeywords || []).includes(val)) {
                            setFormData({
                              ...formData,
                              seoKeywords: [...(formData.seoKeywords || []), val]
                            });
                            setKeywordInput('');
                          }
                        }
                      }}
                      placeholder="Enter SEO keyword and press Enter (e.g. fresh chicken)..."
                      className="flex-1 bg-white ring-1 ring-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = keywordInput.trim().replace(/^,+|,+$/g, '');
                        if (val && !(formData.seoKeywords || []).includes(val)) {
                          setFormData({
                            ...formData,
                            seoKeywords: [...(formData.seoKeywords || []), val]
                          });
                          setKeywordInput('');
                        }
                      }}
                      disabled={!keywordInput.trim()}
                      className="text-xs font-bold text-white bg-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 ml-1">
                  Stored per product in the backend. Type a keyword and press <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-mono font-bold">Enter</kbd> or click <strong>Add</strong>.
                </p>
              </div>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
