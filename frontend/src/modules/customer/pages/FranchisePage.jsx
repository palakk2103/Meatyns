import React, { useState } from 'react';
import { 
    ChevronLeft, 
    Rocket, 
    Sparkles, 
    Snowflake, 
    Lightbulb, 
    TrendingUp, 
    ShieldCheck, 
    GraduationCap, 
    Truck, 
    Megaphone, 
    Phone, 
    MessageSquare, 
    MapPin, 
    Building2, 
    CheckCircle2, 
    ArrowRight, 
    IndianRupee, 
    HelpCircle,
    Send,
    BadgePercent
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const whyChooseItems = [
    {
        emoji: '🚀',
        icon: Rocket,
        title: 'Fastest growing premium meat brand in Maharashtra',
        highlight: 'Rapid Regional Growth',
        description: 'Join Maharashtra\'s fastest-expanding fresh meat retail network with unparalleled brand momentum and customer loyalty.',
        badgeColor: 'bg-rose-50 text-[#C81017] border-rose-200'
    },
    {
        emoji: '🥩',
        icon: Sparkles,
        title: 'High-demand industry with repeat customers',
        highlight: 'Consistent Daily Demand',
        description: 'Fresh meat is an essential grocery category characterized by exceptionally high weekly repeat orders and lifelong customer retention.',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
        emoji: '🧊',
        icon: Snowflake,
        title: 'Cold-chain supported logistics',
        highlight: 'Farm-to-Store Freshness',
        description: 'Zero spoilage risk with our dedicated temperature-controlled supply chain delivering certified hygienic cuts every morning.',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
        emoji: '💡',
        icon: Lightbulb,
        title: 'Low investment, high returns',
        highlight: 'Optimized Unit Economics',
        description: 'A capital-efficient business model structured for fast breakeven, predictable operational margins, and strong cash flow.',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
];

const benefitsList = [
    {
        icon: GraduationCap,
        title: 'Training & Operational Support',
        points: [
            'Comprehensive onboarding & standard operating procedures (SOPs)',
            'Master butchery, cutting techniques & hygiene training',
            'Cloud POS billing system & daily inventory management software',
            'Dedicated field support specialist for regular store guidance'
        ],
        badge: 'End-to-End Enablement',
        accentBg: 'from-amber-500/10 to-transparent',
        iconColor: 'text-amber-600 bg-amber-100/80'
    },
    {
        icon: Truck,
        title: 'Centralized Supply Chain',
        points: [
            'Daily doorstep replenishment of freshly processed meat',
            'Farm-sourced goat, sheep & lamb adhering to strict hygiene benchmarks',
            'Pre-cut vacuum packaging reducing in-store wastage and odor',
            'Strict quality audits and 100% cold-chain transit'
        ],
        badge: 'Zero Procurement Hassle',
        accentBg: 'from-blue-500/10 to-transparent',
        iconColor: 'text-blue-600 bg-blue-100/80'
    },
    {
        icon: Megaphone,
        title: 'Strong Brand Identity & Marketing Support',
        points: [
            'High-converting hyperlocal digital ads targeting nearby households',
            'Premium store signage, menu boards & branded packaging collateral',
            'Grand opening promotional blitz & local influencer campaigns',
            'Customer app integration routing online orders to your store'
        ],
        badge: 'High Footfall & Demand',
        accentBg: 'from-rose-500/10 to-transparent',
        iconColor: 'text-[#C81017] bg-rose-100/80'
    }
];

const faqs = [
    {
        q: 'What is the typical retail store size required?',
        a: 'A prime ground-floor retail space of approximately 250 to 450 sq. ft. in a dense residential neighborhood or commercial high street with clean water supply and electricity.'
    },
    {
        q: 'Do I need prior experience in the meat or retail business?',
        a: 'No prior meat industry experience is needed. Meatyns provides complete operational training, hiring assistance, POS software, and daily ready-to-sell supply from our centralized facility.'
    },
    {
        q: 'What is the estimated setup timeline to open a franchise store?',
        a: 'Upon site approval and agreement signing, a typical Meatyns franchise store is fully fitted, equipped, and launched within 20 to 30 days.'
    },
    {
        q: 'How does the daily stock replenishment work?',
        a: 'Orders placed on the partner portal are processed overnight at our centralized hub and delivered directly to your store before morning opening via refrigerated transport.'
    }
];

const FranchisePage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    // Lead inquiry form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        city: 'Pune',
        budget: '₹15 Lakhs Ready',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;

        // Construct pre-filled WhatsApp message for immediate direct contact
        const waText = encodeURIComponent(
            `Hi Meatyns Franchise Team,\n\nI am interested in exploring a franchise opportunity in Maharashtra.\n\n*Name:* ${formData.name}\n*Phone:* ${formData.phone}\n*City:* ${formData.city}\n*Investment Readiness:* ${formData.budget}\n*Note:* ${formData.message || 'Looking forward to discussing franchise details.'}`
        );

        // Open WhatsApp in new tab for direct conversion
        window.open(`https://wa.me/917558598590?text=${waText}`, '_blank');
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-800">
            {/* Top Sticky Navigation Bar */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 shadow-xs">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (window.history.length > 1) {
                                    navigate(-1);
                                } else {
                                    navigate('/');
                                }
                            }}
                            className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors -ml-1 text-slate-700"
                            aria-label="Go back"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <div>
                            <h1 className="text-base sm:text-lg font-anton font-normal tracking-wide uppercase text-slate-900 leading-none">
                                Franchise Opportunities
                            </h1>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Partner with {appName} in Maharashtra
                            </p>
                        </div>
                    </div>

                    <a
                        href="tel:18002338590"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-[#C81017] hover:bg-red-100 transition-colors text-xs font-bold shrink-0 border border-red-200"
                    >
                        <Phone size={13} className="text-[#C81017]" />
                        <span className="hidden sm:inline">Toll-Free:</span>
                        <span>1800-233-8590</span>
                    </a>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
                {/* Hero Section */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-white to-red-50/70 text-slate-800 p-6 sm:p-10 shadow-sm border border-slate-200">
                    {/* Decorative ambient elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-100/50 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-56 h-56 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#C81017] text-xs font-bold tracking-wide uppercase mb-4">
                            <Sparkles size={14} className="text-[#C81017]" />
                            <span>Franchise Opportunity • Maharashtra</span>
                        </div>

                        <h2 className="text-2xl sm:text-4xl md:text-[40px] font-anton font-normal tracking-wide uppercase leading-tight text-slate-900">
                            Be a Part of Maharashtra’s Premium Meat Revolution!
                        </h2>

                        <p className="mt-3.5 text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                            Own a high-yielding, modern fresh meat outlet backed by cold-chain logistics, centralized procurement, and Maharashtra’s most trusted premium meat brand.
                        </p>

                        {/* Quick CTA Actions */}
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <a
                                href="#franchise-inquiry"
                                className="px-5 py-3 rounded-xl bg-[#C81017] hover:bg-[#a50d13] text-white font-bold text-sm shadow-sm active:scale-95 transition-all inline-flex items-center gap-2"
                            >
                                <span>Apply for Franchise</span>
                                <ArrowRight size={16} />
                            </a>

                            <a
                                href="tel:7558598590"
                                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-xs active:scale-95 transition-all inline-flex items-center gap-2"
                            >
                                <Phone size={16} className="text-[#C81017]" />
                                <span>Call 75585 98590</span>
                            </a>
                        </div>

                        {/* Quick Highlights Bar */}
                        <div className="mt-8 pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                                <p className="text-slate-500 font-semibold">Investment Model</p>
                                <p className="text-slate-900 font-black text-sm sm:text-base mt-0.5">₹15 Lakh Total</p>
                            </div>
                            <div>
                                <p className="text-slate-500 font-semibold">Logistics</p>
                                <p className="text-slate-900 font-black text-sm sm:text-base mt-0.5">100% Cold Chain</p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <p className="text-slate-500 font-semibold">Turnaround Time</p>
                                <p className="text-slate-900 font-black text-sm sm:text-base mt-0.5">25 Days to Launch</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Why Choose Meatyns Franchise? */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                        <div>
                            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#C81017]">
                                <TrendingUp size={14} />
                                <span>The Meatyns Advantage</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                                Why Choose Meatyns Franchise?
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Tested business model built for sustainable profits
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {whyChooseItems.map((item, idx) => {
                            return (
                                <div
                                    key={idx}
                                    className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <span className="text-2xl" role="img" aria-label="Icon">{item.emoji}</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.badgeColor}`}>
                                                {item.highlight}
                                            </span>
                                        </div>
                                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-[#C81017] transition-colors">
                                            {item.title}
                                        </h4>
                                        <p className="mt-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-[#C81017] transition-colors">
                                        <span>Proven model</span>
                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Section: Franchise Investment Model */}
                <section className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-slate-50 rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm relative overflow-hidden">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAB82C]/20 text-amber-900 font-bold text-xs uppercase tracking-wider mb-2">
                            <IndianRupee size={13} />
                            <span>Transparent Financial Plan</span>
                        </div>
                        <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Franchise Investment Model
                        </h3>
                        <p className="text-slate-600 text-xs sm:text-sm mt-1.5">
                            Clear, upfront capital allocation structured to get your outlet operational with high profitability and zero ambiguity.
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Venture Stake Card */}
                        <div className="bg-white rounded-2xl p-6 border-2 border-[#C81017]/20 shadow-sm relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-xl pointer-events-none" />
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#C81017] bg-red-50 px-2.5 py-1 rounded-md">
                                        Setup &amp; Capital
                                    </span>
                                    <Building2 size={20} className="text-[#C81017]" />
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                    ₹13 Lakh
                                </div>
                                <h4 className="text-base font-extrabold text-slate-800 mt-1">
                                    Venture Stake
                                </h4>
                                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Turnkey retail shop interior &amp; exterior branding</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Commercial cold display counters &amp; deep chillers</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Cloud POS billing machine, digital scale &amp; software</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Opening meat inventory, packaging materials &amp; staff uniforms</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Security Deposit Card */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                                        Secure &amp; Refundable
                                    </span>
                                    <ShieldCheck size={20} className="text-emerald-600" />
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                    ₹2 Lakh
                                </div>
                                <h4 className="text-base font-extrabold text-slate-800 mt-1">
                                    Security Deposit
                                </h4>
                                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>100% refundable security deposit as per agreement terms</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Operational compliance and quality assurance guarantee</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Standard agreement tenure with convenient renewal terms</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-600">Total Investment</span>
                                <span className="font-extrabold text-slate-900 text-sm">₹15 Lakh Initial</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Benefits */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                        <div>
                            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#C81017]">
                                <BadgePercent size={14} />
                                <span>Partner Prosperity</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                                Franchise Benefits
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Full backing from India’s leading meat specialists
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {benefitsList.map((benefit, idx) => {
                            const IconComponent = benefit.icon;
                            return (
                                <div
                                    key={idx}
                                    className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${benefit.iconColor}`}>
                                                <IconComponent size={22} />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                {benefit.badge}
                                            </span>
                                        </div>

                                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                                            {benefit.title}
                                        </h4>

                                        <ul className="mt-4 space-y-2.5">
                                            {benefit.points.map((pt, pIdx) => (
                                                <li key={pIdx} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#C81017] mt-1.5 shrink-0" />
                                                    <span>{pt}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Section: Direct Contact & Inquiry Form */}
                <section id="franchise-inquiry" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm scroll-mt-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left column: Contact Info */}
                        <div className="lg:col-span-5 space-y-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#C81017] text-xs font-bold uppercase tracking-wider mb-2">
                                    <Phone size={13} />
                                    <span>Let's Connect</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Contact Us Today to Explore Franchise Opportunities
                                </h3>
                                <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
                                    Our franchise expansion team is ready to answer your questions, assist with site feasibility, and guide you through the partner onboarding process.
                                </p>
                            </div>

                            {/* Direct Contact Numbers */}
                            <div className="space-y-3">
                                <a
                                    href="tel:18002338590"
                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-red-300 hover:bg-red-50/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-100/70 text-[#C81017] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Toll-Free Helpline</p>
                                            <p className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#C81017] transition-colors">
                                                1800-233-8590
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-[#C81017] group-hover:underline">Call Free</span>
                                </a>

                                <a
                                    href="tel:7558598590"
                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Direct Business Team</p>
                                            <p className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                                                75585 98590
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-amber-800 group-hover:underline">Call / WhatsApp</span>
                                </a>
                            </div>

                            {/* WhatsApp Direct Action */}
                            <a
                                href="https://wa.me/917558598590?text=Hi%20Meatyns,%20I%20am%20interested%20in%20a%20Franchise%20opportunity%20in%20Maharashtra."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
                            >
                                <MessageSquare size={17} />
                                <span>Chat with Franchise Lead on WhatsApp</span>
                            </a>
                        </div>

                        {/* Right column: Interactive Inquiry Form */}
                        <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-5 sm:p-7 border border-slate-200">
                            <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                                Express Your Interest
                            </h4>
                            <p className="text-xs text-slate-500 mb-5">
                                Fill this brief form and our franchise manager will call you back within 24 hours.
                            </p>

                            {submitted ? (
                                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h5 className="text-base font-bold text-slate-900">Thank You for Your Interest!</h5>
                                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                                        Your details have been recorded. Our Maharashtra expansion team will connect with you promptly.
                                    </p>
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="text-xs font-bold text-[#C81017] hover:underline pt-2 block mx-auto"
                                    >
                                        Submit another inquiry
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter your name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Phone Number *
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="e.g. 98765 43210"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Target City in Maharashtra
                                            </label>
                                            <select
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                            >
                                                <option value="Pune">Pune</option>
                                                <option value="Mumbai / MMR">Mumbai / MMR</option>
                                                <option value="Nagpur">Nagpur</option>
                                                <option value="Nashik">Nashik</option>
                                                <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                                                <option value="Solapur">Solapur</option>
                                                <option value="Kolhapur">Kolhapur</option>
                                                <option value="Satara / Sangli">Satara / Sangli</option>
                                                <option value="Other Maharashtra City">Other Maharashtra City</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Investment Readiness
                                        </label>
                                        <select
                                            value={formData.budget}
                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                        >
                                            <option value="₹15 Lakhs Ready (Immediate)">₹15 Lakhs Ready (Ready in 30 Days)</option>
                                            <option value="Planning within 60 Days">Planning within 60 Days</option>
                                            <option value="Exploring Options & Feasibility">Exploring Options & Feasibility</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Message or Preferred Location Details (Optional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Mention specific locality, commercial property availability, or questions..."
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-3 px-4 rounded-xl bg-[#C81017] hover:bg-[#a50d13] text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} />
                                        <span>Submit Franchise Inquiry</span>
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </section>

                {/* Section: Frequently Asked Questions */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <HelpCircle size={20} className="text-[#C81017]" />
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                            Franchise FAQs
                        </h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {faqs.map((faq, fIdx) => (
                            <div key={fIdx} className="py-3.5">
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === fIdx ? null : fIdx)}
                                    className="w-full flex items-center justify-between text-left font-bold text-sm text-slate-800 hover:text-[#C81017] transition-colors"
                                >
                                    <span>{faq.q}</span>
                                    <span className="text-slate-400 text-lg ml-2 font-light">
                                        {openFaqIndex === fIdx ? '−' : '+'}
                                    </span>
                                </button>
                                {openFaqIndex === fIdx && (
                                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pr-4">
                                        {faq.a}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Footer Assurance Banner */}
                <div className="rounded-2xl p-5 bg-gradient-to-r from-red-50 via-amber-50 to-white border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-extrabold text-slate-900">
                            Ready to transform the meat industry in your city?
                        </p>
                        <p className="text-xs text-slate-600">
                            Call 1800-233-8590 or 75585 98590 to speak with our franchise director today.
                        </p>
                    </div>
                    <a
                        href="tel:18002338590"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C81017] hover:bg-[#a50d13] text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
                    >
                        <Phone size={14} />
                        <span>Call Toll-Free</span>
                    </a>
                </div>

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} {appName} Retail Pvt. Ltd. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default FranchisePage;
