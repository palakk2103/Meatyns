import React from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Heart, ShoppingCart, Plus, Minus } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useProductDetail } from "../../context/ProductDetailContext";
import { toast } from "sonner";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

// 4 Curated Hot Deals directly matching reference screenshot
export const DEFAULT_HOT_DEALS = [
  {
    id: "deal-chicken-breast",
    _id: "deal-chicken-breast",
    name: "Chicken Breast (Boneless)",
    weight: "500 g",
    price: 149,
    originalPrice: 199,
    discount: "25% OFF",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=500",
  },
  {
    id: "deal-salmon-fish",
    _id: "deal-salmon-fish",
    name: "Salmon Fish (Premium)",
    weight: "500 g",
    price: 449,
    originalPrice: 599,
    discount: "25% OFF",
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=500",
  },
  {
    id: "deal-mutton-curry-cut",
    _id: "deal-mutton-curry-cut",
    name: "Mutton Curry Cut",
    weight: "500 g",
    price: 349,
    originalPrice: 449,
    discount: "22% OFF",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=500",
  },
  {
    id: "deal-tiger-prawns",
    _id: "deal-tiger-prawns",
    name: "Fresh Tiger Prawns",
    weight: "500 g",
    price: 299,
    originalPrice: 399,
    discount: "25% OFF",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=500",
  },
];

const HotDealsSection = ({ products = [] }) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openProduct } = useProductDetail();

  // Merge real backend products if they have discounts, or fallback to curated defaults
  const displayItems = React.useMemo(() => {
    const MEAT_KEYWORDS = ["chicken", "fish", "mutton", "meat", "beef", "prawn", "seafood", "steak", "curry cut"];
    const discountedFromBackend = (products || [])
      .filter((p) => {
        const orig = Number(p.originalPrice || p.price || 0);
        const curr = Number(p.salePrice || p.price || 0);
        const name = (p.name || "").toLowerCase();
        const cat = (p.category?.name || p.category || "").toLowerCase();
        return orig > curr && MEAT_KEYWORDS.some((kw) => name.includes(kw) || cat.includes(kw));
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

    if (discountedFromBackend.length >= 4) {
      return discountedFromBackend.slice(0, 4);
    }

    // Merge backend with curated items to guarantee exactly 4 beautiful cards
    const merged = [...discountedFromBackend];
    const existingNames = new Set(merged.map((m) => m.name.toLowerCase()));
    for (const item of DEFAULT_HOT_DEALS) {
      if (merged.length >= 4) break;
      if (!existingNames.has(item.name.toLowerCase())) {
        merged.push(item);
        existingNames.add(item.name.toLowerCase());
      }
    }
    return merged.slice(0, 4);
  }, [products]);

  const getQuantity = (product) => {
    const item = (cart || []).find(
      (c) => (c.id || c._id) === (product.id || product._id)
    );
    return item ? item.quantity : 0;
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
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleIncrement = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const qty = getQuantity(product);
    updateQuantity(product.id || product._id, qty + 1);
  };

  const handleDecrement = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const qty = getQuantity(product);
    if (qty === 1) {
      removeFromCart(product.id || product._id);
    } else {
      updateQuantity(product.id || product._id, qty - 1);
    }
  };

  return (
    <section className="w-full mb-6 sm:mb-8 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#6B111F]/10 flex items-center justify-center text-[#6B111F]">
            <Flame size={18} className="fill-[#6B111F] sm:w-5 sm:h-5" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#6B111F] tracking-tight">
            Hot Deals
          </h2>
        </div>

        <button
          onClick={() => navigate("/offers")}
          className="text-xs sm:text-sm font-bold text-[#6B111F] hover:opacity-80 flex items-center gap-1 cursor-pointer transition-opacity border-0 bg-transparent p-0"
        >
          <span>View All</span>
          <span className="text-sm font-bold">&rarr;</span>
        </button>
      </div>

      {/* Single Row Layout with horizontal scroll */}
      <div className="flex items-stretch gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-0.5">
        {displayItems.map((product) => {
          const isWishlisted = isInWishlist(product.id || product._id);
          const quantity = getQuantity(product);

          return (
            <div
              key={product.id || product._id}
              onClick={() => handleCardClick(product)}
              className="w-[142px] sm:w-[195px] md:w-[215px] lg:flex-1 shrink-0 lg:shrink bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group"
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
                <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 bg-[#E52535] text-white text-[8.5px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-xs tracking-wide">
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
                  <h3 className="font-bold text-slate-900 text-[11.5px] sm:text-[14px] leading-snug line-clamp-1 group-hover:text-[#6B111F] transition-colors">
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
                  <span className="ml-auto bg-[#DC2626] text-white text-[8px] sm:text-[10.5px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-xs tracking-tight">
                    {product.discount || "25% OFF"}
                  </span>
                </div>

                {/* Add to Cart / Quantity Stepper Button */}
                <div className="pt-0.5 sm:pt-1">
                  {quantity > 0 ? (
                    <div
                      style={{ borderColor: "#6B111F" }}
                      className="flex items-center bg-white border border-[#6B111F] rounded-lg sm:rounded-xl p-0.5 justify-between h-6.5 sm:h-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleDecrement(e, product)}
                        className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#6B111F] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent"
                      >
                        <Minus size={10} strokeWidth={3} />
                      </button>
                      <span className="font-bold text-[11px] sm:text-xs text-[#6B111F] px-1">
                        {quantity}
                      </span>
                      <button
                        onClick={(e) => handleIncrement(e, product)}
                        className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#6B111F] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent"
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, product)}
                      className="w-full h-6.5 sm:h-8 py-0.5 sm:py-1 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#6B111F] hover:bg-[#8B1A2C] text-white text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98 border-0"
                    >
                      <ShoppingCart size={11} strokeWidth={2.2} />
                      <span>Add to Cart</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default React.memo(HotDealsSection);
