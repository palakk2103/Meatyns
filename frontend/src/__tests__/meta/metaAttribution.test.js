import {
  captureAttributionSignals,
  getStoredAttribution,
} from "../../core/meta/attribution.js";

describe("Frontend Meta Attribution Engine", () => {
  let mockStore = {};

  beforeAll(() => {
    const mockLocalStorage = {
      getItem: (key) => mockStore[key] || null,
      setItem: (key, val) => {
        mockStore[key] = String(val);
      },
      removeItem: (key) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    global.localStorage = mockLocalStorage;
    global.window = {
      location: new URL("https://meatyns.com/"),
      localStorage: mockLocalStorage,
    };
    global.document = {
      referrer: "https://facebook.com",
      cookie: "",
    };
  });

  beforeEach(() => {
    mockStore = {};
    global.window.location = new URL("https://meatyns.com/");
    global.document.cookie = "";
  });

  it("should return null when no attribution signals are in URL or storage", () => {
    expect(getStoredAttribution()).toBeNull();
  });

  it("should capture and persist Meta attribution signals from URL query parameters", () => {
    global.window.location = new URL(
      "https://meatyns.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=fresh_mutton&fbclid=IwAR123456789"
    );

    const attribution = captureAttributionSignals();
    expect(attribution).not.toBeNull();
    expect(attribution.source).toBe("meta");
    expect(attribution.utmSource).toBe("facebook");
    expect(attribution.utmCampaign).toBe("fresh_mutton");
    expect(attribution.fbclid).toBe("IwAR123456789");
    expect(attribution.fbc).toMatch(/^fb\.1\.\d+\.IwAR123456789$/);

    // Verify localStorage persistence
    const stored = getStoredAttribution();
    expect(stored).not.toBeNull();
    expect(stored.source).toBe("meta");
    expect(stored.fbclid).toBe("IwAR123456789");
  });

  it("should correctly categorize non-Meta UTMs as their respective source", () => {
    global.window.location = new URL(
      "https://meatyns.com/?utm_source=newsletter&utm_medium=email&utm_campaign=welcome_discount"
    );

    const attribution = captureAttributionSignals();
    expect(attribution.source).toBe("newsletter");
    expect(attribution.utmSource).toBe("newsletter");
  });

  it("should expire attribution data after TTL", () => {
    const expiredData = {
      source: "meta",
      fbclid: "old_click_123",
      capturedAt: Date.now() - 35 * 24 * 60 * 60 * 1000, // 35 days ago (TTL is 30 days)
    };
    global.localStorage.setItem("meatyns_attribution", JSON.stringify(expiredData));

    expect(getStoredAttribution()).toBeNull();
  });
});
