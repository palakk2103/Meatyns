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
    Sparkles,
    ShieldCheck,
    Truck,
    Tag,
    ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@shared/components/ui/Toast';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import Header from '../components/layout/Header';
import DesktopSidebarNav from '../components/shared/DesktopSidebarNav';
import FishEmptyCartIllustration from '../components/shared/FishEmptyCartIllustration';

const CartPage = () => {
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const { showToast } = useToast();
    const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
    const [emptyBoxData, setEmptyBoxData] = useState(null);

    const handleRemove = (id, name, variantSku = "") => {
        removeFromCart(id, variantSku);
        showToast(`${name} removed from cart`, 'info');
    };

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const deliveryCharge = cartTotal >= 499 || cartTotal === 0 ? 0 : 30;
    const finalCartTotal = cartTotal + deliveryCharge;

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
                    <div className="min-h-screen bg-white flex flex-col font-outfit">
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
                            <h1 className="text-[17px] font-bold text-[#1A1A1A] tracking-wide">
                                My Cart
                            </h1>
                        </header>

                        {/* Center Content */}
                        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center -mt-6 sm:-mt-10">
                            <div className="mb-6">
                                <FishEmptyCartIllustration />
                            </div>
                            <h2 className="text-[17.5px] sm:text-[20px] font-bold text-[#2D3748] tracking-tight mb-1">
                                Ohhh... Your cart is empty
                            </h2>
                            <p className="text-xs sm:text-[13.5px] text-[#94A3B8] font-normal mb-8">
                                but it doesn&apos;t have to be.
                            </p>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center px-10 py-3 sm:px-12 sm:py-3.5 text-[#1A1A1A] font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-md bg-[#FDCE04] hover:bg-[#E5B800] active:scale-95 transition-all select-none"
                            >
                                SHOP NOW
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
                            <h1 className="text-[17px] font-bold text-[#1A1A1A] tracking-wide">
                                My Cart
                            </h1>
                        </header>
                        <div className="relative mx-auto w-full max-w-[1440px] px-4 py-6">
                            <section className="space-y-4">
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
                                                        <div>
                                                            <h3 className="truncate text-base font-bold text-slate-900">
                                                                {item.name}
                                                            </h3>
                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                {item.weight || '500 g'}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemove(item.id, item.name, item.variantSku)}
                                                            className="text-slate-400 hover:text-rose-500 p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <div className="text-lg font-black text-slate-900">
                                                            ₹{item.price * item.quantity}
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                                            <button
                                                                onClick={() => updateQuantity(item.id, -1, item.variantSku)}
                                                                className="h-7 w-7 flex items-center justify-center text-slate-600"
                                                                disabled={item.quantity <= 1}
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
                                        <span className="text-slate-500">Delivery</span>
                                        <span className="font-bold text-emerald-600">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between font-black text-base">
                                        <span>Total</span>
                                        <span className="text-[#1A1A1A]">₹{finalCartTotal}</span>
                                    </div>
                                    <Link to="/checkout" className="block pt-2">
                                        <Button className="w-full h-12 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] font-extrabold border border-[#E5B800]">
                                            Proceed to Checkout
                                        </Button>
                                    </Link>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View - Matching Image 2 */}
            <div className="hidden md:block">
                <Header />
                <div className="min-h-screen bg-[#FBF8F5] pt-24 lg:pt-28 pb-16 px-4 lg:px-8">
                    <div className="max-w-7xl mx-auto flex gap-8 items-start">
                        {/* 1. Left Sidebar Navigation */}
                        <DesktopSidebarNav />

                        {/* 2. Middle Cart Content */}
                        <div className="flex-1 min-w-0">
                            {cart.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 border border-[#ede5df] shadow-xs text-center">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#1A1A1A] mb-4">
                                        <ShoppingBag size={32} />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-1">Your cart is empty</h2>
                                    <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">Explore our fresh meat, poultry, and seafood selections and add your favorites to cart.</p>
                                    <Link
                                        to="/"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-xs font-extrabold border border-[#E5B800] transition-colors"
                                    >
                                        Start Shopping &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Cart Header: Your Cart (X Items) + Clear Cart */}
                                    <div className="flex items-center justify-between">
                                        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                                            Your Cart <span className="text-slate-500 text-base font-normal">({itemCount} {itemCount === 1 ? 'Item' : 'Items'})</span>
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
                                                            {item.name}
                                                        </h3>
                                                        <p className="text-xs text-slate-500">
                                                            {item.weight || item.netWeight || '500 g'}
                                                        </p>
                                                        <div className="flex items-center gap-2 pt-0.5">
                                                            <span className="text-base font-bold text-slate-900">
                                                                ₹{item.price}
                                                            </span>
                                                            <span className="text-xs text-slate-400 line-through">
                                                                ₹{Math.round(item.price * 1.2)}
                                                            </span>
                                                            <span className="bg-[#E7F7ED] text-[#15803D] text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                Fresh
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Quantity Controls & Delete Icon */}
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/80 px-2 py-1 gap-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, -1, item.variantSku)}
                                                            disabled={item.quantity <= 1}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
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
                                            <p className="text-[10px] text-slate-400">Free delivery above ₹499</p>
                                        </div>
                                        <span className="font-semibold text-slate-900">
                                            {deliveryCharge === 0 ? (
                                                <span className="text-emerald-700 font-bold">FREE</span>
                                            ) : (
                                                `₹${deliveryCharge}`
                                            )}
                                        </span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex items-center justify-between text-emerald-700">
                                            <span>Coupon ({appliedCoupon})</span>
                                            <span className="font-bold">-₹0</span>
                                        </div>
                                    )}

                                    <hr className="border-slate-100 my-2" />

                                    <div className="flex items-center justify-between text-sm font-black text-slate-900 pt-1">
                                        <span>Total Amount</span>
                                        <span className="text-base text-slate-900">₹{finalCartTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/checkout')}
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
