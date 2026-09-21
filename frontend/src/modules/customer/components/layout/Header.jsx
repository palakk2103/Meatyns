import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, MapPin, ChevronDown, Zap, CircleUserRound, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useLocation as useAppLocation } from "../../context/LocationContext";
import { useSettings } from '@core/context/SettingsContext';
import LocationDrawer from '../shared/LocationDrawer';

// Leaf outline emblem matching brand logo design
const LeafLogo = ({ className = "w-8 h-8 text-white shrink-0" }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 27C9 21 11.5 15.5 16 12C18 10.5 20.5 10 20.5 10C20.5 10 19.5 14.5 17 18C14.8 21 13 24 10 27Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 26C14 23 20 18 24 13C27.5 8.5 30 8 30 8C30 8 29.5 12.5 26 17.5C21.5 23.5 16 26.5 11 26Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 22C19 18 23.5 14.5 27.5 11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const Header = () => {
    const { settings } = useSettings();
    const { count: wishlistCount } = useWishlist();
    const { cartCount } = useCart();
    const location = useLocation();
    const isCheckoutPage = location.pathname === '/checkout';
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const { currentLocation, refreshLocation, isFetchingLocation } = useAppLocation();

    // Search placeholder animation
    const [searchPlaceholder, setSearchPlaceholder] = useState('Search ');
    const [typingState, setTypingState] = useState({
        textIndex: 0,
        charIndex: 0,
        isDeleting: false,
        isPaused: false
    });

    const staticText = "Search ";
    const typingPhrases = ['"mutton"', '"chicken"', '"fish"', '"prawns"', '"goat meat"', '"beef"'];

    React.useEffect(() => {
        const { textIndex, charIndex, isDeleting, isPaused } = typingState;
        const currentPhrase = typingPhrases[textIndex];

        if (isPaused) {
            const timeout = setTimeout(() => {
                setTypingState(prev => ({ ...prev, isPaused: false, isDeleting: true }));
            }, 2000); // Pause after full phrase
            return () => clearTimeout(timeout);
        }

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                // Typing
                if (charIndex < currentPhrase.length) {
                    setSearchPlaceholder(staticText + currentPhrase.substring(0, charIndex + 1));
                    setTypingState(prev => ({ ...prev, charIndex: prev.charIndex + 1 }));
                } else {
                    // Finished typing
                    setTypingState(prev => ({ ...prev, isPaused: true }));
                }
            } else {
                // Deleting
                if (charIndex > 0) {
                    setSearchPlaceholder(staticText + currentPhrase.substring(0, charIndex - 1));
                    setTypingState(prev => ({ ...prev, charIndex: prev.charIndex - 1 }));
                } else {
                    // Finished deleting
                    setTypingState(prev => ({
                        ...prev,
                        isDeleting: false,
                        textIndex: (prev.textIndex + 1) % typingPhrases.length
                    }));
                }
            }
        }, isDeleting ? 50 : 100);

        return () => clearTimeout(timeout);
    }, [typingState]);

    return (
        <>
            {/* ──── Desktop Header Layout (md and above) ──── */}
            <header className="hidden md:block absolute top-8 left-0 right-0 z-[200] px-4">
                <div className="container mx-auto max-w-6xl">
                    <div
                        className="w-full px-4 lg:px-8 py-2.5 rounded-2xl shadow-lg flex items-center justify-between border border-black/10 text-[#1A1A1A]"
                        style={{ background: 'linear-gradient(180deg, #FECD04 0%, #FDCE04 55%, #F5C502 100%)' }}
                    >
                        {/* Left Section: Meatyns Official Brand Logo */}
                        <Link to="/" className="flex items-center cursor-pointer group shrink-0 select-none no-underline py-0.5">
                            <img
                                src="/meatyns_logo_2x.png"
                                alt="Meatyns"
                                className="h-8 lg:h-9 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        </Link>

                        {/* Center Section: Pill Search Bar */}
                        {!isCheckoutPage && (
                            <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
                                <Link to="/search" className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 cursor-pointer shadow-xs hover:shadow-sm transition-shadow no-underline border border-black/5">
                                    <Search size={18} className="text-[#1A1A1A] shrink-0 stroke-[2.4]" />
                                    <span className="flex-1 text-slate-500 font-normal text-[13.5px] truncate">
                                        Search for meat, fish, seafood, etc...
                                    </span>
                                </Link>
                            </div>
                        )}

                        {/* Right Section: Delivery & Actions */}
                        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                            {/* Deliver to */}
                            <button
                                type="button"
                                data-lenis-prevent
                                data-lenis-prevent-touch
                                onClick={() => {
                                    refreshLocation?.();
                                    setIsLocationOpen(true);
                                }}
                                className="flex items-center gap-2 text-left text-[#1A1A1A] bg-transparent border-0 p-0 cursor-pointer group hover:opacity-85 transition-opacity"
                            >
                                <MapPin size={20} className="text-[#1A1A1A] shrink-0 stroke-[2]" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[11px] text-stone-800 font-semibold tracking-wide leading-tight">
                                        Deliver to
                                    </span>
                                    <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-[#1A1A1A] leading-tight">
                                        <span className="max-w-[110px] lg:max-w-[140px] truncate">
                                            {currentLocation?.name || 'Indore'}
                                        </span>
                                        <ChevronDown size={13} className="text-stone-800 shrink-0" />
                                    </div>
                                </div>
                            </button>

                            {/* Delivery in */}
                            <div className="flex items-center gap-2 text-[#1A1A1A]">
                                <Zap size={18} className="text-[#1A1A1A] fill-[#1A1A1A] shrink-0" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[11px] text-stone-800 font-semibold tracking-wide leading-tight">
                                        Delivery in
                                    </span>
                                    <span className="text-[13px] lg:text-sm font-bold text-[#1A1A1A] whitespace-nowrap leading-tight">
                                        {currentLocation?.time || '15–30 mins'}
                                    </span>
                                </div>
                            </div>

                            {/* Profile Icon */}
                            <Link
                                to="/profile"
                                aria-label="Profile"
                                className="text-[#1A1A1A] hover:opacity-80 transition-opacity flex items-center justify-center p-1"
                            >
                                <CircleUserRound size={28} className="text-[#1A1A1A] stroke-[1.9]" />
                            </Link>

                            {/* Cart Icon with badge */}
                            <Link
                                to="/cart"
                                id="header-cart-icon"
                                aria-label="Shopping Cart"
                                className="relative text-[#1A1A1A] hover:opacity-80 transition-opacity flex items-center justify-center p-1"
                            >
                                <ShoppingCart size={24} className="text-[#1A1A1A] stroke-[2.2]" />
                                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#EF131F] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                                    {cartCount || 0}
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* ──── Mobile View Header (Strictly md:hidden) matching Meatyns Standard ──── */}
            <header
                className="md:hidden fixed top-0 left-0 right-0 z-[200] px-4 pt-2.5 pb-2 bg-white border-b border-slate-100 shadow-xs select-none text-[#111111]"
            >
                {/* Top Row: Delivery Address, Meatyns Brand, Cart */}
                <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 min-h-[36px]">
                    {/* 1. Left: Delivery Address */}
                    <button
                        type="button"
                        data-lenis-prevent
                        data-lenis-prevent-touch
                        onClick={() => {
                            refreshLocation?.();
                            setIsLocationOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-left text-[#111111] bg-transparent border-0 p-0 cursor-pointer active:scale-95 transition-transform min-w-0 max-w-full"
                    >
                        <MapPin size={17} className="text-[#C81017] fill-[#C81017] shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0">
                            <span className="text-[9.5px] font-medium text-slate-500 leading-tight">
                                Deliver to
                            </span>
                            <div className="flex items-center gap-0.5 min-w-0">
                                <span className="text-[10.5px] font-bold text-[#111111] leading-tight truncate">
                                    {isFetchingLocation
                                        ? "Detecting..."
                                        : (currentLocation?.name || "Corporate Ho...")}
                                </span>
                                <ChevronDown size={11} className="text-slate-500 shrink-0" />
                            </div>
                        </div>
                    </button>

                    {/* 2. Center: Meatyns Brand Official Logo */}
                    <Link
                        to="/"
                        className="flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform shrink-0 no-underline"
                    >
                        <img
                            src="/meatyns_logo_2x.png"
                            alt="Meatyns"
                            className="h-6 sm:h-7 w-auto object-contain"
                        />
                    </Link>

                    {/* 3. Right: Cart Action */}
                    <div className="flex items-center justify-end shrink-0 pr-1">
                        <Link
                            to="/cart"
                            aria-label="Cart"
                            className="relative flex flex-col items-center justify-center text-[#111111] bg-transparent border-0 p-0 cursor-pointer active:scale-90 transition-transform select-none no-underline"
                        >
                            <div className="relative inline-flex items-center justify-center">
                                <ShoppingCart size={19} className="text-[#111111] stroke-[2.2]" />
                                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-[#C81017] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs leading-none">
                                    {cartCount || 0}
                                </span>
                            </div>
                            <span className="text-[8.5px] font-medium text-slate-700 leading-none mt-0.5">
                                Cart
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Search Bar Row (Mobile) */}
                {!isCheckoutPage && (
                    <div className="relative z-10 mt-1 flex items-center pb-0.5">
                        <Link
                            to="/search"
                            className="w-full h-[38px] bg-[#F8FAFC] border border-slate-200/90 rounded-full px-3.5 flex flex-row flex-nowrap items-center justify-between gap-2.5 shadow-2xs cursor-pointer active:scale-[0.99] transition-transform no-underline"
                        >
                            <div className="flex flex-row flex-nowrap items-center gap-2.5 flex-1 min-w-0">
                                <Search size={16} className="text-slate-400 shrink-0 stroke-[2.2]" />
                                <span className="text-slate-400 font-normal text-[12.5px] truncate leading-normal">
                                    {searchPlaceholder || 'Search for chicken, fish, seafood...'}
                                </span>
                            </div>
                            <Mic size={16} className="text-slate-400 shrink-0" />
                        </Link>
                    </div>
                )}
            </header>

            {/* Location Selection Drawer */}
            <LocationDrawer
                isOpen={isLocationOpen}
                onClose={() => setIsLocationOpen(false)}
            />
        </>
    );
};

export default Header;

