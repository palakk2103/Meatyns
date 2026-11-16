import axios from 'axios';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';
import { getStoredAuthToken } from '@core/utils/authStorage';
import { getActiveRole, ROLES } from '@core/auth/activeRoleStore';
import { STORAGE_KEYS } from '@core/utils/storage';
import { decodeToken } from '@core/utils/token';
import {
    refreshCustomerAccessToken,
    REFRESH_RESULT,
} from '@core/auth/customerSession';

const AUTH_ENDPOINT_PREFIXES = [
    '/customer/login',
    '/customer/verify',
    '/customer/send-',
    '/customer/refresh',
    '/customer/logout',
];

const ROLE_TO_STORAGE_KEY = {
    [ROLES.SELLER]: STORAGE_KEYS.AUTH_SELLER,
    [ROLES.ADMIN]: STORAGE_KEYS.AUTH_ADMIN,
    [ROLES.DELIVERY]: STORAGE_KEYS.AUTH_DELIVERY,
    [ROLES.CUSTOMER]: STORAGE_KEYS.AUTH_CUSTOMER,
};

// URL-prefix → storage-key map used as a *fallback* for the few call sites
// (e.g. an admin page that calls a /products endpoint) where the request URL
// itself encodes the intended role. The primary source is the activeRoleStore.
function tokenForRequestUrl(url) {
    if (!url) return null;
    if (
        url.startsWith('/seller') ||
        url === '/products/bulk' ||
        url.startsWith('/products/bulk') ||
        url.startsWith('/seller/products/bulk') ||
        url.startsWith('/products/seller')
    ) {
        return getStoredAuthToken(STORAGE_KEYS.AUTH_SELLER) || getStoredAuthToken(STORAGE_KEYS.AUTH_ADMIN);
    }
    if (url.startsWith('/admin')) return getStoredAuthToken(STORAGE_KEYS.AUTH_ADMIN);
    if (url.startsWith('/delivery')) return getStoredAuthToken(STORAGE_KEYS.AUTH_DELIVERY);
    if (
        url.startsWith('/customer') ||
        url.startsWith('/cart') ||
        url.startsWith('/wishlist') ||
        url.startsWith('/categories') ||
        (url.startsWith('/products') && !url.includes('/bulk')) ||
        url.startsWith('/payments')
    ) {
        return getStoredAuthToken(STORAGE_KEYS.AUTH_CUSTOMER);
    }
    return null;
}

const axiosInstance = axios.create({
    baseURL: resolveApiBaseUrl(),
});

axiosInstance.interceptors.request.use(
    (config) => {
        const url = config.url || '';
        const isMultipartRequest =
            typeof FormData !== 'undefined' && config.data instanceof FormData;

        if (isMultipartRequest) {
            if (typeof config.headers?.delete === 'function') {
                config.headers.delete('Content-Type');
            } else if (config.headers) {
                delete config.headers['Content-Type'];
            }
        }

        // Primary: pick token from the active role (set by the router on mount).
        const activeRole = getActiveRole();
        const primaryStorageKey = ROLE_TO_STORAGE_KEY[activeRole];
        let token = primaryStorageKey ? getStoredAuthToken(primaryStorageKey) : null;

        // Fallback 1: URL-derived token (cross-portal calls, e.g. admin → /products).
        if (!token) {
            token = tokenForRequestUrl(url);
        }

        // Fallback 2: customer token for un-prefixed/public-ish endpoints while
        // the user is not currently inside a privileged portal.
        if (
            !token &&
            activeRole !== ROLES.ADMIN &&
            activeRole !== ROLES.SELLER &&
            activeRole !== ROLES.DELIVERY
        ) {
            token = getStoredAuthToken(STORAGE_KEYS.AUTH_CUSTOMER);
        }

        // Fallback 3: legacy shared 'token' key.
        if (!token) {
            token = getStoredAuthToken(STORAGE_KEYS.AUTH_LEGACY);
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: on a 401 for a customer request, silently renew the
// access token from the refresh cookie (single-flight) and retry once. Stored
// tokens are only cleared when the server says the session is gone for good;
// network trouble never logs the customer out.
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
            return Promise.reject(error);
        }
        originalRequest._retry = true;

        const url = originalRequest.url || '';
        const sentAuth = String(
            originalRequest.headers?.Authorization ||
                originalRequest.headers?.get?.('Authorization') ||
                ''
        ).replace(/^Bearer\s+/i, '');
        const wasCustomerRequest = decodeToken(sentAuth)?.role === 'customer';
        const isAuthEndpoint = AUTH_ENDPOINT_PREFIXES.some((p) => url.startsWith(p));

        if (wasCustomerRequest && !isAuthEndpoint) {
            const result = await refreshCustomerAccessToken();
            if (result.status === REFRESH_RESULT.OK) {
                originalRequest.headers.Authorization = `Bearer ${result.token}`;
                return axiosInstance(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
