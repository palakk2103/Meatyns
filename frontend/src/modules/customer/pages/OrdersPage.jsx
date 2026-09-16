import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, ChevronRight, CheckCircle, Loader2, ChevronLeft } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { getOrderStatusLabel, getLegacyStatusFromOrder } from '@/shared/utils/orderStatus';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const OrdersPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await customerApi.getMyOrders();
                // Backend uses handleResponse():
                // - arrays => { results: [...] }
                // - objects => { result: { items: [...] } }
                const payload = response?.data;
                const items =
                    payload?.result?.items ||
                    payload?.results ||
                    [];
                setOrders(Array.isArray(items) ? items : []);
            } catch (error) {
                console.error("Failed to fetch orders:", error);
                const apiMessage = error?.response?.data?.message;
                if (apiMessage) {
                    console.warn("[OrdersPage] API error:", apiMessage);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] font-outfit">
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-sm border border-[#EBE3D5]">
                    <Loader2 className="animate-spin text-[#741721]" size={22} />
                    <span className="text-sm font-semibold text-[#1A1A1A]">Loading your orders…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF6F0] pb-24 font-outfit text-[#1A1A1A]">
            {/* Top Burgundy App Header */}
            <header
                className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3.5 shadow-sm select-none"
                style={{ background: "#741721" }}
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                    className="w-8 h-8 flex items-center justify-center text-white active:scale-90 transition-transform rounded-full hover:bg-white/10 -ml-1"
                >
                    <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                <h1 className="text-[17px] sm:text-lg font-bold text-white tracking-wide">
                    My Orders
                </h1>
            </header>

            <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-3 pb-2">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-[#FFF0EF] border border-[#F2B8BF] flex items-center justify-center text-[#741721] mb-4 shadow-inner">
                            <Package size={38} strokeWidth={1.8} />
                        </div>
                        <h3 className="text-lg font-bold text-[#1A1A1A] mb-1.5">No orders yet</h3>
                        <p className="text-[#7A6A60] text-xs sm:text-sm mb-6 max-w-[280px] leading-relaxed">
                            When you place an order, it will appear here so you can track it easily.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center px-8 py-3 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-md hover:opacity-95 active:scale-95 transition-all select-none"
                            style={{ background: "#741721" }}
                        >
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {orders.map((order) => {
                            const legacy = getLegacyStatusFromOrder(order);
                            const orderNumber = order.orderId ? order.orderId.slice(-6) : (order._id ? order._id.slice(-6) : '');
                            const orderTotal = order.pricing?.total ?? order.total ?? 0;
                            const firstItem = order.items?.[0];

                            // Status badge colors in harmony with the Burgundy theme
                            const isDelivered = legacy === 'delivered';
                            const isCancelled = legacy === 'cancelled';
                            const badgeBg = isDelivered
                                ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                                : isCancelled
                                ? 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]'
                                : 'bg-[#FFF5F6] text-[#741721] border-[#F2B8BF]';

                            const checkIconColor = isDelivered
                                ? 'text-[#047857]'
                                : isCancelled
                                ? 'text-[#BE123C]'
                                : 'text-[#741721]';

                            return (
                                <Link
                                    to={`/orders/${order.orderId || order._id}`}
                                    key={order._id || order.orderId}
                                    className="block bg-white rounded-2xl p-4 shadow-[0_4px_16px_rgba(116,23,33,0.04)] border border-[#EBE3D5] hover:border-[#CEB186] active:scale-[0.99] transition-all cursor-pointer"
                                >
                                    <div className="flex justify-between items-start gap-3 mb-3">
                                        <div className="flex gap-3 flex-1 min-w-0">
                                            <div className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center bg-[#FAF6F0] border border-[#E4D5BE] shrink-0 p-0.5">
                                                {firstItem?.image ? (
                                                    <img
                                                        src={applyCloudinaryTransform(firstItem.image)}
                                                        alt={firstItem?.name || 'Order thumbnail'}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <Package size={24} className="text-[#A39282]" />
                                                )}
                                            </div>
                                            <div className="min-w-0 pt-0.5">
                                                <h3 className="font-bold text-[#1A1A1A] text-[14.5px] tracking-tight leading-snug">
                                                    Order #{orderNumber}
                                                </h3>
                                                <p className="mt-0.5 text-[11.5px] text-[#7A6A60] font-medium leading-tight">
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}{' '}
                                                    <span className="mx-1 text-[#CEB186]">•</span>
                                                    {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${badgeBg}`}
                                            >
                                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/80">
                                                    <CheckCircle
                                                        size={9}
                                                        className={checkIconColor}
                                                    />
                                                </span>
                                                <span>{getOrderStatusLabel(order).toUpperCase()}</span>
                                            </span>
                                            <span className="inline-flex items-center text-[10.5px] font-medium text-[#9E8E80]">
                                                <span className="h-1 w-1 rounded-full bg-[#CEB186] mr-1.5" />
                                                Tap to view details
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#F2EDE4] pt-3 flex justify-between items-center gap-3">
                                        <div className="text-[12px] text-[#6E645A] font-medium truncate max-w-[200px] sm:max-w-[340px]">
                                            {order.items?.map((i) => i.name).join(', ') || 'Items'}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[11.5px] font-medium text-[#8C7E72]">Total</span>
                                            <span className="text-sm font-extrabold text-[#741721]">
                                                ₹{orderTotal}
                                            </span>
                                            <ChevronRight size={17} className="text-[#CEB186]" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersPage;

