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

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await customerApi.getMyOrders();
                // Handle both paginated (result.items) and legacy (results) formats
                const orderData = res.data.result?.items || res.data.results || [];
                setOrders(orderData);
            } catch (error) {
                console.error('Failed to fetch orders for transaction history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    return (
        <div className="min-h-screen bg-[#FFF9F4] pb-24 font-outfit">
            {/* ──── Sticky Header matching Home, Search, and Wishlist ──── */}
            <div
                className="sticky top-0 z-30 bg-[#520e1e] shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden"
                style={{
                    backgroundImage: "linear-gradient(135deg, #4A0C1B 0%, #520e1e 50%, #681327 100%)",
                }}
            >
                {/* Subtle dark overlay */}
                <div className="absolute inset-0 bg-black/5 pointer-events-none" />

                {/* ──── Desktop Main Header Row (md+) matching Home & Search Page ──── */}
                <div className="hidden md:flex items-center justify-between relative z-20 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-2.5">
                    {/* Left: Brand Logo */}
                    <div
                        onClick={() => navigate("/")}
                        className="flex items-center gap-3 cursor-pointer group shrink-0 select-none"
                    >
                        <div className="group-hover:scale-105 transition-transform duration-200">
                            <LeafLogo className="w-8 h-8 lg:w-9 lg:h-9 text-white shrink-0 drop-shadow-sm" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[24px] lg:text-[27px] font-serif font-bold text-white tracking-tight leading-none drop-shadow-sm">
                                Meatyns
                            </span>
                            <span className="text-[10.5px] lg:text-[11px] font-normal text-white/80 tracking-wide mt-1 leading-none">
                                Fresh &bull; Fast &bull; Everyday
                            </span>
                        </div>
                    </div>

                    {/* Center: Search Bar */}
                    <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
                        <div
                            onClick={() => navigate("/search")}
                            className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 cursor-pointer shadow-sm hover:shadow transition-shadow"
                        >
                            <Search size={18} className="text-[#520e1e] shrink-0 stroke-[2.2]" />
                            <input
                                type="text"
                                placeholder="Search for meat, fish, seafood, etc..."
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
                                refreshLocation?.();
                                setIsLocationOpen(true);
                            }}
                            className="flex items-center gap-2 text-left text-white bg-transparent border-0 p-0 cursor-pointer group hover:opacity-90 transition-opacity"
                        >
                            <MapPin size={20} className="text-white shrink-0 stroke-[1.8]" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] text-white/75 font-normal tracking-wide leading-tight">
                                    Deliver to
                                </span>
                                <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-white leading-tight">
                                    <span className="max-w-[110px] lg:max-w-[140px] truncate">
                                        {isFetchingLocation
                                            ? "Detecting..."
                                            : currentLocation?.name || "Indore"}
                                    </span>
                                    <ChevronDown size={13} className="text-white/80 shrink-0" />
                                </div>
                            </div>
                        </button>

                        {/* Delivery in */}
                        <div className="flex items-center gap-2 text-white">
                            <Zap size={18} className="text-white fill-white shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] text-white/75 font-normal tracking-wide leading-tight">
                                    Delivery in
                                </span>
                                <span className="text-[13px] lg:text-sm font-bold text-white whitespace-nowrap leading-tight">
                                    {currentLocation?.time || "15–30 mins"}
                                </span>
                            </div>
                        </div>

                        {/* Profile */}
                        <button
                            type="button"
                            onClick={() => navigate("/profile")}
                            aria-label="Profile"
                            className="text-white hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <CircleUserRound size={28} className="text-white stroke-[1.7]" />
                        </button>

                        {/* Cart */}
                        <button
                            type="button"
                            onClick={() => navigate("/checkout")}
                            aria-label="Shopping Cart"
                            className="relative text-white hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <ShoppingCart size={24} className="text-white stroke-[2]" />
                            <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#e53935] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                                {cartCount || 0}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ──── Transactions Heading Bar (Desktop & Mobile) ──── */}
                <div className="border-t border-white/10">
                    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-all border border-white/10 backdrop-blur-md -ml-1 active:scale-95 cursor-pointer"
                            >
                                <ChevronLeft size={22} className="text-white" />
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                                    <ReceiptIndianRupee size={20} className="text-white" />
                                    Order Transactions
                                </h1>
                                <p className="text-[11px] md:text-xs text-white/80 font-normal leading-tight mt-0.5">
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
                        <div className="w-9 h-9 rounded-xl bg-[#520e1e]/10 flex items-center justify-center text-[#520e1e]">
                            <ReceiptIndianRupee className="h-5 w-5" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-14 flex flex-col items-center justify-center text-xs text-slate-400 font-semibold gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#520e1e]"></div>
                            <span>Loading transactions...</span>
                        </div>
                    ) : orders.length === 0 ? (
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
                            {orders.map((order) => {
                                const isRefund = order.paymentStatus === 'refunded';
                                const amount = order.totalAmount || order.payableAmount || 0;
                                const createdAt = order.createdAt ? new Date(order.createdAt) : null;

                                return (
                                    <div
                                        key={order._id}
                                        className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                    isRefund
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-[#520e1e]/10 text-[#520e1e]'
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
                                                    {isRefund ? 'Refund Issued' : 'Order Payment'}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    #{order.orderId || order._id?.slice(-8)} &bull;{' '}
                                                    <span className="font-medium text-slate-600">
                                                        {order.paymentMethod || 'Online'}
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
                                            {isRefund ? '+' : '-'}₹{amount}
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
