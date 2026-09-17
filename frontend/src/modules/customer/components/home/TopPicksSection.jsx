import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Plus, Minus } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useProductDetail } from "../../context/ProductDetailContext";
import { toast } from "sonner";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

// 4 Curated Top Picks using real product IDs from database
const DEFAULT_TOP_PICKS = [
  {
    id: "6a8740c900d8659486c09570",
    _id: "6a8740c900d8659486c09570",
    name: "Rohu Fish (Curry Cut)",
    weight: "500 g",
    price: 199,
    originalPrice: 249,
    discount: "20% OFF",
    image:
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=500",
  },
  {
    id: "6a87424100d8659486c097a3",
    _id: "6a87424100d8659486c097a3",
    name: "Chicken Thigh",
    weight: "500 g",
    price: 129,
    originalPrice: 159,
    discount: "19% OFF",
    image:
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=500",
  },
  {
    id: "6a86da7a00d8659486c08fcd",
    _id: "6a86da7a00d8659486c08fcd",
    name: "Mutton Keema",
    weight: "450 g",
    price: 359,
    originalPrice: 399,
    discount: "10% OFF",
    image:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=500",
  },
  {
    id: "6a86db0c00d8659486c09034",
    _id: "6a86db0c00d8659486c09034",
    name: "Fresh Atlantic Salmon Steaks",
    weight: "300 g",
    price: 529,
    originalPrice: 599,
    discount: "12% OFF",
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=500",
  },
];

const TopPicksSection = ({ products = [] }) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openProduct } = useProductDetail();

  // Prioritize meat & fish products matching the store identity or fallback to curated screenshot items
  const displayItems = React.useMemo(() => {
    const MEAT_KEYWORDS = ["fish", "chicken", "mutton", "meat", "beef", "prawn", "seafood", "keema", "surmai", "rohu"];
    const validFromBackend = (products || [])
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const cat = (p.category?.name || p.category || "").toLowerCase();
        return MEAT_KEYWORDS.some((kw) => name.includes(kw) || cat.includes(kw));
      })
      .map((p) => {
        const orig = Number(p.originalPrice || 0);
        const curr = Number(p.salePrice || p.price || 0);
        const effectiveOrig = orig > curr ? orig : Math.round(curr * 1.25);
        const pct = Math.round(((effectiveOrig - curr) / effectiveOrig) * 100);
        return {
          id: p._id || p.id,
          _id: p._id || p.id,
          name: p.name,
          weight: p.weight || "500 g",
          price: curr,
          originalPrice: effectiveOrig,
          discount: `${pct}% OFF`,
          image: p.mainImage || p.image || DEFAULT_TOP_PICKS[0].image,
        };
      });

    if (validFromBackend.length >= 4) {
      return validFromBackend.slice(0, 4);
    }

    const merged = [...validFromBackend];
    const existingNames = new Set(merged.map((m) => m.name.toLowerCase()));
    for (const item of DEFAULT_TOP_PICKS) {
      if (merged.length >= 4) break;
      if (!existingNames.has(item.name.toLowerCase())) {
        merged.push(item);
        existingNames.add(item.name.toLowerCase());
      }
    }
    return merged.slice(0, 4);
  }, [products]);

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

  return (
    <section className="w-full mb-6 sm:mb-8 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FDCE04]/20 flex items-center justify-center text-[#1A1A1A] font-bold">
            <span className="text-base sm:text-lg leading-none">★</span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Top Picks for You
          </h2>
        </div>

        <button
          onClick={() => navigate("/category/all")}
          className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors border-0 bg-transparent p-0"
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
              {/* Image Container with Wishlist */}
              <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
                <img
                  src={applyCloudinaryTransform(product.image)}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

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
                    {product.discount || "20% OFF"}
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
    </section>
  );
};

export default React.memo(TopPicksSection);
