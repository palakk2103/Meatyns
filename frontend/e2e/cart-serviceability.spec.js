import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Stale-cart / seller-location mismatch. One delivery location is served by
 * exactly one seller; items owned by any other seller must be NAMED and
 * removable one by one (never "clear your whole cart").
 *
 * Runs against the real API + DB. Seller / product ids are discovered from the
 * live catalogue at each location (nothing hardcoded). The coordinates below
 * are TEST DATA only: the customer's real saved address
 * "1764 B Ward, Mangalwar Peth, Powar Lane, Manjula Apartment, Kolhapur"
 * as stored in the DB (customer.addresses[].location).
 */
const APP = 'http://localhost:5173';
const API = 'http://localhost:7000/api';
const MOCK_PHONE = '8770620342';
const MOCK_OTP = '1234';

const MANGALWAR_PETH = { lat: 16.6903804, lng: 74.2262781, city: 'Kolhapur', label: 'B Ward, Mangalwar Peth, Kolhapur' };
const PUNE = { lat: 18.559, lng: 73.7868, city: 'Pune', label: 'Baner, Pune' };

// Seed the session issued by the single API login in beforeAll (what a completed
// login stores). Avoids extra OTP sends: the OTP rate limit is 5 sends / 15 min
// per phone, and UI OTP login is already covered by customer-session.spec.js.
async function loginUi(page, _phone, _otp, apiToken, app) {
    await page.goto(`${app}/login`);
    await page.evaluate((t) => localStorage.setItem('auth_customer', t), apiToken);
    await page.goto(`${app}/`);
}

let api;
let token;
let kolhapurProduct; // sold by the seller serving Mangalwar Peth
let puneProduct; // sold by a seller that does NOT serve Mangalwar Peth
let kolhapurSellerId;
let puneSellerId;

const auth = () => ({ Authorization: `Bearer ${token}` });
const sid = (p) => String(p.sellerId?._id || p.sellerId);

