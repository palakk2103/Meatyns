import React, { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import PageHeader from '@shared/components/ui/PageHeader';
import Pagination from '@shared/components/ui/Pagination';
import {
    Zap,
    Plus,
    Search,
    Clock,
    Calendar,
    Edit3,
    Power,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Tag,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { flashDealsApi } from '../services/api/flashDealsApi';
import { customerApi } from '../../customer/services/customerApi';

const FlashDealsManagement = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Products catalog for selection
    const [availableProducts, setAvailableProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');

    // Form fields
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: 20,
        startTime: '',
        endTime: '',
        maxQtyPerCustomer: 2,
        status: 'active',
        products: [],
    });

    const fetchDeals = useCallback(async (requestedPage = 1) => {
        try {
            setLoading(true);
            const params = { page: requestedPage, limit: 15 };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (statusFilter !== 'all') params.status = statusFilter;

            const res = await flashDealsApi.getFlashDeals(params);
            if (res.data?.success) {
                const payload = res.data.result || {};
                setDeals(payload.items || []);
                setTotal(payload.total || 0);
                setTotalPages(payload.totalPages || 1);
                setPage(payload.page || requestedPage);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load flash deals');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDeals(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchDeals]);

    useEffect(() => {
        // Load products for deal selector
        async function loadProducts() {
            try {
                const res = await customerApi.getProducts({ limit: 100 });
                if (res.data?.success) {
                    const list = res.data.products || res.data.results || [];
                    setAvailableProducts(list);
                }
            } catch {
                // Ignore silent product list failure
            }
        }
        loadProducts();
    }, []);

    const openCreateModal = () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);

        const formatIsoForInput = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setEditingDeal(null);
        setFormData({
            title: '',
            description: '',
            discountType: 'percentage',
            discountValue: 20,
            startTime: formatIsoForInput(now),
            endTime: formatIsoForInput(tomorrow),
            maxQtyPerCustomer: 2,
            status: 'active',
            products: [],
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (deal) => {
        const formatIsoForInput = (dStr) => {
            if (!dStr) return '';
            const d = new Date(dStr);
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setEditingDeal(deal);
        setFormData({
            title: deal.title || '',
            description: deal.description || '',
            discountType: deal.discountType || 'percentage',
            discountValue: deal.discountValue || 0,
            startTime: formatIsoForInput(deal.startTime),
            endTime: formatIsoForInput(deal.endTime),
            maxQtyPerCustomer: deal.maxQtyPerCustomer || 2,
            status: deal.status || 'active',
            products: (deal.products || []).map((p) => ({
                productId: p.productId?._id || p.productId,
                name: p.productId?.name || 'Product',
                flashPrice: p.flashPrice,
                originalPrice: p.originalPrice || p.productId?.price || 0,
                dealStock: p.dealStock || 50,
            })),
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (deal) => {
        const newStatus = deal.status === 'active' ? 'inactive' : 'active';
        try {
            await flashDealsApi.toggleFlashDealStatus(deal._id, newStatus);
            toast.success(`Deal marked as ${newStatus}`);
            fetchDeals(page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to toggle status');
        }
    };

    const handleAddProductToDeal = (prod) => {
        if (formData.products.some((p) => String(p.productId) === String(prod._id || prod.id))) {
            toast.info('Product already added to deal');
            return;
        }

        const regPrice = Number(prod.price || 0);
        let flashPrice = regPrice;
        if (formData.discountType === 'percentage' && formData.discountValue > 0) {
            flashPrice = Math.max(1, Math.round(regPrice * (1 - formData.discountValue / 100)));
        } else if (formData.discountType === 'fixed' && formData.discountValue > 0) {
            flashPrice = Math.max(1, Math.round(regPrice - formData.discountValue));
        } else {
            flashPrice = Number(prod.salePrice || regPrice);
        }

        setFormData((prev) => ({
            ...prev,
            products: [
                ...prev.products,
                {
                    productId: prod._id || prod.id,
                    name: prod.name,
                    flashPrice,
                    originalPrice: regPrice,
                    dealStock: 50,
                },
            ],
        }));
    };

    const handleRemoveProductFromDeal = (productId) => {
        setFormData((prev) => ({
            ...prev,
            products: prev.products.filter((p) => String(p.productId) !== String(productId)),
        }));
    };

    const handleProductPriceChange = (productId, newPrice) => {
        setFormData((prev) => ({
            ...prev,
            products: prev.products.map((p) =>
                String(p.productId) === String(productId)
                    ? { ...p, flashPrice: Number(newPrice) || 0 }
                    : p
            ),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = {};

        if (!formData.title.trim()) errors.title = 'Deal title is required';
        if (!formData.startTime) errors.startTime = 'Start time is required';
        if (!formData.endTime) errors.endTime = 'End time is required';
        if (new Date(formData.endTime) <= new Date(formData.startTime)) {
            errors.endTime = 'End time must be after start time';
        }
        if (formData.products.length === 0) {
            errors.products = 'Please add at least one product to the deal';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error('Please fix the validation errors before saving');
            return;
        }

        try {
            setIsSaving(true);
            if (editingDeal) {
                await flashDealsApi.updateFlashDeal(editingDeal._id, formData);
                toast.success('Flash deal updated successfully');
            } else {
                await flashDealsApi.createFlashDeal(formData);
                toast.success('Flash deal created successfully');
            }
            setIsModalOpen(false);
            fetchDeals(1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save flash deal');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAvailableProducts = availableProducts.filter((p) =>
        (p.name || '').toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <div className="ds-section-spacing">
            <PageHeader
                title="Flash Deals & Scheduled Offers"
                description="Create time-limited flash promotions with database countdown and purchase limits"
                badge={
                    <div className="ds-stat-card-icon bg-orange-50">
                        <Zap className="ds-icon-lg text-orange-600" />
                    </div>
                }
                actions={
                    <button
                        onClick={openCreateModal}
                        className="ds-btn ds-btn-md bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                    >
                        <Plus className="ds-icon-sm" />
                        NEW FLASH DEAL
                    </button>
                }
            />

            {/* Filters */}
            <Card className="ds-card-compact">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 ds-icon-sm text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search deals by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ds-input pl-9 w-full"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {['all', 'active', 'inactive', 'draft', 'expired'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                    statusFilter === status
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden p-0 border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">Deal Title</th>
                                <th className="p-4">Schedule</th>
                                <th className="p-4">Products</th>
                                <th className="p-4">Purchase Limit</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-500" />
                                        Loading flash deals...
                                    </td>
                                </tr>
                            ) : deals.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">
                                        No flash deals found. Click "New Flash Deal" to schedule one.
                                    </td>
                                </tr>
                            ) : (
                                deals.map((deal) => {
                                    const now = Date.now();
                                    const start = new Date(deal.startTime).getTime();
                                    const end = new Date(deal.endTime).getTime();
                                    const isLive = deal.status === 'active' && now >= start && now < end;
                                    const isUpcoming = deal.status === 'active' && now < start;
                                    const isEnded = deal.status === 'expired' || now >= end;

                                    return (
                                        <tr key={deal._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{deal.title}</div>
                                                {deal.description && (
                                                    <div className="text-xs text-slate-400 line-clamp-1">
                                                        {deal.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    <span>{new Date(deal.startTime).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                    <Clock size={13} className="text-slate-400" />
                                                    <span>to {new Date(deal.endTime).toLocaleString()}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-semibold text-slate-800">
                                                    {deal.products?.length || 0} products
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                                    Max {deal.maxQtyPerCustomer || 2} / user
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {isLive && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        LIVE
                                                    </span>
                                                )}
                                                {isUpcoming && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        UPCOMING
                                                    </span>
                                                )}
                                                {isEnded && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                                                        ENDED
                                                    </span>
                                                )}
                                                {deal.status === 'inactive' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600">
                                                        DISABLED
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleStatus(deal)}
                                                        title={deal.status === 'active' ? 'Deactivate Deal' : 'Activate Deal'}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            deal.status === 'active'
                                                                ? 'text-emerald-600 hover:bg-emerald-50'
                                                                : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(deal)}
                                                        title="Edit Deal"
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={(p) => fetchDeals(p)}
                        />
                    </div>
                )}
            </Card>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {editingDeal ? 'Edit Flash Deal' : 'Create Flash Deal'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure schedule, flash pricing, and purchase limitations
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Deal Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Midnight Meat Feast Flash Sale"
                                    className="ds-input w-full"
                                />
                                {formErrors.title && (
                                    <p className="text-rose-500 text-xs mt-1">{formErrors.title}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Description / Subtitle
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="e.g. Up to 40% OFF on Prime Mutton & Chicken"
                                    className="ds-input w-full"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Start Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="ds-input w-full"
                                    />
                                    {formErrors.startTime && (
                                        <p className="text-rose-500 text-xs mt-1">{formErrors.startTime}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        End Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="ds-input w-full"
                                    />
                                    {formErrors.endTime && (
                                        <p className="text-rose-500 text-xs mt-1">{formErrors.endTime}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Max Qty Per Customer
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.maxQtyPerCustomer}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                maxQtyPerCustomer: parseInt(e.target.value, 10) || 1,
                                            })
                                        }
                                        className="ds-input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="ds-input w-full"
                                    >
                                        <option value="active">Active</option>
                                        <option value="draft">Draft</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Products Selector */}
                            <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                                <label className="block text-xs font-bold text-slate-700 uppercase">
                                    Deal Products ({formData.products.length}) *
                                </label>

                                {formErrors.products && (
                                    <p className="text-rose-500 text-xs">{formErrors.products}</p>
                                )}

                                {/* Selected Products List */}
                                {formData.products.length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {formData.products.map((p) => (
                                            <div
                                                key={p.productId}
                                                className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                                            >
                                                <div className="flex-1 font-medium text-slate-800 line-clamp-1 pr-2">
                                                    {p.name}
                                                    <span className="text-slate-400 ml-1">
                                                        (Reg: ₹{p.originalPrice})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-slate-500">Flash ₹:</label>
                                                    <input
                                                        type="number"
                                                        value={p.flashPrice}
                                                        onChange={(e) =>
                                                            handleProductPriceChange(p.productId, e.target.value)
                                                        }
                                                        className="w-20 px-2 py-1 border rounded text-right font-bold text-orange-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProductFromDeal(p.productId)}
                                                        className="text-rose-500 hover:text-rose-700 p-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Product Search & Add */}
                                <div className="space-y-2 pt-2 border-t border-slate-200">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search catalog to add products..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-xl bg-white"
                                        />
                                    </div>

                                    {productSearch.trim() && (
                                        <div className="max-h-36 overflow-y-auto bg-white rounded-xl border border-slate-200 divide-y text-xs">
                                            {filteredAvailableProducts.slice(0, 10).map((prod) => (
                                                <div
                                                    key={prod._id || prod.id}
                                                    className="flex items-center justify-between p-2 hover:bg-slate-50"
                                                >
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{prod.name}</span>
                                                        <span className="text-slate-400 ml-2">₹{prod.price}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddProductToDeal(prod)}
                                                        className="px-2 py-1 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {editingDeal ? 'Update Deal' : 'Publish Deal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashDealsManagement;
