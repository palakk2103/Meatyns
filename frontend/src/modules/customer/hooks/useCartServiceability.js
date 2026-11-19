import { useEffect, useMemo, useState } from "react";
import { customerApi } from "../services/customerApi";
import { useAuth } from "../../../core/context/AuthContext";
import { useCart } from "../context/CartContext";

/**
 * Re-validates the logged-in customer's cart against a delivery location
 * (lat/lng) whenever the location or the cart contents change. Uses the
 * backend's single-seller serviceability rule (same one checkout enforces), so
 * a stale cart from another location surfaces here, before checkout.
 *
 * Returns the items that can't be delivered there; empty when everything is
 * serviceable (or when the check can't run — checkout still enforces it).
 */
export function useCartServiceability(lat, lng, enabled = true) {
  const { isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();
  const [unavailable, setUnavailable] = useState([]);

  const cartKey = useMemo(
    () =>
      cart
        .map((i) => `${i.id || i._id}::${String(i.variantSku || "").trim()}`)
        .sort()
        .join("|"),
    [cart],
  );

  useEffect(() => {
    const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    if (!enabled || !isAuthenticated || !hasCoords || !cartKey) {
      setUnavailable([]);
      return undefined;
    }
    let cancelled = false;
    customerApi
      .getCartServiceability(Number(lat), Number(lng))
      .then((res) => {
        if (cancelled) return;
        setUnavailable(res.data?.result?.unavailableItems || []);
        // The server swapped items to the same product at the outlet serving
        // this location; reload the cart so ids/prices match the new outlet.
        if (Number(res.data?.result?.remappedCount || 0) > 0 && typeof refreshCart === "function") {
          refreshCart({ fresh: true });
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailable([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, lat, lng, cartKey]);

  // Drop entries already removed locally so the notice updates instantly.
  return useMemo(
    () =>
      unavailable.filter((u) =>
        cart.some(
          (c) =>
            String(c.id || c._id) === String(u.productId) &&
            String(c.variantSku || "").trim() === String(u.variantSku || "").trim(),
        ),
      ),
    [unavailable, cart],
  );
}

export default useCartServiceability;
