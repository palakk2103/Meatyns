import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, MapPin, Package, CreditCard, Wallet, ChevronRight,
    LogOut, ShieldCheck, Heart, HelpCircle, Info, Edit2, ChevronLeft, Bell,
    ScrollText, RotateCcw, Truck, Coins, Sparkles, Store, Phone, Mail, Clock, Award,
    Calendar, Gift, UtensilsCrossed, Boxes, Trash2, AlertTriangle, Loader2
} from 'lucide-react';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import { customerApi } from '../services/customerApi';
import { toast } from 'sonner';
import {
    describePushSupport,
    ensureFcmTokenRegistered,
    startForegroundPushListener
} from '@core/firebase/pushClient';

const TEST_PUSH_STATUS_POLL_INTERVAL_MS = 1500;
const TEST_PUSH_STATUS_MAX_ATTEMPTS = 20;

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, role, logout } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    const [isTestingPush, setIsTestingPush] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDeleteAccount = async () => {
        try {
            setIsDeleting(true);
            await customerApi.deleteAccount();
            toast.success("Account deleted successfully");
            setShowDeleteModal(false);
            await logout();
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || "Failed to delete account";
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatIndiaPhone = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('+91')) return raw.replace(/^\+91[\s-]*/, '');
        if (raw.startsWith('91') && raw.length >= 12) return raw.replace(/^91[\s-]*/, '');
        return raw;
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const waitForTestPushResult = async (orderId) => {
        for (let attempt = 0; attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS; attempt += 1) {
            const statusRes = await customerApi.getTestPushNotificationStatus(orderId);
            const result = statusRes?.data?.result || {};
            const status = String(result.status || '').trim().toLowerCase();

            if (status === 'sent' || status === 'failed') {
                return result;
            }

            if (attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS - 1) {
                await wait(TEST_PUSH_STATUS_POLL_INTERVAL_MS);
            }
        }
        return null;
    };

    const handleTestPush = async () => {
        if (isTestingPush) return;
        setIsTestingPush(true);
        try {
            const support = describePushSupport();
            if (!support.supported) {
                throw new Error(support.message || 'Push notifications are not supported on this device/browser setup.');
            }

            await ensureFcmTokenRegistered({ role, platform: 'web' });
            await startForegroundPushListener();
            const res = await customerApi.testPushNotification();
            const orderId = res?.data?.result?.orderId || '';
            if (!orderId) {
                toast.success('Test push triggered');
                return;
            }

            const statusResult = await waitForTestPushResult(orderId);
            if (!statusResult) {
                toast.message(`Test push processing (${orderId})`, {
                    description: 'Notification delivery is taking longer than expected.',
                });
                return;
            }

            if (statusResult.status === 'sent') {
                toast.success(`Test push sent (${orderId})`, {
                    description: 'MongoDB status is marked as sent.',
                });
                return;
            }

            toast.error(`Test push failed (${orderId})`, {
                description: String(statusResult.failureReason || 'Notification delivery failed.'),
            });
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Unknown error';
            toast.error('Failed to trigger test push', {
                description: message,
            });
        } finally {
            setIsTestingPush(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF6F0] pb-24 md:pb-8 font-poppins text-[#1A1A1A]">
            {/* Top Golden Yellow App Header */}
            <header
                className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3.5 shadow-sm select-none"
                style={{ background: "#FDCE04" }}
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                    className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform rounded-full hover:bg-black/5 -ml-1"
                >
                    <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                <h1 className="text-[17px] sm:text-lg font-normal font-anton tracking-wide text-[#1A1A1A] uppercase">
                    My Profile
                </h1>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleTestPush}
                        disabled={isTestingPush}
                        title="Test push notification"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-[#1A1A1A] hover:bg-black/5 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Bell size={19} className={isTestingPush ? "animate-pulse text-[#B45309]" : "text-[#1A1A1A]"} />
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-3.5 relative z-20 space-y-4">

                {/* User Identity Card */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EBE3D5] shadow-[0_4px_16px_rgba(253,206,4,0.08)] flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-2xl bg-[#FAF6F0] flex items-center justify-center p-0.5 border border-[#E4D5BE] overflow-hidden shrink-0">
                            {user?.profileImage ? (
                                <img src={user.profileImage} alt="Profile" className="h-full w-full object-cover rounded-xl" />
                            ) : (
                                <div className="h-full w-full rounded-xl bg-[#FEF08A] flex items-center justify-center">
                                    <User size={26} className="text-[#1A1A1A]" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-[17px] leading-tight font-bold text-[#1A1A1A]">{user?.name || 'Customer'}</h2>
                            <p className="text-[#7A6A60] text-xs font-semibold flex items-center gap-1.5 mt-1">
                                <span className="bg-[#FFFBEB] text-[#1A1A1A] border border-[#FDE68A] px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider">India</span> +91 {formatIndiaPhone(user?.phone)}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/profile/edit"
                        className="p-2.5 rounded-xl bg-[#FAF6F0] text-[#1A1A1A] border border-[#E8DFC8] hover:bg-[#FFFBEB] hover:border-[#FDE68A] transition-all active:scale-95"
                        title="Edit profile"
                    >
                        <Edit2 size={16} />
                    </Link>
                </div>

                {/* Menu Sections */}
                <div className="space-y-4">
                    {/* Account Section */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#EBE3D5] shadow-[0_4px_16px_rgba(253,206,4,0.05)]">
                        <div className="px-4 py-2.5 bg-[#FAF6F0] border-b border-[#F2EDE4]">
                            <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">Personal Account</p>
                        </div>
                        <div className="divide-y divide-[#F6F1EA]">
                            <MenuItem
                                icon={Package}
                                label="Your Orders"
                                sub="Track, return or buy things again"
                                path="/orders"
                                color="#1A1A1A"
                                bg="#FEF08A"
                            />
                            <MenuItem
                                icon={CreditCard}
                                label="Order Transactions"
                                sub="View all payments & refunds"
                                path="/transactions"
                                color="#B45309"
                                bg="#FEF3C7"
                            />
                            <MenuItem
                                icon={Wallet}
                                label="Wallet"
                                sub="Balance & return refunds"
                                path="/wallet"
                                color="#047857"
                                bg="#ECFDF5"
                            />
                            <MenuItem
                                icon={Heart}
                                label="Your Wishlist"
                                sub="Your saved items"
                                path="/wishlist"
                                color="#EF131F"
                                bg="#FEE2E2"
                            />
                            <MenuItem
                                icon={Calendar}
                                label="My Subscriptions"
                                sub="Scheduled fresh meat deliveries"
                                path="/subscriptions"
                                color="#B45309"
                                bg="#FEF3C7"
                            />
                            <MenuItem
                                icon={Gift}
                                label="Refer & Earn"
                                sub="Invite friends, get wallet rewards"
                                path="/referrals"
                                color="#7C3AED"
                                bg="#F5F3FF"
                            />
                            <MenuItem
                                icon={UtensilsCrossed}
                                label="Recipes & Cooking"
                                sub="Chef recipes with 1-click cart"
                                path="/recipes"
                                color="#047857"
                                bg="#ECFDF5"
                            />
                            <MenuItem
                                icon={Boxes}
                                label="Meal Prep & Combos"
                                sub="Curated bundles & savings"
                                path="/combos"
                                color="#EA580C"
                                bg="#FFF7ED"
                            />
                            <MenuItem
                                icon={MapPin}
                                label="Saved Addresses"
                                sub="Manage your delivery locations"
                                path="/addresses"
                                color="#1A1A1A"
                                bg="#FEF08A"
                            />
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#EBE3D5] shadow-[0_4px_16px_rgba(253,206,4,0.05)]">
                        <div className="px-4 py-2.5 bg-[#FAF6F0] border-b border-[#F2EDE4]">
                            <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">Help & Settings</p>
                        </div>
                        <div className="divide-y divide-[#F6F1EA]">
                            <MenuItem
                                icon={HelpCircle}
                                label="Help & Support"
                                path="/support"
                                color="#1D4ED8"
                                bg="#EFF6FF"
                            />
                            <MenuItem
                                icon={Award}
                                label="Quality & Policies"
                                sub="100% Fresh Meat, Hygiene & Delivery Guarantee"
                                path="/policy"
                                color="#C81017"
                                bg="#FEE2E2"
                            />
                            <MenuItem
                                icon={ShieldCheck}
                                label="Privacy Policy"
                                path="/privacy"
                                color="#6B21A8"
                                bg="#FAF5FF"
                            />
                            <MenuItem
                                icon={ScrollText}
                                label="Terms & Conditions"
                                path="/terms"
                                color="#1A1A1A"
                                bg="#FFFBEB"
                            />
                            <MenuItem
                                icon={Truck}
                                label="Delivery Policy"
                                path="/shipping-policy"
                                color="#B45309"
                                bg="#FEF3C7"
                            />
                            <MenuItem
                                icon={RotateCcw}
                                label="Refund & Replacement Policy"
                                path="/refund-policy"
                                color="#047857"
                                bg="#ECFDF5"
                            />
                            <MenuItem
                                icon={Info}
                                label="About Us"
                                path="/about"
                                color="#1A1A1A"
                                bg="#FAF6F0"
                            />
                            <MenuItem
                                icon={Sparkles}
                                label="What We Deliver"
                                sub="Premium Fresh Meat, Delivered with Care"
                                path="/what-we-deliver"
                                color="#C81017"
                                bg="#FEE2E2"
                            />
                            <MenuItem
                                icon={Store}
                                label="Franchise Opportunities"
                                sub="Be a Part of Meat Revolution in Maharashtra"
                                path="/franchise"
                                color="#B45309"
                                bg="#FEF3C7"
                            />
                            <MenuItem
                                icon={Phone}
                                label="Contact Us"
                                sub="Kolhapur Outlet, Helpline & Timings"
                                path="/contact"
                                color="#0284C7"
                                bg="#E0F2FE"
                            />
                        </div>
                    </div>
                </div>

                {/* Branded Thank You Mascot Banner (matching mockup screen 8) */}
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#FFF5ED] via-[#FFF1E8] to-[#FFEFE6] border border-[#FCD9C8] flex items-center gap-3.5 shadow-2xs mt-4">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        <img
                            src="/mascot/chef_mascot.png"
                            alt="Meatyns Chef Mascot"
                            className="max-h-full max-w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
                            loading="lazy"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="font-serif italic text-xs text-slate-500">
                            Thank you
                        </p>
                        <h4 className="font-anton uppercase tracking-wide text-sm font-normal text-slate-800 leading-tight flex items-center gap-1.5 mt-0.5">
                            for being a part of <span className="text-[#C81017]">Meatyns!</span> <Heart size={13} className="fill-[#C81017] text-[#C81017] inline-block shrink-0" />
                        </h4>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="w-full py-3.5 rounded-xl border border-[#FDE68A] text-[#1A1A1A] font-bold bg-white hover:bg-[#FFFBEB] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4 shadow-sm cursor-pointer"
                >
                    <LogOut size={19} className="text-[#EF131F]" />
                    Sign out
                </button>

                {/* Delete Account Button */}
                <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full py-3 rounded-xl border border-rose-200 text-rose-600 font-semibold bg-rose-50/60 hover:bg-rose-100/80 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2.5 text-xs sm:text-sm cursor-pointer"
                >
                    <Trash2 size={16} className="text-rose-600" />
                    Delete Account
                </button>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                        <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 text-center">
                            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Customer Account?</h3>
                            <p className="text-xs text-slate-600 leading-relaxed mb-5">
                                Are you sure you want to delete your account? This action is <strong className="text-rose-600 font-semibold">permanent</strong>. All your saved addresses, cart items, and personal data will be erased.
                            </p>
                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleDeleteAccount}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
                                            Yes, Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-center pb-8 pt-2">
                    <p className="text-[11px] text-[#9E8E80] font-medium">Version 2.4.0 • {appName}</p>
                </div>

            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, sub, path, color = '#1A1A1A', bg = '#FFFBEB' }) => (
    <Link to={path || '#'} className="px-4 py-3.5 flex items-center justify-between hover:bg-[#FAF6F0]/60 active:bg-[#FAF6F0] cursor-pointer transition-colors group">
        <div className="flex items-center gap-3.5">
            <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5"
                style={{ backgroundColor: bg }}
            >
                <Icon
                    size={20}
                    className="transition-transform group-hover:scale-110 duration-200"
                    style={{ color }}
                />
            </div>
            <div>
                <h3 className="text-[13.5px] sm:text-sm font-bold text-[#1A1A1A] group-hover:text-amber-800 transition-colors">{label}</h3>
                {sub && <p className="text-[11px] text-[#7A6A60] mt-0.5 font-normal">{sub}</p>}
            </div>
        </div>
        <div className="p-1.5 rounded-md transition-colors">
            <ChevronRight size={17} className="text-[#CEB186] group-hover:text-amber-700 transition-all group-hover:translate-x-0.5" />
        </div>
    </Link>
);

export default ProfilePage;


