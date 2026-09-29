import React from 'react';
import { ChevronLeft, Shield, Lock, CheckCircle2, UserCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromDelivery = searchParams.get('from') === 'delivery';
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
                <h1 className="text-lg font-normal font-anton tracking-wide text-slate-800 uppercase">Privacy Policy</h1>
            </div>

            <div className="p-4 sm:p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-[#6B21A8]">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Privacy Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Data Protection &amp; Customer Privacy</p>
                        </div>
                    </div>

                    {/* Core User Policy Card */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/80 mb-6 flex items-start gap-3.5">
                        <Lock size={22} className="text-[#6B21A8] shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs font-black uppercase text-purple-900 tracking-wider mb-1">Our Privacy Promise</h3>
                            <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                                &ldquo;Your data (name, phone, address) is only used for order fulfillment. We never share it with third parties.&rdquo;
                            </p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            At <span className="font-semibold text-slate-800">{appName}</span>, we take your privacy with the utmost seriousness. This Privacy Policy outlines how your information is handled with complete safety and transparency.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#6B21A8]" /> 1. Information We Collect
                        </h3>
                        <p>
                            We only collect essential details necessary to fulfill your fresh meat orders accurately, including your full name, mobile number, delivery address, and geolocation coordinates.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#6B21A8]" /> 2. Sole Purpose: Order Fulfillment
                        </h3>
                        <p>
                            Your personal information is strictly utilized to process your transactions, coordinate with our verified delivery fleet, send real-time order updates, and provide customer support.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#6B21A8]" /> 3. Zero Third-Party Sharing or Selling
                        </h3>
                        <p>
                            We do not sell, rent, monetize, or trade your contact or location data to advertising networks, third-party marketing companies, or data brokers under any circumstances.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#6B21A8]" /> 4. Data Security &amp; Encryption
                        </h3>
                        <p>
                            All information is transmitted over secure SSL/TLS channels and stored within encrypted infrastructure following modern data security standards.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#6B21A8]" /> 5. Account Control &amp; Deletion
                        </h3>
                        <p>
                            You have complete ownership over your account details. You can update or request deletion of your account and associated addresses at any time by contacting our support desk.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
