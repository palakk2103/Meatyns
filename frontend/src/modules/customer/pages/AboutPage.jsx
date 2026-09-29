import React from 'react';
import { ChevronLeft, Eye, Target, CheckCircle2, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const AboutPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24">
            {/* Top Navigation */}
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
                <h1 className="text-xl font-normal font-anton tracking-wide text-slate-900 uppercase">About Us</h1>
            </div>

            <div className="px-4 pt-1 max-w-3xl mx-auto space-y-4">
                {/* About Meatyns Hero Section */}
                <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-primary">
                            <Award size={22} className="text-[#C81017]" />
                        </div>
                        <h2 className="text-xl font-normal font-anton tracking-wide text-slate-900 uppercase">About Meatyns</h2>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-base">
                        Meatyns is Maharashtra’s first premium meat brand specializing in goat, sheep, and lamb meat. Our goal is to revolutionize the meat industry with hygiene, freshness, and trust.
                    </p>
                </div>

                {/* Our Vision Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#FAB82C]">
                            <Eye size={22} className="text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Our Vision</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-base font-medium">
                        To be India’s most trusted premium fresh meat brand.
                    </p>
                </div>

                {/* Our Mission Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Target size={22} className="text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Our Mission</h3>
                    </div>
                    <ul className="space-y-3.5 text-slate-700 text-base">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>Delivering farm-fresh meat directly to your table.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>Ensuring chemical-free &amp; preservative-free meat.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>Promoting healthy, hygienic, and transparent meat practices.</span>
                        </li>
                    </ul>
                </div>

                {/* Footer Copyright */}
                <div className="text-center pt-4">
                    <p className="text-xs text-slate-400">© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
