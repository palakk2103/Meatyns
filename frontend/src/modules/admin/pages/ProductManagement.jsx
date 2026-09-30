import React, { useState, useMemo, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';
import {
    HiOutlinePlus,
    HiOutlineCube,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlinePhoto,
    HiOutlineArchiveBox,
    HiOutlineTag,
    HiOutlineArrowPath,
    HiOutlineXMark,
    HiOutlineChevronRight,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
    HiOutlineFolderOpen,
    HiOutlineSwatch,
    HiOutlineSquaresPlus,
    HiOutlineGlobeAlt,
    HiOutlineSparkles,
    HiOutlineEye
} from 'react-icons/hi2';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]); // All categories for dropdowns
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // View mode: 'catalog' for regular product management, 'seo' for SEO-focused view
    const [viewMode, setViewMode] = useState('catalog');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterApprovalStatus, setFilterApprovalStatus] = useState('all');
    const [filterSeoStatus, setFilterSeoStatus] = useState('all'); // 'all' | 'complete' | 'incomplete'
    const [sortBy, setSortBy] = useState('newest');
    const [moderationCounts, setModerationCounts] = useState({
        all: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        seoComplete: 0,
        seoIncomplete: 0,
    });
    const [moderatingActionId, setModeratingActionId] = useState('');

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemToReject, setItemToReject] = useState(null);
    const [rejectionNote, setRejectionNote] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [modalTab, setModalTab] = useState('general');
    const [keywordInput, setKeywordInput] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        sku: '',
        metaTitle: '',
        metaDescription: '',
        seoKeywords: [],
        description: '',
        price: '',
        salePrice: '',
        stock: '',
        lowStockAlert: 5,
        unit: 'packet',
        header: '',
        categoryId: '',
        subcategoryId: '',
        status: 'active',
        isFeatured: false,
        tags: '',
        weight: '',
        brand: '',
        mainImage: null,
        galleryImages: [],
        variants: [
            { id: Date.now(), name: 'Default', price: '', salePrice: '', stock: '', sku: '' }
        ]
    });

    const [viewingVariants, setViewingVariants] = useState(null);
    const [isVariantsViewModalOpen, setIsVariantsViewModalOpen] = useState(false);

    const fetchCategories = async () => {
        try {
            const response = await adminApi.getCategoryTree();
            if (response.data.success) {
                setCategories(response.data.results || response.data.result || []);
            }
        } catch (error) {
            console.error('Failed to fetch categories');
        }
    };

    const fetchProducts = async (requestedPage = 1) => {
        setIsLoading(true);
        try {
            const params = { page: requestedPage, limit: pageSize };
            if (searchTerm) params.search = searchTerm;
            if (filterCategory !== 'all') params.category = filterCategory;
            if (filterStatus !== 'all') params.status = filterStatus;
            if (filterApprovalStatus !== 'all') params.approvalStatus = filterApprovalStatus;
            if (filterSeoStatus !== 'all') params.seoStatus = filterSeoStatus;
            if (sortBy) params.sort = sortBy;

            const response = await adminApi.getProductModerationList(params);
            if (response.data.success) {
                const payload = response.data.result || {};
                const list = Array.isArray(payload.items) ? payload.items : (response.data.results || []);
                setProducts(list);
                setTotal(typeof payload.total === 'number' ? payload.total : list.length);
                setPage(typeof payload.page === 'number' ? payload.page : requestedPage);
                setModerationCounts({
                    all: Number(payload?.counts?.all || 0),
                    pending: Number(payload?.counts?.pending || 0),
                    approved: Number(payload?.counts?.approved || 0),
                    rejected: Number(payload?.counts?.rejected || 0),
                    seoComplete: Number(payload?.counts?.seoComplete || 0),
                    seoIncomplete: Number(payload?.counts?.seoIncomplete || 0),
                });
            }
        } catch (error) {
            toast.error('Failed to fetch products');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(1);
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [searchTerm, filterCategory, filterStatus, filterApprovalStatus, filterSeoStatus, sortBy, pageSize]);

    const handleSave = async () => {
        if (!editingItem) {
            return toast.error('Only product editing is allowed for admins');
        }

        if (!formData.name || !formData.price || !formData.stock || !(formData.categoryId || formData.header) || !formData.subcategoryId) {
            return toast.error('Please fill all required fields, including category and subcategory');
        }

        setIsSaving(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('slug', formData.slug);
            data.append('sku', formData.sku);
            data.append('metaTitle', formData.metaTitle || '');
            data.append('metaDescription', formData.metaDescription || '');
            data.append('seoKeywords', JSON.stringify(formData.seoKeywords || []));
            data.append('description', formData.description);
            data.append('price', Number(formData.price));
            data.append('salePrice', Number(formData.salePrice) || 0);
            data.append('stock', Number(formData.stock));
            data.append('lowStockAlert', Number(formData.lowStockAlert) || 5);
            data.append('unit', formData.unit);
            data.append('headerId', formData.header || formData.categoryId);
            data.append('categoryId', formData.categoryId || formData.header);
            data.append('subcategoryId', formData.subcategoryId);
            data.append('status', formData.status);
            data.append('isFeatured', formData.isFeatured);
            data.append('brand', formData.brand);
            data.append('weight', formData.weight);
            data.append('tags', formData.tags);
            data.append('variants', JSON.stringify(formData.variants));

            if (formData.mainImageFile) {
                data.append('mainImage', formData.mainImageFile);
            }
            if (formData.galleryFiles && formData.galleryFiles.length > 0) {
                formData.galleryFiles.forEach((file) => data.append('galleryImages', file));
            }

            await adminApi.updateProduct(editingItem._id, data);
            toast.success('Product updated successfully');
            setIsProductModalOpen(false);
            fetchProducts(page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save product');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await adminApi.deleteProduct(itemToDelete._id);
            toast.success('Product deleted');
            setIsDeleteModalOpen(false);
            fetchProducts(page);
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const submitModerationAction = async (product, action, approvalNote = '') => {
        if (!product?._id) return;

        const actionKey = `${action}:${product._id}`;
        setModeratingActionId(actionKey);
        try {
            if (action === 'approve') {
                const res = await adminApi.approveProductModeration(product._id, { approvalNote });
                toast.success(res?.data?.message || 'Product approved successfully');
            } else {
                const res = await adminApi.rejectProductModeration(product._id, { approvalNote });
                toast.success(res?.data?.message || 'Product rejected successfully');
            }
            fetchProducts(page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update product approval status');
        } finally {
            setModeratingActionId('');
        }
    };

    const handleModerationAction = async (product, action) => {
        if (!product?._id) return;

        if (action === 'reject') {
            setItemToReject(product);
            setRejectionNote(product.approvalNote || '');
            setIsRejectModalOpen(true);
            return;
        }

        submitModerationAction(product, action);
    };

    const confirmReject = async () => {
        const note = rejectionNote.trim();
        if (!note) {
            toast.error('Please enter a rejection reason');
            return;
        }

        await submitModerationAction(itemToReject, 'reject', note);
        setIsRejectModalOpen(false);
        setItemToReject(null);
        setRejectionNote('');
    };

    const handleImageUpload = (e, type) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) {
            return;
        }

        if (type === 'main') {
            const file = files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, mainImage: reader.result, mainImageFile: file });
            };
            reader.readAsDataURL(file);
            return;
        }

        const remainingSlots = Math.max(0, 5 - (formData.galleryImages?.length || 0));
        const galleryFiles = files.slice(0, remainingSlots);
        if (galleryFiles.length === 0) {
            toast.error('Max 5 gallery images allowed');
            return;
        }

        Promise.all(
            galleryFiles.map((file) => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ file, url: reader.result });
                reader.readAsDataURL(file);
            }))
        ).then((results) => {
            setFormData({
                ...formData,
                galleryImages: [...(formData.galleryImages || []), ...results.map((item) => item.url)],
                galleryFiles: [...(formData.galleryFiles || []), ...results.map((item) => item.file)]
            });
        });
    };

    const openModal = (item = null, tab = 'general') => {
        if (item) {
            setFormData({
                name: item.name || '',
                slug: item.slug || '',
                sku: item.sku || '',
                metaTitle: item.metaTitle || '',
                metaDescription: item.metaDescription || '',
                seoKeywords: Array.isArray(item.seoKeywords) ? item.seoKeywords : [],
                description: item.description || '',
                price: item.price || '',
                salePrice: item.salePrice || item.discountPrice || '',
                stock: item.stock || '',
                lowStockAlert: item.lowStockAlert || 5,
                unit: item.unit || 'packet',
                header: item.headerId?._id || item.headerId || '',
                categoryId: item.categoryId?._id || item.categoryId || '',
                subcategoryId: item.subcategoryId?._id || item.subcategoryId || '',
                status: item.status || 'active',
                isFeatured: item.isFeatured || false,
                tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
                weight: item.weight || '',
                brand: item.brand || '',
                mainImage: item.mainImage || null,
                galleryImages: item.galleryImages || item.images || [],
                variants: (item.variants && item.variants.length > 0) ? item.variants.map(v => ({ ...v, id: v._id || Date.now() })) : [
                    {
                        id: Date.now(),
                        name: 'Default',
                        price: item.price || '',
                        salePrice: item.salePrice || item.discountPrice || '',
                        stock: item.stock || '',
                        sku: item.sku || ''
                    }
                ]
            });
            setEditingItem(item);
        } else {
            setFormData({
                name: '', slug: '', sku: '', metaTitle: '', metaDescription: '', seoKeywords: [], description: '', price: '',
                salePrice: '', stock: '', lowStockAlert: 5, unit: 'packet',
                header: '', categoryId: '', subcategoryId: '', status: 'active',
                isFeatured: false, tags: '', weight: '', brand: '',
                mainImage: null, galleryImages: [],
                variants: [
                    { id: Date.now(), name: 'Default', price: '', salePrice: '', stock: '', sku: '' }
                ]
            });
            setEditingItem(null);
        }
        setModalTab(tab);
        setIsProductModalOpen(true);
    };

    const getSeoStatus = (item) => {
        const hasTitle = Boolean(item?.metaTitle && String(item.metaTitle).trim());
        const hasDesc = Boolean(item?.metaDescription && String(item.metaDescription).trim());
        const hasSlug = Boolean(item?.slug && String(item.slug).trim());
        const isComplete = hasTitle && hasDesc && hasSlug;
        const missing = [
            !hasTitle && 'Title',
            !hasDesc && 'Description',
            !hasSlug && 'Slug'
        ].filter(Boolean);

        return {
            isComplete,
            label: isComplete ? 'Complete' : 'Incomplete',
            missing
        };
    };

    const SeoStatusBadge = ({ item }) => {
        const status = getSeoStatus(item);
        if (status.isComplete) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Complete
                </span>
            );
        }
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs"
                title={`Missing: ${status.missing.join(', ')}`}
            >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Incomplete
            </span>
        );
    };

    const productsList = Array.isArray(products) ? products : [];
    const stats = useMemo(() => ({
        total: total,
        lowStock: productsList.filter(p => p.stock > 0 && p.stock <= 10).length,
        outOfStock: productsList.filter(p => p.stock === 0).length,
        active: productsList.filter(p => p.status === 'active').length
    }), [productsList, total]);

    const StatusBadge = ({ status, stock }) => {
        if (stock === 0) return <Badge variant="error" className="text-[10px] px-1.5 py-0">Out of Stock</Badge>;
        if (stock <= 10) return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Low Stock</Badge>;
        if (status === 'active') return <Badge variant="success" className="text-[10px] px-1.5 py-0">Active</Badge>;
        return <Badge variant="gray" className="text-[10px] px-1.5 py-0">Draft</Badge>;
    };

    const ApprovalBadge = ({ approvalStatus }) => {
        const normalized = String(approvalStatus || 'approved').toLowerCase();
        if (normalized === 'pending') {
            return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Pending</Badge>;
        }
        if (normalized === 'rejected') {
            return <Badge variant="error" className="text-[10px] px-1.5 py-0">Rejected</Badge>;
        }
        return <Badge variant="success" className="text-[10px] px-1.5 py-0">Approved</Badge>;
    };

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-2 duration-700 pb-16">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="ds-h1 flex items-center gap-2">
                        {viewMode === 'seo' ? 'SEO Product Management' : 'Product List'}
                        <Badge variant="primary" className="text-[9px] px-1.5 py-0 font-bold tracking-wider uppercase">Live</Badge>
                    </h1>
                    <p className="ds-description mt-0.5">
                        {viewMode === 'seo'
                            ? 'Optimize Meta Titles, Meta Descriptions, and URL Slugs for maximum search visibility.'
                            : 'Track your items, prices, and how many are left in stock.'}
                    </p>
                </div>
                {/* View Mode Switcher */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl shadow-inner gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            setViewMode('catalog');
                            setFilterSeoStatus('all');
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            viewMode === 'catalog'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <HiOutlineCube className="h-4 w-4" />
                        <span>Catalog View</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setViewMode('seo');
                            setFilterApprovalStatus('all');
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            viewMode === 'seo'
                                ? "bg-white text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <HiOutlineGlobeAlt className="h-4 w-4 text-primary" />
                        <span>SEO Product List</span>
                        {moderationCounts.seoIncomplete > 0 && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {moderationCounts.seoIncomplete}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            {viewMode === 'seo' ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Products', val: stats.total, icon: HiOutlineCube, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'SEO Complete', val: moderationCounts.seoComplete, icon: HiOutlineCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Incomplete SEO', val: moderationCounts.seoIncomplete, icon: HiOutlineExclamationCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Complete %', val: stats.total > 0 ? `${Math.round((moderationCounts.seoComplete / stats.total) * 100)}%` : '0%', icon: HiOutlineSparkles, color: 'text-brand-600', bg: 'bg-brand-50' }
                    ].map((stat, i) => (
                        <Card key={i} className="border-none shadow-sm ring-1 ring-slate-100 p-4 relative overflow-hidden group">
                            <div className="flex items-center gap-3">
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", stat.bg, stat.color)}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="ds-label">{stat.label}</p>
                                    <h4 className="ds-stat-medium">{stat.val}</h4>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'All Items', val: stats.total, icon: HiOutlineCube, color: 'text-brand-600', bg: 'bg-brand-50' },
                        { label: 'Active Items', val: stats.active, icon: HiOutlineCheckCircle, color: 'text-brand-600', bg: 'bg-brand-50' },
                        { label: 'Low Stock', val: stats.lowStock, icon: HiOutlineExclamationCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Out of Stock', val: stats.outOfStock, icon: HiOutlineArchiveBox, color: 'text-rose-600', bg: 'bg-rose-50' }
                    ].map((stat, i) => (
                        <Card key={i} className="border-none shadow-sm ring-1 ring-slate-100 p-4 relative overflow-hidden group">
                            <div className="flex items-center gap-3">
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", stat.bg, stat.color)}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="ds-label">{stat.label}</p>
                                    <h4 className="ds-stat-medium">{stat.val}</h4>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Card className="border-none shadow-sm ring-1 ring-slate-100 p-3 bg-white/60 backdrop-blur-xl">
                <div className="flex flex-wrap gap-2">
                    {viewMode === 'seo' ? (
                        [
                            { key: 'all', label: 'All SEO Products', count: moderationCounts.all },
                            { key: 'complete', label: 'SEO Complete', count: moderationCounts.seoComplete },
                            { key: 'incomplete', label: 'Incomplete SEO (Action Needed)', count: moderationCounts.seoIncomplete },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setFilterSeoStatus(item.key)}
                                className={cn(
                                    "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                                    filterSeoStatus === item.key
                                        ? "bg-slate-900 text-white"
                                        : item.key === 'incomplete' && moderationCounts.seoIncomplete > 0
                                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100"
                                            : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {item.label} ({item.count})
                            </button>
                        ))
                    ) : (
                        [
                            { key: 'all', label: 'All', count: moderationCounts.all },
                            { key: 'approved', label: 'Approved', count: moderationCounts.approved },
                            { key: 'pending', label: 'Pending Approval', count: moderationCounts.pending },
                            { key: 'rejected', label: 'Rejected', count: moderationCounts.rejected },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setFilterApprovalStatus(item.key)}
                                className={cn(
                                    "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                                    filterApprovalStatus === item.key
                                        ? "bg-slate-900 text-white"
                                        : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {item.label} ({item.count})
                            </button>
                        ))
                    )}
                </div>
            </Card>

            {/* Toolbox */}
            <Card className="border-none shadow-sm ring-1 ring-slate-100 p-3 bg-white/60 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-all" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, SKU or slug..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border-none rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/5 transition-all outline-none"
                        />
                    </div>
                    <div className="flex gap-2 shrink-0 w-full lg:w-auto">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-white ring-1 ring-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-primary/5 outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(h => (
                                <optgroup key={h._id} label={h.name}>
                                    <option value={h._id}>All {h.name}</option>
                                    {(h.children || []).map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                const nextStatus = filterStatus === 'all' ? 'active' : filterStatus === 'active' ? 'inactive' : 'all';
                                setFilterStatus(nextStatus);
                            }}
                            className={cn(
                                "flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                filterStatus === 'active' ? "bg-brand-500 text-primary-foreground shadow-md shadow-brand-100" :
                                    filterStatus === 'inactive' ? "bg-amber-500 text-white shadow-md shadow-amber-100" :
                                        "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                            >
                            <HiOutlineFunnel className="h-4 w-4" />
                            <span>
                                {filterStatus === 'active' ? 'ONLY LIVE' :
                                    filterStatus === 'inactive' ? 'ONLY DRAFT' :
                                        'SHOW ALL'}
                            </span>
                        </button>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-white ring-1 ring-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-primary/5 outline-none appearance-none cursor-pointer"
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                            <option value="price-asc">Price Low-High</option>
                            <option value="price-desc">Price High-Low</option>
                            <option value="stock-asc">Stock Low-High</option>
                            <option value="stock-desc">Stock High-Low</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Product Table */}
            <Card className="border-none shadow-xl ring-1 ring-slate-100 overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                    {viewMode === 'seo' ? (
                        <table className="w-full min-w-[1240px] table-fixed text-left border-collapse">
                            <colgroup>
                                <col className="w-[18%]" />
                                <col className="w-[20%]" />
                                <col className="w-[22%]" />
                                <col className="w-[13%]" />
                                <col className="w-[13%]" />
                                <col className="w-[7%]" />
                                <col className="w-[7%]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Product</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">SEO Title</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Meta Description</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">SEO Slug</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">SEO Keywords</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] whitespace-nowrap">SEO Status</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <HiOutlineArrowPath className="h-8 w-8 text-primary animate-spin" />
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading SEO Products...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : productsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No products found</td>
                                    </tr>
                                ) : productsList.map((p) => {
                                    const seo = getSeoStatus(p);
                                    return (
                                        <tr
                                            key={p._id}
                                            className={cn(
                                                "group transition-colors hover:bg-slate-50/60",
                                                !seo.isComplete && "bg-amber-50/20"
                                            )}
                                        >
                                            {/* Product Column */}
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 shadow-sm">
                                                        <img src={p.mainImage || p.images?.[0]} alt={p.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-semibold leading-5 text-slate-900" title={p.name}>{p.name}</p>
                                                        <p className="truncate text-[10px] font-mono font-medium text-slate-400" title={p.sku}>{p.sku || 'NO SKU'}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* SEO Title Column */}
                                            <td className="px-6 py-5 align-middle">
                                                {p.metaTitle?.trim() ? (
                                                    <div className="space-y-1">
                                                        <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2" title={p.metaTitle}>
                                                            {p.metaTitle}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {p.metaTitle.length} chars
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                            Fallback: {p.name}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 italic">No custom meta title</p>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Meta Description Column */}
                                            <td className="px-6 py-5 align-middle">
                                                {p.metaDescription?.trim() ? (
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed" title={p.metaDescription}>
                                                            {p.metaDescription}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {p.metaDescription.length} chars
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                                                            {p.description ? 'Uses product description' : 'No description'}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 italic truncate max-w-[220px]">
                                                            {p.description ? p.description.slice(0, 50) + '...' : 'Empty'}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>

                                            {/* SEO Slug Column */}
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-1">
                                                    <span className="inline-block max-w-full font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg truncate border border-slate-200" title={`/product/${p.slug}`}>
                                                        /{p.slug || 'missing'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* SEO Keywords Column */}
                                            <td className="px-4 py-5 align-middle">
                                                {Array.isArray(p.seoKeywords) && p.seoKeywords.length > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]" title={p.seoKeywords.join(', ')}>
                                                            {p.seoKeywords.slice(0, 2).map((kw, ki) => (
                                                                <span
                                                                    key={ki}
                                                                    className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium truncate max-w-[90px]"
                                                                >
                                                                    {kw}
                                                                </span>
                                                            ))}
                                                            {p.seoKeywords.length > 2 && (
                                                                <span className="inline-block px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-bold">
                                                                    +{p.seoKeywords.length - 2}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 block font-mono">
                                                            {p.seoKeywords.length} {p.seoKeywords.length === 1 ? 'keyword' : 'keywords'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">No keywords</span>
                                                )}
                                            </td>

                                            {/* SEO Status Column */}
                                            <td className="px-4 py-5 text-center align-middle whitespace-nowrap">
                                                <div className="flex flex-col items-center gap-1">
                                                    <SeoStatusBadge item={p} />
                                                    {!seo.isComplete && (
                                                        <span className="text-[9px] text-amber-600 font-semibold">
                                                            Needs {seo.missing.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-4 py-5 text-center align-middle">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openModal(p, 'seo')}
                                                        className="flex h-9 px-3 items-center justify-center gap-1.5 hover:bg-slate-900 hover:text-white rounded-xl transition-all text-slate-700 bg-white shadow-sm ring-1 ring-slate-200 text-xs font-bold"
                                                        title="Edit SEO settings"
                                                    >
                                                        <HiOutlinePencilSquare className="h-4 w-4" />
                                                        <span>Edit SEO</span>
                                                    </button>
                                                    <a
                                                        href={`/product/${p.slug || p._id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-slate-400 shadow-sm ring-1 ring-slate-100"
                                                        title="Preview live product page"
                                                    >
                                                        <HiOutlineEye className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full min-w-[1180px] table-fixed text-left border-collapse">
                            <colgroup>
                                <col className="w-[24%]" />
                                <col className="w-[13%]" />
                                <col className="w-[11%]" />
                                <col className="w-[12%]" />
                                <col className="w-[14%]" />
                                <col className="w-[11%]" />
                                <col className="w-[15%]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Product</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Seller</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Variant</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Category</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Subcategory</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <HiOutlineArrowPath className="h-8 w-8 text-primary animate-spin" />
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Products...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : productsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No products found</td>
                                    </tr>
                                ) : productsList.map((p) => (
                                    <tr
                                        key={p._id}
                                        className={cn(
                                            "group transition-colors hover:bg-slate-50/60",
                                            String(p.approvalStatus || '').toLowerCase() === 'pending' && "bg-amber-50/40"
                                        )}
                                    >
                                        {/* Product Column */}
                                        <td className="px-6 py-5 align-middle">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 shadow-sm">
                                                    <img src={p.mainImage || p.images?.[0]} alt={p.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-semibold leading-5 text-slate-900" title={p.name}>{p.name}</p>
                                                    <p className="truncate text-[10px] font-medium uppercase tracking-widest text-slate-400" title={p.unit}>{p.unit}</p>
                                                    {p.approvalStatus === 'rejected' && p.approvalNote ? (
                                                        <p className="truncate text-[10px] font-medium text-rose-500" title={p.approvalNote}>
                                                            Note: {p.approvalNote}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Seller Column */}
                                        <td className="px-6 py-5 align-middle">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                                                <span className="truncate text-[13px] font-medium text-slate-700" title={p.sellerId?.shopName || 'Admin'}>
                                                    {p.sellerId?.shopName || 'Admin'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Variant Column */}
                                        <td
                                            className="px-6 py-5 cursor-pointer align-middle transition-colors group/variant hover:bg-purple-50/60"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingVariants(p);
                                                setIsVariantsViewModalOpen(true);
                                            }}
                                        >
                                            {p.variants && p.variants.length > 0 ? (
                                                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 ring-1 ring-purple-100 transition-transform group-hover/variant:-translate-y-0.5">
                                                    <HiOutlineSwatch className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                                                    <span className="text-[12px] font-medium whitespace-nowrap">
                                                        {p.variants.length} Variant{p.variants.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[12px] font-medium text-slate-400">No variants</span>
                                            )}
                                        </td>

                                        {/* Category Column */}
                                        <td className="px-6 py-5 align-middle">
                                            <span
                                                className="inline-block max-w-full rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200 truncate"
                                                title={p.categoryId?.name || 'N/A'}
                                            >
                                                {p.categoryId?.name || 'N/A'}
                                            </span>
                                        </td>

                                        {/* Subcategory Column */}
                                        <td className="px-6 py-5 align-middle">
                                            <span
                                                className="inline-block max-w-full rounded-full bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600 ring-1 ring-slate-100 truncate"
                                                title={p.subcategoryId?.name || 'N/A'}
                                            >
                                                {p.subcategoryId?.name || 'N/A'}
                                            </span>
                                        </td>

                                        {/* Status Column */}
                                        <td className="px-4 py-5 text-center align-middle whitespace-nowrap">
                                            <div className="flex flex-col items-center gap-1">
                                                <StatusBadge status={p.status} stock={p.stock} />
                                                <ApprovalBadge approvalStatus={p.approvalStatus} />
                                                <SeoStatusBadge item={p} />
                                            </div>
                                        </td>

                                        {/* Actions Column */}
                                        <td className="px-4 py-5 text-center align-middle">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleModerationAction(p, 'approve')}
                                                    disabled={moderatingActionId === `approve:${p._id}`}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all text-slate-400 shadow-sm ring-1 ring-slate-100 disabled:opacity-60"
                                                    title="Approve product"
                                                >
                                                    <HiOutlineCheckCircle className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleModerationAction(p, 'reject')}
                                                    disabled={moderatingActionId === `reject:${p._id}`}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all text-slate-400 shadow-sm ring-1 ring-slate-100 disabled:opacity-60"
                                                    title="Reject product"
                                                >
                                                    <HiOutlineXMark className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => openModal(p)}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-white hover:text-primary rounded-xl transition-all text-slate-400 shadow-sm ring-1 ring-slate-100"
                                                >
                                                    <HiOutlinePencilSquare className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => (setItemToDelete(p), setIsDeleteModalOpen(true))}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all text-slate-400 shadow-sm ring-1 ring-slate-100"
                                                >
                                                    <HiOutlineTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="px-6 py-3 border-t border-slate-100">
                    <Pagination
                        page={page}
                        totalPages={Math.ceil(total / pageSize) || 1}
                        total={total}
                        pageSize={pageSize}
                        onPageChange={(p) => fetchProducts(p)}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                        loading={isLoading}
                    />
                </div>
            </Card>

            {/* Super Detailed Modal */}
            <AnimatePresence>
                {isProductModalOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 overflow-hidden overscroll-contain touch-pan-y"
                        onWheelCapture={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
                            onClick={() => setIsProductModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-5xl relative z-10 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                                        <HiOutlineCube className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="admin-h3">
                                            Edit Product
                                        </h3>
                                        <div className="flex items-center space-x-2 mt-0.5">
                                            <Badge variant="primary" className="text-[7px] font-bold uppercase tracking-widest px-1">SYSTEM</Badge>
                                            <HiOutlineChevronRight className="h-2.5 w-2.5 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formData.sku || 'PENDING SKU'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                    <HiOutlineXMark className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex flex-col lg:flex-row flex-1 min-h-0 min-h-[400px] max-h-[calc(100vh-200px)] overflow-hidden">
                                {/* Modal Sidebar Tabs */}
                                <div className="lg:w-1/4 bg-slate-50/50 border-r border-slate-100 p-4 space-y-1 overflow-y-auto overscroll-contain scrollbar-hide min-h-0">
                                    {[
                                        { id: 'general', label: 'General Info', icon: HiOutlineTag },
                                        { id: 'variants', label: 'Item Variants', icon: HiOutlineSwatch },
                                        { id: 'category', label: 'Groups', icon: HiOutlineFolderOpen },
                                        { id: 'media', label: 'Photos', icon: HiOutlinePhoto },
                                        { id: 'seo', label: 'SEO Settings', icon: HiOutlineGlobeAlt }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setModalTab(tab.id)}
                                            className={cn(
                                                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all",
                                                modalTab === tab.id
                                                    ? "bg-white text-primary shadow-sm ring-1 ring-slate-100"
                                                    : "text-slate-500 hover:bg-slate-100"
                                            )}
                                        >
                                            <tab.icon className="h-4 w-4" />
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}

                                    <div className="pt-8 px-4">
                                        <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100">
                                            <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest mb-1">Status</p>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full bg-transparent border-none text-xs font-bold text-brand-700 outline-none p-0 cursor-pointer"
                                            >
                                                <option value="active">PUBLISHED</option>
                                                <option value="inactive">DRAFT</option>
                                            </select>
                                        </div>
                                        <div className="mt-3 p-4 bg-brand-50 rounded-2xl border border-brand-100 flex items-center justify-between">
                                            <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest">Featured</p>
                                            <input
                                                type="checkbox"
                                                checked={formData.isFeatured}
                                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                                className="h-4 w-4 rounded border-brand-300 text-primary focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Content Area */}
                                <div className="flex-1 p-4 overflow-y-auto overscroll-contain touch-pan-y min-h-0">
                                    {modalTab === 'general' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product Title</label>
                                                    <input
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2"
                                                        placeholder="e.g. Premium Basmati Rice"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Web Address</label>
                                                    <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2.5">
                                                        <span className="text-[10px] text-slate-400 font-bold mr-1">/product/</span>
                                                        <input
                                                            value={formData.slug}
                                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                                            className="flex-1 bg-transparent border-none text-sm text-slate-500 font-semibold outline-none"
                                                            placeholder="premium-basmati-rice"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">About this item</label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    onWheel={(e) => e.stopPropagation()}
                                                    onTouchMove={(e) => e.stopPropagation()}
                                                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-semibold min-h-[160px] max-h-[260px] outline-none resize-none overflow-y-auto custom-scrollbar"
                                                    placeholder="Describe the item here..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Brand Name</label>
                                                    <input
                                                        value={formData.brand}
                                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2"
                                                        placeholder="e.g. Amul"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product Code</label>
                                                    <input
                                                        value={formData.sku}
                                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-mono font-bold outline-none ring-primary/5 focus:ring-2"
                                                        placeholder="AUTO-GENERATED"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {modalTab === 'category' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Category <span className="text-rose-500">*</span></label>
                                                    <select
                                                        value={formData.categoryId || formData.header}
                                                        onChange={(e) => {
                                                            const selectedId = e.target.value;
                                                            setFormData({
                                                                ...formData,
                                                                header: selectedId,
                                                                categoryId: selectedId,
                                                                subcategoryId: ''
                                                            });
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-rose-500/20"
                                                    >
                                                        <option value="">Select Category</option>
                                                        {categories.map(cat => (
                                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Subcategory <span className="text-rose-500">*</span></label>
                                                    <select
                                                        value={formData.subcategoryId}
                                                        onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                                                        disabled={!(formData.categoryId || formData.header)}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none cursor-pointer disabled:opacity-50 focus:ring-2 focus:ring-rose-500/20"
                                                    >
                                                        <option value="">Select Subcategory</option>
                                                        {(() => {
                                                            const activeCatId = formData.categoryId || formData.header;
                                                            const matchedCat = categories.find(c => c._id === activeCatId);
                                                            if (!matchedCat || !Array.isArray(matchedCat.children)) return null;

                                                            const hasGrandchildren = matchedCat.children.some(c => Array.isArray(c.children) && c.children.length > 0);
                                                            if (hasGrandchildren) {
                                                                return matchedCat.children.map(group => (
                                                                    <optgroup key={group._id} label={group.name}>
                                                                        {(group.children || []).map(sub => (
                                                                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                ));
                                                            }

                                                            return matchedCat.children.map(sub => (
                                                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                            ));
                                                        })()}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {modalTab === 'variants' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-slate-900">Product Variants</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, variants: [...formData.variants, { id: Date.now(), name: '', price: '', salePrice: '', stock: '', sku: '' }] })}
                                                    className="rounded-xl bg-rose-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-100"
                                                >
                                                    + ADD
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {formData.variants.map((v, i) => (
                                                    <div key={v.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                                            <div className="space-y-1.5">
                                                                <label className="ml-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">Variant Name</label>
                                                                <input
                                                                    value={v.name}
                                                                    onChange={e => {
                                                                        const news = [...formData.variants];
                                                                        news[i].name = e.target.value;
                                                                        setFormData({ ...formData, variants: news });
                                                                    }}
                                                                    placeholder="500g"
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-0 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="ml-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">Price</label>
                                                                <input
                                                                    type="number"
                                                                    value={v.price}
                                                                    onChange={e => {
                                                                        const news = [...formData.variants];
                                                                        news[i].price = e.target.value;
                                                                        setFormData({ ...formData, variants: news });
                                                                    }}
                                                                    placeholder="200"
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-0 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="ml-1 text-[8px] font-bold uppercase tracking-widest text-brand-500">Sale Price</label>
                                                                <input
                                                                    type="number"
                                                                    value={v.salePrice}
                                                                    onChange={e => {
                                                                        const news = [...formData.variants];
                                                                        news[i].salePrice = e.target.value;
                                                                        setFormData({ ...formData, variants: news });
                                                                    }}
                                                                    placeholder="150"
                                                                    className="w-full rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2.5 text-sm outline-none ring-0 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="ml-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">Stock</label>
                                                                <input
                                                                    type="number"
                                                                    value={v.stock}
                                                                    onChange={e => {
                                                                        const news = [...formData.variants];
                                                                        news[i].stock = e.target.value;
                                                                        setFormData({ ...formData, variants: news });
                                                                    }}
                                                                    placeholder="50"
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-0 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="ml-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">SKU</label>
                                                                <div className="flex items-start gap-2">
                                                                    <input
                                                                        value={v.sku}
                                                                        onChange={e => {
                                                                            const news = [...formData.variants];
                                                                            news[i].sku = e.target.value;
                                                                            setFormData({ ...formData, variants: news });
                                                                        }}
                                                                        placeholder="mango-001"
                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-0 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setFormData({ ...formData, variants: formData.variants.filter((_, idx) => idx !== i) })}
                                                                        className="mt-0.5 rounded-xl p-2 text-rose-500 transition-colors hover:bg-rose-50"
                                                                        aria-label="Delete variant"
                                                                    >
                                                                        <HiOutlineTrash className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {modalTab === 'media' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Main Cover Photo</label>
                                                <div className="flex flex-col md:flex-row items-start gap-6">
                                                    <div className="w-48 aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer overflow-hidden relative">
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                            onChange={(e) => handleImageUpload(e, 'main')}
                                                        />
                                                        {formData.mainImage ? (
                                                            <img src={formData.mainImage} alt="Main Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <HiOutlinePhoto className="h-10 w-10 text-slate-200" />
                                                                <p className="text-[10px] text-slate-400 font-bold mt-2">UPLOAD</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between gap-4">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gallery Photos</label>
                                                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:-translate-y-0.5 transition-all">
                                                        <HiOutlinePhoto className="h-4 w-4" />
                                                        <span>Add Photos</span>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleImageUpload(e, 'gallery')}
                                                        />
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                                    {(formData.galleryImages || []).length > 0 ? (
                                                        formData.galleryImages.map((image, index) => (
                                                            <div key={`${image}-${index}`} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                                                                <img src={image} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData({
                                                                        ...formData,
                                                                        galleryImages: formData.galleryImages.filter((_, i) => i !== index)
                                                                    })}
                                                                    className="absolute top-2 right-2 p-2 rounded-full bg-white/90 text-rose-500 shadow-md opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <HiOutlineTrash className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                                                            <p className="text-xs font-medium text-slate-400">No gallery photos added yet.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-slate-400 font-medium italic text-center pt-4 border-t border-slate-50 outline-none">
                                                Quick Tip: Multiple photos help users trust your products more!
                                            </p>
                                        </div>
                                    )}

                                    {modalTab === 'seo' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300 space-y-6">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                    <HiOutlineGlobeAlt className="h-4 w-4 text-primary" />
                                                    SEO Settings &amp; Metadata
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Control how this product appears in Google search results and when shared on social media.
                                                </p>
                                            </div>

                                            {/* Google SERP Live Snippet Preview */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Engine Preview</span>
                                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">Google Snippet</span>
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
                                            </div>

                                            {/* Meta Title */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest ml-1">
                                                        Meta Title <span className="text-slate-400 font-normal lowercase">(title tag)</span>
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, metaTitle: `${formData.name || ''} | Meatyns`.trim() })}
                                                            className="text-[10px] text-primary hover:underline font-bold"
                                                        >
                                                            Auto-suggest
                                                        </button>
                                                        <span className={cn(
                                                            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                                                            formData.metaTitle.length >= 30 && formData.metaTitle.length <= 60
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : formData.metaTitle.length > 60
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {formData.metaTitle.length} / 60 chars
                                                        </span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.metaTitle}
                                                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                                                    placeholder="Fresh Chicken Breast Online | Meatyns"
                                                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2 text-slate-800"
                                                />
                                                <p className="text-[10px] text-slate-400 ml-1">
                                                    Ideal length: 50-60 characters. When left blank, search engines will use the product name.
                                                </p>
                                            </div>

                                            {/* Meta Description */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest ml-1">
                                                        Meta Description
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, metaDescription: (formData.description || '').slice(0, 155) })}
                                                            className="text-[10px] text-primary hover:underline font-bold"
                                                        >
                                                            Auto-suggest
                                                        </button>
                                                        <span className={cn(
                                                            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                                                            formData.metaDescription.length >= 100 && formData.metaDescription.length <= 160
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : formData.metaDescription.length > 160
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {formData.metaDescription.length} / 160 chars
                                                        </span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={formData.metaDescription}
                                                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                                    rows={3}
                                                    placeholder="Buy fresh chicken breast online with fast delivery. Quality products at competitive prices."
                                                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2 text-slate-800 resize-none"
                                                />
                                                <p className="text-[10px] text-slate-400 ml-1">
                                                    Ideal length: 140-160 characters. A compelling summary that encourages clicks from search results.
                                                </p>
                                            </div>

                                            {/* SEO Slug */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest ml-1">
                                                        SEO Slug <span className="text-slate-400 font-normal lowercase">(web address)</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const gen = (formData.name || '')
                                                                .toLowerCase()
                                                                .replace(/[^a-z0-9]+/g, '-')
                                                                .replace(/^-+|-+$/g, '');
                                                            setFormData({ ...formData, slug: gen });
                                                        }}
                                                        className="text-[10px] text-primary hover:underline font-bold"
                                                    >
                                                        Generate from title
                                                    </button>
                                                </div>
                                                <div className="flex items-center bg-slate-100 rounded-xl px-4 py-2.5">
                                                    <span className="text-[11px] text-slate-400 font-bold mr-1">/product/</span>
                                                    <input
                                                        type="text"
                                                        value={formData.slug}
                                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                                        placeholder="fresh-chicken-breast"
                                                        className="flex-1 bg-transparent border-none text-sm text-slate-700 font-mono font-semibold outline-none"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 ml-1">
                                                    Used in the public URL. Changing this is safe because existing ID links are preserved.
                                                </p>
                                            </div>

                                            {/* SEO Keywords */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest ml-1">
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

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100"
                                >
                                    CLOSE
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-slate-900 text-white px-10 py-2.5 rounded-xl text-xs font-bold shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => {
                    if (moderatingActionId === `reject:${itemToReject?._id}`) return;
                    setIsRejectModalOpen(false);
                    setItemToReject(null);
                    setRejectionNote('');
                }}
                title="Reject Product"
                size="sm"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRejectModalOpen(false);
                                setItemToReject(null);
                                setRejectionNote('');
                            }}
                            disabled={moderatingActionId === `reject:${itemToReject?._id}`}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            onClick={confirmReject}
                            disabled={moderatingActionId === `reject:${itemToReject?._id}`}
                            className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {moderatingActionId === `reject:${itemToReject?._id}` ? 'REJECTING...' : 'REJECT PRODUCT'}
                        </button>
                    </>
                }
            >
                <div className="space-y-5 py-2">
                    <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                        <p className="text-xs font-black text-slate-900 line-clamp-2">
                            {itemToReject?.name || 'Selected product'}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-rose-500">
                            Rejection reason required
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Reason for seller
                        </label>
                        <textarea
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                            rows={5}
                            autoFocus
                            placeholder="Tell the seller what needs to be fixed before resubmitting..."
                            className="w-full resize-none rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:ring-2 focus:ring-rose-100"
                        />
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="sm"
                footer={
                    <>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                        >
                            DELETE PRODUCT
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                        <HiOutlineExclamationCircle className="h-10 w-10 text-rose-500" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">Delete Product?</h3>
                    <p className="text-sm text-slate-500 font-medium">
                        Are you sure you want to delete <span className="font-bold text-slate-900">"{itemToDelete?.name}"</span>?
                        This action cannot be undone.
                    </p>
                </div>
            </Modal>

            {/* Viewing Variants Modal */}
            <Modal
                isOpen={isVariantsViewModalOpen}
                onClose={() => setIsVariantsViewModalOpen(false)}
                title="Product Variants Details"
                size="lg"
            >
                <div className="py-2">
                    <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="h-16 w-16 bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center border border-slate-100">
                            {viewingVariants?.mainImage || viewingVariants?.images?.[0] || viewingVariants?.galleryImages?.[0] ? (
                                <img src={viewingVariants.mainImage || viewingVariants.images?.[0] || viewingVariants.galleryImages?.[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <HiOutlineCube className="h-8 w-8 text-slate-200" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">{viewingVariants?.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="primary" className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5">{viewingVariants?.categoryId?.name || 'Category'}</Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master SKU: {viewingVariants?.sku || viewingVariants?._id?.slice(-6).toUpperCase() || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm bg-white">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variant Specification</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit Price</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Available Stock</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Variant SKU</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {viewingVariants?.variants?.map((v, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30 transition-all cursor-default">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">{v.name}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Variation {idx + 1}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={cn("text-xs font-bold", v.salePrice > 0 ? "text-slate-400 line-through scale-90" : "text-slate-900")}>₹{v.price}</span>
                                                {v.salePrice > 0 && <span className="text-xs font-bold text-brand-600">₹{v.salePrice}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={v.stock === 0 ? "rose" : v.stock <= 10 ? "amber" : "emerald"} className="text-[10px] font-black uppercase tracking-widest px-2 shadow-sm">
                                                {v.stock === 0 ? 'OUT OF STOCK' : `${v.stock} UNITS`}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase bg-slate-100 px-2 py-1 rounded-lg">
                                                {v.sku || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={() => setIsVariantsViewModalOpen(false)}
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                        >
                            CLOSE VIEWER
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default ProductManagement;

