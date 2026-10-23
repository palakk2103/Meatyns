const ATTRIBUTION_STORAGE_KEY = "meatyns_attribution";
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Parses attribution parameters from current URL and persists them with TTL
 */
export function captureAttributionSignals() {
  if (typeof window === "undefined") return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get("utm_source");
    const utmMedium = urlParams.get("utm_medium");
    const utmCampaign = urlParams.get("utm_campaign");
    const utmContent = urlParams.get("utm_content");
    const utmTerm = urlParams.get("utm_term");
    const fbclid = urlParams.get("fbclid");

    // Only update if at least one attribution signal is present in URL
    if (utmSource || utmMedium || utmCampaign || fbclid) {
      let fbc = null;
      if (fbclid) {
        fbc = `fb.1.${Date.now()}.${fbclid}`;
      }

      // Read or generate _fbp cookie if not present
      let fbp = getCookie("_fbp");
      if (!fbp) {
        fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 8999999999 + 1000000000)}`;
        setCookie("_fbp", fbp, 90);
      }
      if (fbc) {
        setCookie("_fbc", fbc, 90);
      }

      const isMeta =
        Boolean(fbclid) ||
        ["facebook", "meta", "instagram", "fb", "ig"].includes(
          String(utmSource || "").toLowerCase()
        );

      const attributionData = {
        source: isMeta ? "meta" : utmSource ? utmSource.toLowerCase() : "direct",
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
        utmTerm: utmTerm || null,
        fbclid: fbclid || null,
        fbc,
        fbp,
        landingUrl: window.location.href,
        referrer: document.referrer || null,
        capturedAt: Date.now(),
      };

      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attributionData));
      return attributionData;
    }

    return getStoredAttribution();
  } catch (err) {
    console.warn("captureAttributionSignals warning:", err);
    return null;
  }
}

/**
 * Retrieves valid persisted attribution data
 */
export function getStoredAttribution() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.capturedAt) return null;

    // Check expiration
    if (Date.now() - parsed.capturedAt > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
      return null;
    }

    // Refresh cookies if present
    if (!parsed.fbp) {
      parsed.fbp = getCookie("_fbp");
    }
    if (!parsed.fbc) {
      parsed.fbc = getCookie("_fbc");
    }

    return parsed;
  } catch (err) {
    return null;
  }
}

function setCookie(name, value, days) {
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {}
}

function getCookie(name) {
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch (e) {}
  return null;
}
