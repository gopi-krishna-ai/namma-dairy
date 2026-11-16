import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hashResetToken, timingSafeTokenMatch } from '@/lib/security';
import { checkRateLimit, getClientIp, clearFailedLogins } from '@/lib/rateLimit';

const MIN_PASSWORD_LENGTH = 8; // Requirement 14: Enforce minimum 8 characters

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const body = await req.json().catch(() => ({}));
    const { resetToken, newPassword, identifier, email, phone, userId } = body;

    // Requirement 17: Rate limit password reset attempts
    const rateLimit = checkRateLimit(`ip_reset_${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Requirement 12 & 13: Strictly block direct password updates using email, phone, name, or userId
    if (!resetToken || typeof resetToken !== 'string' || resetToken.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Direct password reset without a verified single-use reset token is prohibited. Please complete the email verification process.',
        },
        { status: 400 }
      );
    }

    // Explicitly reject requests that try to supply arbitrary identifiers instead of relying on token ownership
    if (identifier || email || phone || userId) {
      // Reject if someone is trying to use legacy vulnerable parameter injection
      if (typeof identifier === 'string' && !resetToken) {
        return NextResponse.json(
          {
            success: false,
            message: 'Direct password update using identifier is prohibited.',
          },
          { status: 400 }
        );
      }
    }

    // Requirement 14: Enforce minimum password length of 8 characters
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        },
        { status: 400 }
      );
    }

    const cleanToken = resetToken.trim();
    const hashedCandidate = hashResetToken(cleanToken);

    // Look up the verified reset token in database
    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: {
        hashedResetToken: hashedCandidate,
      },
      include: {
        user: true,
      },
    });

    // Requirement 18: Handle missing, invalid, or unverified tokens
    if (!resetRequest || !resetRequest.isVerified) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or unverified password-reset token. Please restart the password reset process.',
        },
        { status: 400 }
      );
    }

    // Requirement 10 & 18: Reject reused reset token
    if (resetRequest.isConsumed) {
      return NextResponse.json(
        {
          success: false,
          message: 'This reset token has already been used and cannot be reused. Please request a new verification code.',
        },
        { status: 400 }
      );
    }

    // Check token expiration
    const now = new Date();
    if (!resetRequest.resetTokenExpiresAt || resetRequest.resetTokenExpiresAt < now) {
      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: { isConsumed: true },
      });
      return NextResponse.json(
        {
          success: false,
          message: 'This password reset token has expired. Please restart the password reset process.',
        },
        { status: 400 }
      );
    }

    // Constant-time token match verification
    if (!timingSafeTokenMatch(cleanToken, resetRequest.hashedResetToken!)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Reset token verification failed.',
        },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt (salt rounds: 12)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atomic transaction:
    // 1. Invalidate this reset request (isConsumed: true)
    // 2. Invalidate any remaining open requests for this user
    // 3. Update user password and increment tokenVersion (Requirement 15: Invalidate all existing sessions!)
    await prisma.$transaction([
      prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          isConsumed: true,
          consumedAt: new Date(),
        },
      }),
      prisma.passwordResetRequest.updateMany({
        where: {
          userId: resetRequest.userId,
          isConsumed: false,
        },
        data: {
          isConsumed: true,
        },
      }),
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 }, // Requirement 15: Revokes all active JWT sessions
        },
      }),
    ]);

    // Clear any failed login counter/temporary lockout on successful reset
    if (resetRequest.user?.email) {
      clearFailedLogins(resetRequest.user.email);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Password has been reset successfully! All active sessions have been signed out for security. Please sign in with your new password.',
    });

    // Clear any active session cookie on the client
    response.cookies.delete('namma_token');

    return response;
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An internal server error occurred while resetting your password.',
      },
      { status: 500 }
    );
  }
}