async function catalogue(loc) {
    const res = await api.get(`${API}/products`, { params: { lat: loc.lat, lng: loc.lng, limit: 50 } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    return body.result?.items || [];
}
const addToServerCart = (p) =>
    api.post(`${API}/cart/add`, { headers: auth(), data: { productId: p._id, variantSku: '', quantity: 1 } });
const clearServerCart = () => api.delete(`${API}/cart/clear`, { headers: auth() });
const serviceability = (loc) =>
    api.get(`${API}/cart/serviceability`, { headers: auth(), params: { lat: loc.lat, lng: loc.lng } });
const addressFor = (loc) => ({
    name: 'Test', address: loc.label, city: loc.city, phone: MOCK_PHONE, location: { lat: loc.lat, lng: loc.lng },
});

test.beforeAll(async () => {
    api = await pwRequest.newContext();
    await api.post(`${API}/customer/send-login-otp`, { data: { phone: MOCK_PHONE } });
    const ver = await (await api.post(`${API}/customer/verify-otp`, { data: { phone: MOCK_PHONE, otp: MOCK_OTP } })).json();
    token = ver.result?.token || ver.result?.accessToken || ver.token;
    expect(token).toBeTruthy();

    const k = await catalogue(MANGALWAR_PETH);
    const p = await catalogue(PUNE);
    kolhapurProduct = k[0];
    puneProduct = p[0];
    kolhapurSellerId = sid(kolhapurProduct);
    puneSellerId = sid(puneProduct);
    expect(kolhapurSellerId).not.toBe(puneSellerId);
    await clearServerCart();
});
test.afterAll(async () => {
    await clearServerCart();
    await api.dispose();
});

test.describe.serial('API: cart serviceability + checkout enforcement', () => {
    test('1. cart from the serving seller is serviceable at the real Mangalwar Peth address', async () => {
        await clearServerCart();
        await addToServerCart(kolhapurProduct);
        const r = (await (await serviceability(MANGALWAR_PETH)).json()).result;
        expect(r.selectedSellerId).toBe(kolhapurSellerId);
        expect(r.serviceable).toBe(true);
        expect(r.unavailableItems).toEqual([]);
    });

    // NOTE: carts are now AUTO-REMAPPED to the serving outlet's equivalent product (same
    // name/variant), so a stale cart item from another outlet no longer exists for products
    // every outlet stocks. Scenarios that need an unavailable item are parked with
    // test.fixme until a product that exists at only one outlet is available.
    test('2. a product from another outlet is re-mapped to the serving outlet (not flagged, never served by the wrong seller)', async () => {
        await addToServerCart(puneProduct);
        const r = (await (await serviceability(MANGALWAR_PETH)).json()).result;
        expect(r.selectedSellerId).toBe(kolhapurSellerId);
        expect(r.serviceable).toBe(true);
        expect(r.unavailableItems).toEqual([]);
        expect(r.remappedCount).toBeGreaterThanOrEqual(1);
    });

    test.fixme('3. checkout preview + order creation return a structured 409 and create no order', async () => {
        const items = [
            { product: kolhapurProduct._id, quantity: 1 },
            { product: puneProduct._id, quantity: 1 },
        ];
        const prev = await api.post(`${API}/orders/checkout/preview`, { headers: auth(), data: { items, address: addressFor(MANGALWAR_PETH) } });
        expect(prev.status()).toBe(409);
        const pb = await prev.json();
        expect(pb.message).toContain(puneProduct.name);
        expect(pb.message).not.toMatch(/clear your cart/i);
        expect(pb.result.code).toBe('CART_SELLER_MISMATCH');
        expect(pb.result.unavailableItems.map((i) => i.productId)).toEqual([String(puneProduct._id)]);

        const order = await api.post(`${API}/orders`, {
            headers: auth(),
            data: { items, address: addressFor(MANGALWAR_PETH), paymentMode: 'COD' },
        });
        expect(order.status()).toBe(409);
        expect((await order.json()).result.unavailableItems).toHaveLength(1);
    });

    test.fixme('4. removing only the unavailable item makes the rest checkout-able (and location back restores)', async () => {
        const del = await api.delete(`${API}/cart/remove/${puneProduct._id}`, { headers: auth(), params: { variantSku: '' } });
        expect(del.ok()).toBeTruthy();
        const r = (await (await serviceability(MANGALWAR_PETH)).json()).result;
        expect(r.serviceable).toBe(true);
        const cart = (await (await api.get(`${API}/cart`, { headers: auth() })).json()).result;
        expect(cart.items.map((i) => String(i.productId?._id || i.productId))).toEqual([String(kolhapurProduct._id)]);

        // Same cart is NOT serviceable in Pune; back at Mangalwar Peth it is again.
        const inPune = (await (await serviceability(PUNE)).json()).result;
        expect(inPune.serviceable).toBe(false);
        expect(inPune.unavailableItems[0].productId).toBe(String(kolhapurProduct._id));
        expect((await (await serviceability(MANGALWAR_PETH)).json()).result.serviceable).toBe(true);
    });

    test('5. a valid cart places an order (COD) and the cart-seller rule is satisfied', async () => {
        const res = await api.post(`${API}/orders`, {
            headers: auth(),
            data: { items: [{ product: kolhapurProduct._id, quantity: 1 }], address: addressFor(MANGALWAR_PETH), paymentMode: 'COD' },
        });
        const body = await res.json();
        expect([200, 201]).toContain(res.status());
        const orderId = body.result?.order?.orderId || body.result?.order?._id;
        expect(orderId).toBeTruthy();
        // tidy up the test order so it doesn't linger with the seller
        await api.put(`${API}/orders/cancel/${orderId}`, { headers: auth(), data: { reason: 'e2e test' } });
    });

    test('6. invalid coordinates are rejected', async () => {
        const res = await api.get(`${API}/cart/serviceability`, { headers: auth(), params: { lat: 'x', lng: '1' } });
        expect(res.status()).toBe(400);
    });
});

test.describe.serial('UI: stale cart is identified, removable per item, and persists', () => {
    let page;

    const setLocation = async (loc) => {
        await page.evaluate((l) => {
            localStorage.setItem(
                'location_v2',
                JSON.stringify({ address: l.label, city: l.city, state: 'X', pincode: '000000', latitude: l.lat, longitude: l.lng, time: '12-15 mins' }),
            );
        }, loc);
        await page.reload();
    };
    const notice = () => page.locator('[data-testid="unavailable-items-notice"]:visible');

    test.beforeAll(async ({ browser }) => {
        await clearServerCart();
        await addToServerCart(kolhapurProduct);
        await addToServerCart(puneProduct); // stale: added "under another location"
        const ctx = await browser.newContext();
        page = await ctx.newPage();
        await page.addInitScript(() => localStorage.setItem('appzeto:storage_schema_version', '2'));
        await loginUi(page, MOCK_PHONE, MOCK_OTP, token, APP);
        await setLocation(MANGALWAR_PETH);
    });
    test.afterAll(async () => {
        await page?.context().close();
    });

    test.fixme('7. cart page names the unavailable product + seller, only that one', async () => {
        await page.goto(`${APP}/cart`);
        await expect(notice()).toBeVisible();
        const rows = page.locator('[data-testid="unavailable-item"]:visible');
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText(puneProduct.name);
        await expect(rows.first()).toContainText(/Sold by/);
        await expect(rows.first()).not.toContainText(kolhapurProduct.name === puneProduct.name ? '__never__' : kolhapurProduct.name);
    });

    test.fixme('8. survives a refresh / reopen (cart is server-side, re-validated on load)', async () => {
        await page.reload();
        await expect(notice()).toBeVisible();
        await expect(page.locator('[data-testid="unavailable-item"]:visible')).toHaveCount(1);
    });

    test.fixme('9. checkout shows the same notice instead of a generic red error', async () => {
        const prev = page.waitForResponse((r) => /\/orders\/checkout\/preview/.test(r.url()));
        await page.goto(`${APP}/checkout`);
        expect((await prev).status()).toBe(409);
        await expect(notice()).toBeVisible();
        await expect(page.getByText(/Please clear your cart and add items again/i)).toHaveCount(0);
    });

    test.fixme('10. Remove deletes just that item; the rest of the cart stays and checkout recovers', async () => {
        const prev = page.waitForResponse((r) => /\/orders\/checkout\/preview/.test(r.url()) && r.status() === 200);
        await page.locator('[data-testid="unavailable-item"]:visible button:has-text("Remove")').first().click();
        await expect(notice()).toHaveCount(0);
        expect((await prev).ok()).toBeTruthy();
        await expect
            .poll(async () => {
                const cart = (await (await api.get(`${API}/cart`, { headers: auth() })).json()).result;
                return cart.items.map((i) => String(i.productId?._id || i.productId));
            }, { timeout: 10000 })
            .toEqual([String(kolhapurProduct._id)]);
    });

    test.fixme('11. changing location to Pune flags the remaining item; changing back restores', async () => {
        await setLocation(PUNE);
        await page.goto(`${APP}/cart`);
        await expect(notice()).toBeVisible();
        await expect(page.locator('[data-testid="unavailable-item"]:visible').first()).toContainText(kolhapurProduct.name);

        await setLocation(MANGALWAR_PETH);
        await page.goto(`${APP}/cart`);
        await page.waitForLoadState('networkidle');
        await expect(notice()).toHaveCount(0);
    });
});
