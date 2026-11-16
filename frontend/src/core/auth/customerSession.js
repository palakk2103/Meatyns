/**
 * customerSession.js — persistent customer login.
 *
 * The customer's long-lived credential is an HttpOnly refresh cookie set by the
 * API (never readable from JS). This module exchanges it for short-lived access
 * tokens, de-duplicating concurrent refreshes (single-flight), and notifies the
 * rest of the app (AuthContext) when the session changes.
 */
import axios from 'axios';
import { resolveApiBaseUrl } from '@core/api/resolveApiBaseUrl';
import { rawGet, rawSet, rawRemove, STORAGE_KEYS } from '@core/utils/storage';
import { decodeToken } from '@core/utils/token';

export const REFRESH_RESULT = Object.freeze({
    OK: 'ok',
    INVALID: 'invalid', // no / expired / revoked session -> must log in again
    TRANSIENT: 'transient', // network / server trouble -> keep current auth state
});

const listeners = new Set();
let inFlight = null;

export function subscribeCustomerSession(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

const emit = (event) => {
    listeners.forEach((cb) => {
        try {
            cb(event);
        } catch {
            /* listener errors must not break auth */
        }
    });
};

export const hasCustomerSessionHint = () => rawGet(STORAGE_KEYS.AUTH_CUSTOMER_SESSION) === '1';
export const markCustomerSession = () => rawSet(STORAGE_KEYS.AUTH_CUSTOMER_SESSION, '1');
export const clearCustomerSessionHint = () => rawRemove(STORAGE_KEYS.AUTH_CUSTOMER_SESSION);

/** Milliseconds until the token expires (<=0 when expired / unknown). */
export function msUntilExpiry(token) {
    const exp = decodeToken(token)?.exp;
    return exp ? exp * 1000 - Date.now() : 0;
}

/** Drop local customer credentials (does not touch the server). */
export function clearLocalCustomerAuth() {
    rawRemove(STORAGE_KEYS.AUTH_CUSTOMER);
    clearCustomerSessionHint();
    emit({ type: 'invalid' });
}

/**
 * Exchange the refresh cookie for a new access token. Concurrent callers share
 * one request. Resolves to { status, token? } and never throws.
 */
export function refreshCustomerAccessToken() {
    if (inFlight) return inFlight;

    inFlight = axios
        .post(`${resolveApiBaseUrl()}/customer/refresh`, null, {
            withCredentials: true,
            timeout: 15000,
        })
        .then((response) => {
            const token = response?.data?.result?.token;
            if (!token) return { status: REFRESH_RESULT.TRANSIENT };
            rawSet(STORAGE_KEYS.AUTH_CUSTOMER, token);
            markCustomerSession();
            emit({ type: 'refreshed', token });
            return { status: REFRESH_RESULT.OK, token };
        })
        .catch((error) => {
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                clearLocalCustomerAuth();
                return { status: REFRESH_RESULT.INVALID };
            }
            // Offline, timeout, 5xx, 429: never log the customer out for these.
            return { status: REFRESH_RESULT.TRANSIENT };
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/** Revoke the server session and clear the cookie. Best effort, never throws. */
export async function endCustomerSessionRemote() {
    try {
        await axios.post(`${resolveApiBaseUrl()}/customer/logout`, null, {
            withCredentials: true,
            timeout: 5000,
        });
    } catch {
        /* local logout proceeds regardless */
    }
}
