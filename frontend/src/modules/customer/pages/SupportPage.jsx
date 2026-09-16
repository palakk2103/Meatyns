import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText,
  ChevronLeft,
  PlusCircle,
  X,
  Send,
  MapPin,
  Headphones,
  Search,
  Zap,
  CircleUserRound,
  ShoppingCart,
} from 'lucide-react';
import { useToast } from '@shared/components/ui/Toast';
import { useSettings } from '@core/context/SettingsContext';
import { useCart } from '../context/CartContext';
import { useLocation as useAppLocation } from '../context/LocationContext';
import LocationDrawer from '../components/shared/LocationDrawer';
import { LeafLogo } from '../components/shared/MainLocationHeader';
import { customerApi } from '../services/customerApi';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import axiosInstance from '@core/api/axios';
import { getJSON, setJSON, STORAGE_KEYS } from '@core/utils/storage';

const FAQ_CACHE_KEY = STORAGE_KEYS.FAQ_CACHE;
const FAQ_CACHE_TTL_MS = 5 * 60 * 1000;

const SupportPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { cartCount } = useCart();
    const { currentLocation, refreshLocation, isFetchingLocation } = useAppLocation();
    const [isLocationOpen, setIsLocationOpen] = useState(false);

    const supportEmail = settings?.supportEmail || 'anitamegamart@gmail.com';
    const supportPhone = settings?.supportPhone || '02269621920';
    const supportEmailShort = supportEmail ? (supportEmail.length > 18 ? supportEmail.slice(0, 15) + '...' : supportEmail) : 'support@...';
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [ticketData, setTicketData] = useState({
        subject: '',
        description: '',
        priority: 'medium'
    });
    const [faqs, setFaqs] = useState([]);

    useEffect(() => {
        const fetchFaqs = async () => {
            const cached = getJSON(FAQ_CACHE_KEY, null, { storage: 'session' });
            if (cached && Array.isArray(cached.items)) {
                setFaqs(cached.items);
                return;
            }

            try {
                const response = await axiosInstance.get('/public/faqs', {
                    params: { category: 'Customer', status: 'published' }
                });
                const data = response.data?.result ?? response.data;
                const list = Array.isArray(data?.items) ? data.items : Array.isArray(data?.results) ? data.results : [];
                setFaqs(list);
                setJSON(
                    FAQ_CACHE_KEY,
                    { items: list },
                    { storage: 'session', ttlMs: FAQ_CACHE_TTL_MS },
                );
            } catch (error) {
                console.error('Error fetching FAQs:', error);
            }
        };

        fetchFaqs();
    }, []);

    const handleTicketSubmit = async (e) => {
        e.preventDefault();
        try {
            setTicketLoading(true);
            const res = await customerApi.createTicket({
                ...ticketData,
                userType: 'Customer'
            });
            if (res.data.success) {
                showToast("Ticket raised successfully", "success");
                setIsTicketModalOpen(false);
                setTicketData({ subject: '', description: '', priority: 'medium' });
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to create ticket", "error");
        } finally {
            setTicketLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFF9F4] pb-24 font-outfit">
            {/* ──── Sticky Header matching Home and Search page background color ──── */}
            <div
                className="sticky top-0 z-30 bg-[#520e1e] shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden"
                style={{
                    backgroundImage: "linear-gradient(135deg, #4A0C1B 0%, #520e1e 50%, #681327 100%)",
                }}
            >
                {/* Subtle dark overlay */}
                <div className="absolute inset-0 bg-black/5 pointer-events-none" />

                {/* ──── Desktop Main Header Row (md+) matching Home & Search Page ──── */}
                <div className="hidden md:flex items-center justify-between relative z-20 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-2.5">
                    {/* Left: Brand Logo */}
                    <div
                        onClick={() => navigate("/")}
                        className="flex items-center gap-3 cursor-pointer group shrink-0 select-none"
                    >
                        <div className="group-hover:scale-105 transition-transform duration-200">
                            <LeafLogo className="w-8 h-8 lg:w-9 lg:h-9 text-white shrink-0 drop-shadow-sm" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[24px] lg:text-[27px] font-serif font-bold text-white tracking-tight leading-none drop-shadow-sm">
                                Meatyns
                            </span>
                            <span className="text-[10.5px] lg:text-[11px] font-normal text-white/80 tracking-wide mt-1 leading-none">
                                Fresh &bull; Fast &bull; Everyday
                            </span>
                        </div>
                    </div>

                    {/* Center: Search Bar */}
                    <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
                        <div
                            onClick={() => navigate("/search")}
                            className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 cursor-pointer shadow-sm hover:shadow transition-shadow"
                        >
                            <Search size={18} className="text-[#520e1e] shrink-0 stroke-[2.2]" />
                            <input
                                type="text"
                                placeholder="Search for meat, fish, seafood, etc..."
                                readOnly
                                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-normal text-[13.5px] cursor-pointer select-none"
                            />
                        </div>
                    </div>

                    {/* Right Section: Delivery & Actions */}
                    <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                        {/* Deliver to */}
                        <button
                            type="button"
                            onClick={() => {
                                refreshLocation?.();
                                setIsLocationOpen(true);
                            }}
                            className="flex items-center gap-2 text-left text-white bg-transparent border-0 p-0 cursor-pointer group hover:opacity-90 transition-opacity"
                        >
                            <MapPin size={20} className="text-white shrink-0 stroke-[1.8]" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] text-white/75 font-normal tracking-wide leading-tight">
                                    Deliver to
                                </span>
                                <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-white leading-tight">
                                    <span className="max-w-[110px] lg:max-w-[140px] truncate">
                                        {isFetchingLocation
                                            ? "Detecting..."
                                            : currentLocation?.name || "Indore"}
                                    </span>
                                    <ChevronDown size={13} className="text-white/80 shrink-0" />
                                </div>
                            </div>
                        </button>

                        {/* Delivery in */}
                        <div className="flex items-center gap-2 text-white">
                            <Zap size={18} className="text-white fill-white shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] text-white/75 font-normal tracking-wide leading-tight">
                                    Delivery in
                                </span>
                                <span className="text-[13px] lg:text-sm font-bold text-white whitespace-nowrap leading-tight">
                                    {currentLocation?.time || "15–30 mins"}
                                </span>
                            </div>
                        </div>

                        {/* Profile */}
                        <button
                            type="button"
                            onClick={() => navigate("/profile")}
                            aria-label="Profile"
                            className="text-white hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <CircleUserRound size={28} className="text-white stroke-[1.7]" />
                        </button>

                        {/* Cart */}
                        <button
                            type="button"
                            onClick={() => navigate("/checkout")}
                            aria-label="Shopping Cart"
                            className="relative text-white hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <ShoppingCart size={24} className="text-white stroke-[2]" />
                            <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#e53935] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                                {cartCount || 0}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ──── Support Heading Bar (Desktop & Mobile) ──── */}
                <div className="border-t border-white/10">
                    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-all border border-white/10 backdrop-blur-md -ml-1 active:scale-95 cursor-pointer"
                            >
                                <ChevronLeft size={22} className="text-white" />
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                                    <Headphones size={20} className="text-white" />
                                    Help & Support
                                </h1>
                                <p className="text-[11px] md:text-xs text-white/80 font-normal leading-tight mt-0.5">
                                    We're here to help you with your orders and inquiries
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Drawer */}
            <LocationDrawer
                isOpen={isLocationOpen}
                onClose={() => setIsLocationOpen(false)}
            />

            <div className="max-w-3xl mx-auto px-4 pt-6 relative z-20 space-y-6">
                {/* Contact Channels */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ContactCard icon={MessageCircle} label="Chat Us" sub="Instant Support" to="/chat" />
                    <ContactCard
                        icon={PlusCircle}
                        label="Raise Ticket"
                        sub="Formal Request"
                        onClick={() => setIsTicketModalOpen(true)}
                    />
                    <ContactCard 
                        icon={Phone} 
                        label="Call Us" 
                        sub={supportPhone} 
                        onClick={() => window.location.href = `tel:${supportPhone}`} 
                    />
                    <ContactCard 
                        icon={Mail} 
                        label="Email Us" 
                        sub={supportEmailShort} 
                        onClick={() => window.location.href = `mailto:${supportEmail}`} 
                    />
                </div>

                {/* Store Address */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-[#520e1e]/10 flex items-center justify-center text-[#520e1e] shrink-0">
                        <MapPin size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Store Address</h3>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{settings?.address || 'Ramkrishna Nagar patna 800020'}</p>
                    </div>
                </div>

                {/* FAQ Section */}
                <div>
                    <h2 className="text-base font-bold text-slate-800 mb-3 px-1 flex items-center gap-2">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-3">
                        {faqs.length > 0 ? (
                            faqs.map((faq) => (
                                <FAQItem
                                    key={faq._id}
                                    question={faq.question}
                                    answer={faq.answer}
                                />
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl shadow-[0_4px_10px_rgb(0,0,0,0.02)] border border-slate-100 px-5 py-6 text-sm text-slate-400 text-center">
                                No FAQs available right now.
                            </div>
                        )}
                    </div>
                </div>

                {/* Legal Links */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Legal Information</h3>
                    <div className="space-y-2.5">
                        <Link to="/terms" className="flex items-center gap-2.5 text-slate-700 hover:text-[#520e1e] font-medium text-sm transition-colors no-underline">
                            <FileText size={18} className="text-[#520e1e]" /> Terms & Conditions
                        </Link>
                        <Link to="/privacy" className="flex items-center gap-2.5 text-slate-700 hover:text-[#520e1e] font-medium text-sm transition-colors no-underline">
                            <FileText size={18} className="text-[#520e1e]" /> Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>

            {/* Ticket Creation Modal */}
            <AnimatePresence>
                {isTicketModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsTicketModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden z-10"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">Raise a Ticket</h2>
                                        <p className="text-sm text-slate-500 font-medium">Describe your issue in detail</p>
                                    </div>
                                    <button
                                        onClick={() => setIsTicketModalOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleTicketSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subject</label>
                                        <input
                                            type="text"
                                            required
                                            value={ticketData.subject}
                                            onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                                            placeholder="What's the issue about?"
                                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none ring-1 ring-transparent focus:ring-[#520e1e]/20 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {['low', 'medium', 'high'].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setTicketData({ ...ticketData, priority: p })}
                                                className={cn(
                                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                    ticketData.priority === p
                                                        ? "bg-[#520e1e] text-white border-[#520e1e] shadow-md shadow-[#520e1e]/20"
                                                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                                        <textarea
                                            required
                                            value={ticketData.description}
                                            onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                            placeholder="Please explain the issue clearly..."
                                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold min-h-[150px] outline-none ring-1 ring-transparent focus:ring-[#520e1e]/20 transition-all"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={ticketLoading}
                                        className="w-full h-14 bg-[#520e1e] hover:bg-[#681327] text-white text-lg font-bold rounded-2xl shadow-lg shadow-[#520e1e]/20 transition-all active:scale-95 border-0 cursor-pointer"
                                    >
                                        {ticketLoading ? (
                                            <div className="flex items-center gap-2 text-center w-full justify-center">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                SUBMITTING...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-center w-full justify-center">
                                                <Send size={20} /> SUBMIT TICKET
                                            </div>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ContactCard = ({ icon: Icon, label, sub, to, onClick }) => {
    const CardContent = (
        <div
            onClick={onClick}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-[#520e1e]/40 hover:shadow-sm transition-all cursor-pointer group h-full"
        >
            <div className="h-11 w-11 rounded-xl bg-[#520e1e]/10 flex items-center justify-center text-[#520e1e] group-hover:scale-105 transition-transform">
                <Icon size={22} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm whitespace-nowrap group-hover:text-[#520e1e] transition-colors">{label}</h3>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">{sub}</p>
            </div>
        </div>
    );

    return to ? <Link to={to} className="block h-full no-underline">{CardContent}</Link> : CardContent;
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer border-0 bg-transparent"
            >
                <span className="font-bold text-slate-800 text-sm">{question}</span>
                {isOpen ? <ChevronUp size={18} className="text-[#520e1e]" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            {isOpen && (
                <div className="px-5 pb-5 text-sm text-slate-600 font-normal leading-relaxed border-t border-slate-100/80 pt-3">
                    {answer}
                </div>
            )}
        </div>
    );
};

export default SupportPage;
