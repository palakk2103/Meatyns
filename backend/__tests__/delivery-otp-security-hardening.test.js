import { jest } from '@jest/globals';
import crypto from 'crypto';

const mockOrderFindOne = jest.fn();
const mockOrderOtpHashCode = jest.fn();
const mockOrderOtpFindOne = jest.fn();
const mockOrderOtpUpdateMany = jest.fn();
const mockOrderOtpCreate = jest.fn();

jest.unstable_mockModule('../app/models/order.js', () => ({
  default: {
    findOne: mockOrderFindOne,
  },
}));

jest.unstable_mockModule('../app/models/orderOtp.js', () => ({
  default: {
    hashCode: mockOrderOtpHashCode,
    findOne: mockOrderOtpFindOne,
    updateMany: mockOrderOtpUpdateMany,
    create: mockOrderOtpCreate,
  },
}));

const {
  validateDeliveryOtp,
  validateReturnPickupOtp,
  validateReturnDropOtp,
  isMockDeliveryOtpPermitted,
} = await import('../app/services/deliveryOtpService.js');

describe('P0 Delivery OTP Security Hardening Regressions', () => {
  const originalEnv = process.env;
  const orderId = 'ORD-SEC-999';
  const realOtp = '8492';
  const realOtpHash = crypto.createHash('sha256').update(realOtp).digest('hex');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockOrderOtpHashCode.mockImplementation((otp) =>
      crypto.createHash('sha256').update(String(otp)).digest('hex')
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('strictly rejects mock OTP "1234" in production even if USE_MOCK_OTP is enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.USE_MOCK_OTP = 'true';
    process.env.ALLOW_MOCK_DELIVERY_OTP = 'true';

    expect(isMockDeliveryOtpPermitted()).toBe(false);

    const activeOtpRecord = {
      orderId,
      codeHash: realOtpHash, // Hash of 8492
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      maxAttempts: 3,
      consumedAt: null,
      save: jest.fn().mockResolvedValue({}),
    };

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(activeOtpRecord),
    });

    const result = await validateDeliveryOtp(orderId, '1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OTP_MISMATCH');
    expect(activeOtpRecord.attempts).toBe(1);
    expect(activeOtpRecord.save).toHaveBeenCalled();
  });

  it('rejects delivery verification when no OTP record exists', async () => {
    process.env.NODE_ENV = 'development';
    process.env.USE_MOCK_OTP = 'true';

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    const result = await validateDeliveryOtp(orderId, '1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OTP_NOT_FOUND');
  });

  it('rejects expired OTP even if entered code is "1234"', async () => {
    process.env.NODE_ENV = 'development';
    process.env.USE_MOCK_OTP = 'true';

    const expiredRecord = {
      orderId,
      codeHash: realOtpHash,
      expiresAt: new Date(Date.now() - 10000), // Expired
      attempts: 0,
      maxAttempts: 3,
      consumedAt: null,
      save: jest.fn().mockResolvedValue({}),
    };

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(expiredRecord),
    });

    const result = await validateDeliveryOtp(orderId, '1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OTP_EXPIRED');
  });

  it('rejects already consumed OTP even if entered code is "1234"', async () => {
    process.env.NODE_ENV = 'development';
    process.env.USE_MOCK_OTP = 'true';

    const consumedRecord = {
      orderId,
      codeHash: realOtpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 1,
      maxAttempts: 3,
      consumedAt: new Date(Date.now() - 2000),
      save: jest.fn().mockResolvedValue({}),
    };

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(consumedRecord),
    });

    const result = await validateDeliveryOtp(orderId, '1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OTP_CONSUMED');
  });

  it('rejects validation when max attempts have been exceeded', async () => {
    process.env.NODE_ENV = 'development';
    process.env.USE_MOCK_OTP = 'true';

    const exhaustedRecord = {
      orderId,
      codeHash: realOtpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 3,
      maxAttempts: 3,
      consumedAt: null,
      save: jest.fn().mockResolvedValue({}),
    };

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(exhaustedRecord),
    });

    const result = await validateDeliveryOtp(orderId, '1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('MAX_ATTEMPTS_EXCEEDED');
  });

  it('authenticates valid real OTP successfully and marks as consumed', async () => {
    process.env.NODE_ENV = 'production';

    const validRecord = {
      orderId,
      codeHash: realOtpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      maxAttempts: 3,
      consumedAt: null,
      save: jest.fn().mockResolvedValue({}),
    };

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(validRecord),
    });

    const result = await validateDeliveryOtp(orderId, realOtp);
    expect(result.valid).toBe(true);
    expect(result.message).toMatch(/validated successfully/i);
    expect(validRecord.consumedAt).toBeInstanceOf(Date);
    expect(validRecord.save).toHaveBeenCalled();
  });

  it('enforces same security checks for return pickup OTP', async () => {
    process.env.NODE_ENV = 'production';

    // 1. Missing OTP record
    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });
    const missingRes = await validateReturnPickupOtp(orderId, '1234');
    expect(missingRes.valid).toBe(false);
    expect(missingRes.error).toBe('OTP_NOT_FOUND');

    // 2. Mock OTP rejected in production
    const validRecord = {
      orderId,
      codeHash: realOtpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      maxAttempts: 3,
      consumedAt: null,
      save: jest.fn().mockResolvedValue({}),
    };
    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(validRecord),
    });
    const mismatchRes = await validateReturnPickupOtp(orderId, '1234');
    expect(mismatchRes.valid).toBe(false);
    expect(mismatchRes.error).toBe('OTP_MISMATCH');
  });

  it('enforces same security checks for return drop OTP', async () => {
    process.env.NODE_ENV = 'production';

    mockOrderOtpFindOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });
    const missingRes = await validateReturnDropOtp(orderId, '1234');
    expect(missingRes.valid).toBe(false);
    expect(missingRes.error).toBe('OTP_NOT_FOUND');
  });
});
