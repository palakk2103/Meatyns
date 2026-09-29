import React from 'react';
import { ChevronLeft, RotateCcw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const ReturnPolicyPage = () => {
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
                <h1 className="text-lg font-normal font-anton tracking-wide text-slate-800 uppercase">Return &amp; Replacement Policy</h1>
            </div>

            <div className="p-4 sm:p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-primary">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Return &amp; Replacement Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Fresh Meat Standards &amp; Replacement Policy</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            Thank you for shopping at <span className="font-semibold text-slate-800">{appName}</span>. Because meat is a perishable, temperature-sensitive food item, we guarantee freshness at handoff with an instant replacement or refund policy.
                        </p>

                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 my-4 not-prose">
                            <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider mb-1">Our Core Commitment</h4>
                            <p className="text-sm font-bold text-slate-800 leading-snug">
                                Instant replacement/refund if meat is stale, damaged, or incorrect. Refunds processed within 7 working days.
                            </p>
                        </div>

                        <h3 className="text-slate-800 font-bold text-base mt-6">1. Eligibility for Returns &amp; Replacements</h3>
                        <p>
                            Given the perishable nature of fresh meat, physical return of opened meat is generally not required unless requested for quality testing. If your meat is stale, damaged, or incorrect, we will issue an immediate replacement delivery or refund.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">2. Resolution Timelines</h3>
                        <p>
                            Replacement orders are dispatched with priority. In cases where a refund is preferred, it will be credited to the customer's account within 7 working days.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">3. How to Initiate a Claim</h3>
                        <p>
                            Please navigate to your Orders section, tap on the relevant order, or reach out directly to customer support via phone or email with your Order ID and photos of the item within delivery hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnPolicyPage;
