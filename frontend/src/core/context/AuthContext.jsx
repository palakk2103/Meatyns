import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import axiosInstance from '@core/api/axios';
import { getWithDedupe } from '@core/api/dedupe';
import { getStoredAuthToken } from '@core/utils/authStorage';
import { isTokenExpired } from '@core/utils/token';
import {
    REFRESH_RESULT,
    clearCustomerSessionHint,
    endCustomerSessionRemote,
    markCustomerSession,
    msUntilExpiry,
    refreshCustomerAccessToken,
    subscribeCustomerSession,
} from '@core/auth/customerSession';
import {
    getActiveRole,
    subscribeActiveRole,
} from '@core/auth/activeRoleStore';
import {
    rawGet,
    rawSet,
    rawRemove,
    clearOnLogout,
    STORAGE_KEYS,
} from '@core/utils/storage';

const AuthContext = createContext(undefined);

const ROLE_STORAGE_KEYS = {
    customer: STORAGE_KEYS.AUTH_CUSTOMER,
    seller: STORAGE_KEYS.AUTH_SELLER,
    admin: STORAGE_KEYS.AUTH_ADMIN,
    delivery: STORAGE_KEYS.AUTH_DELIVERY,
};

const LEGACY_TOKEN_KEY = STORAGE_KEYS.AUTH_LEGACY;

