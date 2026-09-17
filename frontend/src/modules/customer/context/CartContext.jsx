import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { customerApi } from "../services/customerApi";
import { useAuth } from "../../../core/context/AuthContext";
import { getJSON, setJSON, remove as removeStorage, STORAGE_KEYS } from "@core/utils/storage";

const CartContext = createContext();

const loadGuestCart = () => {
  const parsed = getJSON(STORAGE_KEYS.CART, []);
  if (!Array.isArray(parsed)) {
    removeStorage(STORAGE_KEYS.CART);
    return [];
  }
  return parsed;
};

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(() => loadGuestCart());

  const [loading, setLoading] = useState(false);
  const pendingRequestsRef = React.useRef(0);
  const lsDebounceRef = useRef(null);

  // Clear cart locally when user logs out is handled by the useEffect dependency on isAuthenticated
  const normalizeBackendCart = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return items
      .filter((item) => Boolean(item?.productId))
      .map((item) => {
        const product = item.productId;
        const variantKey = String(item.variantSku || "").trim();
        const { price, salePrice, variantName } = resolveVariantPricing(product, variantKey);
        const pId = String(product?._id || product?.id || "");
        return {
          ...product,
          id: pId,
          _id: pId,
          quantity: Number(item.quantity) || 1,
          variantSku: variantKey,
          variantName,
          price,
          salePrice,
          image: product?.mainImage || product?.image, // Handle mapping for frontend
        };
      });
  };

  const parseWeightToGramsOrUnits = (name) => {
    if (!name) return { value: 1, unit: "unit" };
    const cleanName = name.toLowerCase().trim();
    const match = cleanName.match(/^([\d.]+)\s*(kg|g|pack|packet|pc|pcs|unit|ltr|ml)?/);
    if (!match) return { value: 1, unit: "unit" };
    const value = parseFloat(match[1]) || 1;
    const unit = match[2] || "unit";
    if (unit === "kg") return { value: value * 1000, unit: "g" };
    if (unit === "ltr") return { value: value * 1000, unit: "ml" };
    return { value, unit };
  };

  const resolveVariantPricing = (product, variantSku = "") => {
    const normalizedKey = String(variantSku || "").trim();
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) {
      return {
        price: Number(product?.price || 0),
        salePrice: Number(product?.salePrice || 0),
        variantName: "",
      };
    }

    const hit = variants.find(
      (v) =>
        String(v?.sku || "").trim() === normalizedKey ||
        String(v?.name || "").trim() === normalizedKey,
    );

    let price = Number(hit?.price || product?.price || 0);
    let salePrice = Number(hit?.salePrice || 0);

    const baseVariant = variants[0];
    if (baseVariant && hit && baseVariant.sku !== hit.sku) {
      const basePrice = Number(baseVariant.price || product?.price || 0);
      const baseSalePrice = Number(baseVariant.salePrice || product?.salePrice || 0);
      
      if (price === Number(product?.price || 0) || price === 0) {
        const baseW = parseWeightToGramsOrUnits(baseVariant.name);
        const selW = parseWeightToGramsOrUnits(hit.name);
        if (baseW.unit === selW.unit && baseW.value > 0) {
          const ratio = selW.value / baseW.value;
          price = Math.round(basePrice * ratio);
          if (baseSalePrice > 0) {
            salePrice = Math.round(baseSalePrice * ratio);
          } else {
            salePrice = 0;
          }
        }
      }
    }

    return {
      price,
      salePrice,
      variantName: String(hit?.name || "").trim(),
    };
  };

  const syncCart = (backendItems) => {
    // Only update state from backend if no more pending optimistic updates
    if (pendingRequestsRef.current === 0) {
      setCart(normalizeBackendCart(backendItems));
    }
  };

  const fetchCart = async () => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await customerApi.getCart();
        setCart(normalizeBackendCart(response.data?.result?.items));
      } catch (error) {
        console.error("Failed to fetch cart from backend", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch cart from backend on mount or authentication change
  useEffect(() => {
    if (isAuthenticated) {
      // Cancel any pending guest-mode write that could otherwise overwrite
      // the authenticated state with stale guest data after login.
      clearTimeout(lsDebounceRef.current);
      // The legacy guest cart is no longer authoritative for this user; drop
      // it so a future logout doesn't resurface another account's items.
      removeStorage(STORAGE_KEYS.CART);
      fetchCart();
    } else {
      setCart(loadGuestCart());
    }
  }, [isAuthenticated]);

  // Save local cart to localStorage (fallback/guest mode) — debounced to 300 ms
  useEffect(() => {
    if (isAuthenticated) return;           // backend is source of truth

    clearTimeout(lsDebounceRef.current);
    lsDebounceRef.current = setTimeout(() => {
      setJSON(STORAGE_KEYS.CART, cart);
    }, 300);

    return () => {
      if (isAuthenticated) return;
      // Flush on unmount — no data loss
      clearTimeout(lsDebounceRef.current);
      setJSON(STORAGE_KEYS.CART, cart);
    };
  }, [cart, isAuthenticated]);

  const addToCart = async (product) => {
    const variantSku = String(product?.variantSku || product?.variantName || "").trim();
    const id = String(product?.id || product?._id || "").trim();
    if (!id) return;
    const key = `${id}::${variantSku || ""}`;
    const { price, salePrice, variantName } = resolveVariantPricing(product, variantSku);

    // Optimistic UI update for instant feedback
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          `${item.id || item._id}::${String(item.variantSku || "").trim()}` === key ||
          (!variantSku && String(item.id || item._id) === id),
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          id,
          _id: id,
          variantSku,
          variantName,
          price,
          salePrice,
          quantity: 1,
          image: product?.image || product?.mainImage,
        },
      ];
    });

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.addToCart({
          productId: id,
          variantSku,
          quantity: 1,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data?.result?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error adding to cart on backend", error);
        // Re-fetch entire cart to ensure consistency on error
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const removeFromCart = async (productId, variantSku = "") => {
    const pId = String(productId || "").trim();
    const normalizedVariantSku = String(variantSku || "").trim();
    const key = `${pId}::${normalizedVariantSku || ""}`;

    // Optimistic update
    setCart((prev) =>
      prev.filter((item) => {
        if (normalizedVariantSku) {
          return `${item.id || item._id}::${String(item.variantSku || "").trim()}` !== key;
        }
        return String(item.id || item._id) !== pId;
      }),
    );

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.removeFromCart(
          pId,
          normalizedVariantSku,
        );
        pendingRequestsRef.current -= 1;
        await syncCart(response.data?.result?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error removing from cart on backend", error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const updateQuantity = async (productId, deltaOrTarget, variantSku = "") => {
    const pId = String(productId || "").trim();
    const normalizedVariantSku = String(variantSku || "").trim();
    const key = `${pId}::${normalizedVariantSku || ""}`;
    const currentItem = cart.find(
      (item) =>
        `${item.id || item._id}::${String(item.variantSku || "").trim()}` === key ||
        (!normalizedVariantSku && String(item.id || item._id) === pId),
    );
    if (!currentItem) return;

    const actualVariantSku = currentItem.variantSku || normalizedVariantSku;
    const itemKey = `${pId}::${String(actualVariantSku || "").trim()}`;

    // Support both delta (+1, -1) and direct target quantity (e.g. qty + 1 from components passing absolute quantity)
    let newQty;
    if (deltaOrTarget === 1 || deltaOrTarget === -1) {
      newQty = Math.max(0, (Number(currentItem.quantity) || 0) + deltaOrTarget);
    } else {
      newQty = Math.max(0, Number(deltaOrTarget) || 0);
    }

    if (newQty === 0) {
      removeFromCart(pId, actualVariantSku);
      return;
    }

    // Optimistic update
    setCart((prev) =>
      prev.map((item) => {
        if (
          `${item.id || item._id}::${String(item.variantSku || "").trim()}` === itemKey ||
          (!actualVariantSku && String(item.id || item._id) === pId)
        ) {
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.updateCartQuantity({
          productId: pId,
          quantity: newQty,
          variantSku: actualVariantSku,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data?.result?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error updating quantity on backend", error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await customerApi.clearCart();
        setCart([]);
      } catch (error) {
        console.error("Error clearing cart on backend", error);
      }
    } else {
      setCart([]);
    }
  };

  const cartTotal = cart.reduce((total, item) => {
    const unit =
      Number(item.salePrice || 0) > 0 && Number(item.salePrice) < Number(item.price || 0)
        ? Number(item.salePrice)
        : Number(item.price || 0);
    return total + unit * Number(item.quantity || 0);
  }, 0);
  const cartCount = cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const cartValue = useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    loading,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cart, cartTotal, cartCount, loading]);

  return (
    <CartContext.Provider value={cartValue}>
      {children}
    </CartContext.Provider>
  );
};
