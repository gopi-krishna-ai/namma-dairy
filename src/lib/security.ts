import crypto from 'crypto';

const PEPPER = process.env.OTP_PEPPER_SECRET || process.env.JWT_SECRET || 'pure-picks-otp-pepper-secret-2026';

/**
 * Generates a cryptographically secure 6-digit numeric OTP using Node.js crypto.
 * Range: 100000 - 999999 (inclusive)
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Securely hashes an OTP using SHA-256 with an application-level pepper.
 */
export function hashOtp(otp: string): string {
  return crypto
    .createHash('sha256')
    .update(`${otp.trim()}:${PEPPER}`)
    .digest('hex');
}

/**
 * Constant-time hash comparison to prevent timing side-channel attacks.
 */
export function timingSafeMatch(candidate: string, targetHash: string): boolean {
  try {
    const candidateHash = hashOtp(candidate);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const targetBuf = Buffer.from(targetHash, 'hex');

    if (candidateBuf.length !== targetBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuf, targetBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy, cryptographically random single-use reset token.
 * 256-bit entropy (64 hex characters)
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a reset token for storage in the database.
 */
export function hashResetToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(`RESET:${token.trim()}:${PEPPER}`)
    .digest('hex');
}

/**
 * Constant-time comparison for reset tokens.
 */
export function timingSafeTokenMatch(candidateToken: string, storedHash: string): boolean {
  try {
    const candidateHash = hashResetToken(candidateToken);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const targetBuf = Buffer.from(storedHash, 'hex');

    if (candidateBuf.length !== targetBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuf, targetBuf);
  } catch {
    return false;
  }
}

/**
 * Masks an email for safe frontend display without exposing the full identifier.
 * e.g. "krishnagopi@gmail.com" -> "k**********i@gmail.com"
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const maskedLocal = local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}
