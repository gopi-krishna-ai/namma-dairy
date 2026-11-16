import { NextRequest, NextResponse } from 'next/server';
import { resetRateLimitsForTesting } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Allow during automated test execution via internal security test token and environment opt-in
  const testAuthHeader = req.headers.get('x-test-suite');
  const isTestModeAllowed = process.env.ALLOW_TEST_RESET === 'true';

  if (!isTestModeAllowed || testAuthHeader !== 'purepicks-internal-security-test') {
    return NextResponse.json({ error: 'Endpoint strictly disabled in production.' }, { status: 403 });
  }
  resetRateLimitsForTesting();
  return NextResponse.json({ success: true, message: 'Rate limits cleared for testing.' });
}
