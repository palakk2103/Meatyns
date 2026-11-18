/**
 * AppZeto JS Bridge Helper
 * Bidirectional communication between the React web app and the Flutter
 * native wrapper via the WebView JavaScript channel.
 *
 * Flutter answers by calling `window.onFlutterResponse({ type, data })`.
 * A single dispatcher routes each response to every waiter for that `type`,
 * so concurrent requests (e.g. FCM token + location on app start) can no
 * longer overwrite each other's handler and lose a reply.
 */

const waiters = new Map(); // type -> Set<(data) => void>
let genericListener = null;
let dispatcherInstalled = false;

const normalizeResponse = (response) => {
  if (typeof response === "string") {
    try {
      return JSON.parse(response);
    } catch {
      return null;
    }
  }
  return response;
};

const installDispatcher = () => {
  if (dispatcherInstalled || typeof window === "undefined") return;
  dispatcherInstalled = true;
  window.onFlutterResponse = (raw) => {
    const response = normalizeResponse(raw);
    if (!response) return;
    const set = waiters.get(response.type);
    if (set && set.size) {
      const callbacks = Array.from(set);
      set.clear();
      callbacks.forEach((cb) => cb(response.data));
    }
    if (genericListener) genericListener(response);
  };
};

// Post `action` and resolve with the data of the first `responseType` reply,
// or null after `timeoutMs`.
const request = (action, responseType, timeoutMs) =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !window.Flutter) {
      resolve(null);
      return;
    }
    installDispatcher();
    let done = false;
    const set = waiters.get(responseType) || new Set();
    waiters.set(responseType, set);
    const finish = (data) => {
      if (done) return;
      done = true;
      set.delete(finish);
      clearTimeout(timer);
      resolve(data ?? null);
    };
    set.add(finish);
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      window.Flutter.postMessage(action);
    } catch {
      finish(null);
    }
  });

const AppZetoBridge = {
  /** Is the app running inside the Flutter WebView? */
  isFlutterApp: () => !!window.Flutter,

  /** Send a raw action to Flutter (open_camera, get_location, pick_file, get_fcm_token). */
  send: (action) => {
    if (window.Flutter) {
      window.Flutter.postMessage(action);
    } else {
      console.warn("Flutter context not found. Are you running inside the Flutter app?");
    }
  },

  /** Listen to every response from Flutter ({ type, data }). */
  onResponse: (callback) => {
    installDispatcher();
    genericListener = callback;
  },

  /** @returns {Promise<string|null>} FCM token, or null after 10s. */
  getFcmToken: () => request("get_fcm_token", "fcm_token_response", 10000),

  /**
   * @returns {Promise<any|null>} Native location payload (usually {lat, lng}),
   * or null after 15s.
   */
  getLocation: () => request("get_location", "location_response", 15000),
};

export default AppZetoBridge;
