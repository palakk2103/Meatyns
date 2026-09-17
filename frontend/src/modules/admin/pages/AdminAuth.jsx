import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import {
    Mail,
    Lock,
    User,
    ShieldCheck,
    ArrowRight,
    Eye,
    EyeOff,
    BarChart3,
    Zap,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../services/adminApi';
import meatBoardImg from '@/assets/meat_seafood_board.jpg';

// Stylized Meatyns Animal Crest Logo (Cow head, Rooster, Fish)
const MeatynsBrandLogo = () => (
    <div className="flex items-center gap-3 select-none">
        <div className="w-14 h-14 rounded-full border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center p-2 shadow-lg shrink-0">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                <path d="M28 34 C26 22, 42 20, 50 28 C58 20, 74 22, 72 34 C69 44, 60 52, 50 54 C40 52, 31 44, 28 34 Z" fill="white" />
                <ellipse cx="50" cy="46" rx="9" ry="6" fill="#3B0710" />
                <circle cx="47" cy="46" r="1.5" fill="white" />
                <circle cx="53" cy="46" r="1.5" fill="white" />
                <path d="M46 22 C47 16, 53 16, 54 22 Z" fill="#E5A93C" />
                <path d="M30 68 C38 60, 62 60, 70 68 C62 76, 38 76, 30 68 Z" fill="white" opacity="0.95" />
                <polygon points="68,68 76,64 76,72" fill="white" />
            </svg>
        </div>
        <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
                <span className="text-3xl lg:text-4xl font-serif font-bold text-white tracking-wide leading-none">
                    Meatyns
                </span>
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">TM</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
                <span className="w-5 h-[1px] bg-white/40"></span>
                <span className="text-[9px] font-bold text-white/80 tracking-[2.5px] uppercase">
                    ADMIN CONTROL CENTER
                </span>
                <span className="w-5 h-[1px] bg-white/40"></span>
            </div>
        </div>
    </div>
);

// Faint Botanical Leaf Illustration for Top-Left
const BotanicalLeaf = () => (
    <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#C98A7D]/30">
        <path d="M10 80 C20 45, 50 25, 85 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M32 60 C38 48, 52 46, 58 52 C54 62, 40 66, 32 60 Z" fill="currentColor" opacity="0.4" />
        <path d="M48 44 C56 32, 70 32, 74 40 C68 48, 54 50, 48 44 Z" fill="currentColor" opacity="0.4" />
        <path d="M68 28 C74 18, 86 18, 90 24 C86 32, 74 34, 68 28 Z" fill="currentColor" opacity="0.4" />
    </svg>
);

// Faint Cow Line-Art Watermark for Bottom-Right
const CowWatermark = () => (
    <svg width="220" height="220" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8B2D3B]/10">
        <path d="M40 30 C30 18, 20 20, 15 35 C12 45, 18 55, 25 65 C32 75, 45 85, 60 90 C75 88, 85 75, 88 60 C90 45, 82 32, 70 25 C62 20, 52 18, 40 30 Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M15 35 C8 30, 6 22, 10 16 C16 12, 22 18, 24 25" stroke="currentColor" strokeWidth="1.2" />
        <path d="M70 25 C78 18, 86 16, 90 20 C92 26, 84 32, 78 35" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="60" cy="72" rx="14" ry="10" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="55" cy="72" r="2" fill="currentColor" />
        <circle cx="65" cy="72" r="2" fill="currentColor" />
        <ellipse cx="38" cy="48" rx="3" ry="2" fill="currentColor" />
    </svg>
);

const AdminAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const { login } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const appName = settings?.appName || 'Meatyns';

    const [adminLoginMode, setAdminLoginMode] = useState('password'); // 'password' | 'otp'
    const [loginOtpSent, setLoginOtpSent] = useState(false);
    const [loginOtp, setLoginOtp] = useState('');
    const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        adminCode: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSendAdminLoginOtp = async () => {
        const emailToUse = (formData.email || '').trim().toLowerCase();
        if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
            toast.error('Please enter a valid administrator email.');
            return;
        }
        setIsSendingLoginOtp(true);
        setErrorMsg('');
        try {
            const res = await adminApi.sendLoginOtp({ email: emailToUse });
            setLoginOtpSent(true);
            const mockOtp = res.data?.result?.mockOtp || '1234';
            toast.success(`Mock OTP: ${mockOtp}`, { duration: 10000 });
            toast.info(`OTP sent to ${emailToUse}`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to send OTP.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsSendingLoginOtp(false);
        }
    };

    const handleVerifyAdminLoginOtp = async (e) => {
        e?.preventDefault();
        const emailToUse = (formData.email || '').trim().toLowerCase();
        if (!loginOtp || loginOtp.length !== 4) {
            toast.error('Please enter a valid 4-digit OTP.');
            return;
        }
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await adminApi.verifyLoginOtp({ email: emailToUse, otp: loginOtp });
            const { token, admin } = res.data.result;
            login({
                ...admin,
                token,
                role: 'admin',
            });
            toast.success('Welcome back, Administrator.');
            navigate('/admin');
        } catch (err) {
            const msg = err.response?.data?.message || 'Invalid OTP';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLogin && adminLoginMode === 'otp') {
            if (!loginOtpSent) {
                handleSendAdminLoginOtp();
            } else {
                handleVerifyAdminLoginOtp(e);
            }
            return;
        }

        setIsLoading(true);
        setErrorMsg('');

        // Validate password length for signup
        if (!isLogin) {
            const pwd = (formData.password || '').trim();
            if (pwd.length < 6) {
                toast.error('Password must be at least 6 characters long.');
                setIsLoading(false);
                return;
            }
        }

        try {
            const response = isLogin
                ? await adminApi.login({ email: formData.email, password: formData.password })
                : await adminApi.signup({ name: formData.name, email: formData.email, password: formData.password });

            const { token, admin } = response.data.result;
            const authData = {
                ...admin,
                token,
                role: 'admin'
            };

            login(authData);
            toast.success(isLogin ? 'Welcome back, Administrator.' : 'Administrator Account Created.');
            navigate('/admin');
        } catch (error) {
            const msg = error.response?.data?.message || 'Authentication failed. Please check your credentials.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAF7F2] font-['Outfit',_sans-serif]">
            {/* ================================================================= */}
            {/* LEFT COLUMN: Deep Maroon Banner + Full-bleed Background Image     */}
            {/* ================================================================= */}
            <div className="hidden md:flex md:w-1/2 md:min-h-screen relative overflow-hidden text-white flex-col justify-between">
                {/* Full-bleed Background Image with Seamless Dark Burgundy Gradient Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={meatBoardImg} 
                        alt="Fresh Meat, Fish, and Seafood Selection" 
                        className="w-full h-full object-cover object-bottom scale-100" 
                    />
                    <div 
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(180deg, rgba(48,7,14,0.46) 0%, rgba(40,5,11,0.35) 32%, rgba(26,3,7,0.20) 55%, rgba(14,2,4,0.08) 75%, rgba(8,1,2,0.38) 100%)'
                        }}
                    />
                    <div 
                        className="absolute inset-0" 
                        style={{ background: 'radial-gradient(circle at 75% 25%, rgba(45,6,12,0.10) 0%, rgba(10,1,2,0.22) 100%)' }} 
                    />
                </div>

                {/* Fresh Green Foliage Accents in Top Corners */}
                <div className="absolute top-0 left-0 w-36 h-36 pointer-events-none opacity-80 z-10">
                    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
                        <path d="M0 0 C25 15, 35 45, 18 70 C5 55, 10 25, 0 0 Z" fill="#2E7D32" opacity="0.9" />
                        <path d="M15 10 C35 5, 55 25, 45 45 C30 40, 20 25, 15 10 Z" fill="#43A047" opacity="0.8" />
                        <path d="M0 25 C18 35, 20 60, 5 75 C-5 60, 2 40, 0 25 Z" fill="#1B5E20" opacity="0.85" />
                    </svg>
                </div>
                <div className="absolute top-10 -right-4 w-28 h-28 pointer-events-none opacity-75 z-10">
                    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
                        <path d="M100 0 C75 10, 60 35, 75 55 C90 45, 95 20, 100 0 Z" fill="#2E7D32" opacity="0.85" />
                        <path d="M85 30 C70 40, 65 65, 80 75 C92 65, 95 48, 85 30 Z" fill="#388E3C" opacity="0.75" />
                    </svg>
                </div>

                {/* Top Section: Meatyns Logo */}
                <div className="relative z-10 p-8 lg:p-12 xl:p-14 pb-0">
                    <MeatynsBrandLogo />
                </div>

                {/* Center Section: Headline & Value Badges */}
                <div className="relative z-10 px-8 lg:px-12 xl:px-14 my-auto py-6">
                    <h1 
                        className="text-3xl lg:text-4xl xl:text-5xl font-serif font-bold text-white leading-[1.18] tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Control &amp; Excellence<br />
                        <span className="text-[#E5A93C] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">At Scale</span>
                    </h1>

                    <p className="mt-4 text-white/95 text-sm lg:text-[15px] font-normal max-w-sm leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                        Enterprise management platform for Meatyns operations, sellers, orders, and real-time logistics.
                    </p>

                    {/* 3 Value Badges in a horizontal row */}
                    <div className="mt-7 flex items-center gap-4 lg:gap-6 pt-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <ShieldCheck size={18} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                                Enterprise<br />Security
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <BarChart3 size={18} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                                Real-Time<br />Analytics
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <Zap size={18} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                                Instant<br />Operations
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Cursive Typography over the cutting board */}
                <div className="relative z-10 p-8 lg:p-12 xl:p-14 pt-0 select-none">
                    <span 
                        className="text-[#E5A93C] text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] block -rotate-3 leading-tight tracking-wide"
                        style={{ fontFamily: "'Caveat', cursive" }}
                    >
                        Good Food<br />Good Health
                    </span>
                </div>
            </div>

            {/* ================================================================= */}
            {/* RIGHT COLUMN: Warm Cream Form Container                           */}
            {/* ================================================================= */}
            <div className="w-full md:w-1/2 min-h-screen bg-[#FAF7F2] p-8 lg:p-14 xl:p-16 flex flex-col justify-between relative overflow-hidden">
                {/* Botanical leaf decoration in top-left */}
                <div className="absolute top-4 left-6 pointer-events-none">
                    <BotanicalLeaf />
                </div>

                {/* Cow line watermark in bottom-right */}
                <div className="absolute -bottom-6 -right-6 pointer-events-none">
                    <CowWatermark />
                </div>

                {/* Top Right: Toggle link between Login and Signup */}
                <div className="relative z-10 flex justify-end items-center text-xs lg:text-sm">
                    {isLogin ? (
                        <div className="text-stone-600">
                            Need an admin account?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(false);
                                    setErrorMsg('');
                                }}
                                className="text-[#621320] hover:text-[#4A0D18] font-bold inline-flex items-center gap-1 hover:underline transition-all"
                            >
                                Register <ArrowRight size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="text-stone-600">
                            Already registered?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(true);
                                    setErrorMsg('');
                                }}
                                className="text-[#621320] hover:text-[#4A0D18] font-bold inline-flex items-center gap-1 hover:underline transition-all"
                            >
                                Log in <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Center Form Container */}
                <div className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
                    <div>
                        <h2 
                            className="text-3xl lg:text-4xl font-serif font-bold text-[#2A1515] tracking-tight"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            {isLogin ? 'Welcome Administrator' : 'Create Admin Account'}
                        </h2>
                        {/* Golden Accent Underline */}
                        <div className="w-12 h-1 bg-[#C98A2C] rounded-full mt-2.5 mb-3" />
                        <p className="text-stone-500 text-xs lg:text-sm">
                            {isLogin
                                ? `Enter your credentials to access the ${appName} control center.`
                                : `Register a new administrator account with full platform permissions.`}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        {/* Mode Switcher for Admin Login: Password vs Mock OTP */}
                        {isLogin && (
                            <div className="flex bg-stone-100 rounded-xl p-1 gap-1 border border-stone-200/60 mb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAdminLoginMode('password');
                                        setLoginOtpSent(false);
                                        setErrorMsg('');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                        adminLoginMode === 'password'
                                            ? 'bg-white text-stone-900 shadow-sm'
                                            : 'text-stone-500 hover:text-stone-700'
                                    }`}
                                >
                                    Email &amp; Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAdminLoginMode('otp');
                                        setErrorMsg('');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                        adminLoginMode === 'otp'
                                            ? 'bg-white text-stone-900 shadow-sm'
                                            : 'text-stone-500 hover:text-stone-700'
                                    }`}
                                >
                                    Email OTP
                                </button>
                            </div>
                        )}

                        <AnimatePresence mode="popLayout">
                            {!isLogin && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0, y: -10 }}
                                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                                    exit={{ height: 0, opacity: 0, y: -10 }}
                                    className="space-y-1.5"
                                >
                                    <label className="block text-xs font-semibold text-stone-700">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Enter your full name"
                                            className="w-full bg-[#FCFAF7] border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#621320] focus:ring-1 focus:ring-[#621320]/20 outline-none transition-all"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-stone-700">
                                Admin Email
                            </label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your admin email"
                                    className="w-full bg-[#FCFAF7] border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#621320] focus:ring-1 focus:ring-[#621320]/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Password Field (Shown for registration or password login mode) */}
                        {(!isLogin || (isLogin && adminLoginMode === 'password')) && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-stone-700">
                                    Password {(!isLogin) && <span className="text-[11px] text-stone-400 font-normal">(min 6 chars)</span>}
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        minLength={6}
                                        maxLength={128}
                                        autoComplete="current-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your secure password"
                                        className="w-full bg-[#FCFAF7] border border-stone-200 rounded-xl pl-10 pr-10 py-3 text-sm text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#621320] focus:ring-1 focus:ring-[#621320]/20 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Email OTP Field for Admin Login */}
                        {isLogin && adminLoginMode === 'otp' && loginOtpSent && (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-stone-700">
                                    Security Verification Code
                                </label>
                                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={4}
                                        placeholder="Enter 4-digit Mock OTP"
                                        value={loginOtp}
                                        onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendAdminLoginOtp}
                                        disabled={isSendingLoginOtp}
                                        className="text-[11px] font-bold text-amber-800 hover:underline disabled:opacity-50"
                                    >
                                        {isSendingLoginOtp ? 'Sending...' : 'Resend OTP'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error Message Box */}
                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-rose-50 text-rose-700 text-xs font-semibold p-3.5 rounded-xl border border-rose-200 flex items-center gap-2.5"
                                >
                                    <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center text-rose-800 text-xs font-bold shrink-0">
                                        !
                                    </div>
                                    <span>{errorMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || isSendingLoginOtp}
                            className="w-full bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] py-3.5 rounded-xl text-sm font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 border border-[#E5B800]"
                        >
                            {isLoading || isSendingLoginOtp ? (
                                <div className="w-5 h-5 border-2 border-[#1A1A1A]/30 border-t-[#1A1A1A] rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>
                                        {isLogin
                                            ? adminLoginMode === 'otp'
                                                ? loginOtpSent
                                                    ? 'Verify OTP & Login'
                                                    : 'Send Mock OTP'
                                                : 'Login to Admin Dashboard'
                                            : 'Create Admin Account'}
                                    </span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Bottom Security Guarantee */}
                <div className="relative z-10 flex items-center justify-center gap-2 text-stone-400 text-center text-xs pt-4">
                    <ShieldCheck size={16} className="text-stone-400 shrink-0" />
                    <span>Protected by Meatyns enterprise role-based security &amp; audit logging.</span>
                </div>
            </div>
        </div>
    );
};

export default AdminAuth;
