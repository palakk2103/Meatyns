import { test, expect, request as pwRequest } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Gallery Management module — end-to-end.
 *
 *  1. API security        — always runs (no credentials needed).
 *  2. Customer UI (mocked) — always runs; gallery API responses are stubbed so
 *                            UI behaviour (filters, lightbox, states, profile entry,
 *                            responsive grid) is verified independent of DB content.
 *  3. Admin → customer     — real API + DB. Needs an admin login supplied via
 *                            E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (never committed).
 *                            Every record it creates is deleted in afterAll.
 */

const APP = 'http://localhost:5173';
const API = 'http://localhost:7000/api';
const MOCK_PHONE = '8770620342'; // approved test number (mock OTP 1234)
const MOCK_OTP = '1234';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const HAS_ADMIN = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
const KOLHAPUR = { label: 'B Ward, Mangalwar Peth, Kolhapur', city: 'Kolhapur', lat: 16.6903804, lng: 74.2262781 };
const RUN = Date.now().toString(36);

/* ---------------- helpers ---------------- */

const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};
/** Writes a solid-colour PNG (valid magic bytes, so the server accepts it). */
function makePng(file, [r, g, b], w = 96, h = 72) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const o = y * (w * 3 + 1) + 1 + x * 3;
            raw[o] = r;
            raw[o + 1] = g;
            raw[o + 2] = b;
        }
    }
    fs.writeFileSync(
        file,
        Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
    );
    return file;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-gallery-'));
const IMG = {
    red: makePng(path.join(tmpDir, 'red.png'), [200, 16, 23]),
    gold: makePng(path.join(tmpDir, 'gold.png'), [253, 206, 4]),
    dark: makePng(path.join(tmpDir, 'dark.png'), [26, 26, 26]),
    green: makePng(path.join(tmpDir, 'green.png'), [4, 120, 87]),
};

let api;
let customerToken = '';

async function customerApiLogin() {
    await api.post(`${API}/customer/send-login-otp`, { data: { phone: MOCK_PHONE } });
    const ver = await (await api.post(`${API}/customer/verify-otp`, { data: { phone: MOCK_PHONE, otp: MOCK_OTP } })).json();
    return ver.result?.token || ver.result?.accessToken || ver.token || '';
}

