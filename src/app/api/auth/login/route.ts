import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, isJwtConfigured } from '@/lib/auth';
import {
  checkRateLimit,
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
  logSecurityEvent,
  getClientIp,
} from '@/lib/rateLimit';

// Dummy hash for constant-time comparison when user does not exist (prevents timing side-channel attacks)
const DUMMY_BCRYPT_HASH = '$2a$12$e8Y5t1hK4l5y3r9e.hkW4YxvK8jjYfrweY1cPT44E6hcsjuPQML3A';
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);

    // Requirement 1 & 2: Rate limit login attempts by IP (credential-stuffing & brute-force protection)
    const ipRateLimit = checkRateLimit(`ip_login_${ip}`, 20, 15 * 60 * 1000);
    if (!ipRateLimit.success) {
      logSecurityEvent({
        type: 'IP_LOGIN_RATE_LIMIT_EXCEEDED',
        ip,
        details: `IP ${ip} exceeded 20 attempts in 15 minutes.`,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts from this IP address. Please try again in ${ipRateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, identifier, password, requiredRole } = body;
    const loginIdentifier = email || identifier;

    if (!loginIdentifier || !password || typeof loginIdentifier !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please provide both your registered identifier and password.' },
        { status: 400 }
      );
    }

    const rawIdentifier = String(loginIdentifier).trim();
    const isEmail = rawIdentifier.includes('@');
    const cleanPhoneDigits = rawIdentifier.replace(/\D/g, '');

    // Requirement 7: Validate email and phone formats
    if (isEmail) {
      if (!EMAIL_REGEX.test(rawIdentifier)) {
        return NextResponse.json(
          { success: false, message: 'Please provide a valid email address.' },
          { status: 400 }
        );
      }
    } else {
      if (cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 15) {
        return NextResponse.json(
          { success: false, message: 'Please provide a valid email address or 10-digit mobile number.' },
          { status: 400 }
        );
      }
    }

    const cleanIdentifier = isEmail ? rawIdentifier.toLowerCase() : cleanPhoneDigits.slice(-10);

    // Requirement 3 & 4: Check temporary account lockout (avoids permanent lockout that attackers can weaponize)
    const lockoutStatus = checkAccountLockout(cleanIdentifier);
    if (lockoutStatus.isLocked) {
      logSecurityEvent({
        type: 'LOCKED_ACCOUNT_LOGIN_ATTEMPT',
        identifier: cleanIdentifier,
        ip,
        details: `Attempt while temporarily locked (${lockoutStatus.retryAfterSeconds}s remaining).`,
      });
      return NextResponse.json(
        {
          success: false,
          message: `This account is temporarily locked due to excessive failed login attempts. Please try again in ${lockoutStatus.retryAfterSeconds} seconds or use forgot password.`,
        },
        { status: 429 }
      );
    }

    // Requirement 2: Account-identifier-level rate limiting (protects against distributed multi-IP brute force)
    const idRateLimit = checkRateLimit(`id_login_${cleanIdentifier}`, 15, 15 * 60 * 1000);
    if (!idRateLimit.success) {
      logSecurityEvent({
        type: 'ACCOUNT_IDENTIFIER_RATE_LIMIT_EXCEEDED',
        identifier: cleanIdentifier,
        ip,
        details: `Account identifier exceeded attempt limit.`,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts for this account. Please try again in ${idRateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Requirement 8 & 9: Avoid fetching every user from the database. Use efficient indexed queries.
    let user = null;
    if (isEmail) {
      const cleanEmail = cleanIdentifier;
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            cleanEmail === 'admin@purepicks.com' ? { email: 'admin@nammadairy.com' } : { email: '__NONE__' },
            cleanEmail === 'admin@nammadairy.com' ? { email: 'admin@purepicks.com' } : { email: '__NONE__' },
          ],
        },
      });
    } else {
      // Indexed lookup by phone (single fast query, no findMany)
      const tenDigits = cleanPhoneDigits.slice(-10);
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhoneDigits },
            { phone: tenDigits },
            { phone: `+91${tenDigits}` },
            { phone: `+91 ${tenDigits}` },
            { phone: `+91-${tenDigits}` },
            { phone: `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}` },
          ],
        },
      });
    }

    // Requirement 5 & 6: Prevent account enumeration and timing attacks
    if (!user) {
      // Record failed attempt for progressive delays/lockouts
      const failure = recordFailedLogin(cleanIdentifier, ip);
      // Constant-time execution: compare against dummy hash
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      if (failure.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, failure.delayMs));
      }
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please verify your identifier and password.' },
        { status: 401 }
      );
    }

    // Requirement 2: Authenticate strictly via bcrypt verification
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const failure = recordFailedLogin(cleanIdentifier, ip);
      if (failure.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, failure.delayMs));
      }
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please verify your identifier and password.' },
        { status: 401 }
      );
    }

    // Requirement 6: Ensure deleted or disabled accounts cannot continue using old tokens or login
    if (user.isActive === false) {
      logSecurityEvent({
        type: 'LOGIN_FAILURE',
        identifier: user.email,
        ip,
        details: `Login attempt on deactivated account ${user.id}.`,
      });
      return NextResponse.json(
        { success: false, message: 'This account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    // Role verification for admin portal
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
      logSecurityEvent({
        type: 'CUSTOMER_ATTEMPTED_ADMIN_LOGIN',
        identifier: user.email,
        ip,
        details: `Customer account ${user.id} attempted to login through admin portal.`,
      });
      return NextResponse.json(
        { success: false, message: 'Access Denied: This account does not possess administrator privileges.' },
        { status: 403 }
      );
    }

    // Fail securely if JWT configuration is missing
    if (!isJwtConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Authentication service configuration error.' },
        { status: 500 }
      );
    }

    // Reset failed login records on success
    clearFailedLogins(cleanIdentifier);
    logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      identifier: user.email,
      ip,
      details: `User ${user.id} (${user.role}) authenticated successfully.`,
    });

    // Generate Secure JWT Token with Database-Derived Role and Session TokenVersion
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'CUSTOMER' | 'ADMIN',
      name: user.name,
      tokenVersion: user.tokenVersion ?? 0,
    });

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Login authentication error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred during authentication.' },
      { status: 500 }
    );
  }
}
