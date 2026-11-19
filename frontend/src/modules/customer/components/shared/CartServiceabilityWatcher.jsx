import { useEffect, useRef } from "react";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLocation as useAppLocation } from "../../context/LocationContext";
import { useCartServiceability } from "../../hooks/useCartServiceability";

const TOAST_ID = "cart-unavailable-for-location";

/**
 * Renders nothing. When the delivery location changes (or the cart changes)
 * and some cart items can't be delivered there, shows a one-time toast with a
 * shortcut to the cart. The cart and checkout pages already show the full
 * notice, so the watcher stays quiet there.
 */
const CartServiceabilityWatcher = () => {
  const { pathname } = useRouterLocation();
  const navigate = useNavigate();
  const { currentLocation, hasRealLocation } = useAppLocation();
  const onCartFlow = pathname === "/cart" || pathname.startsWith("/checkout");
  // Never validate (and remap) the cart against the hardcoded default area.
  const unavailable = useCartServiceability(
    currentLocation?.latitude,
    currentLocation?.longitude,
    !onCartFlow && hasRealLocation,
  );
  const lastKeyRef = useRef("");

  useEffect(() => {
    const key = unavailable.map((u) => `${u.productId}::${u.variantSku || ""}`).sort().join("|");
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (!unavailable.length) {
      toast.dismiss(TOAST_ID);
      return;
    }
    const first = unavailable[0].name;
    const message =
      unavailable.length === 1
        ? `${first} isn't available at this location`
        : `${first} and ${unavailable.length - 1} more item(s) aren't available at this location`;
    toast.warning(message, {
      id: TOAST_ID,
      position: "bottom-center",
      duration: 8000,
      action: { label: "View cart", onClick: () => navigate("/cart") },
    });
  }, [unavailable, navigate]);

  return null;
};

export default CartServiceabilityWatcher;