/** Customer session + delivery location seeded the same way a completed login stores them. */
async function seedCustomer(page, { loggedIn = true } = {}) {
    await page.addInitScript(
        ({ token, loc }) => {
            localStorage.setItem('appzeto:storage_schema_version', '2');
            localStorage.setItem(
                'location_v2',
                JSON.stringify({ address: loc.label, city: loc.city, state: 'Maharashtra', pincode: '416012', latitude: loc.lat, longitude: loc.lng, time: '12-15 mins' }),
            );
            if (token && !sessionStorage.getItem('__seeded')) {
                localStorage.setItem('auth_customer', token);
                sessionStorage.setItem('__seeded', '1');
            }
        },
        { token: loggedIn ? customerToken : '', loc: KOLHAPUR },
    );
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
    api = await pwRequest.newContext();
    customerToken = await customerApiLogin();
});
test.afterAll(async () => {
    await api?.dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

/* =====================================================================
   1. API security & public contract
===================================================================== */

test.describe('API security', () => {
    test('admin gallery endpoints reject anonymous and customer callers', async () => {
        const anon = [
            api.get(`${API}/admin/gallery`),
            api.get(`${API}/admin/gallery/stats`),
            api.post(`${API}/admin/gallery`, { data: { title: 'x' } }),
            api.put(`${API}/admin/gallery/settings`, { data: { homepageGalleryEnabled: false } }),
            api.delete(`${API}/admin/gallery/categories/000000000000000000000000`),
            api.post(`${API}/admin/gallery/upload`, { multipart: { images: fs.createReadStream(IMG.red) } }),
        ];
        for (const res of await Promise.all(anon)) expect(res.status()).toBe(401);

        expect(customerToken, 'customer mock login failed').toBeTruthy();
        const headers = { Authorization: `Bearer ${customerToken}` };
        const asCustomer = [
            api.get(`${API}/admin/gallery`, { headers }),
            api.post(`${API}/admin/gallery`, { headers, data: { title: 'Hack', category: '000000000000000000000000' } }),
            api.put(`${API}/admin/gallery/settings`, { headers, data: { homepageGalleryEnabled: false } }),
            api.post(`${API}/admin/gallery/upload`, { headers, multipart: { images: fs.createReadStream(IMG.red) } }),
        ];
        for (const res of await Promise.all(asCustomer)) expect(res.status()).toBe(403);
    });

    test('public endpoints expose only published, display-safe data', async () => {
        const settings = await (await api.get(`${API}/gallery/settings`)).json();
        expect(settings.success).toBe(true);
        expect(settings.result).not.toHaveProperty('updatedBy');

        const cats = await (await api.get(`${API}/gallery/categories`)).json();
        expect(Array.isArray(cats.results)).toBe(true);
        for (const c of cats.results) expect(c).toHaveProperty('galleryCount');

        const list = await (await api.get(`${API}/gallery`, { params: { limit: 48 } })).json();
        for (const g of list.result.items) {
            expect(g).not.toHaveProperty('isPublished');
            expect(g).not.toHaveProperty('createdBy');
            expect(g).not.toHaveProperty('images');
        }
        expect((await api.get(`${API}/gallery/definitely-not-a-gallery-${RUN}`)).status()).toBe(404);
    });
});

/* =====================================================================
   2. Customer UI against stubbed gallery API (always runs)
===================================================================== */

const asset = (name) => `${APP}/categories/${name}`;
const MOCK_CATS = [
    { _id: 'c1', name: 'Openings & Inaugurations', slug: 'openings', displayOrder: 1, galleryCount: 2 },
    { _id: 'c2', name: 'Our Franchises', slug: 'franchises', displayOrder: 2, galleryCount: 1 },
    { _id: 'c3', name: 'Distinguished Visitors', slug: 'visitors', displayOrder: 3, galleryCount: 0 },
];
const card = (i, cat, extra = {}) => ({
    _id: `g${i}`,
    slug: `mock-gallery-${i}`,
    title: `Mock Gallery ${i}`,
    category: { _id: cat._id, name: cat.name, slug: cat.slug },
    franchiseName: i === 2 ? 'Meatyns Pune' : '',
    location: 'FC Road',
    city: 'Pune',
    state: 'Maharashtra',
    eventDate: '2026-05-04T00:00:00.000Z',
    shortDescription: `Short description ${i}`,
    coverImage: asset(i % 2 ? 'chicken.png' : 'beef.png'),
    imageCount: 3,
    ...extra,
});
const MOCK_ITEMS = [card(1, MOCK_CATS[0]), card(2, MOCK_CATS[1]), card(3, MOCK_CATS[0]), card(4, MOCK_CATS[0]), card(5, MOCK_CATS[1])];
const MOCK_SETTINGS = {
    homepageGalleryEnabled: true,
    profileGalleryEnabled: true,
    homepageItemLimit: 4,
    homepageTitle: 'Our Journey & Moments',
    homepageSubtitle: 'Celebrating our milestones, achievements and memorable moments.',
    pageTitle: 'Our Journey & Moments',
    pageDescription: 'Explore the journey of Meatyns.',
};

async function stubGallery(page, overrides = {}) {
    const settings = { ...MOCK_SETTINGS, ...(overrides.settings || {}) };
    const json = (route, result, key = 'result') => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, error: false, message: 'ok', [key]: result }) });
    await page.route(/\/api\/gallery(\/[^?]*)?(\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        const p = url.pathname.replace(/^\/api\/gallery/, '');
        if (overrides.fail) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"message":"boom"}' });
        if (p === '/settings') return json(route, settings);
        if (p === '/categories') return json(route, MOCK_CATS, 'results');
        if (p === '/home') return json(route, { settings, items: settings.homepageGalleryEnabled ? MOCK_ITEMS.slice(0, settings.homepageItemLimit) : [] });
        if (p === '' || p === '/') {
            if (overrides.empty) return json(route, { items: [], pagination: { page: 1, hasMore: false } });
            const cat = url.searchParams.get('category');
            const items = cat ? MOCK_ITEMS.filter((g) => g.category.slug === cat) : MOCK_ITEMS;
            return json(route, { items, pagination: { page: 1, limit: 12, total: items.length, totalPages: 1, hasMore: false } });
        }
        const slug = decodeURIComponent(p.slice(1));
        const g = MOCK_ITEMS.find((x) => x.slug === slug);
        if (!g) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"success":false,"message":"Gallery not found"}' });
        return json(route, {
            ...g,
            description: `Detailed description for ${g.title}.`,
            images: [
                { _id: 'i1', url: asset('chicken.png'), caption: 'Ribbon cutting', altText: 'Ribbon cutting' },
                { _id: 'i2', url: asset('beef.png'), caption: 'Team photo', altText: 'Team' },
                { _id: 'i3', url: `${APP}/does-not-exist-${RUN}.png`, caption: 'Broken', altText: 'Broken' },
            ],
        });
    });
}

