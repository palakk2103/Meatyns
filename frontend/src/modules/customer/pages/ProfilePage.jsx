import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, MapPin, Package, CreditCard, Wallet, ChevronRight,
    LogOut, ShieldCheck, Heart, HelpCircle, Info, Edit2, ChevronLeft, Bell,
    ScrollText, RotateCcw, Truck, Coins
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
        <div className="min-h-screen bg-[#FAF6F0] pb-24 md:pb-8 font-outfit text-[#1A1A1A]">
            {/* Top Burgundy App Header */}
            <header
                className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3.5 shadow-sm select-none"
                style={{ background: "#741721" }}
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                    className="w-8 h-8 flex items-center justify-center text-white active:scale-90 transition-transform rounded-full hover:bg-white/10 -ml-1"
                >
                    <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                <h1 className="text-[17px] sm:text-lg font-bold text-white tracking-wide">
                    My Profile
                </h1>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleTestPush}
                        disabled={isTestingPush}
                        title="Test push notification"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Bell size={19} className={isTestingPush ? "animate-pulse text-[#E5A83B]" : "text-white"} />
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-3.5 relative z-20 space-y-4">

                {/* User Identity Card */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EBE3D5] shadow-[0_4px_16px_rgba(116,23,33,0.04)] flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-2xl bg-[#FAF6F0] flex items-center justify-center p-0.5 border border-[#E4D5BE] overflow-hidden shrink-0">
                            {user?.profileImage ? (
                                <img src={user.profileImage} alt="Profile" className="h-full w-full object-cover rounded-xl" />
                            ) : (
                                <div className="h-full w-full rounded-xl bg-[#FFF0EF] flex items-center justify-center">
                                    <User size={26} className="text-[#741721]" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-[17px] leading-tight font-bold text-[#1A1A1A]">{user?.name || 'Customer'}</h2>
                            <p className="text-[#7A6A60] text-xs font-semibold flex items-center gap-1.5 mt-1">
                                <span className="bg-[#FFF0EF] text-[#741721] border border-[#F2B8BF] px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider">India</span> +91 {formatIndiaPhone(user?.phone)}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/profile/edit"
                        className="p-2.5 rounded-xl bg-[#FAF6F0] text-[#741721] border border-[#E8DFC8] hover:bg-[#FFF0EF] hover:border-[#F2B8BF] transition-all active:scale-95"
                        title="Edit profile"
                    >
                        <Edit2 size={16} />
                    </Link>
                </div>

                {/* Menu Sections */}
                <div className="space-y-4">
                    {/* Account Section */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#EBE3D5] shadow-[0_4px_16px_rgba(116,23,33,0.03)]">
                        <div className="px-4 py-2.5 bg-[#FAF6F0] border-b border-[#F2EDE4]">
                            <p className="text-[11px] font-bold text-[#741721] uppercase tracking-wider">Personal Account</p>
                        </div>
                        <div className="divide-y divide-[#F6F1EA]">
                            <MenuItem
                                icon={Package}
                                label="Your Orders"
                                sub="Track, return or buy things again"
                                path="/orders"
                                color="#741721"
                                bg="#FFF0EF"
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
                                color="#BE123C"
                                bg="#FFE4E6"
                            />
                            <MenuItem
                                icon={MapPin}
                                label="Saved Addresses"
                                sub="Manage your delivery locations"
                                path="/addresses"
                                color="#8C2332"
                                bg="#FFF0EF"
                            />
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#EBE3D5] shadow-[0_4px_16px_rgba(116,23,33,0.03)]">
                        <div className="px-4 py-2.5 bg-[#FAF6F0] border-b border-[#F2EDE4]">
                            <p className="text-[11px] font-bold text-[#741721] uppercase tracking-wider">Help & Settings</p>
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
                                color="#741721"
                                bg="#FFF0EF"
                            />
                            <MenuItem
                                icon={RotateCcw}
                                label="Return Policy"
                                path="/return-policy"
                                color="#0369A1"
                                bg="#F0F9FF"
                            />
                            <MenuItem
                                icon={Truck}
                                label="Shipping Policy"
                                path="/shipping-policy"
                                color="#B45309"
                                bg="#FEF3C7"
                            />
                            <MenuItem
                                icon={Coins}
                                label="Refund Policy"
                                path="/refund-policy"
                                color="#047857"
                                bg="#ECFDF5"
                            />
                            <MenuItem
                                icon={Info}
                                label="About Us"
                                path="/about"
                                color="#741721"
                                bg="#FAF6F0"
                            />
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="w-full py-3.5 rounded-xl border border-[#F2B8BF] text-[#741721] font-bold bg-white hover:bg-[#FFF0EF] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 shadow-sm"
                >
                    <LogOut size={19} />
                    Sign out
                </button>

                <div className="text-center pb-8 pt-1">
                    <p className="text-[11px] text-[#9E8E80] font-medium">Version 2.4.0 • {appName}</p>
                </div>

            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, sub, path, color = '#741721', bg = '#FFF0EF' }) => (
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
                <h3 className="text-[13.5px] sm:text-sm font-bold text-[#1A1A1A] group-hover:text-[#741721] transition-colors">{label}</h3>
                {sub && <p className="text-[11px] text-[#7A6A60] mt-0.5 font-normal">{sub}</p>}
            </div>
        </div>
        <div className="p-1.5 rounded-md transition-colors">
            <ChevronRight size={17} className="text-[#CEB186] group-hover:text-[#741721] transition-all group-hover:translate-x-0.5" />
        </div>
    </Link>
);

export default ProfilePage;


