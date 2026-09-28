import React from 'react';
import { ChevronLeft, RotateCcw, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const RefundPolicyPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-1 shadow-sm border-b border-slate-100">
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
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800">Refund &amp; Replacement Policy</h1>
            </div>

            <div className="p-4 sm:p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#047857]">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Refund &amp; Replacement Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Customer Satisfaction &amp; Freshness Assurance</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            At <span className="font-semibold text-slate-800">{appName}</span>, your satisfaction and food safety are our top priorities. We stand firmly behind the quality of our 100% fresh meat products.
                        </p>

                        {/* Highlight Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6 not-prose">
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                <div className="flex items-center gap-2 mb-2 text-[#047857]">
                                    <ShieldCheck size={20} />
                                    <h4 className="text-sm font-bold text-slate-900">Instant Replacement / Refund</h4>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    Instant replacement or refund if meat is stale, damaged, or incorrect upon delivery.
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                                <div className="flex items-center gap-2 mb-2 text-[#0284C7]">
                                    <Clock size={20} />
                                    <h4 className="text-sm font-bold text-slate-900">Processing Window</h4>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    Refunds processed within <strong>7 working days</strong> to your original payment method.
                                </p>
                            </div>
                        </div>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#047857]" /> 1. When Can You Request a Replacement or Refund?
                        </h3>
                        <p>
                            You are eligible for an immediate resolution under the following circumstances:
                        </p>
                        <ul className="space-y-1.5 text-xs sm:text-sm">
                            <li>The received product is stale, spoiled, or has an off-odor.</li>
                            <li>The packaging was visibly torn, broken, or contaminated upon receipt.</li>
                            <li>The received cuts or weight do not match your order confirmation.</li>
                        </ul>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#047857]" /> 2. Reporting Timeline
                        </h3>
                        <p>
                            Because meat is a fresh, perishable commodity, issues must be reported promptly upon delivery or unboxing. Please submit a picture of the item along with the order ID via the Orders tab or our support helpline.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#047857]" /> 3. Refund Method
                        </h3>
                        <p>
                            Once verified, refunds are credited back to the source account (UPI, credit/debit card, or wallet) within 7 business days depending on your bank's settlement cycle.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicyPage;
