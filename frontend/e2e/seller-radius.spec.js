import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Seller-wise service radius: ONE customer location -> ONE serving seller.
 * Runs against the real API + DB (seeded sellers: 5 in Kolhapur, 1 in Pune,
 * plus the legacy Indore seller). Asserts real product ownership, prices and
 * what the customer UI actually requests/renders — not just HTTP 200s.
 */
const APP = 'http://localhost:5173';
const API = 'http://localhost:7000/api';
const MOCK_PHONE = '8770620342';
const MOCK_OTP = '1234';

const LOC = {
    kolhapurRajarampuri: { lat: 16.698, lng: 74.236, seller: 'kolhapur5@meatyns.com', city: 'Kolhapur' },
    kolhapurLineBazar: { lat: 16.715, lng: 74.26, seller: 'kolhapur2@meatyns.com', city: 'Kolhapur' },
    kolhapurFarFallback: { lat: 16.8, lng: 74.3, seller: 'kolhapur2@meatyns.com', city: 'Kolhapur' }, // outside every radius
    puneBaner: { lat: 18.559, lng: 73.7868, seller: 'pune@meatyns.com', city: 'Pune' },
    mumbaiFallback: { lat: 19.076, lng: 72.8777, seller: 'pune@meatyns.com', city: 'Mumbai' }, // nearest = Pune
};

let api;
let sellerIdByEmail = {};
let customerToken;

