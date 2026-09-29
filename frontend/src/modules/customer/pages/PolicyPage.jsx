import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, 
    Award, 
    Truck, 
    RotateCcw, 
    ShieldCheck, 
    ScrollText, 
    CheckCircle2, 
    Clock, 
    ThermometerSnowflake, 
    Lock, 
    HelpCircle,
    ArrowRight
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const PolicyPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') || 'all';
    const [activeTab, setActiveTab] = useState(tabParam);
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams(tabId === 'all' ? {} : { tab: tabId });
    };

    const tabs = [
        { id: 'all', label: 'All Policies', icon: ScrollText },
        { id: 'quality', label: 'Quality Policy', icon: Award },
        { id: 'delivery', label: 'Delivery Policy', icon: Truck },
        { id: 'refund', label: 'Refund & Replacement', icon: RotateCcw },
        { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
        { id: 'terms', label: 'Terms & Conditions', icon: ScrollText }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-16">
            {/* Sticky Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between shadow-sm border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/');
                            }
                        }}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                        aria-label="Go back"
                    >
                        <ChevronLeft size={24} className="text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-lg font-normal font-anton tracking-wide text-slate-900 leading-tight uppercase">Policies &amp; Guarantees</h1>
                        <p className="text-[11px] font-semibold text-slate-400">Meatyns Standards & Customer Commitments</p>
                    </div>
                </div>
            </div>

            {/* Quick Horizontal Tab Bar */}
            <div className="bg-white border-b border-slate-200/80 sticky top-[57px] z-20 overflow-x-auto no-scrollbar shadow-xs">
                <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 min-w-max">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isActive
                                        ? 'bg-[#C81017] text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 mt-2">
                {/* Intro Banner */}
                <div className="bg-gradient-to-r from-[#1A1A1A] via-[#2A1215] to-[#1A1A1A] rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-56 h-56 bg-[#FAB82C]/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="inline-block text-[#FAB82C] text-xs font-black uppercase tracking-wider mb-1">
                                Our Customer Promise
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-white">
                                Transparency, Freshness & Trust
                            </h2>
                            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl font-medium">
                                Clear policies designed to give you peace of mind with every order at {appName}.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-400 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                Updated: 2026
                            </span>
                        </div>
                    </div>
                </div>

                {/* 1. Quality Policy */}
                {(activeTab === 'all' || activeTab === 'quality') && (
                    <div id="quality-policy" className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C81017] flex items-center justify-center shrink-0">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Quality Policy</h2>
                                    <p className="text-xs text-slate-400 font-semibold">Freshness & Hygiene Guarantee</p>
                                </div>
                            </div>
                            <Link 
                                to="/quality-policy" 
                                className="text-xs font-bold text-[#C81017] hover:underline flex items-center gap-1 shrink-0"
                            >
                                Details <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Core User Quote */}
                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-4">
                            <p className="text-sm sm:text-base font-black text-slate-900">
                                &ldquo;We promise 100% fresh, chemical-free meat – never frozen, always hygienic.&rdquo;
                            </p>
                        </div>

                        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium">
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#047857] mt-0.5 shrink-0" />
                                <span><strong>Daily Procured:</strong> Sourced daily from vetted livestock partners, completely chemical-free and free of added preservatives.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#047857] mt-0.5 shrink-0" />
                                <span><strong>Never Frozen:</strong> Kept at optimal chilled temperatures to preserve natural texture, juices, and essential nutrients.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#047857] mt-0.5 shrink-0" />
                                <span><strong>Strict Hygiene Controls:</strong> Sanitized cutting tools, food-grade vacuum packing, and protective gear at all touchpoints.</span>
                            </li>
                        </ul>
                    </div>
                )}

                {/* 2. Delivery Policy */}
                {(activeTab === 'all' || activeTab === 'delivery') && (
                    <div id="delivery-policy" className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Delivery Policy</h2>
                                    <p className="text-xs text-slate-400 font-semibold">Speed, Cold-Chain & Coverage</p>
                                </div>
                            </div>
                            <Link 
                                to="/shipping-policy" 
                                className="text-xs font-bold text-[#C81017] hover:underline flex items-center gap-1 shrink-0"
                            >
                                Details <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Core User Delivery Points */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <Clock size={18} className="text-[#B45309] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Same-Day Delivery</h4>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Prompt same-day delivery in select serviceable locations.</p>
                                </div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <ThermometerSnowflake size={18} className="text-[#0369A1] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Cold-Chain Maintained</h4>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Continuous cold-chain temperature maintained from outlet to home.</p>
                                </div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <Award size={18} className="text-[#047857] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Free Delivery</h4>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Enjoy free delivery when your cart reaches above the minimum order value.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 font-medium">
                            Orders are dispatched promptly in temperature-insulated bags to maintain freshness upon arrival.
                        </p>
                    </div>
                )}

                {/* 3. Refund & Replacement Policy */}
                {(activeTab === 'all' || activeTab === 'refund') && (
                    <div id="refund-policy" className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center shrink-0">
                                    <RotateCcw size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Refund &amp; Replacement Policy</h2>
                                    <p className="text-xs text-slate-400 font-semibold">Hassle-Free Resolution</p>
                                </div>
                            </div>
                            <Link 
                                to="/refund-policy" 
                                className="text-xs font-bold text-[#C81017] hover:underline flex items-center gap-1 shrink-0"
                            >
                                Details <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Core User Refund Points */}
                        <div className="space-y-3 mb-4">
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                                <CheckCircle2 size={20} className="text-[#047857] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Instant Replacement or Refund</h4>
                                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                                        Instant replacement or refund if meat is stale, damaged, or incorrect upon delivery.
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <Clock size={20} className="text-slate-700 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Refund Processing Timeline</h4>
                                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                                        Approved refunds will be processed back to the original payment source within <strong>7 working days</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 font-medium">
                            To raise an issue, simply go to your Orders tab or reach our customer care line immediately upon delivery with a photo.
                        </p>
                    </div>
                )}

                {/* 4. Privacy Policy */}
                {(activeTab === 'all' || activeTab === 'privacy') && (
                    <div id="privacy-policy" className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6B21A8] flex items-center justify-center shrink-0">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Privacy Policy</h2>
                                    <p className="text-xs text-slate-400 font-semibold">Your Data Is Safe With Us</p>
                                </div>
                            </div>
                            <Link 
                                to="/privacy" 
                                className="text-xs font-bold text-[#C81017] hover:underline flex items-center gap-1 shrink-0"
                            >
                                Details <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Core User Privacy Point */}
                        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 mb-4 flex items-start gap-3">
                            <Lock size={20} className="text-[#6B21A8] mt-0.5 shrink-0" />
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                                &ldquo;Your data (name, phone, address) is only used for order fulfillment. We never share it with third parties.&rdquo;
                            </p>
                        </div>

                        <ul className="space-y-2 text-xs sm:text-sm text-slate-600 font-medium">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-[#047857] mt-0.5 shrink-0" />
                                <span>No selling, trading, or unauthorized disclosure of customer personal information.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-[#047857] mt-0.5 shrink-0" />
                                <span>Secure encrypted communication for order tracking and SMS / push notification updates.</span>
                            </li>
                        </ul>
                    </div>
                )}

                {/* 5. Terms & Conditions */}
                {(activeTab === 'all' || activeTab === 'terms') && (
                    <div id="terms-conditions" className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
                                    <ScrollText size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900">Terms &amp; Conditions</h2>
                                    <p className="text-xs text-slate-400 font-semibold">Service Guidelines &amp; Care</p>
                                </div>
                            </div>
                            <Link 
                                to="/terms" 
                                className="text-xs font-bold text-[#C81017] hover:underline flex items-center gap-1 shrink-0"
                            >
                                Details <ArrowRight size={14} />
                            </Link>
                        </div>

                        {/* Core User Terms Points */}
                        <div className="space-y-3 mb-4">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Working Hours</h4>
                                    <p className="text-xs text-slate-600 font-medium mt-0.5">Orders must be placed within working hours to ensure same-day preparation and delivery.</p>
                                </div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Market Rates</h4>
                                    <p className="text-xs text-slate-600 font-medium mt-0.5">Prices may vary depending on daily live market rates and product availability.</p>
                                </div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Fresh Meat Storage &amp; Care</h4>
                                    <p className="text-xs text-slate-600 font-medium mt-0.5">Customers should refrigerate meat immediately after delivery to maintain maximum freshness and hygiene.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 text-xs text-slate-500 font-medium">
                            Need help with your order or have questions? Contact support via <Link to="/support" className="text-[#C81017] font-bold hover:underline">Help &amp; Support</Link> or call our helpline.
                        </div>
                    </div>
                )}

                {/* Support Assistance Box */}
                <div className="bg-[#FAF6F0] rounded-2xl p-5 border border-[#EBE3D5] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#C81017] shadow-xs shrink-0">
                            <HelpCircle size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Have Questions?</h4>
                            <p className="text-xs text-slate-600 font-medium">Our customer support team in Kolhapur is here to help you.</p>
                        </div>
                    </div>
                    <Link
                        to="/contact"
                        className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-[#C81017] transition-colors shrink-0"
                    >
                        Contact Us
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PolicyPage;
