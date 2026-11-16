import { jest } from "@jest/globals";

const MOCK_PHONE = "8770620342";
const OTHER_PHONE = "9876543210";
const OTHER_PHONE_2 = "9123456780";

const store = new Map(); // phone -> customer doc
const sendSms = jest.fn();

function makeDoc(data) {
  const doc = {
    _id: `id-${data.phone}`,
    isVerified: false,
    otpFailedAttempts: 0,
    otpSessionVersion: 0,
    ...data,
  };
  doc.save = jest.fn().mockImplementation(async () => {
    store.set(doc.phone, doc);
    return doc;
  });
  return doc;
}

jest.unstable_mockModule("../app/models/customer.js", () => ({
  default: {
    findOne: jest.fn(({ phone }) => ({ select: async () => store.get(phone) || null })),
    create: jest.fn(async (d) => {
      const doc = makeDoc(d);
      store.set(doc.phone, doc);
      return doc;
    }),
    findById: jest.fn((id) => ({
      select: async () => [...store.values()].find((c) => c._id === id) || null,
    })),
  },
}));
jest.unstable_mockModule("../app/services/smsIndiaHubService.js", () => ({
  sendSmsIndiaHubOtp: sendSms,
}));
jest.unstable_mockModule("../app/config/redis.js", () => ({ getRedisClient: () => null }));

const { issueCustomerOtp, verifyCustomerOtpCode, isMockOtpPhone } = await import(
  "../app/services/otpAuthService.js"
);

const issue = (phone) => issueCustomerOtp({ rawPhone: phone, flow: "login", ipAddress: "1.1.1.1" });
const verify = (phone, otp) => verifyCustomerOtpCode({ rawPhone: phone, otp, ipAddress: "1.1.1.1" });
const lastSentOtp = () => sendSms.mock.calls.at(-1)[0].otp;
const expire = (phone) => {
  store.get(`+91${phone}`).otpExpiresAt = new Date(Date.now() - 1000);
};
const clearCooldown = (phone) => {
  store.get(`+91${phone}`).otpLastSentAt = new Date(Date.now() - 3600 * 1000);
};

