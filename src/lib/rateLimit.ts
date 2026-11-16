/**
 * Pure Picks - In-Memory Sliding Window Rate Limiter & Account Protection Engine
 * 
 * Provides:
 * - Thread-safe, sliding-window rate limiting by IP and Account Identifier
 * - Progressive delays and temporary account lockout (after 5 failed attempts, 15 min lock)
 * - Safe temporary lockouts (avoids permanent account lockout that attackers can weaponize)
 * - Structured security audit logging without logging sensitive passwords or OTPs
 */

interface RateLimitRecord {
  timestamps: number[];
}

interface FailedLoginRecord {
  failedCount: number;
  lastFailedAt: number;
  lockoutUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const failedLoginStore = new Map<string, FailedLoginRecord>();

// Maximum failed login attempts allowed before temporary lockout
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
// Temporary lockout window: 15 minutes (900,000 ms)
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// Cleanup stale records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });

    failedLoginStore.forEach((record, key) => {
      if (record.lockoutUntil && record.lockoutUntil < now && now - record.lastFailedAt > 60 * 60 * 1000) {
        failedLoginStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Requirement 1 & 2: Checks if an action is within rate limits.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside of the sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Requirement 3 & 4: Checks if an account identifier is currently under temporary lockout.
 */
export function checkAccountLockout(identifier: string): { isLocked: boolean; retryAfterSeconds: number } {
  const normKey = identifier.toLowerCase().trim();
  const record = failedLoginStore.get(normKey);

  if (!record || !record.lockoutUntil) {
    return { isLocked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  if (record.lockoutUntil > now) {
    const retryAfterMs = record.lockoutUntil - now;
    return {
      isLocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  // Lockout expired: reset lockout status (Requirement 4: Avoid permanent lockout)
  record.lockoutUntil = null;
  record.failedCount = 0;
  return { isLocked: false, retryAfterSeconds: 0 };
}

/**
 * Requirement 3: Records a failed login attempt for an identifier.
 * Implements progressive delays and temporary lockout after MAX_FAILED_LOGIN_ATTEMPTS.
 */
export function recordFailedLogin(
  identifier: string,
  ip: string
): { isLocked: boolean; attempts: number; retryAfterSeconds: number; delayMs: number } {
  const normKey = identifier.toLowerCase().trim();
  const now = Date.now();

  let record = failedLoginStore.get(normKey);
  if (!record) {
    record = { failedCount: 0, lastFailedAt: now, lockoutUntil: null };
    failedLoginStore.set(normKey, record);
  }

  // If previous failure was more than 15 minutes ago, reset count
  if (now - record.lastFailedAt > LOCKOUT_DURATION_MS && !record.lockoutUntil) {
    record.failedCount = 0;
  }

  record.failedCount += 1;
  record.lastFailedAt = now;

  let delayMs = 0;
  // Progressive delays for repeated failures
  if (record.failedCount === 3) delayMs = 1000;
  else if (record.failedCount === 4) delayMs = 2000;

  if (record.failedCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    logSecurityEvent({
      type: 'ACCOUNT_TEMPORARY_LOCKOUT',
      identifier: normKey,
      ip,
      details: `Account temporarily locked out for 15 minutes after ${record.failedCount} failed attempts.`,
    });

    return {
      isLocked: true,
      attempts: record.failedCount,
      retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      delayMs: 0,
    };
  }

  logSecurityEvent({
    type: 'LOGIN_FAILURE',
    identifier: normKey,
    ip,
    details: `Failed login attempt ${record.failedCount} of ${MAX_FAILED_LOGIN_ATTEMPTS}.`,
  });

  return {
    isLocked: false,
    attempts: record.failedCount,
    retryAfterSeconds: 0,
    delayMs,
  };
}

/**
 * Resets failed login records upon successful authentication.
 */
export function clearFailedLogins(identifier: string): void {
  const normKey = identifier.toLowerCase().trim();
  failedLoginStore.delete(normKey);
}

/**
 * Requirement 10: Security audit logger.
 * Masks identifiers and NEVER logs passwords, hashes, or OTPs.
 */
export function logSecurityEvent({
  type,
  identifier,
  ip,
  details,
}: {
  type: string;
  identifier?: string;
  ip: string;
  details?: string;
}): void {
  let maskedIdentifier = 'unknown';
  if (identifier) {
    const atIdx = identifier.indexOf('@');
    if (atIdx > 1) {
      // Email masking: j***e@domain.com
      const userPart = identifier.slice(0, atIdx);
      const domainPart = identifier.slice(atIdx);
      maskedIdentifier = `${userPart[0]}***${userPart[userPart.length - 1]}${domainPart}`;
    } else if (identifier.length >= 7) {
      // Phone masking: 98****1234
      maskedIdentifier = `${identifier.slice(0, 2)}****${identifier.slice(-4)}`;
    } else {
      maskedIdentifier = `${identifier[0]}***`;
    }
  }

  const timestamp = new Date().toISOString();
  console.log(
    `[SECURITY AUDIT] [${timestamp}] [${type}] IP: ${ip} | Identifier: ${maskedIdentifier} | ${details || ''}`
  );
}

/**
 * Reset rate limit stores for testing environments.
 */
export function resetRateLimitsForTesting(): void {
  rateLimitStore.clear();
  failedLoginStore.clear();
}

/**
 * Extracts client IP safely from NextRequest headers.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
