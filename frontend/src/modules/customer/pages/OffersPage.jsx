import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Sparkles, Clock, ArrowRight, Flame, Heart, ShoppingCart, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { customerApi } from "../services/customerApi";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useProductDetail } from "../context/ProductDetailContext";
import { toast } from "sonner";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { DEFAULT_HOT_DEALS } from "../components/home/HotDealsSection";

const OffersPage = () => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openProduct } = useProductDetail();

  const [legacyOffers, setLegacyOffers] = useState([]);
  const [hotDeals, setHotDeals] = useState(DEFAULT_HOT_DEALS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [offersRes, prodRes] = await Promise.all([
          customerApi.getOffers().catch(() => ({ data: {} })),
          customerApi.getProducts({ limit: 40 }).catch(() => ({ data: {} })),
        ]);

        const offersList =
          offersRes.data?.results ||
          offersRes.data?.result ||
          offersRes.data ||
          [];
        setLegacyOffers(Array.isArray(offersList) ? offersList : []);

        const prods =
          prodRes.data?.results ||
          prodRes.data?.result?.items ||
          prodRes.data?.result ||
          prodRes.data ||
          [];

        const MEAT_KEYWORDS = [
          "chicken",
          "fish",
          "mutton",
          "meat",
          "beef",
          "prawn",
          "seafood",
          "steak",
          "curry cut",
        ];

        const discountedFromBackend = (Array.isArray(prods) ? prods : [])
          .filter((p) => {
            const orig = Number(p.originalPrice || p.price || 0);
            const curr = Number(p.salePrice || p.price || 0);
            const name = (p.name || "").toLowerCase();
            const cat = (p.category?.name || p.category || "").toLowerCase();
            return (
              orig > curr &&
              MEAT_KEYWORDS.some((kw) => name.includes(kw) || cat.includes(kw))
            );
          })
          .map((p) => {
            const orig = Number(p.originalPrice || p.price || 0);
            const curr = Number(p.salePrice || p.price || 0);
            const pct = Math.round(((orig - curr) / orig) * 100);
            return {
              id: p._id || p.id,
              _id: p._id || p.id,
              name: p.name,
              weight: p.weight || "500 g",
              price: curr,
              originalPrice: orig,
              discount: `${pct}% OFF`,
              image: p.mainImage || p.image || DEFAULT_HOT_DEALS[0].image,
            };
          });

        // Merge backend discounted products with DEFAULT_HOT_DEALS
        const merged = [...discountedFromBackend];
        const existingNames = new Set(merged.map((m) => m.name.toLowerCase()));
        for (const item of DEFAULT_HOT_DEALS) {
          if (!existingNames.has(item.name.toLowerCase())) {
            merged.push(item);
            existingNames.add(item.name.toLowerCase());
          }
        }
        setHotDeals(merged);
      } catch (e) {
        console.error("Failed to load offers", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getQuantity = (product) => {
    const pId = String(product?.id || product?._id || "");
    const item = (cart || []).find(
      (c) => String(c.id || c._id) === pId
    );
    return item ? Number(item.quantity) || 0 : 0;
  };

  const handleCardClick = (product) => {
    if (openProduct) {
      openProduct(product);
    } else {
      navigate(`/product/${product.id || product._id}`);
    }
  };

  const handleWishlistClick = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    const wishlisted = isInWishlist(product.id || product._id);
    toast(wishlisted ? "Removed from wishlist" : "Added to wishlist");
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      ...product,
      id: product.id || product._id,
      _id: product.id || product._id,
    });
    toast.success(`${product.name} added to cart!`);
  };

  const handleIncrement = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id || product._id, 1);
  };

  const handleDecrement = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const qty = getQuantity(product);
    if (qty <= 1) {
      removeFromCart(product.id || product._id);
    } else {
      updateQuantity(product.id || product._id, -1);
    }
  };

  const styleToBg = {
    blue: "bg-black ",
    green: "bg-primary",
    orange: "bg-orange-500",
  };

  const iconFor = (icon) => {
    if (icon === "clock") return <Clock className="text-white" size={32} />;
    if (icon === "tag") return <Tag className="text-white" size={32} />;
    return <Sparkles className="text-white" size={32} />;
  };

  const sortedLegacyOffers = [...legacyOffers]
    .filter((o) => o.status === "active")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 md:px-[50px] pt-[104px] md:pt-0 mt-0 md:mt-24 pb-8 md:py-8">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8 text-left"
      >
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-primary mb-1.5 sm:mb-2">
          Best Offers for You
        </h1>
        <p className="text-gray-500 text-sm md:text-lg font-medium">
          Grab these exclusive deals before they expire!
        </p>
      </motion.div>

      {/* ─── Hot Deals Product Cards Section ────────────────────────── */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EF131F]/10 flex items-center justify-center text-[#EF131F]">
              <Flame size={20} className="fill-[#EF131F] sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Hot Deals Products
              </h2>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#1A1A1A] border border-[#FDE68A]">
            <Sparkles size={13} className="text-[#B45309]" /> {hotDeals.length} Deals Active
          </span>
        </div>

        {/* Responsive Grid for Hot Deals Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 min-[1800px]:grid-cols-8 gap-2.5 sm:gap-3.5 md:gap-4">
          {hotDeals.map((product) => {
            const isWishlisted = isInWishlist(product.id || product._id);
            const quantity = getQuantity(product);

            return (
              <div
                key={product.id || product._id}
                onClick={() => handleCardClick(product)}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group select-none hover:border-[#FDCE04]"
              >
                {/* Image Container with Badges */}
                <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
                  <img
                    src={applyCloudinaryTransform(product.image)}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Hot Deal Red Badge */}
                  <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 bg-[#C81017] text-white text-[8.5px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-xs tracking-wide">
                    Hot Deal
                  </span>

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={(e) => handleWishlistClick(e, product)}
                    className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-xs flex items-center justify-center transition-colors border-0 cursor-pointer shadow-xs"
                  >
                    <Heart
                      size={11}
                      className={`sm:w-[13px] sm:h-[13px] transition-colors ${
                        isWishlisted
                          ? "fill-rose-500 text-rose-500"
                          : "text-white"
                      }`}
                    />
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-2 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5 sm:gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-[11.5px] sm:text-[14px] leading-snug line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-[9.5px] sm:text-xs text-slate-400 font-medium mt-0.5">
                      {product.weight || "500 g"}
                    </p>
                  </div>

                  {/* Price and Discount Badge Row */}
                  <div className="flex items-center gap-1 sm:gap-2 mt-auto pt-0.5 sm:pt-1">
                    {product.originalPrice && (
                      <span className="text-[10px] sm:text-xs md:text-sm text-slate-400 line-through font-medium">
                        ₹{product.originalPrice}
                      </span>
                    )}
                    <span className="text-[13px] sm:text-base md:text-lg font-black text-slate-900">
                      ₹{product.price}
                    </span>
                    <span className="ml-auto bg-[#EF131F] text-white text-[8px] sm:text-[10.5px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-xs tracking-tight">
                      {product.discount || "25% OFF"}
                    </span>
                  </div>

                  {/* Add to Cart / Quantity Stepper Button */}
                  <div className="pt-0.5 sm:pt-1">
                    {quantity > 0 ? (
                      <div
                        style={{ borderColor: "#FDCE04" }}
                        className="flex items-center bg-white border border-[#FDCE04] rounded-lg sm:rounded-xl p-0.5 justify-between h-6.5 sm:h-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleDecrement(e, product)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent font-bold"
                        >
                          <Minus size={10} strokeWidth={3} />
                        </button>
                        <span className="font-bold text-[11px] sm:text-xs text-[#1A1A1A] px-1">
                          {quantity}
                        </span>
                        <button
                          onClick={(e) => handleIncrement(e, product)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent font-bold"
                        >
                          <Plus size={10} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, product)}
                        className="w-full h-6.5 sm:h-8 py-0.5 sm:py-1 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98 border-0"
                      >
                        <ShoppingCart size={11} strokeWidth={2.4} className="text-[#1A1A1A]" />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 text-center text-slate-400 text-sm font-bold">
          Loading offers...
        </div>
      )}

      {/* Legacy offer cards (promo codes / first-order type) */}
      {!isLoading && sortedLegacyOffers.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-black text-slate-800 mb-4">
            Coupon deals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLegacyOffers.map((offer) => (
              <div
                key={offer._id}
                className="relative overflow-hidden rounded-3xl group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div
                  className={`${
                    styleToBg[offer.style] || styleToBg.blue
                  } p-8 h-full flex flex-col justify-between text-white relative z-10`}
                >
                  <div>
                    <div className="bg-white/20 p-3 rounded-2xl w-fit mb-6 backdrop-blur-md">
                      {iconFor(offer.icon)}
                    </div>
                    <h2 className="text-3xl font-black mb-3 leading-tight">
                      {offer.title}
                    </h2>
                    <p className="text-white/80 font-medium mb-8 leading-relaxed">
                      {offer.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col items-end gap-2">
                      <div className="bg-black/20 px-4 py-2 rounded-xl font-mono font-bold tracking-widest text-lg">
                        {offer.code || "AUTO-APPLIED"}
                      </div>
                      {offer.appliesOnOrderNumber && (
                        <span className="text-xs font-bold text-white/80">
                          Applies on order #{offer.appliesOnOrderNumber}
                        </span>
                      )}
                    </div>
                    <button className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-primary transform transition-transform group-hover:rotate-[-45deg]">
                      <ArrowRight size={24} />
                    </button>
                  </div>
                </div>
                <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && sortedLegacyOffers.length === 0 && (
        <div className="mt-10 p-6 sm:p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">
            More Coupons Coming Soon
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
            Enjoy our daily live hot deals above while our team curates fresh promo coupon codes for you.
          </p>
        </div>
      )}
    </div>
  );
};

export default OffersPage;
