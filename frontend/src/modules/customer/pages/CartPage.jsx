import MascotTagline from "../components/shared/MascotTagline";
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useCart } from '../context/CartContext';
import {
    Minus,
    Plus,
    Trash2,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Tag,
    ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@shared/components/ui/Toast';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import DesktopSidebarNav from '../components/shared/DesktopSidebarNav';
import FishEmptyCartIllustration from '../components/shared/FishEmptyCartIllustration';
import UnavailableItemsNotice from './checkout/components/UnavailableItemsNotice';
import { useCartServiceability } from '../hooks/useCartServiceability';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { cleanProductName } from "@/core/utils/productName";

const CartPage = () => {
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQuantity, cartTotal, clearCart, resolveItemEffectivePrice } = useCart();
    const { showToast } = useToast();
    const { currentLocation, hasRealLocation } = useAppLocation();
    const unavailableItems = useCartServiceability(currentLocation?.latitude, currentLocation?.longitude, hasRealLocation);
    const removeUnavailable = (id, sku) => removeFromCart(id, String(sku || '').trim());
    const removeAllUnavailable = () => unavailableItems.forEach((u) => removeUnavailable(u.productId, u.variantSku));
    const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
    const [emptyBoxData, setEmptyBoxData] = useState(null);


    const handleRemove = (id, name, variantSku = "") => {
        removeFromCart(id, variantSku);
        showToast(`${name} removed from cart`, 'info');
    };

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');

    const handleProceedToCheckout = (e) => {
        if (unavailableItems.length > 0) {
            e?.preventDefault?.();
            showToast('Remove the unavailable items to continue to checkout.', 'error');
            return;
        }
        navigate('/checkout');
    };

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) {
            showToast('Please enter a coupon code', 'error');
            return;
        }
        setAppliedCoupon(couponCode.trim().toUpperCase());
        showToast(`Coupon "${couponCode.trim().toUpperCase()}" applied!`, 'success');
    };

    return (
        <div>
            {/* Mobile View */}
            <div className="md:hidden">
                {cart.length === 0 ? (
                    <div className="min-h-screen bg-white flex flex-col font-poppins">
                        {/* Top Header Bar */}
                        <header
                            className="sticky top-0 z-50 text-[#1A1A1A] px-4 h-14 flex items-center gap-3 shadow-sm select-none"
                            style={{ background: "linear-gradient(180deg, #FECD04 0%, #FDCE04 55%, #F5C502 100%)" }}
                        >
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                aria-label="Go back"
                                className="flex items-center justify-center w-8 h-8 rounded-full text-[#1A1A1A] active:scale-90 transition-transform -ml-1"
                            >
                                <ArrowLeft size={22} strokeWidth={2.4} />
                            </button>
                            <h1 className="text-[17px] font-normal font-anton tracking-wide text-[#1A1A1A] uppercase">
                                My Cart
                            </h1>
                        </header>

                        {/* Center Content */}
                        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center -mt-4 sm:-mt-6">
                            <div className="relative w-48 sm:w-56 h-56 sm:h-64 mb-10 flex items-center justify-center">
                                <img
                                    src="/mascot/chef_mascot.png"
                                    alt="Meatyns Chef Mascot"
                                    className="max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:scale-105 transition-transform duration-300"
                                    loading="eager"
                                />
<MascotTagline size="lg" below />
                            </div>
                            <h2 className="text-[20px] sm:text-[22px] font-normal font-anton uppercase tracking-wide text-slate-800 mb-1.5">
                                Your cart is empty!
                            </h2>
                            <p className="text-sm font-bold text-[#C81017] mb-2">Order Fresh. Cook Happy.</p>
                            <p className="text-xs sm:text-[13px] text-slate-500 font-medium max-w-xs mb-6 leading-relaxed">
                                Looks like you haven&apos;t added anything yet. Let&apos;s fill it with some fresh and healthy meat.
                            </p>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center px-8 py-3 sm:px-10 sm:py-3.5 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-md bg-[#C81017] hover:bg-[#A30D13] active:scale-95 transition-all select-none"
                            >
                                Explore Products
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="relative isolate w-full min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(254,205,4,0.15),_transparent_34%),linear-gradient(180deg,_#fbf8f5_0%,_#f5f1e8_100%)] animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Top Header Bar */}
                        <header
                            className="sticky top-0 z-50 text-[#1A1A1A] px-4 h-14 flex items-center gap-3 shadow-sm select-none"
                            style={{ background: "linear-gradient(180deg, #FECD04 0%, #FDCE04 55%, #F5C502 100%)" }}
                        >
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                aria-label="Go back"
                                className="flex items-center justify-center w-8 h-8 rounded-full text-[#1A1A1A] active:scale-90 transition-transform -ml-1"
                            >
                                <ArrowLeft size={22} strokeWidth={2.4} />
                            </button>
                            <h1 className="text-[17px] font-normal font-anton tracking-wide text-[#1A1A1A] uppercase">
                                My Cart
                            </h1>
                        </header>
                        <div className="relative mx-auto w-full max-w-[1440px] px-4 py-6">
                            <section className="space-y-4">
                                <UnavailableItemsNotice items={unavailableItems} onRemove={removeUnavailable} onRemoveAll={removeAllUnavailable} />
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                        Your items
                                    </h2>
                                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-slate-500 border border-slate-200">
                                        {itemCount} total
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <article
                                            key={`${item.id}::${String(item.variantSku || "").trim()}`}
                                            className="group overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/85 shadow-sm p-4"
                                        >
                                            <div className="flex gap-4">
                                                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-50">
                                                    <img
                                                        src={applyCloudinaryTransform(item.image)}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="truncate text-base font-bold text-slate-900">
                                                                {cleanProductName(item.name)}
                                                            </h3>
                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                {item.variantName || item.weight || '500 g'}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemove(item.id, item.name, item.variantSku)}
                                                            aria-label="Remove item"
                                                            title="Remove item"
                                                            className="flex-shrink-0 text-slate-400 hover:text-rose-500 active:scale-90 p-1.5 rounded-lg hover:bg-rose-50"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        {(() => {
                                                            const effective = resolveItemEffectivePrice ? resolveItemEffectivePrice(item, item.quantity) : { unitPrice: item.price, appliedTier: null };
                                                            return (
                                                                <div className="flex flex-col">
                                                                    <div className="text-lg font-black text-slate-900">
                                                                        ₹{effective.unitPrice * item.quantity}
                                                                    </div>
                                                                    {effective.appliedTier && (
                                                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                                                            {effective.appliedTier.discountPercentage ? `${effective.appliedTier.discountPercentage}% Tier Discount` : 'Volume Discount'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                                            <button
                                                                onClick={() => item.quantity <= 1
                                                                    ? handleRemove(item.id, item.name, item.variantSku)
                                                                    : updateQuantity(item.id, -1, item.variantSku)}
                                                                aria-label="Decrease quantity"
                                                                className="h-7 w-7 flex items-center justify-center text-slate-600"
                                                            >
                                                                <Minus size={13} />
                                                            </button>
                                                            <span className="text-xs font-bold">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(item.id, 1, item.variantSku)}
                                                                className="h-7 w-7 flex items-center justify-center text-slate-600"
                                                            >
                                                                <Plus size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-bold">₹{cartTotal}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <div>
                                            <span className="text-slate-500">Delivery</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500">Calculated at checkout</span>
                                    </div>
                                    <div className="border-t pt-2">
                                        <div className="flex justify-between font-black text-base">
                                            <span>Item Total</span>
                                            <span className="text-[#1A1A1A]">₹{cartTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Delivery charge depends on your location and is added at checkout.</p>
                                    </div>
                                    <div className="block pt-2">
                                        <Button
                                            onClick={handleProceedToCheckout}
                                            className="w-full h-12 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] font-extrabold border border-[#E5B800] disabled:opacity-50"
                                        >
                                            Proceed to Checkout
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View - Matching Image 2 */}
            <div className="hidden md:block">
                <div className="min-h-screen bg-[#FBF8F5] pt-6 lg:pt-8 pb-16 px-4 lg:px-8">
                    <div className="max-w-7xl mx-auto flex gap-8 items-start">
                        {/* 1. Left Sidebar Navigation */}
                        <DesktopSidebarNav />

                        {/* 2. Middle Cart Content */}
                        <div className="flex-1 min-w-0">
                            {cart.length === 0 ? (
                                <div className="bg-white rounded-2xl p-10 lg:p-12 border border-[#ede5df] shadow-xs text-center flex flex-col items-center">
                                    <div className="relative w-48 h-56 mb-10 flex items-center justify-center">
                                        <img
                                            src="/mascot/chef_mascot.png"
                                            alt="Meatyns Chef Mascot"
                                            className="max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.14)]"
                                            loading="eager"
                                        />
<MascotTagline size="lg" below />
                                    </div>
                                    <h2 className="text-2xl font-normal font-anton uppercase tracking-wide text-slate-900 mb-1.5">Your cart is empty!</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                                        Looks like you haven&apos;t added anything yet. Let&apos;s fill it with fresh chicken, mutton, seafood, and healthy cuts.
                                    </p>
                                    <Link
                                        to="/"
                                        className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#C81017] hover:bg-[#A30D13] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
                                    >
                                        Explore Products &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <UnavailableItemsNotice items={unavailableItems} onRemove={removeUnavailable} onRemoveAll={removeAllUnavailable} />
                                    {/* Cart Header: Your Cart (X Items) + Clear Cart */}
                                    <div className="flex items-center justify-between">
                                        <h1 className="text-xl lg:text-2xl font-normal font-anton tracking-wide text-slate-900 uppercase">
                                            Your Cart <span className="text-slate-500 text-base font-normal font-poppins">({itemCount} {itemCount === 1 ? 'Item' : 'Items'})</span>
                                        </h1>
                                        <button
                                            onClick={clearCart}
                                            className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={14} /> Clear Cart
                                        </button>
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-3">
                                        {cart.map((item) => (
                                            <div
                                                key={`${item.id}::${String(item.variantSku || '').trim()}`}
                                                className="bg-white rounded-2xl p-4 border border-[#ede5df] shadow-xs flex items-center justify-between gap-4"
                                            >
                                                {/* Left: Thumbnail + Title + Weight + Price */}
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                                                        <img
                                                            src={applyCloudinaryTransform(item.image)}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 space-y-1">
                                                        <h3 className="text-sm font-bold text-slate-900 truncate">
                                                            {cleanProductName(item.name)}
                                                        </h3>
                                                        <p className="text-xs text-slate-500">
                                                            {item.variantName || item.weight || item.netWeight || '500 g'}
                                                        </p>
                                                        {(() => {
                                                            const effective = resolveItemEffectivePrice ? resolveItemEffectivePrice(item, item.quantity) : { unitPrice: item.price, appliedTier: null };
                                                            return (
                                                                <div className="flex items-center gap-2 pt-0.5">
                                                                    <span className="text-base font-bold text-slate-900">
                                                                        ₹{effective.unitPrice}
                                                                    </span>
                                                                    {effective.unitPrice < (item.salePrice || item.price) && (
                                                                        <span className="text-xs text-slate-400 line-through">
                                                                            ₹{item.salePrice || item.price}
                                                                        </span>
                                                                    )}
                                                                    {effective.appliedTier && (
                                                                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                            {effective.appliedTier.discountPercentage ? `${effective.appliedTier.discountPercentage}% Tier Off` : 'Volume Discount'}
                                                                        </span>
                                                                    )}
                                                                    <span className="bg-[#E7F7ED] text-[#15803D] text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                        Fresh
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Right: Quantity Controls & Delete Icon */}
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/80 px-2 py-1 gap-2">
                                                        <button
                                                            onClick={() => item.quantity <= 1
                                                                ? handleRemove(item.id, item.name, item.variantSku)
                                                                : updateQuantity(item.id, -1, item.variantSku)}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
                                                        >
                                                            <Minus size={13} strokeWidth={2.5} />
                                                        </button>
                                                        <span className="text-xs font-bold text-slate-900 min-w-[18px] text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1, item.variantSku)}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
                                                        >
                                                            <Plus size={13} strokeWidth={2.5} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => handleRemove(item.id, item.name, item.variantSku)}
                                                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Coupon Code Card */}
                                    <div className="bg-white rounded-2xl p-4 border border-[#ede5df] shadow-xs flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                                                <Tag size={16} />
                                            </div>
                                            <span className="text-xs font-medium text-slate-700">
                                                Have a coupon code?
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter code"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#FDCE04] w-36 uppercase tracking-wider font-semibold"
                                            />
                                            <button
                                                onClick={handleApplyCoupon}
                                                className="px-4 py-1.5 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-xs font-bold border border-[#E5B800] transition-colors cursor-pointer"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Right Column: Price Details */}
                        <div className="w-72 xl:w-80 flex-shrink-0 select-none">
                            <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs space-y-4">
                                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                                    Price Details
                                </h2>

                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span>Subtotal</span>
                                        <span className="font-semibold text-slate-900">₹{cartTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <div>
                                            <span>Delivery Charges</span>
                                        </div>
                                        <span className="font-semibold text-slate-500">Calculated at checkout</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex items-center justify-between text-emerald-700">
                                            <span>Coupon ({appliedCoupon})</span>
                                            <span className="font-bold">-₹0</span>
                                        </div>
                                    )}

                                    <hr className="border-slate-100 my-2" />

                                    <div className="pt-1">
                                        <div className="flex items-center justify-between text-sm font-black text-slate-900">
                                            <span>Item Total</span>
                                            <span className="text-base text-slate-900">₹{cartTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Delivery charge depends on your location and is added at checkout.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleProceedToCheckout}
                                    disabled={cart.length === 0}
                                    className="w-full py-3.5 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] disabled:opacity-50 text-[#1A1A1A] font-extrabold text-sm flex items-center justify-center gap-2 border border-[#E5B800] transition-all active:scale-[0.99] shadow-sm cursor-pointer mt-2"
                                >
                                    <span>Proceed to Checkout &rarr;</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
