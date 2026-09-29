import React from 'react';
import { ChevronLeft, Award, CheckCircle2, Snowflake, ShieldCheck, Sparkles, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const QualityPolicyPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    const qualityPillars = [
        {
            icon: Sparkles,
            title: "100% Fresh & Chemical-Free",
            desc: "Zero preservatives, zero chemicals, and no artificial tenderizers. Only natural, prime cuts."
        },
        {
            icon: Snowflake,
            title: "Never Frozen",
            desc: "Sourced daily and processed fresh to retain natural tenderness, moisture, and nutritional value."
        },
        {
            icon: ShieldCheck,
            title: "Always Hygienic",
            desc: "Cleaned, precision-cut, and vacuum-sealed in sanitized facilities maintaining strict hygiene protocols."
        },
        {
            icon: HeartHandshake,
            title: "Farm to Table Integrity",
            desc: "Ethically sourced livestock and poultry with complete traceability and quality inspection."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3.5 flex items-center gap-2 shadow-sm border-b border-slate-100">
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
                    <h1 className="text-lg font-normal font-anton tracking-wide text-slate-900 leading-tight uppercase">Quality Policy</h1>
                    <p className="text-[11px] font-semibold text-slate-400">Our Uncompromising Standards</p>
                </div>
            </div>

            <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2B0E11] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#C81017]/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAB82C]/20 border border-[#FAB82C]/40 text-[#FAB82C] text-xs font-bold uppercase tracking-wider mb-4">
                            <Award size={14} /> Quality Assurance
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
                            Quality Policy
                        </h2>
                        {/* Core user statement */}
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mt-3">
                            <p className="text-base sm:text-lg font-bold text-amber-200 leading-relaxed">
                                &ldquo;We promise 100% fresh, chemical-free meat – never frozen, always hygienic.&rdquo;
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quality Pillars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {qualityPillars.map((pillar, idx) => {
                        const Icon = pillar.icon;
                        return (
                            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start gap-4 hover:border-red-100 transition-all">
                                <div className="w-11 h-11 rounded-xl bg-red-50 text-[#C81017] flex items-center justify-center shrink-0">
                                    <Icon size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm mb-1">{pillar.title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{pillar.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detailed Standards Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 space-y-5">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-[#047857]" /> How We Guarantee Quality
                    </h3>
                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-3.5">
                        <p className="leading-relaxed">
                            At <span className="font-semibold text-slate-800">{appName}</span>, quality is not an afterthought—it is our founding principle. We implement a rigorous cold-chain management process and hygiene checks at every stage, from livestock selection to your doorstep.
                        </p>
                        <div className="space-y-2.5 pt-1">
                            <div className="flex items-start gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-[#C81017] mt-1.5 shrink-0"></span>
                                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                                    <strong>Daily Fresh Batches:</strong> Meat is never carried over frozen or chilled across extended storage cycles.
                                </p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-[#C81017] mt-1.5 shrink-0"></span>
                                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                                    <strong>Sanitized Handling:</strong> Temperature-monitored prep zones and medical-grade sanitized surfaces.
                                </p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-[#C81017] mt-1.5 shrink-0"></span>
                                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                                    <strong>Food-Grade Packaging:</strong> Sealed in tamper-proof, insulated packaging to preserve natural juices and freshness until opened.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QualityPolicyPage;
