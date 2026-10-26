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
  AlertTriangle,
  Bike,
  CreditCard,
  Headphones,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@core/context/SettingsContext";

const RIDER_FAQS = [
  {
    category: "Earnings & Payouts",
    question: "How are my delivery earnings and distance pay calculated?",
    answer:
      "Your earnings are calculated per delivery using: Base Order Pay + Per-Kilometer Distance Pay + Peak Hours Surge + Weekly Target Incentives. You can check the complete breakdown in real-time under your Earnings section.",
  },
  {
    category: "Earnings & Payouts",
    question: "When and how are payouts transferred to my bank account?",
    answer:
      "Weekly earnings are automatically transferred directly to your registered bank account every Tuesday via IMPS/NEFT. Daily on-demand withdrawals are also available for eligible partners with a minimal processing fee.",
  },
  {
    category: "Orders & Navigation",
    question: "What should I do if the customer is unreachable or the delivery address is wrong?",
    answer:
      "Wait at the doorstep and try calling the customer via the in-app call masked button. If there is no response after 3 attempts or 10 minutes, tap 'Report Issue' -> 'Customer Unreachable'. Our central dispatch team will either verify alternative numbers or guide you on returning items to the store.",
  },
  {
    category: "Orders & Navigation",
    question: "How do I deposit Cash on Delivery (COD) collections?",
    answer:
      "All cash collected from customers is tracked in your COD Cash balance. You must deposit COD collections through UPI or at the nearest Meatyns Partner Hub when your COD balance reaches the permitted ceiling limit.",
  },
  {
    category: "Emergencies & Safety",
    question: "What to do in case of a bike breakdown or road accident during an active delivery?",
    answer:
      "Your safety is our #1 priority. Immediately trigger the in-app SOS button or call the 24/7 Rider Emergency Helpline. Our emergency support team will assign a backup rider to take over the delivery and dispatch road assistance if needed.",
  },
  {
    category: "Onboarding & Documents",
    question: "How do I update my Driving License, Vehicle Number, or Bank Account?",
    answer:
      "You can submit updated document photos or bank details through Profile > Documents or Profile > Bank Account. Our fleet verification team approves updates within 2 to 4 business hours.",
  },
];

const DeliverySupportPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "Meatyns";
  const supportEmail = settings?.supportEmail || "support@meatyns.com";
  const supportPhone = settings?.supportPhone || "02269621920";
  const hubAddress = settings?.address || "Meatyns Logistics Hub, Ramkrishna Nagar, Patna 800020";

  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] font-['Outfit',_sans-serif] pb-16">
      {/* Top Sticky Header */}
      <div className="bg-white sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between shadow-xs border-b border-indigo-100">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/delivery/auth");
              }
            }}
            className="p-2 -ml-2 rounded-full hover:bg-indigo-50 text-gray-700 active:scale-95 transition-all cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight uppercase">
              Rider Partner Support
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pt-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-6 translate-y-6">
            <Bike size={180} />
          </div>

          <div className="relative z-10 max-w-lg">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-indigo-100 inline-block mb-3 backdrop-blur-xs">
              24/7 Rider Fleet Help Desk
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              We're Here For You On Every Ride
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 font-medium mt-2 leading-relaxed">
              Facing issues with an order pickup, navigation, customer handover, or weekly payouts? Connect with our dedicated partner support team.
            </p>
          </div>
        </div>

        {/* Quick Contact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a
            href={`tel:${supportPhone}`}
            className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group no-underline"
          >
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Phone size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Call Support</h3>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">{supportPhone}</p>
            </div>
          </a>

          <a
            href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group no-underline"
          >
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">WhatsApp</h3>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Instant Chat</p>
            </div>
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group no-underline"
          >
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Email Fleet</h3>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Queries &amp; Payouts</p>
            </div>
          </a>

          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col items-center justify-center text-center gap-2">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Emergency SOS</h3>
              <p className="text-[10px] text-red-600 font-bold mt-0.5">Accident / Breakdown</p>
            </div>
          </div>
        </div>

        {/* Fleet Depot / Central Hub Address */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <MapPin size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Central Fleet Hub &amp; Onboarding Office</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
              {hubAddress}
            </p>
            <p className="text-[11px] text-indigo-600 font-bold mt-1">
              Visiting hours: Mon – Sat (9:00 AM – 7:00 PM)
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <HelpCircle size={20} className="text-indigo-600" />
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Frequently Asked Questions by Riders
            </h2>
          </div>

          <div className="space-y-3">
            {RIDER_FAQS.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-indigo-100 shadow-xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-indigo-50/40 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <div className="pr-3">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block mb-0.5">
                      {faq.category}
                    </span>
                    <span className="font-bold text-gray-800 text-xs sm:text-sm">
                      {faq.question}
                    </span>
                  </div>
                  {openIndex === index ? (
                    <ChevronUp size={18} className="text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-indigo-50 bg-indigo-50/20"
                    >
                      <div className="px-5 py-4 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Links for Delivery Partners */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">
            Partner Legal &amp; Compliance Policies
          </h3>
          <div className="space-y-2.5">
            <Link
              to="/delivery/privacy"
              className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 font-bold text-xs sm:text-sm transition-colors no-underline"
            >
              <ShieldCheck size={18} className="text-indigo-600" />
              Delivery Partner Privacy Policy
            </Link>
            <Link
              to="/terms?from=delivery"
              className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 font-bold text-xs sm:text-sm transition-colors no-underline"
            >
              <FileText size={18} className="text-indigo-600" />
              Delivery Partner Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverySupportPage;