const items = async (loc, extra = {}) => {
    const res = await api.get(`${API}/products`, { params: { lat: loc.lat, lng: loc.lng, limit: 200, ...extra } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    return body.result?.items || body.results || [];
};
const sid = (p) => String(p.sellerId?._id || p.sellerId);
const priceOf = (list, name) =>
    (list.find((p) => p.name === name) || list.find((p) => p.name.startsWith(name)))?.variants?.[0]?.price;

test.beforeAll(async () => {
    api = await pwRequest.newContext();
    // Resolve seller ids by probing each serving location (no hardcoded ids).
    for (const loc of [LOC.kolhapurRajarampuri, LOC.kolhapurLineBazar, LOC.puneBaner]) {
        const list = await items(loc);
        sellerIdByEmail[loc.seller] = sid(list[0]);
    }
    const sent = await api.post(`${API}/customer/send-login-otp`, { data: { phone: MOCK_PHONE } });
    const ver = await api.post(`${API}/customer/verify-otp`, { data: { phone: MOCK_PHONE, otp: MOCK_OTP } });
    const vb = await ver.json();
    customerToken = vb.result?.token || vb.result?.accessToken || vb.token || vb.result?.data?.token;
    void sent;
});

test.describe('API: one customer location -> exactly one seller', () => {
    for (const [key, loc] of Object.entries(LOC)) {
        test(`${key}: every product belongs to ${loc.seller}, no duplicates`, async () => {
            const list = await items(loc);
            expect(list.length).toBeGreaterThan(0);
            const sellers = new Set(list.map(sid));
            expect([...sellers]).toHaveLength(1); // ONE seller only
            if (sellerIdByEmail[loc.seller]) expect([...sellers][0]).toBe(sellerIdByEmail[loc.seller]);
            const names = list.map((p) => p.name);
            expect(new Set(names).size).toBe(names.length); // no duplicate listings
            expect(list.length).toBe(13);
        });
    }

    test('Kolhapur sellers share pricing; Pune has its own (seller-specific pricing)', async () => {
        const k = await items(LOC.kolhapurRajarampuri);
        const k2 = await items(LOC.kolhapurLineBazar);
        const p = await items(LOC.puneBaner);
        expect(priceOf(k, 'Meatyns Special Mutton')).toBe(930);
        expect(priceOf(k2, 'Meatyns Special Mutton')).toBe(930);
        expect(priceOf(p, 'Meatyns Special Mutton')).toBe(1050);
        expect(priceOf(p, 'Goat Curry Cut')).toBe(930);
        expect(priceOf(k, 'Goat Curry Cut')).toBe(860);
        // chicken has no Pune override
        expect(priceOf(p, 'Meatyns Chicken Breast')).toBe(priceOf(k, 'Meatyns Chicken Breast'));
    });

    test('search respects the selected seller', async () => {
        for (const loc of [LOC.kolhapurRajarampuri, LOC.puneBaner]) {
            const list = await items(loc, { search: 'mutton' });
            expect(list.length).toBeGreaterThan(0);
            expect(new Set(list.map(sid)).size).toBe(1);
        }
    });

    test('category + subcategory listings respect the selected seller', async () => {
        const all = await items(LOC.puneBaner);
        const p = all[0];
        const cat = p.categoryId?._id || p.categoryId;
        const sub = p.subcategoryId?._id || p.subcategoryId;
        for (const extra of [{ categoryId: cat }, { subcategoryId: sub }]) {
            const list = await items(LOC.puneBaner, extra);
            expect(list.length).toBeGreaterThan(0);
            expect(new Set(list.map(sid))).toEqual(new Set([sellerIdByEmail['pune@meatyns.com']]));
        }
    });

    test('product details: own seller visible, another seller\'s product hidden', async () => {
        const pune = await items(LOC.puneBaner);
        const kolh = await items(LOC.kolhapurRajarampuri);
        const own = await api.get(`${API}/products/${pune[0]._id}`, { params: LOC.puneBaner && { lat: LOC.puneBaner.lat, lng: LOC.puneBaner.lng } });
        expect(own.status()).toBe(200);
        const foreign = await api.get(`${API}/products/${kolh[0]._id}`, { params: { lat: LOC.puneBaner.lat, lng: LOC.puneBaner.lng } });
        expect(foreign.status()).toBe(404);
    });

    test('requesting a different seller explicitly cannot override the selection', async () => {
        const kolhSeller = sellerIdByEmail['kolhapur5@meatyns.com'];
        const list = await items(LOC.puneBaner, { sellerId: kolhSeller });
        expect(list).toHaveLength(0);
    });

    test('cache does not leak between customers at different locations', async () => {
        const a1 = await items(LOC.puneBaner);
        const b1 = await items(LOC.kolhapurRajarampuri);
        const a2 = await items(LOC.puneBaner);
        expect(new Set(a1.map(sid))).toEqual(new Set(a2.map(sid)));
        expect(new Set(a1.map(sid))).not.toEqual(new Set(b1.map(sid)));
    });

    test('offer sections only reference the selected seller', async () => {
        const res = await api.get(`${API}/offer-sections`, { params: { lat: LOC.puneBaner.lat, lng: LOC.puneBaner.lng } });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const sections = body.result || body.results || [];
        for (const s of sections) {
            for (const pr of s.productIds || []) expect(sid(pr)).toBe(sellerIdByEmail['pune@meatyns.com']);
        }
    });
});

test.describe('API: checkout safety', () => {
    test.skip(() => !customerToken, 'mock customer login unavailable');
    const preview = async (items_, loc) =>
        api.post(`${API}/orders/checkout/preview`, {
            headers: { Authorization: `Bearer ${customerToken}` },
            data: { items: items_, address: { name: 'T', address: 'x', city: loc.city, phone: MOCK_PHONE, location: { lat: loc.lat, lng: loc.lng } } },
        });

    test('cart with another seller\'s products is rejected for this delivery address', async () => {
        const kolh = await items(LOC.kolhapurRajarampuri);
        const res = await preview([{ productId: kolh[0]._id, quantity: 1 }], LOC.puneBaner);
        expect(res.status()).toBe(409);
        expect((await res.json()).message).toMatch(/not available for your delivery location/i);
    });

    test('mixed-seller cart is rejected', async () => {
        const kolh = await items(LOC.kolhapurRajarampuri);
        const pune = await items(LOC.puneBaner);
        const res = await preview(
            [{ productId: kolh[0]._id, quantity: 1 }, { productId: pune[0]._id, quantity: 1 }],
            LOC.puneBaner,
        );
        expect(res.status()).toBe(409);
    });

    test('cart from the selected seller is accepted and priced from DB (not client)', async () => {
        const pune = await items(LOC.puneBaner);
        const special = pune.find((p) => p.name.includes('Special Mutton'));
        const res = await preview([{ productId: special._id, quantity: 1, price: 1 }], LOC.puneBaner);
        expect(res.status()).toBe(200);
        const body = JSON.stringify(await res.json());
        expect(body).toContain('1050');
    });

    test('customer outside every radius can still check out with the fallback seller', async () => {
        const list = await items(LOC.mumbaiFallback);
        const res = await preview([{ productId: list[0]._id, quantity: 1 }], LOC.mumbaiFallback);
        expect(res.status()).not.toBe(409);
    });
});

test.describe('UI: customer app', () => {
    const seedLocation = (page, loc) =>
        page.addInitScript((l) => {
            // the app wipes known keys on boot unless the schema marker matches
            localStorage.setItem('appzeto:storage_schema_version', '2');
            if (localStorage.getItem('location_v2')) return; // keep a location the test changed later
            localStorage.setItem(
                'location_v2',
                JSON.stringify({ address: `Test, ${l.city}`, city: l.city, state: 'X', pincode: '000000', latitude: l.lat, longitude: l.lng, time: '12-15 mins' }),
            );
        }, loc);

    for (const key of ['kolhapurRajarampuri', 'puneBaner']) {
        test(`home page (${key}) requests carry coordinates and show only that seller's products`, async ({ page }) => {
            const loc = LOC[key];
            const consoleErrors = [];
            page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
            await seedLocation(page, loc);
            const catalogue = [];
            page.on('response', async (r) => {
                if (/\/api\/(products|offer-sections)(\?|$)/.test(r.url())) catalogue.push(r.url());
            });
            const prodResp = page.waitForResponse((r) => /\/api\/products\?/.test(r.url()) && r.ok());
            await page.goto(`${APP}/`);
            const body = await (await prodResp).json();
            const list = body.result?.items || [];
            expect(list.length).toBeGreaterThan(0);
            expect(new Set(list.map(sid))).toEqual(new Set([sellerIdByEmail[loc.seller]]));
            await page.waitForLoadState('networkidle');
            // every catalogue request carried the customer's coordinates
            for (const u of catalogue) {
                const q = new URL(u).searchParams;
                expect(q.get('lat'), u).toBeTruthy();
                expect(q.get('lng'), u).toBeTruthy();
            }
            // price visible to the customer matches this seller
            const special = list.find((p) => p.name.includes('Special Mutton'));
            expect(special.variants[0].price).toBe(key === 'puneBaner' ? 1050 : 930);
            expect(consoleErrors.filter((e) => !/favicon|Failed to load resource|net::ERR|geolocation|WebSocket|socket/i.test(e))).toEqual([]);
        });
    }

    test('search page uses the selected seller', async ({ page }) => {
        await seedLocation(page, LOC.puneBaner);
        const resp = page.waitForResponse((r) => /\/api\/products\?.*search=/.test(r.url()) && r.ok());
        await page.goto(`${APP}/search?q=mutton`);
        const url = (await resp).url();
        expect(url).toMatch(/lat=18\.559/);
        const body = await (await resp).json();
        const list = body.result?.items || [];
        expect(new Set(list.map(sid)).size).toBe(1);
    });

    test('changing delivery location switches the serving seller (no stale cache)', async ({ page }) => {
        await seedLocation(page, LOC.kolhapurRajarampuri);
        let resp = page.waitForResponse((r) => /\/api\/products\?/.test(r.url()) && r.ok());
        await page.goto(`${APP}/`);
        const first = (await (await resp).json()).result.items;
        expect(sid(first[0])).toBe(sellerIdByEmail['kolhapur5@meatyns.com']);

        // switch address -> new location persisted -> reload as the app would on next visit
        await page.evaluate((l) => {
            localStorage.setItem('appzeto:storage_schema_version', '2');
            localStorage.setItem('location_v2', JSON.stringify({ address: 'Baner, Pune', city: 'Pune', state: 'MH', pincode: '411045', latitude: l.lat, longitude: l.lng, time: '12-15 mins' }));
        }, LOC.puneBaner);
        resp = page.waitForResponse((r) => /\/api\/products\?/.test(r.url()) && r.ok());
        await page.reload();
        const second = (await (await resp).json()).result.items;
        expect(sid(second[0])).toBe(sellerIdByEmail['pune@meatyns.com']);
        expect(sid(second[0])).not.toBe(sid(first[0]));
    });
});
