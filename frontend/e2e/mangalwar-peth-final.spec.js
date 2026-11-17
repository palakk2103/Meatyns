import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Final end-to-end verification for the customer's real address:
 *   "1764 B Ward, Mangalwar Peth, Powar Lane, Manjula Apartment, Kolhapur"
 * Coordinates below are the values stored for that saved address in the DB
 * (test data only — nothing is hardcoded in app code). Reproduces the original
 * CART_SELLER_MISMATCH: a "Meatyns Chicken Lollipop" from a Kolhapur outlet that
 * is NOT the one serving this address sits in the cart.
 */
const APP = 'http://localhost:5173';
const API = 'http://localhost:7000/api';
const PHONE = '8770620342';
const OTP = '1234';

const ADDRESS_TEXT = '1764 B Ward, Mangalwar Peth, Powar Lane, Manjula Apartment, Kolhapur, Maharashtra, India';
const ADDR = { lat: 16.6903804, lng: 74.2262781, city: 'Kolhapur', label: ADDRESS_TEXT };
const PUNE = { lat: 18.559, lng: 73.7868, city: 'Pune', label: 'Baner, Pune' };

// Seed the session issued by the single API login in beforeAll (what a completed
// login stores). Avoids extra OTP sends: the OTP rate limit is 5 sends / 15 min
// per phone, and UI OTP login is already covered by customer-session.spec.js.
async function loginUi(page, _phone, _otp, apiToken, app) {
    await page.goto(`${app}/login`);
    await page.evaluate((t) => localStorage.setItem('auth_customer', t), apiToken);
    await page.goto(`${app}/`);
}

let api, token;
let servingSellerId, wrongSellerId;
let correctLollipop, wrongLollipop;
const auth = () => ({ Authorization: `Bearer ${token}` });
const sid = (p) => String(p.sellerId?._id || p.sellerId);

const lollipopAt = async (lat, lng) => {
    const res = await api.get(`${API}/products`, { params: { lat, lng, search: 'chicken lollipop', limit: 20 } });
    const items = (await res.json()).result?.items || [];
    return items.find((p) => /chicken lollipop/i.test(p.name));
};
const clearCart = () => api.delete(`${API}/cart/clear`, { headers: auth() });
const addToCart = (p) => api.post(`${API}/cart/add`, { headers: auth(), data: { productId: p._id, variantSku: '', quantity: 1 } });
const serviceability = (l) => api.get(`${API}/cart/serviceability`, { headers: auth(), params: { lat: l.lat, lng: l.lng } });
const addressFor = (l) => ({ name: 'Test', address: l.label, city: l.city, phone: PHONE, location: { lat: l.lat, lng: l.lng } });
const cartIds = async () =>
    ((await (await api.get(`${API}/cart`, { headers: auth() })).json()).result.items || []).map((i) => String(i.productId?._id || i.productId));

test.beforeAll(async () => {
    api = await pwRequest.newContext();
    await api.post(`${API}/customer/send-login-otp`, { data: { phone: PHONE } });
    const v = await (await api.post(`${API}/customer/verify-otp`, { data: { phone: PHONE, otp: OTP } })).json();
    token = v.result?.token || v.result?.accessToken || v.token;
    expect(token).toBeTruthy();

    // Lollipop sold to this address (serving seller) …
    correctLollipop = await lollipopAt(ADDR.lat, ADDR.lng);
    servingSellerId = sid(correctLollipop);
    // … and a Lollipop from ANOTHER Kolhapur outlet: found by browsing at that
    // outlet's own spot (Phulewadi, 1.5 km away, also covers this address).
    const otherOutletSpots = [
        { lat: 16.69, lng: 74.24 }, { lat: 16.7046, lng: 74.2433 }, { lat: 16.715, lng: 74.26 }, { lat: 16.7, lng: 74.265 },
    ];
    for (const s of otherOutletSpots) {
        const p = await lollipopAt(s.lat, s.lng);
        if (p && sid(p) !== servingSellerId) { wrongLollipop = p; wrongSellerId = sid(p); break; }
    }
    expect(wrongLollipop, 'need a Lollipop from a non-serving outlet').toBeTruthy();
    await clearCart();
});
test.afterAll(async () => {
    await clearCart();
    await api.dispose();
});

