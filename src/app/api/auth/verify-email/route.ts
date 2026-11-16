import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`ip_verify_email_${ip}`, 15, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, message: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email verification token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: cleanToken },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired email verification link.' },
        { status: 400 }
      );
    }

    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: 'This email verification link has expired. Please request a new verification link.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully! Your Pure Picks account is now verified.',
    });
  } catch (error: any) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal error occurred during email verification.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`ip_verify_email_${ip}`, 15, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, message: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email verification token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: cleanToken },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired email verification token.' },
        { status: 400 }
      );
    }

    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: 'This email verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully! Your account is now fully active.',
    });
  } catch (error: any) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal error occurred during email verification.' },
      { status: 500 }
    );
  }
}