describe("Customer conditional mock OTP", () => {
  beforeEach(() => {
    store.clear();
    sendSms.mockReset().mockResolvedValue({ provider: "test" });
    process.env.OTP_HASH_SECRET = "test-secret";
    process.env.OTP_RESEND_COOLDOWN_SECONDS = "60";
    process.env.OTP_MAX_FAILED_ATTEMPTS = "5";
    process.env.OTP_SEND_LIMIT_PER_WINDOW = "1000";
    process.env.OTP_VERIFY_LIMIT_PER_WINDOW = "1000";
    delete process.env.CUSTOMER_MOCK_OTP_PHONE;
    process.env.USE_MOCK_OTP = "true"; // must NOT leak into the customer flow
    globalThis.__OTP_WINDOW_COUNTER__ = new Map();
  });

  test("mock number: no SMS, 1234 logs in, no OTP in response", async () => {
    const res = await issue(MOCK_PHONE);
    expect(sendSms).not.toHaveBeenCalled();
    expect(res).toEqual({ sent: true, phone: `+91${MOCK_PHONE}` });
    const c = await verify(MOCK_PHONE, "1234");
    expect(c.isVerified).toBe(true);
  });

  test("mock number matches +91 / spaced formats only for that number", () => {
    expect(isMockOtpPhone("+91 87706 20342")).toBe(true);
    expect(isMockOtpPhone("918770620342")).toBe(true);
    expect(isMockOtpPhone(OTHER_PHONE)).toBe(false);
    expect(isMockOtpPhone("+18770620342")).toBe(false);
  });

  test("mock number: wrong OTP rejected", async () => {
    await issue(MOCK_PHONE);
    await expect(verify(MOCK_PHONE, "9999")).rejects.toMatchObject({ statusCode: 400 });
  });

  test("mock number: resend sends no SMS and 1234 still works", async () => {
    await issue(MOCK_PHONE);
    clearCooldown(MOCK_PHONE);
    await issue(MOCK_PHONE);
    expect(sendSms).not.toHaveBeenCalled();
    expect((await verify(MOCK_PHONE, "1234")).phone).toBe(`+91${MOCK_PHONE}`);
  });

  test("other number: real SMS with random OTP, response has no OTP", async () => {
    const res = await issue(OTHER_PHONE);
    expect(sendSms).toHaveBeenCalledTimes(1);
    expect(sendSms.mock.calls[0][0].phone).toBe(`+91${OTHER_PHONE}`);
    expect(res).toEqual({ sent: true, phone: `+91${OTHER_PHONE}` });
    const otp = lastSentOtp();
    expect(otp).toMatch(/^\d{4}$/);
    if (otp !== "1234") {
      await expect(verify(OTHER_PHONE, "1234")).rejects.toMatchObject({ statusCode: 400 });
    }
    expect((await verify(OTHER_PHONE, otp)).isVerified).toBe(true);
  });

  test("other number: 1234 rejected with no challenge and creates no customer", async () => {
    await expect(verify(OTHER_PHONE, "1234")).rejects.toMatchObject({ statusCode: 400 });
    expect(store.has(`+91${OTHER_PHONE}`)).toBe(false);
  });

  test("OTP stored hashed only; reuse blocked", async () => {
    await issue(OTHER_PHONE);
    const otp = lastSentOtp();
    const doc = store.get(`+91${OTHER_PHONE}`);
    expect(doc.otpHash).not.toBe(otp);
    expect(doc.otp).toBeUndefined();
    await verify(OTHER_PHONE, otp);
    await expect(verify(OTHER_PHONE, otp)).rejects.toMatchObject({ statusCode: 400 });
  });

  test("expired OTP rejected", async () => {
    await issue(OTHER_PHONE);
    const otp = lastSentOtp();
    expire(OTHER_PHONE);
    await expect(verify(OTHER_PHONE, otp)).rejects.toMatchObject({ statusCode: 400 });
  });

  test("resend issues a fresh real OTP; cooldown enforced", async () => {
    await issue(OTHER_PHONE);
    const first = lastSentOtp();
    await expect(issue(OTHER_PHONE)).rejects.toMatchObject({ statusCode: 429 });
    clearCooldown(OTHER_PHONE);
    await issue(OTHER_PHONE);
    expect(sendSms).toHaveBeenCalledTimes(2);
    const second = lastSentOtp();
    if (first !== second) {
      await expect(verify(OTHER_PHONE, first)).rejects.toMatchObject({ statusCode: 400 });
    }
    await verify(OTHER_PHONE, second);
  });

  test("cross-mobile: OTP issued for one number cannot verify another", async () => {
    await issue(OTHER_PHONE);
    const otp1 = lastSentOtp();
    await issue(OTHER_PHONE_2);
    const otp2 = lastSentOtp();
    if (otp1 !== otp2) {
      await expect(verify(OTHER_PHONE_2, otp1)).rejects.toMatchObject({ statusCode: 400 });
    }
    const c = await verify(OTHER_PHONE, otp1);
    expect(c.phone).toBe(`+91${OTHER_PHONE}`);
  });

  test("frontend-supplied mock flags are ignored", async () => {
    await issueCustomerOtp({ rawPhone: OTHER_PHONE, flow: "login", mock: true, useMock: true });
    expect(sendSms).toHaveBeenCalledTimes(1);
    const otp = lastSentOtp();
    if (otp !== "1234") {
      await expect(
        verifyCustomerOtpCode({ rawPhone: OTHER_PHONE, otp: "1234", isMock: true, mockOtp: true }),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
  });

  test("SMS provider failure returns error, no silent mock fallback", async () => {
    sendSms.mockRejectedValue(new Error("provider down"));
    await expect(issue(OTHER_PHONE)).rejects.toMatchObject({ statusCode: 502 });
    const doc = store.get(`+91${OTHER_PHONE}`);
    expect(doc.otpHash).toBeFalsy();
    await expect(verify(OTHER_PHONE, "1234")).rejects.toMatchObject({ statusCode: 400 });
  });

  test("repeated wrong OTPs lock out non-mock numbers", async () => {
    await issue(OTHER_PHONE);
    const otp = lastSentOtp();
    const wrong = otp === "0000" ? "1111" : "0000";
    for (let i = 0; i < 4; i++) {
      await expect(verify(OTHER_PHONE, wrong)).rejects.toMatchObject({ statusCode: 400 });
    }
    await expect(verify(OTHER_PHONE, wrong)).rejects.toMatchObject({ statusCode: 423 });
    await expect(verify(OTHER_PHONE, otp)).rejects.toMatchObject({ statusCode: 423 });
  });

  test("mock number is env-configurable and can be disabled", () => {
    process.env.CUSTOMER_MOCK_OTP_PHONE = OTHER_PHONE_2;
    expect(isMockOtpPhone(OTHER_PHONE_2)).toBe(true);
    expect(isMockOtpPhone(MOCK_PHONE)).toBe(false);
    process.env.CUSTOMER_MOCK_OTP_PHONE = "none";
    expect(isMockOtpPhone(OTHER_PHONE_2)).toBe(false);
  });
});
