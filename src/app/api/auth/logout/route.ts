import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, CLEAR_AUTH_COOKIE_OPTIONS, getUserFromRequest, validateCsrfProtection } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  // Requirement 9: Protect against CSRF on state-changing cookie-authenticated requests
  const csrf = validateCsrfProtection(req);
  if (!csrf.valid) {
    return NextResponse.json({ success: false, message: csrf.error }, { status: 403 });
  }

  try {
    // Requirement 8 & 10: Invalidate server-side session version on logout
    const user = await getUserFromRequest(req);
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
    }
  } catch {
    // Fail-safe: continue clearing cookie even if DB update fails
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  // Requirement 7 & 10: Clear authentication cookie with exact matching path, sameSite, secure and expires
  response.cookies.set(AUTH_COOKIE_NAME, '', CLEAR_AUTH_COOKIE_OPTIONS);

  return response;
}
