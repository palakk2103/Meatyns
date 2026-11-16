import { test, expect, chromium, request as pwRequest } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = 'http://localhost:5173';
const API = 'http://localhost:7000/api';
const MOCK_PHONE = '8770620342'; // approved test number (mock OTP 1234, no SMS)
const MOCK_OTP = '1234';
const PROTECTED_PAGES = ['/profile', '/wishlist', '/orders'];

// Structurally valid but expired + unsigned access token.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const expiredJwt = () =>
    `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 'x', role: 'customer', exp: 1000 })}.sig`;

async function uiLogin(page, phone = MOCK_PHONE, otp = MOCK_OTP) {
    await page.goto(`${APP}/login`);
    // The page renders desktop + mobile layouts; drive whichever is visible.
    const phoneInput = page.locator('input[name="phone"]:visible').first();
    await phoneInput.fill(phone);
    await phoneInput.press('Enter');
    const otpInput = page.locator('input[aria-label="4-digit OTP code"]:visible').first();
    await otpInput.fill(otp);
    await otpInput.press('Enter');
}
const token = (page) => page.evaluate(() => localStorage.getItem('auth_customer'));
const refreshCookie = async (ctx) => (await ctx.cookies(`${API}/customer`)).find((c) => c.name === 'mt_rt');
const expectStaysOn = async (page, p) => {
    await page.goto(`${APP}${p}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`${p}$`));
};

test.describe.configure({ mode: 'serial' });

let userDataDir;
let context;
let page;

async function reopenBrowser() {
    await context.close();
    context = await chromium.launchPersistentContext(userDataDir);
    page = context.pages()[0] || (await context.newPage());
}

test.beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-e2e-'));
    context = await chromium.launchPersistentContext(userDataDir);
    page = context.pages()[0] || (await context.newPage());
});
test.afterAll(async () => {
    await context?.close().catch(() => {});
    fs.rmSync(userDataDir, { recursive: true, force: true });
});

test('1. logs in with mobile + OTP; refresh cookie is HttpOnly and not readable by JS', async () => {
    await uiLogin(page);
    await page.waitForURL(`${APP}/`);
    expect(await token(page)).toBeTruthy();
    const cookie = await refreshCookie(context);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 30 * 86400);
    expect(await page.evaluate(() => document.cookie)).not.toContain('mt_rt');
    const storage = await page.evaluate(
        () => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    );
    expect(storage).not.toContain(cookie.value);
});

test('2. page refresh keeps the customer logged in', async () => {
    await expectStaysOn(page, '/profile');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/profile$/);
});

test('5. navigating between protected pages stays authenticated', async () => {
    for (const p of PROTECTED_PAGES) await expectStaysOn(page, p);
    await page.goto(`${APP}/`);
    await expectStaysOn(page, '/profile');
});

test('3/4. full browser close + reopen (repeatedly) never asks for OTP again', async () => {
    for (let i = 0; i < 3; i++) {
        await reopenBrowser();
        const otpCalls = [];
        page.on('request', (r) => {
            if (/send-login-otp|verify-otp/.test(r.url())) otpCalls.push(r.url());
        });
        await expectStaysOn(page, '/profile');
        expect(otpCalls).toEqual([]);
        expect(await token(page)).toBeTruthy();
    }
});

test('3b. restores the session from the cookie even if localStorage was evicted', async () => {
    await page.evaluate(() => localStorage.clear());
    const refreshCalls = [];
    page.on('request', (r) => r.url().endsWith('/customer/refresh') && refreshCalls.push(r));
    await expectStaysOn(page, '/profile');
    expect(refreshCalls.length).toBe(1); // exactly one refresh, no loop
    expect(await token(page)).toBeTruthy();
});

test('6. multiple tabs share the session; logout in one tab logs out the other', async () => {
    const tab2 = await context.newPage();
    await expectStaysOn(tab2, '/profile');
    expect(await token(tab2)).toBe(await token(page));

    await page.goto(`${APP}/profile`);
    await page.getByRole('button', { name: /sign ?out|log ?out/i }).click();
    await page.waitForURL(/\/login/);
    await expect(tab2).toHaveURL(/\/login/, { timeout: 10_000 });
    await tab2.close();
});

test('7/8. manual logout clears credentials; reopening does not authenticate', async () => {
    expect(await token(page)).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('auth_customer_session'))).toBeNull();
    expect(await refreshCookie(context)).toBeUndefined();

    await reopenBrowser();
    await page.goto(`${APP}/profile`);
    await page.waitForURL(/\/login/);
    expect(await token(page)).toBeNull();
});

test('OTP is still enforced: wrong OTP is rejected and creates no session', async () => {
    const res = await context.request.post(`${API}/customer/verify-otp`, {
        data: { phone: `+91${MOCK_PHONE}`, otp: '0000' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.headers()['set-cookie']).toBeUndefined();
    expect(await refreshCookie(context)).toBeUndefined();
});

test('9. expired access token is silently refreshed from a valid session', async () => {
    await uiLogin(page);
    await page.waitForURL(`${APP}/`);
    await page.evaluate((t) => localStorage.setItem('auth_customer', t), expiredJwt());
    const refreshes = [];
    page.on('response', (r) => r.url().endsWith('/customer/refresh') && refreshes.push(r.status()));
    await expectStaysOn(page, '/profile');
    expect(refreshes).toEqual([200]);
    const renewed = await token(page);
    expect(renewed).not.toBe(expiredJwt());
    expect(renewed.split('.')).toHaveLength(3);
});

test('11. network failure during restore does not log the customer out', async () => {
    await page.evaluate((t) => localStorage.setItem('auth_customer', t), expiredJwt());
    await page.route('**/customer/refresh', (r) => r.abort('internetdisconnected'));
    await page.goto(`${APP}/profile`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    expect(await token(page)).toBeTruthy(); // credentials kept
    expect(await page.evaluate(() => localStorage.getItem('auth_customer_session'))).toBe('1');
    await page.unroute('**/customer/refresh');
    // Connectivity returns -> next load restores normally.
    await expectStaysOn(page, '/profile');
    expect(await token(page)).not.toBe(expiredJwt());
});

test('10. revoked / tampered refresh sessions are rejected securely', async () => {
    const tampered = await pwRequest.newContext({ extraHTTPHeaders: { cookie: 'mt_rt=not-a-real-token' } });
    expect((await tampered.post(`${API}/customer/refresh`)).status()).toBe(401);
    const anon = await pwRequest.newContext();
    expect((await anon.post(`${API}/customer/refresh`)).status()).toBe(401);

    // Revoke server-side with the real cookie from a separate client; the
    // browser (still holding the cookie) must then be sent to /login.
    const real = await refreshCookie(context);
    const other = await pwRequest.newContext({ extraHTTPHeaders: { cookie: `mt_rt=${real.value}` } });
    expect((await other.post(`${API}/customer/logout`)).status()).toBe(200);
    expect((await other.post(`${API}/customer/refresh`)).status()).toBe(401);

    await page.evaluate((t) => localStorage.setItem('auth_customer', t), expiredJwt());
    await page.goto(`${APP}/profile`);
    await page.waitForURL(/\/login/);
    expect(await token(page)).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('auth_customer_session'))).toBeNull();
});

test('12. fresh OTP login still works after a revoked session', async () => {
    await uiLogin(page);
    await page.waitForURL(`${APP}/`);
    expect(await token(page)).toBeTruthy();
    expect((await refreshCookie(context))?.httpOnly).toBe(true);
    await expectStaysOn(page, '/profile');
});
