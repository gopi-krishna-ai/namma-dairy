import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSecureOtp, hashOtp, maskEmail } from '@/lib/security';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sendOtpEmail } from '@/lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    // Requirement 1: Accept only valid registered email address (reject phone, names, IDs)
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a valid registered email address (e.g. user@example.com). Phone numbers and usernames are not accepted for password recovery.',
        },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Requirement 17: Rate limiting by IP and by Email
    const ipLimit = checkRateLimit(`ip_forgot_${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset requests from this IP address. Please try again in ${ipLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const emailLimit = checkRateLimit(`email_forgot_${cleanEmail}`, 5, 15 * 60 * 1000);
    if (!emailLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset requests for this email address. Please try again in ${emailLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Lookup user in database
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true },
    });

    // Requirement 16: Return generic response if user not found to prevent account enumeration
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: 'If an account with that email exists, a 6-digit verification code has been sent.',
          maskedEmail: maskEmail(cleanEmail),
        },
        { status: 200 }
      );
    }

    // Requirement 8: Implement 60-second resend cooldown
    const latestRequest = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestRequest) {
      const elapsedMs = Date.now() - latestRequest.createdAt.getTime();
      if (elapsedMs < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            success: false,
            message: `Please wait ${remainingSeconds} seconds before requesting another verification code.`,
            cooldownRemaining: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Requirement 9: Invalidate previous pending OTPs when a new OTP is requested
    await prisma.passwordResetRequest.updateMany({
      where: {
        userId: user.id,
        isConsumed: false,
        isVerified: false,
      },
      data: {
        isConsumed: true,
      },
    });

    // Requirement 2: Cryptographically secure random 6-digit OTP using Node.js crypto
    const rawOtp = generateSecureOtp();

    // Requirement 5: Store only a securely hashed OTP
    const hashedOtp = hashOtp(rawOtp);

    // Requirement 6: OTP must expire after 5 minutes
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store in database
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        email: cleanEmail,
        hashedOtp,
        otpExpiresAt,
        attemptsCount: 0,
        maxAttempts: 5, // Requirement 7
        isVerified: false,
        isConsumed: false,
      },
    });

    // Requirement 3: Send OTP to registered email using proper server-side email provider
    await sendOtpEmail({
      toEmail: cleanEmail,
      userName: user.name,
      otp: rawOtp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    // Requirement 4: Never return OTP in the API response or client-readable responses
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a 6-digit verification code has been sent.',
      maskedEmail: maskEmail(cleanEmail),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An internal server error occurred while processing your request.',
      },
      { status: 500 }
    );
  }
}