test.describe('Customer gallery UI (stubbed data)', () => {
    test('desktop: compact gallery card between category row and Hot Deals, respects limit, View All opens /gallery', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await seedCustomer(page, { loggedIn: false });
        await stubGallery(page);
        await page.goto(`${APP}/`);
        const preview = page.locator('[data-testid="home-gallery-preview"]:visible');
        await expect(preview).toBeVisible({ timeout: 30_000 });
        await expect(preview.getByRole('heading', { name: 'Gallery – Our Journey & Moments' })).toBeVisible();
        await expect(preview.locator('[data-testid="home-gallery-card"]')).toHaveCount(4);

        // Existing shopping sections intact; gallery sits just above Hot Deals (reference design).
        const hot = page.getByRole('heading', { name: /hot deals/i }).filter({ visible: true }).first();
        const trending = page.getByRole('heading', { name: /trending now/i }).filter({ visible: true }).first();
        await expect(hot).toBeVisible();
        await expect(trending).toBeVisible();
        const [hotBox, trendBox, galBox] = await Promise.all([hot.boundingBox(), trending.boundingBox(), preview.boundingBox()]);
        expect(galBox.y).toBeLessThan(hotBox.y);
        expect(hotBox.y).toBeLessThan(trendBox.y);

        await preview.getByTestId('home-gallery-view-all').click();
        await expect(page).toHaveURL(/\/gallery$/);
        await expect(page.getByTestId('gallery-page')).toBeVisible();
    });

    test('homepage preview hides when admin disables it (mobile)', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await seedCustomer(page, { loggedIn: false });
        await stubGallery(page, { settings: { homepageGalleryEnabled: false } });
        await page.goto(`${APP}/`);
        await expect(page.getByRole('heading', { name: /hot deals/i }).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-testid="home-gallery-preview"]:visible')).toHaveCount(0);
    });

    test('mobile: compact gallery card right after Hot Deals, before Top Picks', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await seedCustomer(page, { loggedIn: false });
        await stubGallery(page);
        await page.goto(`${APP}/`);
        const preview = page.locator('[data-testid="home-gallery-preview"]:visible');
        await expect(preview).toBeAttached({ timeout: 30_000 });
        await preview.scrollIntoViewIfNeeded();
        await expect(preview).toBeVisible();
        await expect(preview.getByRole('heading', { name: 'Our Journey & Moments' })).toBeVisible();
        const hot = page.getByRole('heading', { name: /hot deals/i }).filter({ visible: true }).first();
        const picks = page.getByRole('heading', { name: /top picks/i }).filter({ visible: true }).first();
        const galY = (await preview.boundingBox()).y;
        expect((await hot.boundingBox()).y).toBeLessThan(galY);
        expect(galY).toBeLessThan((await picks.boundingBox()).y);
    });

    test('gallery page: dynamic category filters, cards and responsive grid', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await seedCustomer(page, { loggedIn: false });
        await stubGallery(page);
        await page.goto(`${APP}/gallery`);
        const chips = page.getByTestId('gallery-category-chip');
        // "All" + categories that actually have galleries (Visitors has 0 → hidden).
        await expect(chips).toHaveText(['All', 'Openings & Inaugurations', 'Our Franchises']);
        await expect(page.getByTestId('gallery-card')).toHaveCount(5);

        // Mobile: two columns.
        const boxes = await page.getByTestId('gallery-card').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(boxes[0]).toBe(boxes[1]);
        expect(boxes[2]).toBeGreaterThan(boxes[0]);

        await chips.filter({ hasText: 'Our Franchises' }).click();
        await expect(page).toHaveURL(/category=franchises/);
        await expect(page.getByTestId('gallery-card')).toHaveCount(2);
        for (const cat of await page.getByTestId('gallery-card').evaluateAll((els) => els.map((e) => e.dataset.category))) expect(cat).toBe('franchises');
        await expect(page.getByTestId('gallery-hero')).toContainText('Our Journey & Moments');

        await chips.filter({ hasText: 'Openings' }).click();
        await expect(page.getByTestId('gallery-card')).toHaveCount(3);
        await chips.filter({ hasText: 'All' }).click();
        await expect(page.getByTestId('gallery-card')).toHaveCount(5);

        // Desktop: 3+ columns.
        await page.setViewportSize({ width: 1440, height: 900 });
        const tops = await page.getByTestId('gallery-card').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(new Set(tops).size).toBe(1);
    });

    test('gallery detail: event info, lightbox next/prev, broken-image fallback, back', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 860 });
        await seedCustomer(page, { loggedIn: false });
        await stubGallery(page);
        await page.goto(`${APP}/gallery`);
        await page.getByTestId('gallery-card').filter({ hasText: 'Mock Gallery 2' }).click();
        await expect(page).toHaveURL(/\/gallery\/mock-gallery-2$/);
        await expect(page.getByTestId('gallery-detail-title')).toHaveText('Mock Gallery 2');
        const meta = page.getByTestId('gallery-detail-meta');
        await expect(meta).toContainText('Meatyns Pune');
        await expect(meta).toContainText('FC Road, Pune, Maharashtra');
        await expect(meta).toContainText('4 May 2026');
        await expect(page.getByTestId('gallery-detail-description')).toContainText('Detailed description');
        await expect(page.getByTestId('gallery-detail-image')).toHaveCount(3);
        await expect(page.getByTestId('gallery-detail-images').getByTestId('gallery-image-fallback')).toHaveCount(1);

        await page.getByTestId('gallery-detail-image').first().click();
        const box = page.getByTestId('gallery-lightbox');
        await expect(box).toBeVisible();
        const counter = page.getByTestId('gallery-lightbox-counter');
        await expect(counter).toHaveText('1 / 3');
        await expect(box).toContainText('Ribbon cutting');
        await page.getByRole('button', { name: 'Next image' }).click();
        await expect(counter).toHaveText('2 / 3');
        await page.keyboard.press('ArrowRight');
        await expect(counter).toHaveText('3 / 3');
        await page.getByRole('button', { name: 'Previous image' }).click();
        await expect(counter).toHaveText('2 / 3');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await expect(counter).toHaveText('3 / 3'); // wraps around
        await page.keyboard.press('Escape');
        await expect(box).toHaveCount(0);

        await page.getByRole('button', { name: /back to gallery/i }).click();
        await expect(page).toHaveURL(/\/gallery$/);
    });

    test('loading, empty, error and not-found states', async ({ page }) => {
        await seedCustomer(page, { loggedIn: false });
        await stubGallery(page, { empty: true });
        await page.goto(`${APP}/gallery`);
        await expect(page.getByTestId('gallery-empty')).toBeVisible();

        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await stubGallery(page, { fail: true });
        await page.goto(`${APP}/gallery?fail=${RUN}`);
        await expect(page.getByTestId('gallery-error')).toBeVisible();

        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await stubGallery(page);
        await page.goto(`${APP}/gallery/unknown-${RUN}`);
        await expect(page.getByTestId('gallery-detail-missing')).toContainText('not available');
    });

    test('profile Gallery option opens the SAME /gallery page; hidden when disabled', async ({ page }) => {
        expect(customerToken, 'customer mock login failed').toBeTruthy();
        await page.setViewportSize({ width: 390, height: 844 });
        await seedCustomer(page);
        await stubGallery(page);
        await page.goto(`${APP}/profile`);
        await expect(page).toHaveURL(/\/profile$/);
        // Existing profile options untouched.
        for (const label of ['Your Orders', 'Saved Addresses', 'Your Wishlist', 'Help & Support', 'About Us']) {
            await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
        }
        const entry = page.getByRole('link', { name: /^Gallery\b/ });
        await expect(entry).toBeVisible();
        await expect(entry).toContainText('Explore our journey, milestones and memorable moments.');
        await entry.click();
        await expect(page).toHaveURL(/\/gallery$/);
        await expect(page.getByTestId('gallery-page')).toBeVisible();

        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await stubGallery(page, { settings: { profileGalleryEnabled: false } });
        await page.goto(`${APP}/profile?r=${RUN}`);
        await expect(page.getByRole('heading', { name: 'Help & Support', exact: true })).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('link', { name: /^Gallery\b/ })).toHaveCount(0);
    });
});

