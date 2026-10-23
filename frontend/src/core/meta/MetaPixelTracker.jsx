import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { initMetaPixel, trackPageView } from "./pixelService";
import { captureAttributionSignals } from "./attribution";

const MetaPixelTracker = () => {
  const location = useLocation();
  const lastTrackedPath = useRef("");

  useEffect(() => {
    // Initialize Pixel on first mount
    initMetaPixel();
  }, []);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (lastTrackedPath.current === currentPath) return;
    lastTrackedPath.current = currentPath;

    // Capture attribution signals (UTMs, fbclid)
    captureAttributionSignals();

    // Only track PageViews on public/customer facing routes (skip admin/seller/delivery dashboards)
    const isInternalStaffRoute =
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/seller") ||
      location.pathname.startsWith("/delivery");

    if (!isInternalStaffRoute) {
      trackPageView();
    }
  }, [location]);

  return null;
};

export default MetaPixelTracker;