test.describe.serial('Final verification: Mangalwar Peth, Kolhapur', () => {
    test('A. serving seller owns the correct Lollipop; the other outlet is a different seller', async () => {
        console.log('SERVING seller', servingSellerId, 'Lollipop', correctLollipop._id);
        console.log('WRONG   seller', wrongSellerId, 'Lollipop', wrongLollipop._id);
        expect(servingSellerId).not.toBe(wrongSellerId);
        await clearCart();
        await addToCart(correctLollipop);
        const r = (await (await serviceability(ADDR)).json()).result;
        expect(r.selectedSellerId).toBe(servingSellerId);
        expect(r.serviceable).toBe(true);
    });

    test('B. REPRODUCE original bug: wrong-outlet Lollipop in cart -> CART_SELLER_MISMATCH, now with exact item', async () => {
        await clearCart();
        await addToCart(wrongLollipop);
        console.log('CART seller id (item in cart):', wrongSellerId, '| address resolves to:', servingSellerId);
        const prev = await api.post(`${API}/orders/checkout/preview`, {
            headers: auth(),
            data: { items: [{ product: wrongLollipop._id, quantity: 1 }], address: addressFor(ADDR) },
        });
        const pb = await prev.json();
        console.log('PREVIEW', prev.status(), pb.message);
        expect(prev.status()).toBe(409);
        expect(pb.result.code).toBe('CART_SELLER_MISMATCH');
        expect(pb.result.unavailableItems[0]).toMatchObject({ productId: String(wrongLollipop._id), sellerId: wrongSellerId });
        expect(pb.message).not.toMatch(/clear your cart/i);
        const order = await api.post(`${API}/orders`, {
            headers: auth(),
            data: { items: [{ product: wrongLollipop._id, quantity: 1 }], address: addressFor(ADDR), paymentMode: 'COD' },
        });
        expect(order.status()).toBe(409); // server blocks order creation too
    });
});

test.describe.serial('Final verification (UI): cart -> checkout with the exact address', () => {
    let page;
    const setLocation = async (l) => {
        await page.evaluate((x) => {
            localStorage.setItem('location_v2', JSON.stringify({ address: x.label, city: x.city, state: 'Maharashtra', pincode: '416012', latitude: x.lat, longitude: x.lng, time: '12-15 mins' }));
        }, l);
        await page.reload();
    };
    const notice = () => page.locator('[data-testid="unavailable-items-notice"]:visible');

    test.beforeAll(async ({ browser }) => {
        await clearCart();
        await addToCart(wrongLollipop);
        const ctx = await browser.newContext();
        page = await ctx.newPage();
        await page.addInitScript(() => localStorage.setItem('appzeto:storage_schema_version', '2'));
        await loginUi(page, PHONE, OTP, token, APP);
        await setLocation(ADDR);
    });
    test.afterAll(async () => page?.context().close());

    test('C. checkout with the stale Lollipop: 409 -> named notice, no generic error, pay blocked', async () => {
        const prev = page.waitForResponse((r) => /\/orders\/checkout\/preview/.test(r.url()));
        await page.goto(`${APP}/checkout`);
        expect((await prev).status()).toBe(409);
        await expect(notice()).toBeVisible();
        await expect(notice()).toContainText(wrongLollipop.name);
        await expect(notice()).toContainText(/Sold by/);
        await expect(page.getByText(/Please clear your cart and add items again/i)).toHaveCount(0);
        await page.screenshot({ path: 'test-results/final-checkout-notice.png' });
    });

    test('D. Remove only that item; add the serving seller\'s Lollipop; checkout preview succeeds', async () => {
        await page.locator('[data-testid="unavailable-item"]:visible button:has-text("Remove")').first().click();
        await expect(notice()).toHaveCount(0);
        await expect.poll(cartIds, { timeout: 10000 }).toEqual([]);
        await addToCart(correctLollipop);
        const ok = page.waitForResponse((r) => /\/orders\/checkout\/preview/.test(r.url()) && r.status() === 200);
        await page.goto(`${APP}/checkout`);
        expect((await ok).ok()).toBeTruthy();
        await expect(notice()).toHaveCount(0);
        await expect.poll(cartIds, { timeout: 10000 }).toEqual([String(correctLollipop._id)]);
        await page.screenshot({ path: 'test-results/final-checkout-ok.png' });
    });

    test('E. valid cart places a COD order for this address (then cancelled)', async () => {
        const res = await api.post(`${API}/orders`, {
            headers: auth(),
            data: { items: [{ product: correctLollipop._id, quantity: 1 }], address: addressFor(ADDR), paymentMode: 'COD' },
        });
        const body = await res.json();
        console.log('ORDER', res.status(), body.result?.order?.orderId, 'seller', body.result?.order?.seller);
        expect([200, 201]).toContain(res.status());
        const id = body.result?.order?.orderId;
        expect(id).toBeTruthy();
        await api.put(`${API}/orders/cancel/${id}`, { headers: auth(), data: { reason: 'e2e test' } });
    });

    test('F. location change from the header shows a toast about unavailable items; changing back clears it', async () => {
        await addToCart(correctLollipop);
        await setLocation(PUNE);
        await page.goto(`${APP}/`);
        const t = page.locator('[data-sonner-toast]', { hasText: /isn't available at this location/i });
        await expect(t).toBeVisible({ timeout: 15000 });
        await page.screenshot({ path: 'test-results/final-location-toast.png' });
        await setLocation(ADDR);
        await page.goto(`${APP}/`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-sonner-toast]', { hasText: /isn't available at this location/i })).toHaveCount(0);
    });
});