/* =====================================================================
   3. Admin → customer, real API + DB (needs E2E_ADMIN_EMAIL/PASSWORD)
===================================================================== */

test.describe('Admin gallery management (real data)', () => {
    test.skip(!HAS_ADMIN, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin gallery tests');

    let adminToken = '';
    let adminPage;
    let originalSettings;
    const created = { galleries: [], categories: [] };
    const CAT_NAME = `E2E Moments ${RUN}`;
    const CAT2_NAME = `E2E Archive ${RUN}`;
    const TITLE = `E2E Franchise Opening Pune ${RUN}`;
    const EDITED = `E2E Grand Opening Pune ${RUN}`;
    let slug = '';
    let galleryId = '';

    const ah = () => ({ Authorization: `Bearer ${adminToken}` });
    const adminGet = async (p) => (await api.get(`${API}/admin/gallery${p}`, { headers: ah() })).json();
    const publicStatus = async (s) => (await api.get(`${API}/gallery/${s}`)).status();
    const row = (title) => adminPage.locator(`[data-testid="gallery-admin-row"][data-title="${title}"]`);

    test.beforeAll(async ({ browser }) => {
        const res = await api.post(`${API}/admin/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
        expect(res.ok(), 'admin login failed').toBeTruthy();
        adminToken = (await res.json()).result.token;
        originalSettings = (await adminGet('/settings')).result;

        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        adminPage = await ctx.newPage();
        await adminPage.goto(`${APP}/admin/auth`);
        await adminPage.locator('input[name="email"]').fill(ADMIN_EMAIL);
        await adminPage.locator('input[name="password"]').fill(ADMIN_PASSWORD);
        await adminPage.locator('button[type="submit"]').click();
        await adminPage.waitForURL(/\/admin(\/)?$/);
    });

    test.afterAll(async () => {
        for (const id of created.galleries) await api.delete(`${API}/admin/gallery/${id}`, { headers: ah() });
        for (const id of created.categories) await api.delete(`${API}/admin/gallery/categories/${id}`, { headers: ah() });
        if (originalSettings) {
            const { homepageGalleryEnabled, profileGalleryEnabled, homepageItemLimit } = originalSettings;
            await api.put(`${API}/admin/gallery/settings`, { headers: ah(), data: { homepageGalleryEnabled, profileGalleryEnabled, homepageItemLimit } });
        }
        await adminPage?.context().close();
    });

    test('A1. navigate Content Management → Gallery and see the dashboard', async () => {
        await adminPage.getByText('Content Management', { exact: true }).click();
        await adminPage.getByRole('link', { name: 'Gallery', exact: true }).click();
        await expect(adminPage).toHaveURL(/\/admin\/gallery$/);
        await expect(adminPage.getByTestId('admin-gallery-page')).toBeVisible();
        for (const label of ['Total Galleries', 'Published', 'Drafts', 'Total Images', 'Active Categories']) {
            await expect(adminPage.getByTestId('gallery-stats')).toContainText(label);
        }
    });

    test('A2. add gallery categories', async () => {
        await adminPage.getByRole('tab', { name: 'Categories' }).click();
        for (const name of [CAT_NAME, CAT2_NAME]) {
            await adminPage.getByRole('button', { name: 'Add Category' }).click();
            const form = adminPage.getByTestId('gallery-category-form');
            await form.locator('#c-name').fill(name);
            await form.locator('#c-desc').fill('Created by Playwright');
            await form.getByTestId('gallery-category-save').click();
            await expect(adminPage.locator(`[data-testid="gallery-category-row"][data-name="${name}"]`)).toBeVisible();
        }
        const cats = (await adminGet('/categories')).results;
        for (const name of [CAT_NAME, CAT2_NAME]) {
            const c = cats.find((x) => x.name === name);
            expect(c).toBeTruthy();
            created.categories.push(c._id);
        }
    });

    test('A3–A7. create gallery with images, cover, franchise details; save as DRAFT', async () => {
        await adminPage.getByRole('tab', { name: 'Galleries' }).click();
        await adminPage.getByRole('button', { name: 'Add New Gallery' }).click();
        const modal = adminPage.getByTestId('gallery-form-modal');
        await modal.locator('#g-title').fill(TITLE);
        await expect(modal.locator('#g-slug')).toHaveValue(/^e2e-franchise-opening-pune-/);
        await modal.locator('#g-category').selectOption({ label: CAT_NAME });
        await modal.locator('#g-franchise').fill('Meatyns Pune');
        await modal.locator('#g-location').fill('FC Road');
        await modal.locator('#g-city').fill('Pune');
        await modal.locator('#g-state').fill('Maharashtra');
        await modal.locator('#g-date').fill('2026-05-04');
        await modal.locator('#g-short').fill('Highlights from the grand opening ceremony.');
        await modal.locator('#g-desc').fill('Highlights from the grand opening ceremony of our Pune franchise.');
        await modal.getByTestId('gallery-image-input').setInputFiles([IMG.red, IMG.gold, IMG.dark]);
        await expect(modal.getByTestId('gallery-image-row')).toHaveCount(3);
        await modal.getByTestId('gallery-image-row').nth(0).getByLabel('Caption for image 1').fill('Ribbon cutting');
        await modal.getByTestId('gallery-set-cover').nth(1).click(); // gold = cover
        await modal.getByTestId('gallery-save-draft').click();
        await expect(modal).toHaveCount(0, { timeout: 30_000 });

        const list = (await adminGet(`?search=${encodeURIComponent(TITLE)}`)).result.items;
        expect(list).toHaveLength(1);
        galleryId = list[0]._id;
        created.galleries.push(galleryId);
        const g = (await adminGet(`/${galleryId}`)).result;
        slug = g.slug;
        expect(g.isPublished).toBe(false);
        expect(g.franchiseName).toBe('Meatyns Pune');
        expect(g.images).toHaveLength(3);
        expect(g.images[0].caption).toBe('Ribbon cutting');
        expect(g.coverImage).toBe(g.images[1].url);
        expect(g.images[0].url).toContain('/uploads/gallery/');
    });

    test('A8. draft content is NOT publicly visible', async () => {
        expect(await publicStatus(slug)).toBe(404);
        expect(await publicStatus(galleryId)).toBe(404);
        const all = (await (await api.get(`${API}/gallery`, { params: { limit: 48 } })).json()).result.items;
        expect(all.find((g) => g._id === galleryId)).toBeUndefined();
        const home = (await (await api.get(`${API}/gallery/home`)).json()).result.items;
        expect(home.find((g) => g._id === galleryId)).toBeUndefined();
    });

    test('A9–A10. publish from the list → visible on customer side (homepage, page, detail)', async ({ page }) => {
        await expect(row(TITLE)).toBeVisible();
        await row(TITLE).getByTestId('row-toggle-featured').click();
        await expect(row(TITLE).getByTestId('row-toggle-featured')).toHaveAttribute('aria-checked', 'true');
        await row(TITLE).getByTestId('row-toggle-published').click();
        await expect(row(TITLE).getByTestId('row-toggle-published')).toHaveAttribute('aria-checked', 'true');
        await expect.poll(() => publicStatus(slug)).toBe(200);

        await page.setViewportSize({ width: 1440, height: 900 });
        await seedCustomer(page, { loggedIn: false });
        await page.goto(`${APP}/`);
        const preview = page.locator('[data-testid="home-gallery-preview"]:visible');
        await expect(preview).toBeVisible({ timeout: 30_000 });
        await expect(preview).toContainText(TITLE); // featured → first

        await page.goto(`${APP}/gallery?category=${encodeURIComponent((await adminGet(`/${galleryId}`)).result.category.slug)}`);
        await expect(page.getByTestId('gallery-card')).toHaveCount(1);
        await page.getByTestId('gallery-card').click();
        await expect(page.getByTestId('gallery-detail-title')).toHaveText(TITLE);
        await expect(page.getByTestId('gallery-detail-meta')).toContainText('Meatyns Pune');
        await expect(page.getByTestId('gallery-detail-image')).toHaveCount(3);
    });

    test('A11–A12. edit title/description and replace an image', async () => {
        const before = (await adminGet(`/${galleryId}`)).result;
        await row(TITLE).getByRole('button', { name: `Edit ${TITLE}` }).click();
        const modal = adminPage.getByTestId('gallery-form-modal');
        await expect(modal.locator('#g-title')).toHaveValue(TITLE);
        await modal.locator('#g-title').fill(EDITED);
        await modal.locator('#g-desc').fill('Updated description by Playwright.');
        await modal.getByTestId('gallery-replace-image').nth(2).click();
        await modal.getByTestId('gallery-replace-input').setInputFiles(IMG.green);
        await expect(modal.getByTestId('gallery-image-row').nth(2)).toContainText('NEW');
        await modal.getByTestId('gallery-save-publish').click();
        await expect(modal).toHaveCount(0, { timeout: 30_000 });

        const after = (await adminGet(`/${galleryId}`)).result;
        expect(after.title).toBe(EDITED);
        expect(after.description).toBe('Updated description by Playwright.');
        expect(after.slug).toBe(before.slug); // slug kept stable on edit
        expect(after.images[2].url).not.toBe(before.images[2].url);
        expect(after.images[0].url).toBe(before.images[0].url);
        // Replaced file is no longer referenced → removed from storage.
        expect((await api.get(before.images[2].url)).status()).toBe(404);
        const pub = await (await api.get(`${API}/gallery/${slug}`)).json();
        expect(pub.result.title).toBe(EDITED);
    });

    test('A13. reorder gallery items', async () => {
        // Second published gallery via API so there is something to reorder against.
        const up = await api.post(`${API}/admin/gallery/upload`, { headers: ah(), multipart: { images: fs.createReadStream(IMG.dark) } });
        const url = (await up.json()).result.images[0].url;
        const res = await api.post(`${API}/admin/gallery`, {
            headers: ah(),
            data: { title: `E2E Second ${RUN}`, category: created.categories[0], isPublished: true, images: [{ url }], displayOrder: 0 },
        });
        expect(res.status()).toBe(201);
        created.galleries.push((await res.json()).result._id);

        await adminPage.reload();
        await adminPage.getByLabel('Search galleries').fill('');
        const rows = adminPage.getByTestId('gallery-admin-row');
        await expect(rows.first()).toBeVisible();
        const titles = await rows.evaluateAll((els) => els.map((e) => e.dataset.title));
        const idx = titles.indexOf(EDITED);
        expect(idx).toBeGreaterThan(-1);
        const direction = idx > 0 ? 'up' : 'down';
        await adminPage.getByRole('button', { name: `Move ${EDITED} ${direction}` }).click();
        await expect.poll(async () => (await rows.evaluateAll((els) => els.map((e) => e.dataset.title))).indexOf(EDITED)).toBe(direction === 'up' ? idx - 1 : idx + 1);
        // Persisted server-side.
        const order = (await adminGet('?sort=order&limit=100')).result.items.map((g) => g.title);
        expect(order.indexOf(EDITED)).toBe(direction === 'up' ? idx - 1 : idx + 1);
    });

    test('A14–A16. disabling homepage and Profile visibility hides both entry points', async ({ page }) => {
        await adminPage.getByRole('tab', { name: 'Display Settings' }).click();
        const form = adminPage.getByTestId('gallery-settings-form');
        const setToggle = async (id, value) => {
            const t = form.getByTestId(id);
            if ((await t.getAttribute('aria-checked')) !== String(value)) await t.click();
        };
        await setToggle('settings-homepage-toggle', false);
        await setToggle('settings-profile-toggle', false);
        await form.getByTestId('gallery-settings-save').click();
        await expect.poll(async () => (await adminGet('/settings')).result.homepageGalleryEnabled).toBe(false);
        const pub = (await (await api.get(`${API}/gallery/home`)).json()).result;
        expect(pub.items).toHaveLength(0);

        await page.setViewportSize({ width: 390, height: 844 });
        await seedCustomer(page);
        await page.goto(`${APP}/`);
        await expect(page.getByRole('heading', { name: /hot deals/i }).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-testid="home-gallery-preview"]:visible')).toHaveCount(0);
        await page.goto(`${APP}/profile`);
        await expect(page.getByRole('heading', { name: 'Help & Support', exact: true })).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('link', { name: /^Gallery\b/ })).toHaveCount(0);
        // Direct page still works (only the entry points are hidden).
        await page.goto(`${APP}/gallery`);
        await expect(page.getByTestId('gallery-page')).toBeVisible();

        await setToggle('settings-homepage-toggle', true);
        await setToggle('settings-profile-toggle', true);
        await form.getByTestId('gallery-settings-save').click();
        await expect.poll(async () => (await adminGet('/settings')).result.profileGalleryEnabled).toBe(true);
        await page.goto(`${APP}/profile?again=1`);
        await expect(page.getByRole('link', { name: /^Gallery\b/ })).toBeVisible({ timeout: 20_000 });
    });

    test('A17. category delete requires reassignment; gallery delete is safe', async () => {
        // Category with galleries cannot be deleted without a target.
        const blocked = await api.delete(`${API}/admin/gallery/categories/${created.categories[0]}`, { headers: ah() });
        expect(blocked.status()).toBe(409);
        expect((await blocked.json()).result.requiresReassignment).toBe(true);

        await adminPage.getByRole('tab', { name: 'Categories' }).click();
        await adminPage.getByRole('button', { name: `Delete ${CAT_NAME}` }).click();
        const dlg = adminPage.getByTestId('gallery-category-delete');
        await dlg.getByLabel('Move galleries to').selectOption({ label: CAT2_NAME });
        await dlg.getByRole('button', { name: 'Move & Delete' }).click();
        await expect(adminPage.locator(`[data-testid="gallery-category-row"][data-name="${CAT_NAME}"]`)).toHaveCount(0);
        created.categories.shift();
        const moved = (await adminGet(`/${galleryId}`)).result;
        expect(moved.category._id).toBe(created.categories[0]);

        // Gallery delete through UI with confirmation.
        const images = moved.images.map((i) => i.url);
        await adminPage.getByRole('tab', { name: 'Galleries' }).click();
        await adminPage.getByRole('button', { name: `Delete ${EDITED}` }).click();
        await adminPage.getByRole('button', { name: 'Delete', exact: true }).click();
        await expect(row(EDITED)).toHaveCount(0);
        created.galleries = created.galleries.filter((id) => id !== galleryId);
        expect((await api.get(`${API}/admin/gallery/${galleryId}`, { headers: ah() })).status()).toBe(404);
        expect(await publicStatus(slug)).toBe(404);
        for (const u of images) expect((await api.get(u)).status()).toBe(404);
        // The other gallery and its image are untouched.
        const other = (await adminGet(`/${created.galleries[0]}`)).result;
        expect((await api.get(other.images[0].url)).status()).toBe(200);
    });
});
