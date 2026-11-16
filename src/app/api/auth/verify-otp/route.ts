import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateResetToken, hashResetToken, timingSafeMatch } from '@/lib/security';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_EXPIRY_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const body = await req.json().catch(() => ({}));
    const { email, otp } = body;

    // Requirement 17: Rate limit verification attempts by IP
    const rateLimit = checkRateLimit(`ip_verify_${ip}`, 15, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many verification attempts from this IP. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Input validation
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 6-digit numeric verification code.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    // Find the latest active verification request for this email
    const resetRequest = await prisma.passwordResetRequest.findFirst({
      where: {
        email: cleanEmail,
        isConsumed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Requirement 18: Handle missing, invalid, or already consumed OTP requests
    if (!resetRequest) {
      return NextResponse.json(
        {
          success: false,
          message: 'No active verification code found for this email. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Requirement 10 & 18: Reject already verified / reused OTP
    if (resetRequest.isVerified) {
      return NextResponse.json(
        {
          success: false,
          message: 'This verification code has already been verified and cannot be reused. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Requirement 6 & 18: Check OTP expiration (5 minutes)
    const now = new Date();
    if (resetRequest.otpExpiresAt < now) {
      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: { isConsumed: true },
      });
      return NextResponse.json(
        {
          success: false,
          message: 'Verification code has expired (5-minute limit). Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Requirement 7 & 18: Check maximum 5 attempts
    if (resetRequest.attemptsCount >= resetRequest.maxAttempts) {
      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: { isConsumed: true },
      });
      return NextResponse.json(
        {
          success: false,
          message: 'Maximum verification attempts exceeded (5 attempts). This code has been invalidated for security. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Timing-safe verification of the hashed OTP
    const isMatch = timingSafeMatch(cleanOtp, resetRequest.hashedOtp);

    if (!isMatch) {
      // Requirement 7: Atomically increment attempts count
      const updated = await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: { attemptsCount: { increment: 1 } },
      });

      const remainingAttempts = Math.max(0, updated.maxAttempts - updated.attemptsCount);

      if (remainingAttempts === 0) {
        // Invalidate immediately upon reaching limit
        await prisma.passwordResetRequest.update({
          where: { id: resetRequest.id },
          data: { isConsumed: true },
        });
        return NextResponse.json(
          {
            success: false,
            message: 'Incorrect verification code. Maximum attempts exceeded (5/5). This code has been invalidated. Please request a new code.',
            attemptsRemaining: 0,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: `Incorrect verification code. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
          attemptsRemaining: remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Requirement 11: Issue short-lived, single-use password-reset token
    const rawResetToken = generateResetToken();
    const hashedToken = hashResetToken(rawResetToken);
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Atomically mark OTP as verified and attach the hashed single-use reset token
    await prisma.passwordResetRequest.update({
      where: { id: resetRequest.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        hashedResetToken: hashedToken,
        resetTokenExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code confirmed successfully. Please create your new password.',
      resetToken: rawResetToken,
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An internal server error occurred while verifying the code.',
      },
      { status: 500 }
    );
  }
}
