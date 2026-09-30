import React from 'react';
import { 
    ChevronLeft, 
    Shield, 
    Lock, 
    CheckCircle2, 
    AlertCircle, 
    Share2, 
    UserCheck, 
    Award, 
    Clock, 
    Database, 
    Users, 
    FileText 
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromDelivery = searchParams.get('from') === 'delivery';
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-16">
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

            <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
                {/* Main Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
                    {/* Title Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-[#6B21A8] shrink-0">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Privacy Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Meatyns Fresh Meats Pvt. Ltd.</p>
                        </div>
                    </div>

                    {/* Disclaimer Box */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 mb-6 flex items-start gap-3.5">
                        <AlertCircle size={22} className="text-amber-700 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs font-black uppercase text-amber-900 tracking-wider mb-1">Disclaimer</h3>
                            <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                                Meatyns reserves the right to modify this Privacy Policy at any time without prior notice. Updates may be made to comply with legal regulations, improve security, or adapt to organizational changes. We recommend that you check this page regularly to stay informed of any changes. If you do not agree with any part of this Policy, please stop using our platform immediately.
                            </p>
                        </div>
                    </div>

                    {/* Platform Introduction */}
                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4 mb-8">
                        <p className="leading-relaxed">
                            The website – <span className="font-semibold text-slate-800">www.meatyns.com</span> (“Website”), the Meatyns mobile application (“Meatyns App”), and mobile site (“Msite”) (together referred to as the “Platform”) are operated by <strong className="text-slate-800">Meatyns Fresh Meats Pvt. Ltd.</strong> (“Company” or “Meatyns” or “we”). Meatyns is committed to protecting your privacy and ensuring transparency in the way we handle your personal information. This Privacy Policy explains how we collect, store, share, and use your data when you interact with our Platform.
                        </p>
                        <p className="leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            By accessing or using the Platform, you agree to the terms of this Privacy Policy along with our <Link to="/terms" className="text-[#C81017] font-semibold hover:underline">Terms &amp; Conditions</Link>.
                        </p>
                    </div>

                    <hr className="border-slate-100 my-6" />

                    {/* Section A */}
                    <section className="mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">A</span>
                            What Personal Information Do We Collect?
                        </h3>

                        <div className="space-y-4 pl-0 sm:pl-9">
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">1. During Registration / Account Creation:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Name, phone number, email ID, address, PIN code. For faster access, you may log in using OTP verification.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">2. Order Placement &amp; Delivery:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Delivery details, billing address, payment method, contact information.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">3. Financial &amp; Payment Data:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Card details, UPI ID, wallet information, billing addresses collected through secure third-party gateways such as Razorpay/Paytm/UPI services. <strong className="text-slate-800">We do not store your complete financial details.</strong>
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">4. Visitor Data &amp; Participation:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Data submitted when joining contests, loyalty programs, surveys, or signing up for offers/newsletters.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">5. Feedback &amp; Reviews:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Customer feedback, ratings, images, or videos shared voluntarily.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">6. Gift Orders / Referrals:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    If you order for someone else, we may collect the recipient’s name, address, and phone number. You must ensure their consent.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">7. Usage Data:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Pages viewed, features used, clicks, time spent, app crashes, browsing patterns.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">8. Device Data:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    IP address, device identifiers, mobile network information, browser type, operating system.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">9. Cookies &amp; Tracking:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    We use cookies to improve your shopping experience, analyze interactions, and personalize recommendations. You may disable cookies, but this may impact site functionality.
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-100 my-6" />

                    {/* Section B */}
                    <section className="mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">B</span>
                            How Do We Use Your Information?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mb-4 pl-0 sm:pl-9 font-medium">
                            We use your personal data for:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-9">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Processing Orders</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">Registration, confirmation, payment, dispatch, and delivery.</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Customer Service</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">Resolving complaints, responding to inquiries, quality checks.</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Personalization</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">Tailoring product recommendations, offers, and user experience.</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Marketing Communications</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">Sending updates, newsletters, promotions, festival offers.</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Research &amp; Analytics</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">Understanding buying behavior, improving products &amp; services.</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                                <CheckCircle2 size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Compliance &amp; Security</h4>
                                    <p className="text-xs text-slate-600 mt-0.5">Investigating fraud, ensuring safe transactions, complying with legal obligations.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-100 my-6" />

                    {/* Section C */}
                    <section className="mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">C</span>
                            Sharing of Information
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-700 font-semibold mb-4 pl-0 sm:pl-9">
                            We do not sell your personal information. However, we may share your details with:
                        </p>

                        <div className="space-y-4 pl-0 sm:pl-9">
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">1. Third-Party Service Providers:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Delivery partners, payment processors, logistics companies, SMS/email service providers. These providers have limited access and are bound by confidentiality agreements.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">2. Advertising &amp; Analytics Partners:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    For targeted ads, behavior analysis, and SEO optimization.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">3. Government / Law Enforcement:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    When required by law to prevent fraud, criminal activities, or comply with regulations.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">4. Business Transfers:</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    In case of merger, acquisition, or transfer of ownership, customer data may be shared with associated entities.
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-100 my-6" />

                    {/* Section D */}
                    <section className="mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">D</span>
                            How Do We Protect Your Data?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mb-3 pl-0 sm:pl-9 font-medium">
                            We use strict security measures to safeguard your personal data:
                        </p>
                        <div className="space-y-2.5 pl-0 sm:pl-9">
                            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                                <Lock size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <span>Encrypted payment gateways (Razorpay/Paytm/UPI).</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                                <Lock size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <span>Firewalls &amp; data encryption protocols.</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                                <Lock size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <span>Role-based access to employees only.</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                                <Lock size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <span>Regular system updates &amp; vulnerability checks.</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                                <Lock size={16} className="text-[#6B21A8] mt-0.5 shrink-0" />
                                <span>Staff training on data privacy and meat hygiene handling.</span>
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-100 my-6" />

                    {/* Section E */}
                    <section className="mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">E</span>
                            Your Rights
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mb-3 pl-0 sm:pl-9 font-medium">
                            You have the right to:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-9">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                                <UserCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                <span className="text-xs sm:text-sm text-slate-700 font-medium">Access, update, or correct your data.</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                                <UserCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                <span className="text-xs sm:text-sm text-slate-700 font-medium">Request deletion of your account and data.</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                                <UserCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                <span className="text-xs sm:text-sm text-slate-700 font-medium">Withdraw consent for marketing communications.</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                                <UserCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                <span className="text-xs sm:text-sm text-slate-700 font-medium">Contact us regarding any privacy concerns.</span>
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-100 my-6" />

                    {/* Section F */}
                    <section className="mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">F</span>
                            Data Retention
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-0 sm:pl-9">
                            We retain your data only for as long as required to provide services, comply with laws, or resolve disputes. Once no longer needed, data is securely deleted.
                        </p>
                    </section>

                    <hr className="border-slate-100 my-6" />

                    {/* Section G */}
                    <section className="mb-6">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-extrabold shrink-0">G</span>
                            Children’s Privacy
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-0 sm:pl-9">
                            The Meatyns Platform is not intended for children under 18 years of age. We do not knowingly collect or store their data. If we find such data has been shared, it will be deleted immediately.
                        </p>
                    </section>
                </div>

                {/* FSSAI Guarantee & Food Safety Callout */}
                <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 rounded-3xl p-6 text-white shadow-md border border-emerald-900/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Award size={26} />
                    </div>
                    <div className="text-center sm:text-left">
                        <span className="inline-block text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
                            FSSAI Certified Food Safety
                        </span>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                            Meatyns is proudly licensed under FSSAI, ensuring every product meets the highest standards of food safety and hygiene. Our certification guarantees fresh, hygienic, and quality-checked meat for our customers. We are committed to delivering safe, farm-to-table meat you can trust.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
