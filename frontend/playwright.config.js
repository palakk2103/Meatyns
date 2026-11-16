import { defineConfig } from '@playwright/test';

// Customer persistent-login e2e. Expects the API on :7000 and Vite on :5173
// (started automatically when not already running). Uses the approved mock
// OTP test number (backend CUSTOMER_MOCK_OTP_PHONE) — no OTP security is bypassed.
export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    workers: 1,
    fullyParallel: false,
    reporter: [['list']],
    use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
    webServer: [
        {
            command: 'node index.js',
            cwd: '../backend',
            url: 'http://localhost:7000/health',
            reuseExistingServer: true,
            timeout: 120_000,
        },
        {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 120_000,
        },
    ],
});
