import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/shared/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useLocation as useAppLocation } from "../context/LocationContext";
import LocationDrawer from "../components/shared/LocationDrawer";
import { LeafLogo } from "../components/shared/MainLocationHeader";
import {
  ChevronLeft,
  Heart,
  Trash2,
  Search,
  MapPin,
  Zap,
  CircleUserRound,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";

const WishlistPage = () => {
  const navigate = useNavigate();
  const {
    wishlist,
    clearWishlist,
    fetchFullWishlist,
    isFullDataFetched,
    loading,
  } = useWishlist();

  const { cartCount } = useCart();
  const { currentLocation, refreshLocation, isFetchingLocation } = useAppLocation();
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isFullDataFetched) {
      fetchFullWishlist();
    }
  }, [isFullDataFetched]);

  if (loading && !isFullDataFetched) {
    return (
      <div className="min-h-screen bg-[#FFF9F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FDCE04]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F4] pb-24 font-outfit">
      {/* ──── Sticky Header matching Home and Search page background color ──── */}
      <div
        className="sticky top-0 z-30 bg-[#FDCE04] shadow-[0_4px_20px_rgba(0,0,0,0.08)] relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #FECD04 0%, #FDCE04 55%, #F5C502 100%)",
        }}
      >
        {/* ──── Desktop Main Header Row (md+) matching Home & Search Page ──── */}
        <div className="hidden md:flex items-center justify-between relative z-20 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-2.5">
          {/* Left: Brand Logo */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center cursor-pointer group shrink-0 select-none py-0.5"
          >
            <img
              src="/meatyns_logo_2x.png"
              alt="Meatyns"
              className="h-8 lg:h-9 w-auto object-contain group-hover:scale-[1.03] transition-transform duration-200"
            />
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
            <div
              onClick={() => navigate("/search")}
              className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 cursor-pointer shadow-sm hover:shadow transition-shadow border border-amber-200/60"
            >
              <Search size={18} className="text-[#1A1A1A] shrink-0 stroke-[2.2]" />
              <input
                type="text"
                placeholder="Search for meat, fish, seafood, etc..."
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-normal text-[13.5px] cursor-pointer select-none"
              />
            </div>
          </div>

          {/* Right Section: Delivery & Actions */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            {/* Deliver to */}
            <button
              type="button"
              onClick={() => {
                refreshLocation?.();
                setIsLocationOpen(true);
              }}
              className="flex items-center gap-2 text-left text-[#1A1A1A] bg-transparent border-0 p-0 cursor-pointer group hover:opacity-90 transition-opacity"
            >
              <MapPin size={20} className="text-[#1A1A1A] shrink-0 stroke-[2]" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-[#1A1A1A]/75 font-medium tracking-wide leading-tight">
                  Deliver to
                </span>
                <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-[#1A1A1A] leading-tight">
                  <span className="max-w-[110px] lg:max-w-[140px] truncate">
                    {isFetchingLocation
                      ? "Detecting..."
                      : currentLocation?.name || "Indore"}
                  </span>
                  <ChevronDown size={13} className="text-[#1A1A1A] shrink-0" />
                </div>
              </div>
            </button>

            {/* Delivery in */}
            <div className="flex items-center gap-2 text-[#1A1A1A]">
              <Zap size={18} className="text-[#1A1A1A] fill-[#1A1A1A] shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-[#1A1A1A]/75 font-medium tracking-wide leading-tight">
                  Delivery in
                </span>
                <span className="text-[13px] lg:text-sm font-extrabold text-[#1A1A1A] whitespace-nowrap leading-tight">
                  {currentLocation?.time || "15–30 mins"}
                </span>
              </div>
            </div>

            {/* Profile */}
            <button
              type="button"
              onClick={() => navigate("/profile")}
              aria-label="Profile"
              className="text-[#1A1A1A] hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
            >
              <CircleUserRound size={28} className="text-[#1A1A1A] stroke-[2]" />
            </button>

            {/* Cart */}
            <button
              type="button"
              onClick={() => navigate("/cart")}
              aria-label="Shopping Cart"
              className="relative text-[#1A1A1A] hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
            >
              <ShoppingCart size={24} className="text-[#1A1A1A] stroke-[2.2]" />
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#EF131F] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                {cartCount || 0}
              </span>
            </button>
          </div>
        </div>

        {/* ──── Wishlist Sub-Heading Bar (Desktop & Mobile) ──── */}
        <div className="border-t border-black/10">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-black/10 hover:bg-black/15 text-[#1A1A1A] rounded-full transition-all border border-black/10 backdrop-blur-md -ml-1 active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={22} className="text-[#1A1A1A]" />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-[#1A1A1A] tracking-tight leading-tight flex items-center gap-2">
                  <Heart size={20} className="text-[#EF131F] fill-[#EF131F]/30" />
                  My Wishlist
                </h1>
                <p className="text-[11px] md:text-xs text-[#1A1A1A]/80 font-normal leading-tight mt-0.5">
                  {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
                </p>
              </div>
            </div>

            {wishlist.length > 0 && (
              <button
                onClick={clearWishlist}
                className="flex items-center gap-1.5 text-[#1A1A1A] bg-black/10 hover:bg-black/15 border border-black/10 text-xs font-bold px-3.5 py-1.5 md:py-2 rounded-xl transition-all backdrop-blur-md active:scale-95 cursor-pointer"
              >
                <Trash2 size={14} className="text-[#1A1A1A]" /> Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ──── Location Drawer ──── */}
      <LocationDrawer
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />

      {/* ──── Wishlist Product Grid ──── */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-6">
        {wishlist.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {wishlist.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                variant="homeDesktop"
                neutralBg={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-xs max-w-xl mx-auto mt-6">
            <div className="h-16 w-16 bg-[#FFFBEB] border border-[#FDE68A] rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-[#EF131F]" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              No items in wishlist
            </h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
              Start saving your favorite items to see them here later.
            </p>
            <Link
              to="/categories"
              className="px-6 py-2.5 bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-sm font-extrabold rounded-xl transition-all inline-block shadow-sm active:scale-95 no-underline border border-[#E5B800]"
            >
              Explore Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
