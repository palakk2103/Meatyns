const MOCK_OTP = "1234";

export const isMockOtpPermitted = () => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.USE_MOCK_OTP === "true" ||
    process.env.USE_MOCK_OTP === "1"
  );
};

export const useRealSMS = () => {
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  if (
    process.env.USE_MOCK_OTP === "true" ||
    process.env.USE_MOCK_OTP === "1"
  ) {
    return false;
  }
  return process.env.USE_REAL_SMS === "true" || process.env.USE_REAL_SMS === "1";
};

const OTP_LENGTH = Math.max(4, parseInt(process.env.OTP_LENGTH || "4", 10));

function randomOtp(length) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export const generateOTP = () => {
  if (isMockOtpPermitted()) {
    return MOCK_OTP;
  }
  return randomOtp(OTP_LENGTH);
};

export { MOCK_OTP };
