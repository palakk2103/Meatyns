import React from 'react';
import { ChevronLeft, Truck, Clock, ThermometerSnowflake, Gift, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const ShippingPolicyPage = () => {
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
                <h1 className="text-lg font-normal font-anton tracking-wide text-slate-800 uppercase">Delivery Policy</h1>
            </div>

            <div className="p-4 sm:p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#B45309]">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Delivery Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Fast, Hygienic & Temperature-Controlled</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            Welcome to the Delivery Policy for <span className="font-semibold text-slate-800">{appName}</span>. We are dedicated to providing fast and reliable delivery of 100% fresh, hygienic meat directly to your doorstep.
                        </p>

                        {/* Core Delivery Commitments */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-6 not-prose">
                            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                                <Clock size={20} className="text-[#B45309] mb-2" />
                                <h4 className="text-xs font-bold text-slate-900 mb-1">Same-Day Delivery</h4>
                                <p className="text-xs text-slate-600 font-medium">Prompt same-day delivery in select locations.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70">
                                <ThermometerSnowflake size={20} className="text-[#0284C7] mb-2" />
                                <h4 className="text-xs font-bold text-slate-900 mb-1">Cold-Chain Maintained</h4>
                                <p className="text-xs text-slate-600 font-medium">Cold-chain maintained continuously from outlet to home.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                                <Gift size={20} className="text-[#047857] mb-2" />
                                <h4 className="text-xs font-bold text-slate-900 mb-1">Free Delivery</h4>
                                <p className="text-xs text-slate-600 font-medium">Free delivery above minimum order value.</p>
                            </div>
                        </div>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 1. Serviceable Locations
                        </h3>
                        <p>
                            We deliver across designated zones and pincodes in Kolhapur and expanding regions. Please check your delivery pincode or location picker at checkout to verify real-time coverage.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 2. Cold-Chain Standards
                        </h3>
                        <p>
                            All cuts are packaged in insulated, temperature-controlled transit pouches. From our hub to your door, the cold chain remains unbroken to safeguard freshness and microbiological safety.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 3. Delivery Fees
                        </h3>
                        <p>
                            Delivery fees depend on distance and applicable cart thresholds. Orders that meet or exceed our specified minimum order value qualify for free delivery automatically at checkout.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#C81017]" /> 4. Order Receipt &amp; Immediate Care
                        </h3>
                        <p>
                            Because our meat is 100% fresh and never frozen, we advise customers to inspect the tamper-evident seal upon handover and refrigerate or cook immediately after delivery.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShippingPolicyPage;
