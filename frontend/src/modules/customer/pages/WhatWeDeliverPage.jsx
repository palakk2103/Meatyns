import React from 'react';
import { ChevronLeft, CheckCircle2, ShieldCheck, Sparkles, Truck, Package, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const specialities = [
    {
        title: 'Goat Meat / Mutton Curry Cut',
        desc: 'tender & juicy',
        icon: Sparkles,
        badgeBg: 'bg-red-50 text-[#C81017]'
    },
    {
        title: 'Sheep Meat Cuts',
        desc: 'authentic flavor & texture',
        icon: CheckCircle2,
        badgeBg: 'bg-amber-50 text-amber-700'
    },
    {
        title: 'Lamb Meat',
        desc: 'rich & premium taste',
        icon: Sparkles,
        badgeBg: 'bg-rose-50 text-rose-700'
    },
    {
        title: 'Special Cuts',
        desc: 'Chops, Ribs, Kheema, Liver & more',
        icon: Package,
        badgeBg: 'bg-orange-50 text-orange-700'
    },
    {
        title: 'Hygienic Packaging',
        desc: 'vacuum sealed, odor-free',
        icon: ShieldCheck,
        badgeBg: 'bg-emerald-50 text-emerald-700'
    },
    {
        title: 'Same-Day Farm-to-Table Delivery',
        desc: 'fast & temperature controlled',
        icon: Truck,
        badgeBg: 'bg-blue-50 text-blue-700',
        emoji: '🚚'
    }
];

const WhatWeDeliverPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24">
            {/* Top Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center gap-2">
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else {
                            navigate('/');
                        }
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1"
                    aria-label="Go back"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-anton font-normal tracking-wide uppercase text-slate-900">What We Deliver</h1>
            </div>

            <div className="px-4 pt-1 max-w-3xl mx-auto space-y-4">
                {/* Headline Banner */}
                <div className="rounded-2xl p-6 bg-gradient-to-br from-white via-white to-red-50/40 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#C81017] text-xs font-bold uppercase tracking-wider mb-3">
                        <span>Our Products</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-anton font-normal tracking-wide uppercase text-slate-900 leading-snug">
                        Premium Fresh Meat, Delivered with Care 🥩
                    </h2>
                    <p className="mt-3 text-slate-600 text-base leading-relaxed font-medium">
                        With Meatyns, you get freshness, quality &amp; trust – every time.
                    </p>
                </div>

                {/* Specialization List */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#C81017]" />
                        We specialize in:
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Goat Meat / Mutton Curry Cut</h4>
                            <p className="text-slate-600 text-sm mt-0.5">– tender &amp; juicy</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Sheep Meat Cuts</h4>
                            <p className="text-slate-600 text-sm mt-0.5">– authentic flavor &amp; texture</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Lamb Meat</h4>
                            <p className="text-slate-600 text-sm mt-0.5">– rich &amp; premium taste</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Special Cuts</h4>
                            <p className="text-slate-600 text-sm mt-0.5">: Chops, Ribs, Kheema, Liver &amp; more</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Hygienic Packaging</h4>
                            <p className="text-slate-600 text-sm mt-0.5">– vacuum sealed, odor-free</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                                Same-Day Farm-to-Table Delivery <span>🚚</span>
                            </h4>
                            <p className="text-slate-600 text-sm mt-0.5">Delivered fresh at prime quality</p>
                        </div>
                    </div>
                </div>

                {/* Trust Statement & CTA */}
                <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900">With Meatyns</h4>
                        <p className="text-slate-600 text-sm mt-1">
                            You get freshness, quality &amp; trust – every time.
                        </p>
                    </div>
                    <Link
                        to="/categories"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C81017] hover:bg-[#a50d13] text-white font-bold text-sm transition-all active:scale-95 shrink-0 shadow-sm"
                    >
                        <span>Explore Categories</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="text-center pt-4">
                    <p className="text-xs text-slate-400">© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default WhatWeDeliverPage;