export const AuthProvider = ({ children }) => {
    const getSafeToken = (key) => getStoredAuthToken(ROLE_STORAGE_KEYS[key]);

    const [authData, setAuthData] = useState({
        customer: getSafeToken('customer'),
        seller: getSafeToken('seller'),
        admin: getSafeToken('admin'),
        delivery: getSafeToken('delivery'),
    });

    // Subscribe to the activeRoleStore so this context re-renders whenever the
    // router flips the active portal. The store also falls back to URL
    // inference on first read, so behavior matches the previous implementation
    // before any router has explicitly set a role.
    const [currentRole, setCurrentRole] = useState(getActiveRole());
    useEffect(() => {
        const unsub = subscribeActiveRole((next) => setCurrentRole(next));
        return unsub;
    }, []);

    const [user, setUser] = useState(null);
    const userRef = useRef(null);
    userRef.current = user;
    const [isLoading, setIsLoading] = useState(true);

    // Customer session restoration: when the app opens with no usable access
    // token (expired, or storage evicted) but a refresh cookie may exist, renew
    // BEFORE deciding whether the customer is logged in. Guards and the profile
    // fetch wait on `sessionReady` so a refresh/reopen never flashes /login.
    const [sessionReady, setSessionReady] = useState(() => {
        if (getActiveRole() !== 'customer') return true;
        const t = getStoredAuthToken(ROLE_STORAGE_KEYS.customer);
        return Boolean(t) && !isTokenExpired(t);
    });
    const token = authData[currentRole];
    const isAuthenticated = !!token;

    useEffect(() => {
        const syncStoredTokens = () => {
            setAuthData({
                customer: getSafeToken('customer'),
                seller: getSafeToken('seller'),
                admin: getSafeToken('admin'),
                delivery: getSafeToken('delivery'),
            });
        };

        window.addEventListener('focus', syncStoredTokens);
        window.addEventListener('storage', syncStoredTokens);
        document.addEventListener('visibilitychange', syncStoredTokens);

        return () => {
            window.removeEventListener('focus', syncStoredTokens);
            window.removeEventListener('storage', syncStoredTokens);
            document.removeEventListener('visibilitychange', syncStoredTokens);
        };
    }, []);

    // One-shot restore on app start (customer portal only).
    useEffect(() => {
        if (sessionReady) return undefined;
        let cancelled = false;
        refreshCustomerAccessToken().then((result) => {
            if (cancelled) return;
            if (result.status === REFRESH_RESULT.OK) {
                setAuthData((prev) => ({ ...prev, customer: result.token }));
            }
            // INVALID already cleared storage via the session listener;
            // TRANSIENT keeps whatever token we have (no forced logout).
            setSessionReady(true);
        });
        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // React to session changes from the API layer (silent refresh / revoked).
    useEffect(() => {
        return subscribeCustomerSession((event) => {
            if (event.type === 'refreshed') {
                setAuthData((prev) =>
                    prev.customer === event.token ? prev : { ...prev, customer: event.token }
                );
            } else if (event.type === 'invalid') {
                setAuthData((prev) => (prev.customer ? { ...prev, customer: null } : prev));
            }
        });
    }, []);

    // Renew the customer access token shortly before it expires, and whenever
    // the tab regains focus / connectivity (timers pause while sleeping).
    const customerToken = authData.customer;
    useEffect(() => {
        if (!customerToken) return undefined;
        let timer = null;
        const renewIfNeeded = () => {
            if (msUntilExpiry(customerToken) <= 60 * 1000) refreshCustomerAccessToken();
        };
        const delay = Math.min(
            Math.max(msUntilExpiry(customerToken) - 60 * 1000, 5000),
            2 ** 31 - 1
        );
        timer = setTimeout(renewIfNeeded, delay);
        window.addEventListener('online', renewIfNeeded);
        window.addEventListener('focus', renewIfNeeded);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('online', renewIfNeeded);
            window.removeEventListener('focus', renewIfNeeded);
        };
    }, [customerToken]);

    // Register FCM token after login (non-blocking).
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        let cleanupDeferredRegistration = null;

        // Fire-and-forget; never block auth/profile load.
        setTimeout(() => {
            import('@core/firebase/pushClient')
                .then(async ({
                    ensureFcmTokenRegistered,
                    hasRegisteredFcmToken,
                    startForegroundPushListener,
                    scheduleFcmRegistrationOnUserGesture
                }) => {
                    if (cancelled) return;
                    await startForegroundPushListener();
                    if (hasRegisteredFcmToken(currentRole)) return;

                    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
                    if (permission === 'granted') {
                        await ensureFcmTokenRegistered({
                            role: currentRole,
                            platform: 'web'
                        });
                        return;
                    }

                    cleanupDeferredRegistration = scheduleFcmRegistrationOnUserGesture({
                        role: currentRole,
                        platform: 'web',
                        onError: (error) => {
                            console.warn('[push] Deferred registration failed:', error?.message || error);
                        },
                    });
                })
                .catch((error) => {
                    // Permission denied / unsupported / any error: user can retry later from push-enabled actions.
                    console.warn('[push] Auto-registration skipped:', error?.message || error);
                });
        }, 0);

        return () => {
            cancelled = true;
            if (typeof cleanupDeferredRegistration === 'function') {
                cleanupDeferredRegistration();
            }
        };
    }, [token, currentRole]);

    // Fetch user profile on mount or token change
    useEffect(() => {
        const fetchProfile = async () => {
            if (!sessionReady) return;
            if (token) {
                try {
                    // Background token renewals must not unmount the UI.
                    if (!userRef.current) setIsLoading(true);
                    // Use deduplicated fetch to avoid multiple simultaneous profile calls
                    const endpoint = `/${currentRole}/profile`;
                    const response = await getWithDedupe(endpoint, {}, { ttl: 5000 });
                    setUser(response.data.result);
                } catch (error) {
                    console.error('Failed to fetch profile:', error);
                    // Customer 401s are handled by the API layer: it already tried a
                    // silent refresh and only clears credentials if the session is
                    // truly gone (never on network trouble).
                    if (error.response?.status === 401 && currentRole !== 'customer') {
                        const storageKey = ROLE_STORAGE_KEYS[currentRole];
                        if (storageKey) {
                            rawRemove(storageKey);
                        }
                        setAuthData((prev) => ({ ...prev, [currentRole]: null }));
                    }
                    setUser(null);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setUser(null);
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [token, currentRole, sessionReady]);

    const login = (userData) => {
        const role = userData.role?.toLowerCase() || 'customer';
        const storageKey = ROLE_STORAGE_KEYS[role];

        if (storageKey && userData.token) {
            // Persist only the raw JWT string; everything else lives in memory
            // until the next profile fetch.
            rawSet(storageKey, userData.token);

            // Guard against state leaking from a previous account on the same
            // browser (e.g. abandoned guest cart, leftover recent searches).
            // Backend cart will replace it as soon as fetchCart resolves.
            rawRemove(STORAGE_KEYS.CART);
            rawRemove(STORAGE_KEYS.WISHLIST);

            if (role === 'customer') markCustomerSession();

            setAuthData(prev => ({ ...prev, [role]: userData.token }));
            setSessionReady(true);
            setUser(userData); // Set full data initially
        } else if (userData) {
            // Updating user profile state when already authenticated
            setUser(prev => ({ ...(prev || {}), ...userData }));
        } else {
            console.error('Invalid role or missing token for login:', role);
        }
    };

    const updateUser = (data) => {
        if (!data) return;
        setUser((prev) => ({ ...(prev || {}), ...data }));
    };

    const logout = async () => {
        const storageKey = ROLE_STORAGE_KEYS[currentRole];
        const previousUserId = user?._id || user?.id || '';

        try {
            const { removeStoredFcmToken } = await import('@core/firebase/pushClient');
            await removeStoredFcmToken({ role: currentRole });
        } catch (error) {
            console.warn('Failed to remove push token during logout:', error);
        }

        // Revoke the server-side refresh session first so the cookie cannot
        // silently log this customer back in.
        if (currentRole === 'customer') {
            await endCustomerSessionRemote();
            clearCustomerSessionHint();
        }

        if (storageKey) {
            rawRemove(storageKey);
        }

        // Remove the legacy shared token only when it belongs to the current role session.
        if (token && rawGet(LEGACY_TOKEN_KEY) === token) {
            rawRemove(LEGACY_TOKEN_KEY);
        }

        // Centralized sensitive-data cleanup: push tokens, recipient PII,
        // recent searches, support-unread counts, guest cart/wishlist and (for
        // delivery role) the rider's last-known GPS.
        clearOnLogout({
            role: currentRole,
            userId: previousUserId,
        });

        setAuthData((prev) => ({
            ...prev,
            [currentRole]: null,
        }));

        // Clear the current user profile from memory
        setUser(null);

        // Final fallback: redirect based on current path if needed
        // (ProtectedRoute usually handles this, but explicit navigation is safer for some UI edge cases)
        const path = window.location.pathname;
        if (path.startsWith('/admin')) window.location.href = '/admin/auth';
        else if (path.startsWith('/seller')) window.location.href = '/seller/auth';
        else if (path.startsWith('/delivery')) window.location.href = '/delivery/auth';
        else window.location.href = '/login';
    };

    const refreshUser = async () => {
        if (token) {
            try {
                const endpoint = `/${currentRole}/profile`;
                const response = await axiosInstance.get(endpoint);
                setUser(response.data.result);
                return response.data.result;
            } catch (error) {
                console.error('Failed to refresh profile:', error);
            }
        }
    };

    const value = useMemo(() => ({
        user,
        token,
        role: currentRole,
        isAuthenticated,
        isLoading,
        authData,
        login,
        updateUser,
        logout,
        refreshUser
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [user, token, currentRole, isAuthenticated, isLoading, authData]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
