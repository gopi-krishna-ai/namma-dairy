import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export const AUTH_COOKIE_NAME = 'namma_token';
export const JWT_ISSUER = 'purepicks:auth';
export const JWT_AUDIENCE = 'purepicks:app';

/**
 * Validates and retrieves the JWT_SECRET from environment variables.
 * Requirement 1: Hardcoded fallback removed.
 * Requirement 2: Authentication fails securely if missing.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error(
      'FATAL_AUTH_CONFIGURATION_ERROR: JWT_SECRET environment variable is missing or empty. Server authentication cannot proceed without a secure JWT secret.'
    );
  }
  if (secret.trim().length < 32) {
    throw new Error(
      'INSECURE_AUTH_CONFIGURATION_ERROR: JWT_SECRET must be at least 32 characters in length for cryptographic security.'
    );
  }
  return secret.trim();
}

/**
 * Checks whether JWT authentication is securely configured.
 */
export function isJwtConfigured(): boolean {
  try {
    getJwtSecret();
    return true;
  } catch {
    return false;
  }
}

// Requirement 3: Validate JWT configuration during server startup
if (!isJwtConfigured()) {
  console.error(
    '[SECURITY CRITICAL] JWT_SECRET is missing or insecure (<32 characters). All authentication requests will fail securely.'
  );
}

/**
 * Requirement 7: Secure, SameSite, and Path cookie attributes correctly configured.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};

export const CLEAR_AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
  expires: new Date(0),
};

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  name: string;
  tokenVersion: number;
}

/**
 * Signs a JWT with standard expiry (7d), issuer and audience.
 */
export function signToken(payload: TokenPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      tokenVersion: payload.tokenVersion ?? 0,
    },
    secret,
    {
      expiresIn: '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

/**
 * Cryptographically verifies a JWT.
 * Validates signature, expiry, issuer and audience.
 * Fails safely (returns null) on missing secret, invalid signature, tampering or expiry.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Requirement 9: Protect against CSRF on state-changing cookie-authenticated requests.
 */
export function validateCsrfProtection(req: NextRequest): { valid: boolean; error?: string } {
  const method = req.method.toUpperCase();
  // Safe read-only HTTP methods do not alter state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // If request does not use cookie authentication, skip cookie CSRF check
  const hasAuthCookie = Boolean(req.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!hasAuthCookie) {
    return { valid: true };
  }

  // 1. Inspect Sec-Fetch-Site if provided by modern browsers
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return { valid: false, error: 'Cross-Site Request Forgery (CSRF) attempt blocked: cross-site fetch site.' };
  }

  // 2. Inspect Origin header
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host;
      const isLocalHost =
        (originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1')) &&
        (host.startsWith('localhost') || host.startsWith('127.0.0.1'));
      if (originHost !== host && !isLocalHost) {
        return {
          valid: false,
          error: `Cross-Site Request Forgery (CSRF) attempt blocked: origin ${originHost} does not match host ${host}.`,
        };
      }
    } catch {
      return { valid: false, error: 'Malformed Origin header.' };
    }
  }

  return { valid: true };
}

/**
 * Authenticates user from request.
 * Requirement 5: Keep JWT in HTTP-only cookie.
 * Requirement 6: Ensure deleted or disabled accounts cannot continue using old tokens.
 * Requirement 8: Server-side session version revocation mechanism.
 * Requirement 12 & 13: Never trust role from client, fetch current authorization from database.
 * Requirement 14: Prevent revoked sessions from accessing protected APIs.
 */
export async function getUserFromRequest(req: NextRequest) {
  // Check HTTP-only cookie first
  let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  try {
    // Requirement 13: Fetch current user authorization and status directly from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true, // Database-authoritative role
        tokenVersion: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) return null; // Requirement 6: Deleted accounts cannot continue using old tokens

    if (user.isActive === false) return null; // Requirement 6: Disabled accounts cannot continue using old tokens

    // Requirement 8 & 14: Invalidate revoked sessions (tokenVersion mismatch)
    if (typeof payload.tokenVersion !== 'number' || user.tokenVersion !== payload.tokenVersion) {
      return null;
    }

    return user;
  } catch (e) {
    return null;
  }
}

export async function requireAuth(req: NextRequest) {
  // Requirement 9: CSRF defense on state-changing requests
  const csrf = validateCsrfProtection(req);
  if (!csrf.valid) {
    return { error: csrf.error, status: 403, user: null };
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return { error: 'Unauthorized. Please login to continue.', status: 401, user: null };
  }
  return { error: null, status: 200, user };
}

export async function requireAdmin(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return auth;
  }
  // Requirement 7 & 12: Strictly check DB-derived role (changing role takes effect immediately)
  if (auth.user.role !== 'ADMIN') {
    return { error: 'Forbidden. Admin credentials required.', status: 403, user: null };
  }
  return auth;
}
