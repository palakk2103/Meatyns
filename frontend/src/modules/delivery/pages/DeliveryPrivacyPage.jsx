import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Shield,
  Lock,
  MapPin,
  Camera,
  CreditCard,
  AlertCircle,
  FileText,
  UserCheck,
  Eye,
  Radio,
  CheckCircle2,
  LifeBuoy,
} from "lucide-react";
import { useSettings } from "@core/context/SettingsContext";

const DeliveryPrivacyPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "Meatyns";
  const supportEmail = settings?.supportEmail || "support@meatyns.com";
  const supportPhone = settings?.supportPhone || "02269621920";

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
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight uppercase">
              Rider Partner Privacy Policy
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pt-6">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-indigo-50">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Shield size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full inline-block mb-1">
                Delivery Executive Charter
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                Partner Privacy &amp; Data Policy
              </h2>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">
                {appName} Logistics &amp; Fleet Operations
              </p>
            </div>
          </div>

          {/* Quick Notice Alert */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 mb-6 flex items-start gap-3.5">
            <Radio size={22} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wider mb-1">
                Notice to Delivery Partners &amp; Fleet Applicants
              </h3>
              <p className="text-xs sm:text-sm text-indigo-950 font-medium leading-relaxed">
                This Privacy Policy specifically governs the collection, storage, and utilization of personal, vehicular, and geolocation information of delivery personnel (“Delivery Executives” or “Partners”) registered with {appName}. We adhere to strict data privacy practices and only collect data essential for order dispatch, safety, and earnings disbursement.
              </p>
            </div>
          </div>

          <hr className="border-gray-100 my-6" />

          {/* Section 1: KYC & Documents */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-black text-gray-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                1
              </span>
              Information We Collect From You
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 pl-0 sm:pl-9 font-medium leading-relaxed">
              To approve your partner onboarding, safeguard customer orders, and process payouts, we collect:
            </p>

            <div className="space-y-3 pl-0 sm:pl-9">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <UserCheck size={16} className="text-indigo-600" /> Identity &amp; Profile Details
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Full legal name, phone number, email, residential address, profile photograph (selfie), emergency contact details, and date of birth.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" /> KYC &amp; Verification Documents
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Driving License (DL), Aadhaar Card, Permanent Account Number (PAN), and police verification or background validation records where legally mandated.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <CreditCard size={16} className="text-indigo-600" /> Banking &amp; Financial Information
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Bank account number, IFSC code, account holder name, and UPI identifier for direct payout disbursement and weekly earnings settlement.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100 my-6" />

          {/* Section 2: GPS Location */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-black text-gray-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                2
              </span>
              Real-Time Location &amp; GPS Tracking Policy
            </h3>
            <div className="space-y-3.5 pl-0 sm:pl-9 text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
              <p>
                Precise GPS tracking is crucial to provide accurate delivery ETAs, order routing, and rider safety. Here is how your location data is handled:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5">
                  <MapPin size={18} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">Active Shift Only</h5>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Location is tracked only when you are toggled "Online" or executing an active order delivery.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5">
                  <Eye size={18} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">Customer Visibility</h5>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Customers can view your live transit location only between store pickup and doorstep delivery completion.
                    </p>
                  </div>
                </div>
              </div>
              <p className="bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200 text-xs">
                <strong>No Offline Tracking:</strong> When you mark your status as "Offline" or logout from the application, background GPS tracking is automatically halted.
              </p>
            </div>
          </section>

          <hr className="border-gray-100 my-6" />

          {/* Section 3: Device Permissions */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-black text-gray-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                3
              </span>
              App &amp; Device Permissions Required
            </h3>
            <div className="space-y-2.5 pl-0 sm:pl-9 text-xs sm:text-sm text-gray-700 font-medium">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <MapPin size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <span><strong>Location (Fine &amp; Coarse):</strong> To route orders from meat shops to delivery addresses and compute distance pay.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Camera size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <span><strong>Camera &amp; Storage:</strong> To upload KYC documents during onboarding and snap proof-of-delivery photos when requested.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Radio size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <span><strong>Push Notifications:</strong> To alert you instantly of new delivery assignments, surge payouts, and safety bulletins.</span>
              </div>
            </div>
          </section>

          <hr className="border-gray-100 my-6" />

          {/* Section 4: Payouts & Security */}
          <section className="mb-8">
            <h3 className="text-base sm:text-lg font-black text-gray-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                4
              </span>
              Payout Security &amp; Data Protection
            </h3>
            <div className="space-y-2.5 pl-0 sm:pl-9 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              <p>
                We employ bank-grade SSL/TLS 256-bit encryption for all partner payout transactions. Payout data is shared exclusively with certified payment processors (e.g., RazorpayX / Direct Bank IMPS) to disburse earnings safely.
              </p>
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>We never share your personal contact details or bank account numbers with unverified third parties or advertisers.</span>
              </div>
            </div>
          </section>

          <hr className="border-gray-100 my-6" />

          {/* Section 5: Partner Rights */}
          <section className="mb-6">
            <h3 className="text-base sm:text-lg font-black text-gray-900 mb-3 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                5
              </span>
              Your Rights &amp; Account Termination
            </h3>
            <div className="pl-0 sm:pl-9 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed space-y-2">
              <p>
                You have the right to inspect your stored profile information, request corrections to your bank or contact records, and request deactivation of your delivery partner account upon clearing pending cash-on-delivery collections.
              </p>
            </div>
          </section>
        </div>

        {/* Partner Support Callout */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-6 text-white shadow-md border border-indigo-900 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <LifeBuoy size={26} />
          </div>
          <div className="text-center sm:text-left">
            <span className="inline-block text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
              Fleet Compliance &amp; Rider Grievance
            </span>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-medium">
              If you have any questions regarding your data privacy, location tracking, or account safety, reach out to our Partner Grievance Officer at{" "}
              <a href={`mailto:${supportEmail}`} className="text-indigo-300 font-bold underline">
                {supportEmail}
              </a>{" "}
              or call the Partner Desk at{" "}
              <a href={`tel:${supportPhone}`} className="text-indigo-300 font-bold underline">
                {supportPhone}
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPrivacyPage;
