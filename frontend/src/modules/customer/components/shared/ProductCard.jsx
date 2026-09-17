import React from "react";
import { Link } from "react-router-dom";
import { Heart, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";

import { useProductDetail } from "../../context/ProductDetailContext";

const ProductCard = React.memo(
  ({ product, badge, className, compact = false, neutralBg = false, variant }) => {
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } =
      useWishlist();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { showToast } = useToast();
    const { animateAddToCart, animateRemoveFromCart } = useCartAnimation();

    const { openProduct } = useProductDetail();
    const [showHeartPopup, setShowHeartPopup] = React.useState(false);

    const imageRef = React.useRef(null);

    const defaultVariant = React.useMemo(() => {
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      if (variants.length === 0) return null;

      const displayed = Number(product?.price || 0);
      const displayedOriginal = Number(product?.originalPrice || 0);

      const matchesDisplayedPrice = (variant) => {
        const mrp = Number(variant?.price || 0);
        const sale = Number(variant?.salePrice || 0);
        const effective = sale > 0 && sale < mrp ? sale : mrp;

        if (Number.isFinite(displayedOriginal) && displayedOriginal > displayed) {
          // Try to match both (sale + original) when card shows a discount.
          if (effective === displayed && (mrp === displayedOriginal || displayedOriginal === 0)) {
            return true;
          }
        }

        return effective === displayed || mrp === displayed;
      };

      const picked = variants.find(matchesDisplayedPrice) || variants[0];
      const key = String(picked?.sku || picked?.name || "").trim();
      return {
        key,
        name: String(picked?.name || "").trim(),
      };
    }, [product]);

    const productId = String(product?.id || product?._id || "").trim();
    const variantKey = String(defaultVariant?.key || "").trim();
    const cartKey = `${productId}::${variantKey || ""}`;

    const cartItem = React.useMemo(
      () =>
        cart.find(
          (item) =>
            `${item.id || item._id}::${String(item.variantSku || "").trim()}` ===
            cartKey ||
            (!variantKey && String(item.id || item._id) === productId),
        ),
      [cart, cartKey, variantKey, productId],
    );
    const quantity = cartItem ? (Number(cartItem.quantity) || 0) : 0;
    const isWishlisted = isInWishlist(productId);
    const isStoreClosed = product?.isStoreOpen === false || product?.sellerId?.isStoreOpen === false;

    const handleProductClick = React.useCallback(
      (e) => {
        if (openProduct) {
          e.preventDefault();
          openProduct(product);
        }
      },
      [openProduct, product],
    );

    const toggleWishlist = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isWishlisted) {
          setShowHeartPopup(true);
          setTimeout(() => setShowHeartPopup(false), 1000);
        }

        toggleWishlistGlobal(product);
        showToast(
          isWishlisted
            ? `${product?.name} removed from wishlist`
            : `${product?.name} added to wishlist`,
          isWishlisted ? "info" : "success",
        );
      },
      [isWishlisted, toggleWishlistGlobal, product, showToast],
    );

    const handleAddToCart = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (imageRef.current) {
          animateAddToCart(
            imageRef.current.getBoundingClientRect(),
            product?.image || product?.mainImage,
          );
        }
        addToCart({
          ...product,
          id: productId,
          _id: productId,
          variantSku: variantKey,
          variantName: defaultVariant?.name || "",
        });
      },
      [animateAddToCart, product, addToCart, productId, variantKey, defaultVariant?.name],
    );

    const handleIncrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuantity(productId, 1, variantKey);
      },
      [updateQuantity, productId, variantKey],
    );

    const handleDecrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (quantity <= 1) {
          animateRemoveFromCart(product?.image || product?.mainImage);
          removeFromCart(productId, variantKey);
        } else {
          updateQuantity(productId, -1, variantKey);
        }
      },
      [
        quantity,
        animateRemoveFromCart,
        removeFromCart,
        updateQuantity,
        productId,
        variantKey,
        product?.image,
      ],
    );

    if (variant !== "legacy") {
      return (
        <div
          className={cn(
            "bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between group cursor-pointer w-full select-none",
            className
          )}
          onClick={handleProductClick}
        >
          {/* Product Image & Badges */}
          <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
            <img
              ref={imageRef}
              src={applyCloudinaryTransform(product.image || product.mainImage)}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Fresh Badge or Discount Badge */}
            {badge || product.discount || (product.originalPrice && product.originalPrice > product.price) ? (
              <span className="absolute top-1 sm:top-1.5 md:top-2 left-1 sm:left-1.5 md:left-2 bg-[#EF131F] text-white text-[7.5px] sm:text-[8px] md:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs">
                {badge || product.discount || `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`}
              </span>
            ) : (
              <span className="absolute top-1 sm:top-1.5 md:top-2 left-1 sm:left-1.5 md:left-2 bg-emerald-600 text-white text-[7.5px] sm:text-[8px] md:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs">
                Fresh
              </span>
            )}

            {/* Wishlist Heart */}
            <button
              type="button"
              onClick={toggleWishlist}
              className="absolute top-1 sm:top-1.5 md:top-2 right-1 sm:top-1.5 md:right-2 w-5.5 h-5.5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-rose-600 shadow-xs transition-colors border-0 cursor-pointer"
            >
              <Heart
                size={11}
                className={cn("sm:w-3 sm:h-3 md:w-3.5 md:h-3.5", isWishlisted ? "fill-rose-500 text-rose-500" : "")}
              />
            </button>
          </div>

          {/* Info Area */}
          <div className="p-1.5 sm:p-2 md:p-3 flex flex-col gap-1 md:gap-2 flex-1 justify-between">
            <div>
              <h4 className="text-[11.5px] sm:text-[12.5px] md:text-[13px] font-bold text-slate-800 line-clamp-1 leading-tight">
                {product.name}
              </h4>
              <span className="text-[9.5px] sm:text-[10.5px] md:text-[11px] text-slate-400 font-medium">
                {product.weight || "500 g"}
              </span>
            </div>

            <div>
              {/* Price */}
              <div className="flex items-baseline justify-between mb-1 md:mb-2">
                <div className="flex items-baseline gap-1 sm:gap-1.5">
                  <span className="text-[12.5px] sm:text-[13.5px] md:text-base font-bold text-slate-900">
                    ₹{product.price}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-[9.5px] sm:text-[10.5px] md:text-xs text-slate-400 line-through">
                      ₹{product.originalPrice}
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Cart Button or Quantity Selector */}
              {isStoreClosed ? (
                <button
                  disabled
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showToast("Shop is currently closed and not accepting orders");
                  }}
                  className="w-full h-7 sm:h-7.5 md:h-9 py-1 md:py-2 px-2 md:px-3 rounded-lg md:rounded-xl bg-slate-100 text-slate-400 text-[10px] sm:text-[11px] md:text-xs font-semibold cursor-not-allowed border-0"
                >
                  Store Closed
                </button>
              ) : quantity > 0 ? (
                <div
                  style={{ borderColor: "#FDCE04" }}
                  className="flex items-center bg-white border border-[#FDCE04] rounded-lg md:rounded-xl p-0.5 justify-between h-7 sm:h-7.5 md:h-9"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleDecrement}
                    className="w-5.5 h-5.5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent font-bold"
                  >
                    <Minus size={11} strokeWidth={3} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                  </button>
                  <span className="font-extrabold text-[10.5px] sm:text-[11.5px] md:text-xs text-[#1A1A1A]">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    className="w-5.5 h-5.5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent font-bold"
                  >
                    <Plus size={11} strokeWidth={3} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full h-7 sm:h-7.5 md:h-9 py-1 md:py-2 px-2 md:px-3 rounded-lg md:rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-[10px] sm:text-[11px] md:text-xs font-bold flex items-center justify-center gap-1 md:gap-2 transition-colors cursor-pointer shadow-xs active:scale-98 border-0"
                >
                  <ShoppingCart size={11} strokeWidth={2.4} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-[#1A1A1A]" />
                  <span>Add to Cart</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex-shrink-0 w-full rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.02]",
          compact
            ? "bg-white border-[1.5px] border-brand-50 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.08)]"
            : neutralBg
              ? "bg-white border border-slate-100 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.08)]"
              : "bg-primary/10 border border-primary/20",
          className,
        )}
        onClick={handleProductClick}>
        {/* Top Image Section */}
        <div className="relative">
          {/* Badge (Custom or Discount) */}
          {(badge ||
            product.discount ||
            product.originalPrice > product.price) && (
              <div
                className={cn(
                  "absolute z-10 bg-primary text-primary-foreground font-[900] rounded-md shadow-sm uppercase tracking-wider flex items-center justify-center",
                  compact
                    ? "top-2 left-2 px-1.5 py-0.5 text-[7px]"
                    : "top-2 left-2 px-1 py-0.5 text-[7px] sm:top-3 sm:left-3 sm:px-2 sm:py-1 sm:text-[9px]",
                )}>
                {badge ||
                  product.discount ||
                  `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`}
              </div>
            )}

          <button
            onClick={toggleWishlist}
            className={cn(
              "absolute z-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-white transition-all active:scale-90",
              compact
                ? "top-2 right-2 h-7 w-7"
                : "top-2 right-2 h-6.5 w-6.5 sm:top-3 sm:right-3 sm:h-8 sm:w-8",
            )}>
            <motion.div
              whileTap={{ scale: 0.8 }}
              animate={isWishlisted ? { scale: [1, 1.2, 1] } : {}}>
              <Heart
                size={compact ? 12 : 14}
                className={cn(
                  isWishlisted
                    ? "text-red-500 fill-current"
                    : "text-neutral-400",
                )}
              />
            </motion.div>
          </button>

          <AnimatePresence>
            {showHeartPopup && (
              <motion.div
                initial={{ scale: 0.5, opacity: 1, y: 0 }}
                animate={{ scale: 2, opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-3 right-3 z-50 pointer-events-none text-red-500">
                <Heart size={24} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "block w-full overflow-hidden flex items-center justify-center transition-transform duration-500 group-hover:scale-105 aspect-square",
              compact || neutralBg ? "bg-white/70" : "bg-white/50"
            )}>
            <img
              ref={imageRef}
              src={applyCloudinaryTransform(product.image)}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover mix-blend-multiply"
            />
          </div>
        </div>

        {/* Info Section */}
        <div
          className={cn(
            "flex flex-col flex-1",
            compact
              ? "p-2 pt-1 gap-0"
              : "bg-white/40 p-1.5 pt-2 sm:p-3 sm:pt-4 gap-0.5",
          )}>
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "border-2 rounded-full flex items-center justify-center",
                compact ? "h-2.5 w-2.5" : "h-2.5 w-2.5 sm:h-3.5 sm:w-3.5",
              )}
              style={{ borderColor: "#EF131F" }}>
              <div
                className={cn(
                  "rounded-full",
                  compact ? "h-0.5 w-0.5" : "h-1 w-1",
                )}
                style={{ backgroundColor: "#EF131F" }}
              />
            </div>
            {product.weight && (
              <div
                className={cn(
                  "bg-brand-50 text-brand-600 font-bold rounded px-1.5 py-0 tracking-wide",
                  compact ? "text-[8px]" : "text-[8px] sm:text-[9px]",
                )}>
                {product.weight}
              </div>
            )}
          </div>

          <div className={cn(compact ? "h-8" : "h-8 sm:h-9")}>
            <h4
              className={cn(
                "font-[600] text-[#1A1A1A] leading-tight line-clamp-2",
                compact ? "text-[10.5px]" : "text-[12px] sm:text-[13px]",
              )}>
              {product.name}
            </h4>
          </div>

          {/* Delivery Time & Unit info */}
          <div className="flex items-center gap-1 text-gray-500 mt-0.5 mb-1 sm:gap-1.5 sm:mt-1 sm:mb-2">
            <Clock size={compact ? 9 : 10} className="text-[#D97706]" />
            <span
              className={cn(
                "font-semibold",
                compact ? "text-[8px]" : "text-[9px] sm:text-[10px]",
              )}>
              {product.deliveryTime || "8-12 mins"}
            </span>
          </div>

          {/* Price Row / ADD Button Combination for compact */}
          <div className="mt-auto flex items-center justify-between gap-1">
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-[1000] text-[#1A1A1A]",
                  compact ? "text-[11px]" : "text-[13px] sm:text-sm",
                )}>
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span
                  className={cn(
                    "font-medium text-gray-400 line-through leading-none",
                    compact ? "text-[8px]" : "text-[9px] sm:text-[10px]",
                  )}>
                  ₹{product.originalPrice}
                </span>
              )}
            </div>

            {/* ADD Button / Quantity Selector (Always in price row) */}
            <div className="flex">
              {isStoreClosed ? (
                <button
                  disabled
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showToast("Shop is currently closed and not accepting orders");
                  }}
                  className={cn(
                    "bg-slate-100 border-[1.5px] border-slate-300 text-slate-400 rounded-lg font-black tracking-wide leading-none cursor-not-allowed uppercase",
                    compact
                      ? "px-2 py-1 text-[9px]"
                      : "px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-[11px]",
                  )}>
                  Closed
                </button>
              ) : quantity > 0 ? (
                <div
                  style={{ borderColor: "#FDCE04" }}
                  className={cn(
                    "flex items-center bg-white border-[1.5px] rounded-lg p-0.5 justify-between",
                    compact ? "min-w-[60px]" : "min-w-[68px] sm:min-w-[90px] md:min-w-[80px]",
                  )}>
                  <button
                    onClick={handleDecrement}
                    style={{ color: "#1A1A1A" }}
                    className="p-0.5 px-0.5 active:scale-90 transition-transform sm:p-1 sm:px-1">
                    <Minus size={compact ? 10 : 12} strokeWidth={3.5} />
                  </button>
                  <span
                    style={{ color: "#1A1A1A" }}
                    className={cn(
                      "font-black",
                      compact ? "text-[10px]" : "text-[11px] sm:text-[13px] md:text-xs",
                    )}>
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    style={{ color: "#1A1A1A" }}
                    className="p-0.5 px-0.5 active:scale-90 transition-transform sm:p-1 sm:px-1">
                    <Plus size={compact ? 10 : 12} strokeWidth={3.5} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  style={{ backgroundColor: "#FDCE04", borderColor: "#FDCE04" }}
                  className={cn(
                    "text-[#1A1A1A] border-[1.5px] rounded-lg font-bold shadow-xs hover:bg-[#E5B800] transition-all tracking-wide leading-none active:scale-95 cursor-pointer flex items-center justify-center gap-1",
                    compact
                      ? "px-2 py-1 text-[9.5px]"
                      : "px-3 py-1.5 text-[10.5px] sm:px-4 sm:py-2 sm:text-xs",
                  )}>
                  <ShoppingCart size={11} strokeWidth={2.4} className="text-[#1A1A1A]" />
                  <span>Add to Cart</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ProductCard;
