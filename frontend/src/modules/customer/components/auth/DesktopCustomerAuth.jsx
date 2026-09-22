import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Truck,
    CheckCircle2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    ArrowRight,
    ArrowLeft,
    KeyRound,
    Phone
} from 'lucide-react';
import meatBoardImg from '@/assets/meat_seafood_board.jpg';

// Stylized Meatyns Animal Crest Logo (Fish & Fresh Meat Crest)
const MeatynsBrandLogo = () => (
    <div className="flex items-center gap-3 select-none">
        <div className="w-14 h-14 rounded-full border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center p-2 shadow-lg shrink-0">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                {/* Outer decorative ring */}
                <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                {/* Fresh fish leaping center */}
                <path d="M30 46 C32 32, 46 26, 62 30 C68 32, 74 38, 76 46 C74 54, 66 60, 52 60 C38 60, 31 54, 30 46 Z" fill="white" />
                {/* Fish tail fin */}
                <polygon points="28,46 18,38 22,46 18,54" fill="white" />
                {/* Fish dorsal fin & gill curve */}
                <path d="M48 26 C52 20, 58 22, 60 28 Z" fill="#E5A93C" />
                <path d="M40 58 C44 64, 50 64, 52 58 Z" fill="white" opacity="0.8" />
                <path d="M58 38 C56 42, 56 48, 58 52" stroke="#3B0710" strokeWidth="2" strokeLinecap="round" />
                <circle cx="67" cy="42" r="2.5" fill="#3B0710" />
                {/* Swimming Fish swoosh at bottom */}
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
                    FRESH MEAT &bull; FISH &bull; POULTRY
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

// Faint Fish Line-Art Watermark for Bottom-Right
const FishWatermark = () => (
    <svg width="220" height="220" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#8B2D3B]/10">
        {/* Sleek fish body contour */}
        <path d="M15 50 C25 25, 65 25, 82 50 C65 75, 25 75, 15 50 Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        {/* Tail fins */}
        <path d="M16 50 C10 40, 4 35, 2 42 C4 48, 10 50, 15 50" stroke="currentColor" strokeWidth="1.2" />
        <path d="M16 50 C10 60, 4 65, 2 58 C4 52, 10 50, 15 50" stroke="currentColor" strokeWidth="1.2" />
        {/* Dorsal fin */}
        <path d="M42 32 C50 18, 62 20, 68 34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        {/* Pectoral fin */}
        <path d="M48 52 C55 58, 60 62, 54 66 C48 64, 45 58, 48 52" stroke="currentColor" strokeWidth="1.2" />
        {/* Gill slit curve */}
        <path d="M64 38 C60 44, 60 54, 64 60" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        {/* Eye */}
        <circle cx="73" cy="46" r="2.5" fill="currentColor" />
        {/* Gentle water ripples */}
        <path d="M30 82 C45 78, 55 86, 70 82" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
        <path d="M20 20 C35 16, 45 24, 60 20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
    </svg>
);

const DesktopCustomerAuth = ({
    formData,
    setFormData,
    showOtp,
    setShowOtp,
    handleSendOtp,
    handleVerifyOtp,
    isLoading,
    timer
}) => {

    return (
        <div className="hidden md:flex min-h-screen w-full bg-[#FAF7F2] font-['Outfit',_sans-serif]">
            {/* ================================================================= */}
            {/* LEFT COLUMN: Deep Maroon Banner with Background Image             */}
            {/* ================================================================= */}
            <div className="w-1/2 min-h-screen relative overflow-hidden text-white flex flex-col justify-between">
                {/* Full-bleed Background Image with Seamless Dark Burgundy Gradient Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={meatBoardImg} 
                        alt="Fresh Meat, Fish, and Seafood Selection" 
                        className="w-full h-full object-cover object-bottom scale-100" 
                    />
                    {/* Rich maroon overlay with further reduced opacity for crystal clear background visibility */}
                    <div 
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(180deg, rgba(48,7,14,0.46) 0%, rgba(40,5,11,0.35) 32%, rgba(26,3,7,0.20) 55%, rgba(14,2,4,0.08) 75%, rgba(8,1,2,0.38) 100%)'
                        }}
                    />
                    {/* Soft ambient vignette */}
                    <div 
                        className="absolute inset-0" 
                        style={{ background: 'radial-gradient(circle at 75% 25%, rgba(45,6,12,0.10) 0%, rgba(10,1,2,0.22) 100%)' }} 
                    />
                </div>

                {/* Fresh Green Foliage Accents in Top Corners (matching reference image) */}
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
                        Freshness<br />
                        Delivered to<br />
                        <span className="text-[#E5A93C] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">Your Door</span>
                    </h1>

                    <p className="mt-4 text-white/95 text-sm lg:text-[15px] font-normal max-w-sm leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                        Premium quality meat, fish &amp; poultry &mdash; now just a click away.
                    </p>

                    {/* 3 Value Badges in a horizontal row */}
                    <div className="mt-7 flex items-center gap-4 lg:gap-6 pt-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <ShieldCheck size={18} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                                Hygienically<br />Packed
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <Truck size={18} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                                Fast Delivery<br />15–30 mins
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                <CheckCircle2 size={18} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/90 leading-tight drop-shadow-sm">
                                100% Fresh<br />&amp; Natural
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
            <div className="w-1/2 min-h-screen bg-[#FAF7F2] p-8 lg:p-14 xl:p-16 flex flex-col justify-between relative overflow-hidden">
                {/* Botanical leaf decoration in top-left */}
                <div className="absolute top-4 left-6 pointer-events-none">
                    <BotanicalLeaf />
                </div>

                {/* Fish line watermark in bottom-right */}
                <div className="absolute -bottom-6 -right-6 pointer-events-none select-none">
                    <FishWatermark />
                </div>                {/* Top Right: Tagline */}
                <div className="relative z-10 flex justify-end items-center text-xs text-stone-500 font-semibold gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    Fast &amp; Secure Login
                </div>

                {/* Center Form Container */}
                <div className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
                    <motion.div
                        key={showOtp ? 'otp-card' : 'phone-card'}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Heading */}
                        <div className="space-y-1.5 mb-8">
                            <h2 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight font-serif">
                                {showOtp ? 'Enter Verification Code' : 'Login with Phone'}
                            </h2>
                            <p className="text-stone-500 text-sm">
                                {showOtp
                                    ? `We have sent a 4-digit code to +91 ${formData.phone}`
                                    : 'Enter your 10-digit mobile number to access your account & orders.'}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {!showOtp ? (
                                <motion.form 
                                    key="phone-form"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    onSubmit={handleSendOtp}
                                    className="mt-8 space-y-5"
                                >
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                                            Mobile Number
                                        </label>
                                        <div className="relative flex items-center">
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-stone-500 pointer-events-none">
                                                <Phone size={17} className="text-stone-400" />
                                                <span className="text-sm font-bold text-stone-700">+91</span>
                                                <span className="w-[1px] h-4 bg-stone-300"></span>
                                            </div>
                                            <input
                                                required
                                                type="tel"
                                                inputMode="numeric"
                                                name="phone"
                                                maxLength={10}
                                                value={formData.phone}
                                                placeholder="Enter 10-digit number"
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setFormData({ ...formData, phone: val });
                                                }}
                                                className="w-full bg-[#FCFAF7] border border-stone-200 rounded-xl pl-20 pr-4 py-3.5 text-sm font-bold text-stone-800 placeholder-stone-400 focus:bg-white focus:border-[#FDCE04] focus:ring-1 focus:ring-[#FDCE04]/40 outline-none transition-all tracking-wider placeholder:font-normal placeholder:tracking-normal"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || (formData.phone || '').replace(/\D/g, '').length < 10}
                                        className="w-full bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] py-3.5 rounded-xl text-sm font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 border border-[#E5B800]"
                                    >
                                        <span>{isLoading ? 'Sending OTP...' : 'Continue'}</span>
                                        <ArrowRight size={16} />
                                    </button>

                                    <p className="text-[11px] text-stone-400 text-center pt-2 leading-relaxed">
                                        By continuing, you agree to Meatyns's Terms &amp; Conditions and Privacy Policy.
                                    </p>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="otp-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="mt-8 space-y-6"
                                >
                                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                                <KeyRound size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-800">Verification Code</p>
                                                <p className="text-[11px] text-stone-500">Sent to +91 {formData.phone}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowOtp(false)}
                                            className="text-xs font-semibold text-amber-800 hover:underline"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                                        <div className="flex justify-between gap-3 px-2">
                                            {[...Array(4)].map((_, i) => (
                                                <input
                                                    key={i}
                                                    type="tel"
                                                    maxLength={1}
                                                    value={formData.otp?.[i] || ''}
                                                    className="w-14 h-16 bg-white border-2 border-stone-300 rounded-2xl text-center text-2xl font-black text-[#1A1A1A] outline-none shadow-sm focus:border-[#FDCE04] focus:ring-2 focus:ring-[#FDCE04]/40 transition-all"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Backspace' && !e.target.value && i > 0) {
                                                            e.target.previousElementSibling?.focus();
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        const otpArr = (formData.otp || '').split('');
                                                        otpArr[i] = val;
                                                        const newOtp = otpArr.join('').slice(0, 4);
                                                        setFormData({ ...formData, otp: newOtp });
                                                        if (val && i < 3) e.target.nextElementSibling?.focus();
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading || (formData.otp || '').length !== 4}
                                            className="w-full bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] py-3.5 rounded-xl text-sm font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 border border-[#E5B800]"
                                        >
                                            <span>{isLoading ? 'Verifying...' : 'Verify & Login'}</span>
                                            <ArrowRight size={16} />
                                        </button>

                                        <div className="flex items-center justify-between text-xs pt-1 text-stone-500">
                                            <button
                                                type="button"
                                                onClick={() => setShowOtp(false)}
                                                className="inline-flex items-center gap-1 hover:text-stone-800"
                                            >
                                                <ArrowLeft size={14} /> Back
                                            </button>
                                            <div>
                                                Didn't receive code?{' '}
                                                <button
                                                    type="button"
                                                    disabled={timer > 0}
                                                    onClick={handleSendOtp}
                                                    className={`font-semibold ${timer > 0 ? 'text-stone-400' : 'text-amber-800 underline'}`}
                                                >
                                                    {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Bottom Trust Guarantee Badge */}
                <div className="relative z-10 flex items-center justify-center gap-2 text-stone-400 text-center text-xs pt-4">
                    <ShieldCheck size={16} className="text-stone-400 shrink-0" />
                    <span>Your information is safe with us. We never share your data.</span>
                </div>
            </div>
        </div>
    );
};

export default DesktopCustomerAuth;
