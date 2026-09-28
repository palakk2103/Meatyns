import React from 'react';
import { ChevronLeft, ScrollText, Clock, TrendingUp, ThermometerSnowflake, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const TermsPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromDelivery = searchParams.get('from') === 'delivery';
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';
    const companyName = settings?.companyName || appName;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-1 shadow-sm border-b border-slate-100">
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else if (window.opener) {
                            window.close();
                        }
                        
                        setTimeout(() => {
                            if (fromDelivery) {
                                navigate('/delivery/auth');
                            } else {
                                navigate('/');
                            }
                        }, 100);
                    }}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label="Go back"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800">Terms &amp; Conditions</h1>
            </div>

            <div className="p-4 sm:p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#D97706]">
                            <ScrollText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Terms &amp; Conditions</h2>
                            <p className="text-xs text-slate-500 font-medium">Customer Service Agreement &amp; Policies</p>
                        </div>
                    </div>

                    {/* Key Core Terms Highlight */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-6 not-prose">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                            <Clock size={20} className="text-[#C81017] mb-2" />
                            <h4 className="text-xs font-bold text-slate-900 mb-1">Working Hours</h4>
                            <p className="text-xs text-slate-600 font-medium">Orders must be placed within working hours.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                            <TrendingUp size={20} className="text-[#D97706] mb-2" />
                            <h4 className="text-xs font-bold text-slate-900 mb-1">Market Rates</h4>
                            <p className="text-xs text-slate-600 font-medium">Prices may vary depending on market rates.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                            <ThermometerSnowflake size={20} className="text-[#0284C7] mb-2" />
                            <h4 className="text-xs font-bold text-slate-900 mb-1">Storage &amp; Care</h4>
                            <p className="text-xs text-slate-600 font-medium">Customers should refrigerate meat immediately after delivery.</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            Welcome to <span className="font-semibold text-slate-800">{appName}</span>. By accessing our platform and placing orders, you agree to comply with the terms and operational guidelines described below.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 1. Order Placement &amp; Operating Hours
                        </h3>
                        <p>
                            To guarantee that your meat is fresh-cut and safely delivered on the same day, orders must be placed within our designated store working hours. Orders received outside operating hours will be scheduled for processing during the next open operating shift.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 2. Daily Market Pricing &amp; Weights
                        </h3>
                        <p>
                            Because poultry, mutton, and seafood are live agricultural and marine commodities, prices may vary depending on prevailing daily market rates. The final price and gross/net weight breakdown are displayed transparently prior to checkout.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 3. Handling &amp; Immediate Refrigeration
                        </h3>
                        <p>
                            Our products are 100% fresh and never frozen. Consequently, customers should refrigerate meat immediately after delivery (between 0°C to 4°C) or cook it on the same day to maintain optimal taste, moisture, and hygiene.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 4. Order Cancellations &amp; Modifications
                        </h3>
                        <p>
                            Because meat is customized and freshly prepped upon receipt of your order, orders cannot be cancelled once butchering and packaging has commenced.
                        </p>

                        <div className="border-t border-slate-100 mt-8 pt-6 not-prose">
                            <h4 className="text-slate-800 font-bold text-base">Managed By</h4>
                            <div className="mt-3 text-slate-600 space-y-1.5 text-sm font-medium">
                                <p><span className="text-slate-800 font-semibold">Entity:</span> {companyName}</p>
                                <p><span className="text-slate-800 font-semibold">Helpline:</span> {settings?.supportPhone || '1800-233-8590 / 75585 98590'}</p>
                                <p><span className="text-slate-800 font-semibold">Registered Store:</span> Unit-A, Shop No. 11, Sharda Vihar Apartment, Isolation Ring Road, Kolhapur</p>
                                <p><span className="text-slate-800 font-semibold">Support Email:</span> {settings?.supportEmail || 'contact@meatyns.com'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
