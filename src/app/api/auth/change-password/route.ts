import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAuth, signToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Please provide both your current password and new password.' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
        { status: 400 }
      );
    }

    // Retrieve user password from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    // Verify current password with bcrypt
    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Incorrect current password.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword.trim(), 12);

    // Requirement 8 & 9: Invalidate existing sessions after password changes by incrementing tokenVersion
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        password: hashedNewPassword,
        tokenVersion: { increment: 1 },
      },
    });

    // Generate new token with updated tokenVersion for the active session
    const newToken = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role as 'CUSTOMER' | 'ADMIN',
      name: updatedUser.name,
      tokenVersion: updatedUser.tokenVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully! All prior sessions have been invalidated.',
    });

    response.cookies.set(AUTH_COOKIE_NAME, newToken, AUTH_COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred while updating password.' },
      { status: 500 }
    );
  }
}
