// In-memory OTP cache with 10-minute time-to-live

interface OtpRecord {
  code: string;
  expiresAt: number;
}

// Global store to survive hot-reloads during development
const globalForOtp = global as unknown as { otpCache?: Map<string, OtpRecord> };
export const otpCache = globalForOtp.otpCache || new Map<string, OtpRecord>();
if (process.env.NODE_ENV !== 'production') globalForOtp.otpCache = otpCache;

export function storeOtp(email: string, code: string, ttlMinutes = 10): void {
  const normalized = email.toLowerCase().trim();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  otpCache.set(normalized, { code, expiresAt });
}

export function verifyOtp(email: string, inputCode: string): { valid: boolean; reason?: string } {
  const normalized = email.toLowerCase().trim();
  const record = otpCache.get(normalized);

  if (!record) {
    return { valid: false, reason: 'No OTP found. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpCache.delete(normalized);
    return { valid: false, reason: 'This OTP has expired. Please request a fresh code.' };
  }

  if (record.code !== inputCode.trim()) {
    return { valid: false, reason: 'Invalid OTP code. Please check your email and try again.' };
  }

  // Clear once successfully used
  otpCache.delete(normalized);
  return { valid: true };
}
