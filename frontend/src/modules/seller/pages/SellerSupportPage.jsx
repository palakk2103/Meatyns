import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Store,
  Clock,
  CreditCard,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@core/context/SettingsContext";

const SELLER_FAQS = [
  {
    category: "Store Onboarding",
    question: "How long does vendor verification and store activation take?",
    answer:
      "Once you submit your Trade License, FSSAI certificate, GSTIN, and bank details, our onboarding compliance team verifies your documents within 24 to 48 hours. Upon verification, your digital storefront goes live on the Meatyns customer app.",
  },
  {
    category: "Inventory & Catalog",
    question: "How do I update product pricing, add new meat cuts, or mark items out-of-stock?",
    answer:
      "Log into your Seller Panel and navigate to 'Products' or 'Stock'. You can toggle items in/out of stock instantly with a single tap, or adjust pricing and pack weights before your daily morning orders start.",
  },
  {
    category: "Order Fulfillment",
    question: "What is the order acceptance window and preparation time limit?",
    answer:
      "To maintain hyper-fresh 15–30 minute delivery promises, sellers have a designated timeout (typically 2 to 3 minutes) to accept an incoming order. Once accepted, items must be freshly cut, packed in certified food-grade pouches, and made ready for pickup within 8–12 minutes.",
  },
  {
    category: "Payouts & Settlements",
    question: "How and when are store sales payouts disbursed?",
    answer:
      "Weekly sales settlements (total gross sales minus agreed platform commission and applicable statutory TDS) are automatically transferred to your registered bank account every Tuesday via IMPS/NEFT. Detailed settlement sheets can be downloaded from Earnings > Payment History.",
  },
  {
    category: "Store Operations",
    question: "Can I temporarily pause order acceptance during store cleaning or holidays?",
    answer:
      "Yes. On your Seller Dashboard, simply toggle your store status to 'Paused' or 'Closed for Maintenance'. You can also configure standard weekly holiday schedules under Profile > Store Hours.",
  },
  {
    category: "Returns & Quality",
    question: "What happens if a customer reports a quality or freshness concern?",
    answer:
      "Because fresh meat and seafood are perishable, return claims must be backed by unboxing photos and raised within 30 minutes of delivery. Our quality control team investigates claims; if approved, adjustments are settled in compliance with the Merchant SLA.",
  },
];

const SellerSupportPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "Meatyns";
  const supportEmail = settings?.supportEmail || "support@meatyns.com";
  const supportPhone = settings?.supportPhone || "02269621920";
  const storeAddress = settings?.address || "Meatyns Merchant Office, Ramkrishna Nagar, Patna 800020";

  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-['Outfit',_sans-serif] pb-16">
      {/* Top Sticky Header */}
      <div className="bg-[#3B0710] text-white sticky top-0 z-30 px-4 py-3.5 shadow-md border-b border-amber-900/40">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/seller/auth");
                }
              }}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white active:scale-95 transition-all cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft size={22} className="text-white" />
            </button>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <h1 className="text-base sm:text-lg font-bold tracking-wide uppercase">
                Merchant Help &amp; Support Desk
              </h1>
            </div>
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase bg-amber-400/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/30">
            Seller Portal
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pt-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-[#3B0710] via-[#52101B] to-[#2B050B] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-amber-900/30">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-6 translate-y-6">
            <Store size={180} />
          </div>

          <div className="relative z-10 max-w-lg">
            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full inline-block mb-3 border border-amber-400/30 backdrop-blur-xs">
              Merchant Partner Desk
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Grow Your Meat &amp; Seafood Business With Confidence
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 font-medium mt-2 leading-relaxed">
              Need assistance with catalog approvals, daily order handovers, revenue payouts, or store settings? Our merchant support team is ready to assist.
            </p>
          </div>
        </div>

        {/* Contact Channels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a
            href={`tel:${supportPhone}`}
            className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-[#3B0710] hover:shadow-md transition-all cursor-pointer group no-underline"
          >
            <div className="h-11 w-11 rounded-xl bg-red-50 text-[#3B0710] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Phone size={22} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Merchant Helpline</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">{supportPhone}</p>
            </div>
          </a>

          <a
            href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group no-underline"
          >
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Seller WhatsApp</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">Quick Ops Chat</p>
            </div>
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-[#3B0710] hover:shadow-md transition-all cursor-pointer group no-underline"
          >
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Merchant Desk</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">Accounts &amp; Onboarding</p>
            </div>
          </a>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col items-center justify-center text-center gap-2">
            <div className="h-11 w-11 rounded-xl bg-purple-50 text-[#6B21A8] flex items-center justify-center">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Working Hours</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">7:00 AM – 10:00 PM</p>
            </div>
          </div>
        </div>

        {/* Regional Hub & Merchant Desk */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-[#3B0710]/10 flex items-center justify-center text-[#3B0710] shrink-0">
            <MapPin size={22} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Merchant Operations &amp; Partner Desk</h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
              {storeAddress}
            </p>
            <p className="text-[11px] text-[#3B0710] font-bold mt-1">
              Store verification &amp; agreement desk: Mon – Sat
            </p>
          </div>
        </div>

        {/* Seller FAQs */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <HelpCircle size={20} className="text-[#3B0710]" />
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              Frequently Asked Questions by Sellers
            </h2>
          </div>

          <div className="space-y-3">
            {SELLER_FAQS.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-stone-50/70 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <div className="pr-3">
                    <span className="text-[10px] font-black uppercase text-[#8B2D3B] tracking-wider block mb-0.5">
                      {faq.category}
                    </span>
                    <span className="font-bold text-stone-800 text-xs sm:text-sm">
                      {faq.question}
                    </span>
                  </div>
                  {openIndex === index ? (
                    <ChevronUp size={18} className="text-[#3B0710] shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-stone-400 shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-100 bg-stone-50/50"
                    >
                      <div className="px-5 py-4 text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Links for Sellers */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <h3 className="text-[11px] font-black text-stone-400 uppercase tracking-wider mb-3">
            Merchant Legal &amp; Compliance Agreements
          </h3>
          <div className="space-y-2.5">
            <Link
              to="/seller/privacy"
              className="flex items-center gap-2.5 text-stone-700 hover:text-[#3B0710] font-bold text-xs sm:text-sm transition-colors no-underline"
            >
              <ShieldCheck size={18} className="text-[#3B0710]" />
              Merchant Partner Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="flex items-center gap-2.5 text-stone-700 hover:text-[#3B0710] font-bold text-xs sm:text-sm transition-colors no-underline"
            >
              <FileText size={18} className="text-[#3B0710]" />
              Seller Platform Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerSupportPage;
