import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, isJwtConfigured } from '@/lib/auth';
import { checkRateLimit, getClientIp, logSecurityEvent } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/email';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);

    // Requirement 8: Prevent automated registration abuse (max 5 registrations per 15 minutes per IP)
    const rateLimit = checkRateLimit(`ip_register_${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.success) {
      logSecurityEvent({
        type: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        ip,
        details: `IP ${ip} exceeded maximum registration attempts.`,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, phone, password, role } = body;

    // Requirement 5: Never accept role from a customer registration request
    if (role && String(role).toUpperCase() === 'ADMIN') {
      logSecurityEvent({
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        identifier: typeof email === 'string' ? email : undefined,
        ip,
        details: 'Attempted to register with role ADMIN.',
      });
      return NextResponse.json(
        {
          success: false,
          message: 'Direct administrator creation via public registration is prohibited. Administrator privileges require authorized promotion.',
        },
        { status: 403 }
      );
    }

    // Server-side validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid full name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email address is required.' },
        { status: 400 }
      );
    }

    // Requirement 2: Validate and normalize email
    const cleanEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Requirement 1: Enforce minimum password length of 8 characters
    if (!password || typeof password !== 'string' || password.trim().length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
        { status: 400 }
      );
    }

    // Requirement 3: Validate phone numbers
    let normalizedPhone: string | null = null;
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const rawPhone = String(phone).trim();
      const digits = rawPhone.replace(/\D/g, '');

      if (!PHONE_REGEX.test(rawPhone) && digits.length !== 10) {
        return NextResponse.json(
          { success: false, message: 'Please provide a valid 10-digit mobile number.' },
          { status: 400 }
        );
      }
      normalizedPhone = digits.slice(-10);
    }

    // Requirement 4: Prevent duplicate accounts
    const existingByEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, message: 'An account with this email address already exists. Please login instead.' },
        { status: 409 }
      );
    }

    if (normalizedPhone) {
      const existingByPhone = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: `+91${normalizedPhone}` },
            { phone: `+91-${normalizedPhone}` },
          ],
        },
      });

      if (existingByPhone) {
        return NextResponse.json(
          { success: false, message: 'An account with this phone number already exists. Please login instead.' },
          { status: 409 }
        );
      }
    }

    // Hash password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(password.trim(), 12);

    // Requirement 7: Generate secure email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Requirement 6 & 9: Prevent mass assignment & handle duplicate DB requests safely
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          role: 'CUSTOMER', // Strictly forced to CUSTOMER
          tokenVersion: 0,
          isEmailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: verificationExpiry,
        },
      });
    } catch (dbError: any) {
      // Prisma P2002: unique constraint failed
      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { success: false, message: 'An account with this email or phone number already exists. Please login instead.' },
          { status: 409 }
        );
      }
      throw dbError;
    }

    // Dispatch email verification asynchronously
    sendVerificationEmail({
      toEmail: cleanEmail,
      userName: name.trim(),
      token: verificationToken,
    }).catch((err) => console.error('Verification email dispatch failed:', err));

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        title: 'Welcome to Pure Picks! 🥛',
        message: 'Your account is ready. Order 100% farm fresh milk, free-range chicken, tender mutton, and fresh vegetables delivered to your doorstep in Bengaluru!',
        type: 'PROMOTION',
      },
    });

    if (!isJwtConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Authentication service configuration error.' },
        { status: 500 }
      );
    }

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: 'CUSTOMER',
      name: newUser.name,
      tokenVersion: 0,
    });

    // Requirement: Never return token in JSON response body
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Welcome to Pure Picks. A verification link has been sent to your email.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isEmailVerified: false,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    // Never expose database errors or stack traces to customers
    return NextResponse.json(
      { success: false, message: 'An error occurred during account registration. Please try again.' },
      { status: 500 }
    );
  }
}
