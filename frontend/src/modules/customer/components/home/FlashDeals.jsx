import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Timer, Zap, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../shared/ProductCard';
import { customerApi } from '../../services/customerApi';

/**
 * Format milliseconds into HH:MM:SS or DDd HH:MM:SS
 */
function formatTimeRemaining(diffMs) {
    if (diffMs <= 0) return '00:00:00';

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (days > 0) {
        return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const FlashDeals = ({ products: fallbackProducts = [] }) => {
    const navigate = useNavigate();
    const [deal, setDeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeftStr, setTimeLeftStr] = useState('');
    const [dealPhase, setDealPhase] = useState('none'); // 'upcoming' | 'active' | 'expired' | 'none'

    const fetchDeal = useCallback(async () => {
        try {
            setLoading(true);
            const res = await customerApi.getActiveFlashDeal();
            if (res.data?.success && res.data?.result) {
                setDeal(res.data.result);
            } else {
                setDeal(null);
            }
        } catch {
            setDeal(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeal();
    }, [fetchDeal]);

    // Derived timer state
    useEffect(() => {
        if (!deal || !deal.startTime || !deal.endTime) {
            setDealPhase('none');
            return;
        }

        const updateCountdown = () => {
            const now = Date.now();
            const start = new Date(deal.startTime).getTime();
            const end = new Date(deal.endTime).getTime();

            if (now < start) {
                setDealPhase('upcoming');
                setTimeLeftStr(formatTimeRemaining(start - now));
            } else if (now >= start && now < end) {
                setDealPhase('active');
                setTimeLeftStr(formatTimeRemaining(end - now));
            } else {
                setDealPhase('expired');
                setTimeLeftStr('00:00:00');
            }
        };

        updateCountdown();
        const intervalId = setInterval(updateCountdown, 1000);
        return () => clearInterval(intervalId);
    }, [deal]);

    // Resolve products to display
    const displayProducts = useMemo(() => {
        if (deal && Array.isArray(deal.products) && deal.products.length > 0) {
            return deal.products
                .filter((p) => p.productId)
                .map((p) => {
                    const prod = p.productId;
                    return {
                        id: prod._id || prod.id,
                        _id: prod._id || prod.id,
                        name: prod.name,
                        price: p.flashPrice || prod.salePrice || prod.price,
                        originalPrice: p.originalPrice || prod.price,
                        salePrice: p.flashPrice,
                        mainImage: prod.mainImage,
                        image: prod.mainImage,
                        stock: p.dealStock || prod.stock,
                        badge: 'FLASH DEAL',
                        maxPurchaseLimit: deal.maxQtyPerCustomer || 2,
                    };
                });
        }
        return (fallbackProducts || []).slice(0, 6);
    }, [deal, fallbackProducts]);

    if (!loading && (!deal || dealPhase === 'expired') && displayProducts.length === 0) {
        return null;
    }

    return (
        <section className="py-12 bg-slate-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="container w-full max-w-[1920px] mx-auto px-4 md:px-[50px] relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="h-16 w-16 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-orange-200 animate-pulse">
                            <Zap size={32} fill="currentColor" />
                        </div>
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    {dealPhase === 'upcoming' ? 'Coming Soon' : 'Limited Time'}
                                </span>
                                {dealPhase === 'upcoming' && (
                                    <div className="flex items-center gap-1 text-amber-600 font-bold text-xs uppercase">
                                        <Clock size={14} /> Starts in {timeLeftStr}
                                    </div>
                                )}
                                {dealPhase === 'active' && (
                                    <div className="flex items-center gap-1 text-orange-600 font-bold text-xs uppercase">
                                        <Timer size={14} /> Ending in {timeLeftStr}
                                    </div>
                                )}
                                {dealPhase === 'expired' && (
                                    <div className="flex items-center gap-1 text-slate-500 font-bold text-xs uppercase">
                                        <Timer size={14} /> Deal Ended
                                    </div>
                                )}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                                {deal?.title || 'Flash Deals'}
                            </h2>
                            {deal?.description && (
                                <p className="text-xs md:text-sm text-slate-500 mt-1">
                                    {deal.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/offers')}
                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all hover:shadow-xl active:scale-95 group"
                    >
                        View All Deals <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {displayProducts.map((product) => (
                        <div key={product.id || product._id} className="relative group/card h-full">
                            <ProductCard product={product} badge={product.badge || 'HOT DEAL'} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FlashDeals;
