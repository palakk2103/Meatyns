import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ReceiptIndianRupee,
  Search,
  MapPin,
  Zap,
  CircleUserRound,
  ShoppingCart,
  ChevronDown,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLocation as useAppLocation } from '../context/LocationContext';
import LocationDrawer from '../components/shared/LocationDrawer';
import { LeafLogo } from '../components/shared/MainLocationHeader';
import { customerApi } from '../services/customerApi';

const OrderTransactionsPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const { cartCount } = useCart();
    const { currentLocation, refreshLocation, isFetchingLocation } = useAppLocation();
    const [isLocationOpen, setIsLocationOpen] = useState(false);

    const [walletTxns, setWalletTxns] = useState([]);
    const [loadError, setLoadError] = useState('');

    const fetchAll = async () => {
        setLoading(true);
        setLoadError('');
        const [ordersRes, walletRes] = await Promise.allSettled([
            customerApi.getMyOrders({ limit: 100 }),
            customerApi.getWalletTransactions({ page: 1, limit: 50 }),
        ]);

        if (ordersRes.status === 'fulfilled') {
            const body = ordersRes.value?.data;
            const items = body?.result?.items || body?.results || [];
            setOrders(Array.isArray(items) ? items : []);
        } else {
            console.error('Failed to fetch orders for transaction history:', ordersRes.reason);
            setOrders([]);
            setLoadError(
                ordersRes.reason?.response?.data?.message ||
                    'Could not load your transactions. Please try again.',
            );
        }

        if (walletRes.status === 'fulfilled') {
            const body = walletRes.value?.data;
            const data = body?.result ?? body?.data ?? body;
            setWalletTxns(Array.isArray(data?.items) ? data.items : []);
        } else {
            setWalletTxns([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // Wallet "Order Payment" rows duplicate the order rows, so skip them.
    const entries = [
        ...orders.map((order) => ({ kind: 'order', key: `o-${order._id}`, date: order.createdAt, order })),
        ...walletTxns
            .filter((t) => t.title !== 'Order Payment')
            .map((t) => ({ kind: 'wallet', key: `w-${t._id}`, date: t.date, txn: t })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return (
        <div className="min-h-screen bg-[#FFF9F4] pb-24 font-poppins">
            {/* ──── Sticky Header matching Home, Search, and Wishlist ──── */}
            <div
                className="sticky top-0 z-30 bg-[#FDCE04] shadow-[0_4px_20px_rgba(0,0,0,0.08)] relative overflow-hidden"
                style={{
                    backgroundImage: "linear-gradient(180deg, #FECD04 0%, #FDCE04 55%, #F5C502 100%)",
                }}
            >
                {/* ──── Desktop Main Header Row (md+) matching Home & Search Page ──── */}
                <div className="hidden md:flex items-center justify-between relative z-20 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-2.5">
                    {/* Left: Brand Logo */}
                    <div
                        onClick={() => navigate("/")}
                        className="flex items-center cursor-pointer group shrink-0 select-none py-0.5"
                    >
                        <img
                            src="/meatyns_logo_2x.png"
                            alt="Meatyns"
                            className="h-8 lg:h-9 w-auto object-contain group-hover:scale-[1.03] transition-transform duration-200"
                        />
                    </div>

                    {/* Center: Search Bar */}
                    <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
                        <div
                            onClick={() => navigate("/search")}
                            className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 cursor-pointer shadow-sm hover:shadow transition-shadow border border-amber-200/60"
                        >
                            <Search size={18} className="text-[#1A1A1A] shrink-0 stroke-[2.2]" />
                            <input
                                type="text"
                                placeholder="Search for chicken, mutton, cuts..."
                                readOnly
                                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-normal text-[13.5px] cursor-pointer select-none"
                            />
                        </div>
                    </div>

                    {/* Right Section: Delivery & Actions */}
                    <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                        {/* Deliver to */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLocationOpen(true);
                            }}
                            className="flex items-center gap-2 text-left text-[#1A1A1A] bg-transparent border-0 p-0 cursor-pointer group hover:opacity-90 transition-opacity"
                        >
                            <MapPin size={20} className="text-[#1A1A1A] shrink-0 stroke-[2]" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] text-[#1A1A1A]/75 font-medium tracking-wide leading-tight">
                                    Deliver to
                                </span>
                                <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-[#1A1A1A] leading-tight">
                                    <span className="max-w-[110px] lg:max-w-[140px] truncate">
                                        {isFetchingLocation
                                            ? "Detecting..."
                                            : currentLocation?.name || "Indore"}
                                    </span>
                                    <ChevronDown size={13} className="text-[#1A1A1A] shrink-0" />
                                </div>
                            </div>
                        </button>

                        {/* Delivery in */}
                        <div className="flex items-center gap-2 text-[#1A1A1A]">
                            <Zap size={18} className="text-[#1A1A1A] fill-[#1A1A1A] shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] text-[#1A1A1A]/75 font-medium tracking-wide leading-tight">
                                    Delivery in
                                </span>
                                <span className="text-[13px] lg:text-sm font-extrabold text-[#1A1A1A] whitespace-nowrap leading-tight">
                                    {currentLocation?.time || "15–30 mins"}
                                </span>
                            </div>
                        </div>

                        {/* Profile */}
                        <button
                            type="button"
                            onClick={() => navigate("/profile")}
                            aria-label="Profile"
                            className="text-[#1A1A1A] hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <CircleUserRound size={28} className="text-[#1A1A1A] stroke-[2]" />
                        </button>

                        {/* Cart */}
                        <button
                            type="button"
                            onClick={() => navigate("/cart")}
                            aria-label="Shopping Cart"
                            className="relative text-[#1A1A1A] hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <ShoppingCart size={24} className="text-[#1A1A1A] stroke-[2.2]" />
                            <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#EF131F] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                                {cartCount || 0}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ──── Transactions Heading Bar (Desktop & Mobile) ──── */}
                <div className="border-t border-black/10">
                    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-black/10 hover:bg-black/15 text-[#1A1A1A] rounded-full transition-all border border-black/10 backdrop-blur-md -ml-1 active:scale-95 cursor-pointer"
                            >
                                <ChevronLeft size={22} className="text-[#1A1A1A]" />
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-normal font-anton tracking-wide text-[#1A1A1A] leading-tight flex items-center gap-2 uppercase">
                                    <ReceiptIndianRupee size={20} className="text-[#1A1A1A]" />
                                    Order Transactions
                                </h1>
                                <p className="text-[11px] md:text-xs text-[#1A1A1A]/80 font-normal leading-tight mt-0.5">
                                    Track payments and refunds from your recent orders
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Drawer */}
            <LocationDrawer
                isOpen={isLocationOpen}
                onClose={() => setIsLocationOpen(false)}
            />

            {/* Main Content */}
            <div className="max-w-3xl mx-auto px-4 pt-6 relative z-20">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Transaction History</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Based on your recent orders
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A]">
                            <ReceiptIndianRupee className="h-5 w-5" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-14 flex flex-col items-center justify-center text-xs text-slate-400 font-semibold gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FDCE04]"></div>
                            <span>Loading transactions...</span>
                        </div>
                    ) : loadError ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-base font-bold text-slate-700 mb-1">
                                Couldn&apos;t load transactions
                            </p>
                            <p className="text-xs text-slate-500 max-w-xs mb-4">{loadError}</p>
                            <button
                                type="button"
                                onClick={fetchAll}
                                className="px-5 py-2 rounded-full bg-[#FDCE04] text-[#1A1A1A] text-sm font-bold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                <ReceiptIndianRupee size={26} />
                            </div>
                            <p className="text-base font-bold text-slate-700 mb-1">
                                No transactions yet
                            </p>
                            <p className="text-xs text-slate-500 max-w-xs">
                                Place an order to see your payment and refund history here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {entries.map((entry) => {
                                if (entry.kind === 'wallet') {
                                    const t = entry.txn;
                                    const credit = t.type === 'credit';
                                    const when = t.date ? new Date(t.date) : null;
                                    return (
                                        <div
                                            key={entry.key}
                                            className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                        credit ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FDCE04]/20 text-[#1A1A1A]'
                                                    }`}
                                                >
                                                    {credit ? (
                                                        <ArrowUpRight size={20} strokeWidth={2.2} />
                                                    ) : (
                                                        <ArrowDownLeft size={20} strokeWidth={2.2} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Wallet
                                                        {t.orderId ? <> &bull; #{t.orderId}</> : null}
                                                    </p>
                                                    {when && (
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            {when.toLocaleDateString()},{' '}
                                                            {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`text-base font-bold ${credit ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {credit ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    );
                                }
                                const order = entry.order;
                                const payStatus = String(order.payment?.status || '').toLowerCase();
                                const orderStatus = String(order.status || '').toLowerCase();
                                const isRefund =
                                    payStatus === 'refunded' ||
                                    String(order.paymentStatus || '').toUpperCase() === 'REFUNDED' ||
                                    order.returnStatus === 'refund_completed';
                                const isCancelled = orderStatus === 'cancelled' && !isRefund;
                                const method = String(order.payment?.method || order.paymentMode || '').toLowerCase();
                                const methodLabel =
                                    method === 'cash' || method === 'cod'
                                        ? 'Cash on Delivery'
                                        : method === 'wallet'
                                            ? 'Wallet'
                                            : 'Online';
                                const amount = Number(
                                    order.paymentBreakdown?.grandTotal ?? order.pricing?.total ?? 0,
                                );
                                const createdAt = order.createdAt ? new Date(order.createdAt) : null;

                                return (
                                    <div
                                        key={entry.key}
                                        className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                    isRefund
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-[#FDCE04]/20 text-[#1A1A1A]'
                                                }`}
                                            >
                                                {isRefund ? (
                                                    <ArrowUpRight size={20} strokeWidth={2.2} />
                                                ) : (
                                                    <ArrowDownLeft size={20} strokeWidth={2.2} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    {isRefund ? 'Refund Issued' : isCancelled ? 'Order Cancelled' : 'Order Payment'}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    #{order.orderId || order._id?.slice(-8)} &bull;{' '}
                                                    <span className="font-medium text-slate-600">
                                                        {methodLabel}
                                                    </span>
                                                </p>
                                                {createdAt && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {createdAt.toLocaleDateString()},{' '}
                                                        {createdAt.toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            className={`text-base font-bold ${
                                                isRefund ? 'text-emerald-600' : 'text-slate-900'
                                            }`}
                                        >
                                            {isRefund ? '+' : isCancelled ? '' : '-'}₹{amount.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTransactionsPage;
