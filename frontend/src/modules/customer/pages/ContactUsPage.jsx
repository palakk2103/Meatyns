import React, { useState } from 'react';
import { 
    ChevronLeft, 
    MapPin, 
    Phone, 
    Mail, 
    Clock, 
    MessageSquare, 
    Navigation, 
    Send, 
    CheckCircle2, 
    Sparkles, 
    Headphones,
    ArrowRight
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const ContactUsPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    // Contact details from specifications
    const address = "Unit-A, Shop No. 11, Sharda Vihar Apartment, Isolation Ring Road, Near Dhyan Chand Hockey Stadium, Kolhapur";
    const tollFreePhone = "1800-233-8590";
    const directPhone = "75585 98590";
    const email = "contact@meatyns.com";
    const timings = "8:00 AM – 9:00 PM (All Days)";

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        subject: 'General Inquiry',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;

        // Build WhatsApp message for fast interactive assistance
        const text = encodeURIComponent(
            `Hi Meatyns Support,\n\n*Name:* ${formData.name}\n*Phone:* ${formData.phone}\n*Email:* ${formData.email || 'N/A'}\n*Subject:* ${formData.subject}\n*Message:* ${formData.message}`
        );

        window.open(`https://wa.me/917558598590?text=${text}`, '_blank');
        setSubmitted(true);
    };

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        "Sharda Vihar Apartment, Isolation Ring Road, Near Dhyan Chand Hockey Stadium, Kolhapur"
    )}`;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-800">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-200/80 shadow-xs">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
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
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                            Contact Us
                        </h1>
                    </div>

                    <a
                        href={`tel:18002338590`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-[#C81017] hover:bg-red-100 transition-colors text-xs font-bold border border-red-200 shrink-0"
                    >
                        <Phone size={13} />
                        <span className="hidden sm:inline">Toll-Free:</span>
                        <span>1800-233-8590</span>
                    </a>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 pt-4 sm:pt-6 space-y-5">
                {/* Hero Header Card */}
                <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white via-white to-red-50/60 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#C81017] text-xs font-bold uppercase tracking-wider mb-3 border border-red-100">
                        <Sparkles size={13} className="text-[#C81017]" />
                        <span>Customer Support &amp; Outlet</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                        We’d Love to Hear From You 🥩
                    </h2>

                    <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                        Have a question about our cuts, delivery, your order, or franchise inquiry? Reach out to our team or visit our store.
                    </p>
                </div>

                {/* 4 Main Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Outlet Address Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#C81017] flex items-center justify-center">
                                    <MapPin size={20} />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                    Kolhapur Outlet
                                </span>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-base">Outlet Address</h3>
                            <p className="mt-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                                {address}
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C81017] hover:underline"
                            >
                                <Navigation size={13} />
                                <span>Get Directions on Google Maps</span>
                            </a>
                        </div>
                    </div>

                    {/* Phone Numbers Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                                    <Phone size={20} />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Instant Support
                                </span>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-base">Phone Numbers</h3>
                            <div className="mt-2.5 space-y-2 text-xs sm:text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Toll-Free:</span>
                                    <a href="tel:18002338590" className="font-bold text-slate-900 hover:text-[#C81017] transition-colors">
                                        {tollFreePhone}
                                    </a>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Direct / Mobile:</span>
                                    <a href="tel:7558598590" className="font-bold text-slate-900 hover:text-[#C81017] transition-colors">
                                        {directPhone}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                            <a
                                href="tel:18002338590"
                                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#C81017] font-bold text-xs transition-colors"
                            >
                                Call Toll-Free
                            </a>
                            <a
                                href="https://wa.me/917558598590"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                            >
                                WhatsApp
                            </a>
                        </div>
                    </div>

                    {/* Email Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                                    <Mail size={20} />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    Official Email
                                </span>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-base">Email Us</h3>
                            <p className="mt-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                                For inquiries, feedback, business partnerships, or order queries.
                            </p>
                            <a
                                href={`mailto:${email}`}
                                className="mt-2 block font-bold text-sm sm:text-base text-slate-900 hover:text-[#C81017] transition-colors"
                            >
                                {email}
                            </a>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <a
                                href={`mailto:${email}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C81017] hover:underline"
                            >
                                <span>Write an Email</span>
                                <ArrowRight size={13} />
                            </a>
                        </div>
                    </div>

                    {/* Timings Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-all">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    All Days
                                </span>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-base">Store &amp; Delivery Timings</h3>
                            <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                                {timings}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 font-medium">
                                Fresh deliveries available throughout the day across all service zones.
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Open Today • 8:00 AM – 9:00 PM</span>
                        </div>
                    </div>
                </div>

                {/* Quick Message / Feedback Form */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                            Send Us a Message
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Have an immediate question? Fill this form to connect directly with our support desk.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2.5">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <h4 className="text-base font-bold text-slate-900">Message Sent!</h4>
                            <p className="text-xs text-slate-600">
                                Thank you for contacting Meatyns. Our customer support team will get in touch shortly.
                            </p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-xs font-bold text-[#C81017] hover:underline pt-2 block mx-auto"
                            >
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Your Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                    />
                                </div>
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
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Email Address (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Inquiry Type
                                    </label>
                                    <select
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                    >
                                        <option value="General Inquiry">General Inquiry</option>
                                        <option value="Order Status & Delivery">Order Status &amp; Delivery</option>
                                        <option value="Product Quality & Cuts">Product Quality &amp; Cuts</option>
                                        <option value="Franchise Opportunity">Franchise Opportunity</option>
                                        <option value="Feedback / Suggestion">Feedback / Suggestion</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Message *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Write your message or inquiry here..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C81017]/20 focus:border-[#C81017]"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-4 rounded-xl bg-[#C81017] hover:bg-[#a50d13] text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                                <Send size={16} />
                                <span>Submit Message</span>
                            </button>
                        </form>
                    )}
                </div>

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} {appName}. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default ContactUsPage;
