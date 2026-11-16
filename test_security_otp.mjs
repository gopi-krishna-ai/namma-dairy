import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'customer@gmail.com';
const TEST_PASSWORD_START = 'CustomerStartPass@123';
const TEST_PASSWORD_NEW = 'SecureNewPassword2026!';
const ORIGINAL_SEEDED_PASSWORD = 'customer123';

async function clearRateLimits() {
  try {
    await fetch(`${BASE_URL}/api/auth/dev-reset-ratelimit`, {
      method: 'POST',
      headers: { 'x-test-suite': 'purepicks-internal-security-test' },
    });
  } catch (e) {
    // ignore
  }
}

// Helper: retrieve the latest hashed OTP request from database
async function getLatestRequest(email) {
  return await prisma.passwordResetRequest.findFirst({
    where: { email: email.toLowerCase().trim() },
    orderBy: { createdAt: 'desc' },
  });
}

// Pepper matches src/lib/security.ts
const PEPPER = process.env.OTP_PEPPER_SECRET || process.env.JWT_SECRET || 'pure-picks-otp-pepper-secret-2026';
function hashOtp(otp) {
  return crypto.createHash('sha256').update(`${otp.trim()}:${PEPPER}`).digest('hex');
}

// Find raw OTP from candidate list or reverse test helper
async function discoverRawOtpForTest(email) {
  const req = await getLatestRequest(email);
  if (!req) return null;
  for (let i = 100000; i <= 999999; i++) {
    const candidate = i.toString();
    if (hashOtp(candidate) === req.hashedOtp) {
      return candidate;
    }
  }
  return null;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName} - ${details}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('       RUNNING BACKEND SECURITY PASSWORD RESET TEST SUITE       ');
  console.log('================================================================\n');

  await clearRateLimits();

  // Reset database test requests for clean slate
  await prisma.passwordResetRequest.deleteMany({
    where: { email: TEST_EMAIL },
  });

  // Ensure test user has known initial password and tokenVersion: 0
  const hashedStart = await bcrypt.hash(TEST_PASSWORD_START, 10);
  await prisma.user.update({
    where: { email: TEST_EMAIL },
    data: { password: hashedStart, tokenVersion: 0 },
  });

  // -------------------------------------------------------------
  // SCENARIO 7: Direct API password reset without OTP/token
  // -------------------------------------------------------------
  console.log('--- Scenario 7: Direct API password reset without OTP/token ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: TEST_EMAIL,
        newPassword: 'HackerPassword123!',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false && data.message.includes('prohibited'),
      'Direct reset using identifier without resetToken is strictly rejected (400)',
      JSON.stringify(data)
    );
  }

  // -------------------------------------------------------------
  // SCENARIO 8: Password reset using another user's email / fake token
  // -------------------------------------------------------------
  console.log('\n--- Scenario 8: Password reset using invalid / forged reset token ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken: 'fake-forged-random-token-1234567890abcdef',
        newPassword: 'HackerPassword123!',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      'Forged reset token is rejected with 400 Bad Request',
      JSON.stringify(data)
    );
  }

  // -------------------------------------------------------------
  // SCENARIO 1: Request OTP and verify with Correct OTP
  // -------------------------------------------------------------
  console.log('\n--- Scenario 1: Request OTP & verify with Correct OTP ---');
  await clearRateLimits();
  let validResetToken = null;
  let correctOtp = null;
  {
    // Step A: Request OTP
    const reqRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    const reqData = await reqRes.json();
    assert(
      reqRes.status === 200 && reqData.success === true && reqData.maskedEmail,
      'Request OTP returns generic success and masked email without leaking OTP',
      JSON.stringify(reqData)
    );
    assert(
      !reqData.otp && !JSON.stringify(reqData).includes('rawOtp'),
      'OTP is never returned in HTTP response body'
    );

    // Verify stored OTP in database is securely hashed (64 hex characters SHA-256)
    const dbReq = await getLatestRequest(TEST_EMAIL);
    assert(
      dbReq && dbReq.hashedOtp && dbReq.hashedOtp.length === 64,
      'Stored OTP in DB is a 64-character SHA-256 hash (never plaintext)'
    );

    correctOtp = await discoverRawOtpForTest(TEST_EMAIL);
    assert(correctOtp && correctOtp.length === 6, `Cryptographically resolved valid OTP for test`);

    // Step B: Verify with Correct OTP
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: correctOtp }),
    });
    const verifyData = await verifyRes.json();
    assert(
      verifyRes.status === 200 && verifyData.success === true && verifyData.resetToken,
      'Correct OTP verification returns 200 OK and issues single-use resetToken',
      JSON.stringify(verifyData)
    );
    validResetToken = verifyData.resetToken;
  }

  // -------------------------------------------------------------
  // SCENARIO 4: Reused OTP (Re-verify same OTP)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 4: Reused OTP ---');
  {
    const reuseRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: correctOtp }),
    });
    const reuseData = await reuseRes.json();
    assert(
      reuseRes.status === 400 && reuseData.success === false && reuseData.message.includes('already been verified'),
      'Reusing an already verified OTP is rejected (400)',
      JSON.stringify(reuseData)
    );
  }

  // -------------------------------------------------------------
  // SCENARIO 5: OTP Resend Cooldown (Within 60s)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 5: OTP Resend Cooldown (Within 60 seconds) ---');
  {
    const cooldownRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    const cooldownData = await cooldownRes.json();
    assert(
      cooldownRes.status === 429 && cooldownData.success === false && cooldownData.cooldownRemaining > 0,
      `Resend within 60s is rejected with 429 and cooldown remaining (${cooldownData.cooldownRemaining}s)`,
      JSON.stringify(cooldownData)
    );
  }

  // -------------------------------------------------------------
  // SCENARIO 2: Incorrect OTP attempts & decrementing counter
  // -------------------------------------------------------------
  console.log('\n--- Scenario 2: Incorrect OTP attempts & decrementing counter ---');
  await clearRateLimits();
  // Clear previous requests and create a fresh OTP request
  await prisma.passwordResetRequest.deleteMany({ where: { email: TEST_EMAIL } });

  const freshReqRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const freshReqData = await freshReqRes.json();
  assert(freshReqRes.status === 200 && freshReqData.success, 'Generated fresh OTP for attempt tests');

  // Attempt with incorrect OTP '000000'
  const wrongRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: '000000' }),
  });
  const wrongData = await wrongRes.json();
  assert(
    wrongRes.status === 400 && wrongData.attemptsRemaining === 4,
    'Incorrect OTP returns 400 and reports 4 attempts remaining',
    JSON.stringify(wrongData)
  );

  // -------------------------------------------------------------
  // SCENARIO 6: More than 5 incorrect attempts (Lockout)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 6: Lockout after 5 failed OTP attempts ---');
  await clearRateLimits();
  for (let attempt = 2; attempt <= 4; attempt++) {
    await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, otp: '000000' }),
    });
  }

  // 5th attempt (reaching limit)
  const fifthRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: '000000' }),
  });
  const fifthData = await fifthRes.json();
  assert(
    fifthRes.status === 400 && fifthData.attemptsRemaining === 0 && fifthData.message.includes('invalidated'),
    '5th failed attempt invalidates the OTP and sets attemptsRemaining: 0',
    JSON.stringify(fifthData)
  );

  // 6th attempt on invalidated request
  const sixthRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: '000000' }),
  });
  const sixthData = await sixthRes.json();
  assert(
    sixthRes.status === 400 && (sixthData.message.includes('No active verification code') || sixthData.message.includes('cannot be reused') || sixthData.message.includes('invalidated')),
    'Subsequent attempt is rejected because request is consumed/invalidated',
    JSON.stringify(sixthData)
  );

  // -------------------------------------------------------------
  // SCENARIO 3: Expired OTP (> 5 minutes)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 3: Expired OTP (> 5 minutes) ---');
  await clearRateLimits();
  await prisma.passwordResetRequest.deleteMany({ where: { email: TEST_EMAIL } });
  const expiredRawOtp = '888999';
  await prisma.passwordResetRequest.create({
    data: {
      userId: (await prisma.user.findUnique({ where: { email: TEST_EMAIL } })).id,
      email: TEST_EMAIL,
      hashedOtp: hashOtp(expiredRawOtp),
      otpExpiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      attemptsCount: 0,
      maxAttempts: 5,
      isVerified: false,
      isConsumed: false,
    },
  });

  const expiredRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: expiredRawOtp }),
  });
  const expiredData = await expiredRes.json();
  assert(
    expiredRes.status === 400 && expiredData.message.includes('expired'),
    'Expired OTP is rejected with 400 Expired message',
    JSON.stringify(expiredData)
  );

  // -------------------------------------------------------------
  // SCENARIO 10: Session Invalidation & Token Version Revocation
  // -------------------------------------------------------------
  console.log('\n--- Scenario 10: Session Invalidation & Token Version Revocation ---');
  await clearRateLimits();
  // Log in as user with TEST_PASSWORD_START
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD_START }),
  });
  const loginData = await loginRes.json();
  const cookieHeader = loginRes.headers.get('set-cookie') || '';
  const match = cookieHeader.match(/namma_token=([^;]+)/);
  const originalSessionToken = match ? match[1] : null;

  assert(
    loginRes.status === 200 && originalSessionToken && loginData.token === undefined,
    'Logged in and obtained active JWT session cookie (token excluded from JSON body)',
    JSON.stringify(loginData)
  );

  // Verify that the active session works on /api/auth/me
  const meBefore = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${originalSessionToken}` },
  });
  const meBeforeData = await meBefore.json();
  assert(meBefore.status === 200 && meBeforeData.user.email === TEST_EMAIL, '/api/auth/me confirms session is currently valid');

  // Complete a valid password reset flow
  await prisma.passwordResetRequest.deleteMany({ where: { email: TEST_EMAIL } });
  await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const activeOtp = await discoverRawOtpForTest(TEST_EMAIL);
  const verifyForReset = await (await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: activeOtp }),
  })).json();
  const resetTokenToUse = verifyForReset.resetToken;

  // Execute password reset
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: resetTokenToUse,
      newPassword: TEST_PASSWORD_NEW,
    }),
  });
  const resetData = await resetRes.json();
  assert(
    resetRes.status === 200 && resetData.success && resetData.message.includes('All active sessions have been signed out'),
    'Password successfully reset with new 8+ character password',
    JSON.stringify(resetData)
  );

  // Now test the PREVIOUS session token on /api/auth/me
  const meAfter = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${originalSessionToken}` },
  });
  assert(
    meAfter.status === 401,
    'Previously issued session token is IMMEDIATELY INVALIDATED (401 Unauthorized)'
  );

  // -------------------------------------------------------------
  // SCENARIO 9: Reset Token Reuse
  // -------------------------------------------------------------
  console.log('\n--- Scenario 9: Reset Token Reuse Prevention ---');
  {
    const reuseTokenRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken: resetTokenToUse,
        newPassword: 'AnotherPassword999!',
      }),
    });
    const reuseTokenData = await reuseTokenRes.json();
    assert(
      reuseTokenRes.status === 400 && reuseTokenData.message.includes('already been used'),
      'Reusing the single-use reset token is strictly rejected (400)',
      JSON.stringify(reuseTokenData)
    );
  }

  // Restore original seeded password for user
  const restoreHash = await bcrypt.hash(ORIGINAL_SEEDED_PASSWORD, 10);
  await prisma.user.update({
    where: { email: TEST_EMAIL },
    data: { password: restoreHash },
  });
  await prisma.passwordResetRequest.deleteMany({ where: { email: TEST_EMAIL } });

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
