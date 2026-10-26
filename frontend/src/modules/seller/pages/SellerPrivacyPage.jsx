import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Shield,
  Lock,
  Store,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
  Award,
  LifeBuoy,
} from "lucide-react";
import { useSettings } from "@core/context/SettingsContext";

const SellerPrivacyPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "Meatyns";
  const supportEmail = settings?.supportEmail || "support@meatyns.com";
  const supportPhone = settings?.supportPhone || "02269621920";

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
                Merchant Partner Privacy Policy
              </h1>
            </div>
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase bg-amber-400/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/30">
            Seller Portal
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pt-6">
        {/* Main Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-[#3B0710]/10 text-[#3B0710] flex items-center justify-center shrink-0 border border-[#3B0710]/20">
              <Store size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8B2D3B] bg-red-50 px-2.5 py-1 rounded-full inline-block mb-1">
                Vendor &amp; Merchant Charter
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
                Seller Partner Privacy &amp; Data Policy
              </h2>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {appName} Fresh Meats Merchant Network
              </p>
            </div>
          </div>

          {/* Disclaimer Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 mb-6 flex items-start gap-3.5">
            <AlertCircle size={22} className="text-amber-800 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black uppercase text-amber-900 tracking-wider mb-1">
                Commercial &amp; Data Privacy Commitment
              </h3>
              <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                This Merchant Privacy Policy outlines how {appName} collects, safeguards, and utilizes commercial data, business identification documents, and financial records provided by retail butcheries, meat shops, seafood vendors, and store owners (“Sellers” or “Merchants”).
              </p>
            </div>
          </div>

          <hr className="border-stone-100 my-6" />

          {/* Section 1: Business Information */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#3B0710] text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                1
              </span>
              Merchant &amp; Business KYC Data We Collect
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-4 pl-0 sm:pl-9 font-medium leading-relaxed">
              In accordance with FSSAI, GST, and legal commerce guidelines, we collect and verify the following business information:
            </p>

            <div className="space-y-3 pl-0 sm:pl-9">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 mb-1 flex items-center gap-2">
                  <Building2 size={16} className="text-[#3B0710]" /> Store &amp; Owner Profile
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Registered shop name, trade name, owner's legal name, primary email address, verified phone numbers, and physical store coordinates (latitude, longitude, delivery radius).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 mb-1 flex items-center gap-2">
                  <FileText size={16} className="text-[#3B0710]" /> Commercial &amp; Regulatory Licences
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Municipal Trade License, GST Registration Certificate (GSTIN), FSSAI Food Safety License, and Owner Government ID proof (Aadhaar/PAN).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 mb-1 flex items-center gap-2">
                  <CreditCard size={16} className="text-[#3B0710]" /> Bank Account &amp; Settlement Details
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Current/Savings bank account number, IFSC code, cancelled cheque / bank passbook copy for automated weekly revenue payouts and TDS compliance.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-stone-100 my-6" />

          {/* Section 2: Catalog & Pricing Confidentiality */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#3B0710] text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                2
              </span>
              Catalog, Stock &amp; Pricing Confidentiality
            </h3>
            <div className="space-y-3 pl-0 sm:pl-9 text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
              <p>
                Your wholesale costs, profit margins, custom meat cuts recipes, and store sales volume are considered confidential business data. We do not sell or leak individual vendor pricing strategies to competitor stores.
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-stone-800">
                <strong>Platform Visibility:</strong> Only consumer-facing retail selling prices, product descriptions, stock availability, and hygiene certifications are displayed publicly to customers on {appName}.
              </div>
            </div>
          </section>

          <hr className="border-stone-100 my-6" />

          {/* Section 3: Customer Data Protection Obligations */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#3B0710] text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                3
              </span>
              Customer Data Protection Obligations for Sellers
            </h3>
            <div className="space-y-3 pl-0 sm:pl-9 text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
              <p>
                As a registered Merchant on {appName}, you receive customer order details strictly to pack and dispatch fresh items. You are legally bound by the following obligations:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200 text-red-950">
                  <CheckCircle2 size={16} className="text-red-700 mt-0.5 shrink-0" />
                  <span><strong>Zero Commercial Misuse:</strong> You shall not copy, extract, export, or contact customer phone numbers for off-platform marketing or independent sales.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200 text-red-950">
                  <CheckCircle2 size={16} className="text-red-700 mt-0.5 shrink-0" />
                  <span><strong>Data Confidentiality:</strong> Customer addresses, phone numbers, and delivery instructions must remain confidential within your store staff.</span>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-stone-100 my-6" />

          {/* Section 4: Settlements & Financial Data */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#3B0710] text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                4
              </span>
              Settlement Cycles, Commission &amp; Tax Compliance
            </h3>
            <div className="space-y-2.5 pl-0 sm:pl-9 text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
              <p>
                All payouts are routed through RBI-compliant scheduled commercial banks. GST invoices for platform commissions, convenience fees, and Tax Collected at Source (TCS) / TDS filings are issued periodically to your registered merchant GSTIN.
              </p>
            </div>
          </section>

          <hr className="border-stone-100 my-6" />

          {/* Section 5: Food Safety Standards */}
          <section className="mb-6">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#3B0710] text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                5
              </span>
              Food Safety &amp; FSSAI Audit Compliance
            </h3>
            <div className="pl-0 sm:pl-9 text-xs sm:text-sm text-stone-600 font-medium leading-relaxed space-y-2">
              <p>
                {appName} reserves the right to retain inspection audit records, freshness timestamps, and packaging checklists to comply with statutory inspections by the Food Safety and Standards Authority of India (FSSAI).
              </p>
            </div>
          </section>
        </div>

        {/* Merchant Support Card */}
        <div className="bg-gradient-to-r from-[#3B0710] via-[#52101B] to-[#3B0710] rounded-3xl p-6 text-white shadow-md border border-amber-900/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
            <LifeBuoy size={26} />
          </div>
          <div className="text-center sm:text-left">
            <span className="inline-block text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
              Merchant Grievance &amp; Legal Desk
            </span>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
              For queries related to seller agreement clauses, vendor data privacy, or business account termination, please contact our Merchant Relations Team at{" "}
              <a href={`mailto:${supportEmail}`} className="text-amber-300 font-bold underline">
                {supportEmail}
              </a>{" "}
              or call the Seller Helpline at{" "}
              <a href={`tel:${supportPhone}`} className="text-amber-300 font-bold underline">
                {supportPhone}
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerPrivacyPage;
