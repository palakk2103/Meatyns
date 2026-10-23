import React, { useState, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Button from '@shared/components/ui/Button';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { adminApi } from '../../services/adminApi';
import { toast } from 'sonner';
import {
    HiOutlineCube,
    HiOutlineMagnifyingGlass,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineArrowPath,
    HiOutlineBuildingStorefront,
    HiOutlineExclamationTriangle,
    HiOutlineArchiveBoxXMark,
    HiOutlineClock,
    HiOutlineCheckCircle
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

export const StoreInventoryView = () => {
    const [subTab, setSubTab] = useState('inventory'); // 'inventory' | 'history'
    const [items, setItems] = useState([]);
    const [history, setHistory] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [stats, setStats] = useState({ totalProducts: 0, lowStockItems: 0, outOfStockItems: 0 });
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Adjustment modal state
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [adjustType, setAdjustType] = useState('Restock');
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustNote, setAdjustNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSellers = async () => {
        try {
            const res = await adminApi.getActiveSellers();
            if (res.data?.success) {
                setSellers(res.data.result || res.data.results || []);
            }
        } catch (err) {
            console.error('Failed to fetch stores/sellers', err);
        }
    };

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const params = {
                page,
                limit: pageSize,
                sellerId: selectedSeller !== 'all' ? selectedSeller : undefined,
                search: searchTerm.trim() || undefined,
                lowStockOnly: lowStockOnly ? 'true' : undefined,
            };
            const res = await adminApi.getInventory(params);
            if (res.data?.success) {
                const payload = res.data.result || {};
                setItems(payload.products || []);
                setTotal(payload.pagination?.total || 0);
                if (payload.stats) setStats(payload.stats);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch inventory');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const params = {
                page,
                limit: pageSize,
                sellerId: selectedSeller !== 'all' ? selectedSeller : undefined,
            };
            const res = await adminApi.getStockHistory(params);
            if (res.data?.success) {
                const payload = res.data.result || {};
                setHistory(payload.history || []);
                setTotal(payload.pagination?.total || 0);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch stock history');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    useEffect(() => {
        if (subTab === 'inventory') {
            fetchInventory();
        } else {
            fetchHistory();
        }
    }, [subTab, selectedSeller, lowStockOnly, page]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        if (subTab === 'inventory') fetchInventory();
        else fetchHistory();
    };

    const openAdjustModal = (product) => {
        setSelectedProduct(product);
        setAdjustType('Restock');
        setAdjustQty('');
        setAdjustNote('');
        setIsAdjustModalOpen(true);
    };

    const handleConfirmAdjust = async () => {
        if (!selectedProduct) return;
        const qtyNum = Number(adjustQty);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
            return toast.error('Please enter a valid positive quantity');
        }

        setIsSubmitting(true);
        try {
            const payload = {
                productId: selectedProduct._id,
                sellerId: selectedProduct.sellerId?._id || selectedProduct.sellerId,
                type: adjustType,
                quantity: qtyNum,
                note: adjustNote.trim(),
            };
            const res = await adminApi.adjustStock(payload);
            toast.success(res.data?.message || 'Stock adjusted successfully');
            setIsAdjustModalOpen(false);
            fetchInventory();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to adjust stock');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* View Switcher & Sub-Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { setSubTab('inventory'); setPage(1); }}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                            subTab === 'inventory'
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <HiOutlineCube className="h-4 w-4" />
                        <span>Live Store Stock</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSubTab('history'); setPage(1); }}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                            subTab === 'history'
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <HiOutlineClock className="h-4 w-4" />
                        <span>Stock Audit History</span>
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Store Selector */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                        <HiOutlineBuildingStorefront className="h-4 w-4 text-slate-400" />
                        <select
                            value={selectedSeller}
                            onChange={(e) => { setSelectedSeller(e.target.value); setPage(1); }}
                            className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="all">All Stores & Outlets</option>
                            {sellers.map((s) => (
                                <option key={s._id} value={s._id}>
                                    {s.shopName || s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={subTab === 'inventory' ? fetchInventory : fetchHistory}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Refresh"
                    >
                        <HiOutlineArrowPath className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            {subTab === 'inventory' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-4 border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Monitored Items</p>
                            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalProducts}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <HiOutlineCube className="h-5 w-5" />
                        </div>
                    </Card>
                    <Card className="p-4 border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low Stock Warnings</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">{stats.lowStockItems}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <HiOutlineExclamationTriangle className="h-5 w-5" />
                        </div>
                    </Card>
                    <Card className="p-4 border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Out of Stock</p>
                            <p className="text-2xl font-black text-rose-600 mt-1">{stats.outOfStockItems}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <HiOutlineArchiveBoxXMark className="h-5 w-5" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters Bar */}
            {subTab === 'inventory' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search by product name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </form>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={lowStockOnly}
                            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Low Stock Only</span>
                    </label>
                </div>
            )}

            {/* Table Content */}
            <Card className="p-0 border border-slate-100 overflow-hidden shadow-xs">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold">
                        <HiOutlineArrowPath className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading inventory data...
                    </div>
                ) : subTab === 'inventory' ? (
                    items.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-bold">
                            No products found matching the criteria.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">Product</th>
                                        <th className="py-3 px-4">Store / Outlet</th>
                                        <th className="py-3 px-4">Unit / Step</th>
                                        <th className="py-3 px-4 text-center">Stock Level</th>
                                        <th className="py-3 px-4 text-center">Alert At</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {items.map((prod) => {
                                        const isOut = prod.stock <= 0;
                                        const isLow = prod.stock > 0 && prod.stock <= (prod.lowStockAlert || 5);
                                        return (
                                            <tr key={prod._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={prod.mainImage || '/placeholder-product.png'}
                                                            alt={prod.name}
                                                            className="h-10 w-10 rounded-xl object-contain bg-slate-50 p-1 border border-slate-100"
                                                        />
                                                        <div>
                                                            <p className="font-bold text-slate-800 line-clamp-1">{prod.name}</p>
                                                            <p className="text-[10px] font-mono text-slate-400">{prod.sku || 'No SKU'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-700">
                                                        {prod.sellerId?.shopName || 'Main Store'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-semibold text-slate-600">
                                                        {prod.unitValue || 1} {prod.unit || 'pack'}
                                                    </span>
                                                    {prod.orderIncrement && prod.orderIncrement !== 1 && (
                                                        <span className="text-[10px] text-slate-400 block">
                                                            Step: {prod.orderIncrement}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={cn(
                                                        "inline-block px-2.5 py-1 rounded-lg font-black text-xs",
                                                        isOut ? "bg-rose-100 text-rose-700" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-800"
                                                    )}>
                                                        {prod.stock}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-500 font-bold">
                                                    {prod.lowStockAlert || 5}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {isOut ? (
                                                        <Badge variant="error" className="text-[10px] px-2 py-0.5">Out of Stock</Badge>
                                                    ) : isLow ? (
                                                        <Badge variant="warning" className="text-[10px] px-2 py-0.5">Low Stock</Badge>
                                                    ) : (
                                                        <Badge variant="success" className="text-[10px] px-2 py-0.5">Healthy</Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => openAdjustModal(prod)}
                                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                                                    >
                                                        Adjust Stock
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    history.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-bold">
                            No stock history entries recorded yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">Date / Time</th>
                                        <th className="py-3 px-4">Product</th>
                                        <th className="py-3 px-4">Store</th>
                                        <th className="py-3 px-4">Action Type</th>
                                        <th className="py-3 px-4 text-center">Quantity Delta</th>
                                        <th className="py-3 px-4">Audit Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {history.map((entry) => {
                                        const isPositive = entry.quantity > 0;
                                        return (
                                            <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                                    {new Date(entry.createdAt).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-800">
                                                    {entry.product?.name || 'Unknown Product'}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 font-medium">
                                                    {entry.seller?.shopName || 'Main Store'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                        entry.type === 'Restock' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                        entry.type === 'Sale' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                                        "bg-amber-50 text-amber-700 border border-amber-200"
                                                    )}>
                                                        {entry.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold">
                                                    <span className={isPositive ? "text-emerald-600 font-mono" : "text-rose-600 font-mono"}>
                                                        {isPositive ? `+${entry.quantity}` : entry.quantity}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={entry.note}>
                                                    {entry.note || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </Card>

            {/* Pagination */}
            {total > pageSize && (
                <div className="flex justify-end">
                    <Pagination
                        currentPage={page}
                        totalItems={total}
                        pageSize={pageSize}
                        onPageChange={setPage}
                    />
                </div>
            )}

            {/* Adjust Stock Modal */}
            <Modal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                title="Adjust Store Inventory"
            >
                {selectedProduct && (
                    <div className="space-y-4 text-left p-1">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{selectedProduct.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Store: {selectedProduct.sellerId?.shopName || 'Store'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</p>
                                <p className="text-lg font-black text-slate-800">{selectedProduct.stock}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Adjustment Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Restock', 'Correction', 'Set Stock'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setAdjustType(t)}
                                        className={cn(
                                            "py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                                            adjustType === t
                                                ? "bg-primary text-white border-primary shadow-xs"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {adjustType === 'Set Stock' ? 'Target Stock Level' : 'Quantity'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder={adjustType === 'Set Stock' ? "Enter new absolute stock" : "Enter quantity (e.g. 10)"}
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Audit Note / Reason</label>
                            <textarea
                                rows={2}
                                placeholder="e.g. Physical inventory count verified, received dark-store batch #412"
                                value={adjustNote}
                                onChange={(e) => setAdjustNote(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <Button
                                variant="outline"
                                onClick={() => setIsAdjustModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmAdjust}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Applying...' : 'Apply Stock Change'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StoreInventoryView;
