/**
 * TASK 8: Comprehensive Session Security Test Suite
 *
 * Requirements Covered:
 * 1. Consistent HTTP-only cookie authentication strategy.
 * 2. Complete removal of JWT tokens from JSON responses.
 * 3. Secure login and logout endpoints.
 * 4. Immediate session invalidation after password change.
 * 5. Immediate session invalidation after password reset.
 * 6. Deactivated or deleted accounts cannot continue using old tokens or log in.
 * 7. Role changes take effect immediately on subsequent requests.
 * 8. Authoritative database validation on sensitive API requests.
 * 9. CSRF defense on state-changing cookie-authenticated requests.
 * 10. SameSite=Lax and Path=/ cookie attributes.
 * 11. Session fixation prevention (fresh distinct tokens).
 * 12. LocalStorage zero-token compliance across frontend.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const PEPPER = process.env.OTP_PEPPER_SECRET || process.env.JWT_SECRET || 'pure-picks-otp-pepper-secret-2026';
function hashResetToken(token) {
  return crypto.createHash('sha256').update(`RESET:${token.trim()}:${PEPPER}`).digest('hex');
}

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

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function parseSetCookie(header) {
  if (!header) return null;
  const parts = header.split(';').map((p) => p.trim());
  const [name, ...valParts] = parts[0].split('=');
  const value = valParts.join('=');
  const flags = {};
  for (let i = 1; i < parts.length; i++) {
    const [k, ...v] = parts[i].split('=');
    flags[k.toLowerCase()] = v.length > 0 ? v.join('=') : true;
  }
  return { name, value, flags, raw: header };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- TASK 8: APPLICATION SESSION SECURITY TEST SUITE ---');
  console.log('======================================================\n');

  const timestamp = Date.now();
  const testCustomerEmail = `session.cust.${timestamp}@test.com`;
  const testCustomerPassword = 'SecurePassword123!';
  const newPassword = 'NewSecurePassword456!';
  const hashedPassword = await bcrypt.hash(testCustomerPassword, 10);

  // Seed test user
  const user = await prisma.user.create({
    data: {
      name: 'Session Security Tester',
      email: testCustomerEmail,
      phone: `98888${String(timestamp).slice(-5)}`,
      password: hashedPassword,
      role: 'CUSTOMER',
      tokenVersion: 0,
      isActive: true,
    },
  });

  console.log(`[SETUP] Created test user: ${testCustomerEmail} (ID: ${user.id})`);

  let customerAuthCookie = '';
  let customerRawToken = '';

  // --------------------------------------------------------------------------
  // TEST 1: Login sets HTTP-only cookie with proper attributes & NO JWT in JSON
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Login Cookie Security and Zero JSON Token Exposure:');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCustomerEmail,
      password: testCustomerPassword,
    }),
  });
  const loginData = await loginRes.json();
  const setCookieHeader = loginRes.headers.get('set-cookie');
  const cookieParsed = parseSetCookie(setCookieHeader);

  assert(loginRes.status === 200, `Login returns HTTP 200 (Got ${loginRes.status})`);
  assert(loginData.success === true, 'Login response body reports success: true');
  assert(loginData.token === undefined, 'No "token" property returned in JSON response body');
  assert(loginData.jwt === undefined, 'No "jwt" property returned in JSON response body');
  assert(loginData.accessToken === undefined, 'No "accessToken" property returned in JSON response body');
  assert(Boolean(cookieParsed), 'Set-Cookie header is present');
  assert(cookieParsed?.name === 'namma_token', 'Cookie name is "namma_token"');
  assert(cookieParsed?.flags['httponly'] === true, 'Cookie contains "HttpOnly" attribute');
  assert(cookieParsed?.flags['samesite']?.toLowerCase() === 'lax', 'Cookie contains "SameSite=Lax" attribute');
  assert(cookieParsed?.flags['path'] === '/', 'Cookie path is "/"');

  customerRawToken = cookieParsed?.value || '';
  customerAuthCookie = `namma_token=${customerRawToken}`;

  // --------------------------------------------------------------------------
  // TEST 2: Response body returns safe user attributes only (no tokenVersion or secrets)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Response Body Data Sanitization:');
  assert(loginData.user && loginData.user.email === testCustomerEmail, 'Returns authenticated user info');
  assert(loginData.user.password === undefined, 'Plaintext/hashed password is not present in response');
  assert(loginData.user.tokenVersion === undefined, 'tokenVersion is not exposed in login response');

  // --------------------------------------------------------------------------
  // TEST 3: /api/auth/me uses HTTP-only cookie and sanitizes user output
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Session Introspection via /api/auth/me:');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: customerAuthCookie },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, `/api/auth/me returns HTTP 200 (Got ${meRes.status})`);
  assert(meData.success === true, '/api/auth/me succeeds with valid cookie');
  assert(meData.user?.email === testCustomerEmail, 'Returned user matches logged in session');
  assert(meData.user?.tokenVersion === undefined, 'tokenVersion is stripped from /api/auth/me response');

  // --------------------------------------------------------------------------
  // TEST 4: Logout clears cookie and invalidates session version
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Secure Logout and Server-Side Cookie Invalidation:');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Cookie: customerAuthCookie,
      'Sec-Fetch-Site': 'same-origin',
      Origin: BASE_URL,
    },
  });
  const logoutData = await logoutRes.json();
  const logoutCookieHeader = logoutRes.headers.get('set-cookie');
  const logoutParsed = parseSetCookie(logoutCookieHeader);

  assert(logoutRes.status === 200, `Logout returns HTTP 200 (Got ${logoutRes.status})`);
  assert(logoutData.success === true, 'Logout reports success: true');
  assert(logoutParsed?.flags['max-age'] === '0', 'Logout Set-Cookie specifies Max-Age=0 to expire cookie immediately');

  // Check tokenVersion in database was incremented
  const userAfterLogout = await prisma.user.findUnique({ where: { id: user.id } });
  assert(userAfterLogout.tokenVersion > user.tokenVersion, `tokenVersion incremented from ${user.tokenVersion} to ${userAfterLogout.tokenVersion}`);

  // --------------------------------------------------------------------------
  // TEST 5: Protected API rejects request after logout (stale token revocation)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Revoked Token Rejection After Logout:');
  const postLogoutMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: customerAuthCookie }, // Using the retained stale token
  });
  assert(postLogoutMeRes.status === 401, `Stale token rejected with HTTP 401 Unauthorized (Got ${postLogoutMeRes.status})`);

  // --------------------------------------------------------------------------
  // TEST 6: Invalidate sessions after password change
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Session Invalidation on Password Change:');
  await clearRateLimits();
  // Log in again to get a fresh session
  const login2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: testCustomerPassword }),
  });
  const sessionBeforeChange = parseSetCookie(login2Res.headers.get('set-cookie'));
  const activeCookieBeforeChange = `namma_token=${sessionBeforeChange.value}`;

  // Change password
  const changeRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: activeCookieBeforeChange,
      'Sec-Fetch-Site': 'same-origin',
      Origin: BASE_URL,
    },
    body: JSON.stringify({
      currentPassword: testCustomerPassword,
      newPassword: newPassword,
    }),
  });
  const changeData = await changeRes.json();
  const changeCookieHeader = changeRes.headers.get('set-cookie');
  const changeCookieParsed = parseSetCookie(changeCookieHeader);

  assert(changeRes.status === 200, `Change password succeeded (Got ${changeRes.status})`);
  assert(Boolean(changeCookieParsed), 'Change password issued a fresh cookie for current session');

  // Stale token from before password change must be rejected
  const staleMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: activeCookieBeforeChange },
  });
  assert(staleMeRes.status === 401, `Old session token from before password change returns 401 (Got ${staleMeRes.status})`);

  // New session cookie from password change must be accepted
  const newMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: `namma_token=${changeCookieParsed.value}` },
  });
  assert(newMeRes.status === 200, `Newly issued session token works successfully (Got ${newMeRes.status})`);

  // --------------------------------------------------------------------------
  // TEST 7: Invalidate sessions after password reset
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Session Invalidation on Password Reset via OTP:');
  await clearRateLimits();
  const activeCookieBeforeReset = `namma_token=${changeCookieParsed.value}`;

  // Create password reset request directly in DB to simulate verified OTP step
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = hashResetToken(rawResetToken);
  const resetReq = await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      email: testCustomerEmail,
      hashedOtp: 'test-hashed-otp',
      otpExpiresAt: new Date(Date.now() - 1000),
      isVerified: true,
      verifiedAt: new Date(),
      hashedResetToken,
      resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: rawResetToken,
      newPassword: 'BrandNewPassword789!',
    }),
  });
  const resetData = await resetRes.json();
  assert(resetRes.status === 200, `Password reset succeeded (Got ${resetRes.status})`);

  // Existing session before password reset must be revoked
  const staleResetMe = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: activeCookieBeforeReset },
  });
  assert(staleResetMe.status === 401, `Session from before password reset is revoked with 401 (Got ${staleResetMe.status})`);

  // --------------------------------------------------------------------------
  // TEST 8: Deactivated / Disabled Account Enforcement
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Deactivated Account Cannot Use Old Tokens or Login:');
  await clearRateLimits();
  // Log in with brand new password
  const login3Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: 'BrandNewPassword789!' }),
  });
  const sessionBeforeDeactivate = parseSetCookie(login3Res.headers.get('set-cookie'));
  const deactCookie = `namma_token=${sessionBeforeDeactivate.value}`;

  // Verify session works initially
  const preDeactMe = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: deactCookie } });
  assert(preDeactMe.status === 200, 'Session is active before deactivation');

  // Deactivate account in DB
  await prisma.user.update({
    where: { id: user.id },
    data: { isActive: false },
  });

  // Now, existing session token must be rejected
  const postDeactMe = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: deactCookie } });
  assert(postDeactMe.status === 401, `Deactivated account token returns 401 Unauthorized (Got ${postDeactMe.status})`);

  // Attempting to log into deactivated account must be blocked
  const deactLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: 'BrandNewPassword789!' }),
  });
  assert(deactLoginRes.status === 403, `Login to disabled account is rejected with 403 Forbidden (Got ${deactLoginRes.status})`);

  // Reactivate for further tests
  await prisma.user.update({
    where: { id: user.id },
    data: { isActive: true },
  });

  // --------------------------------------------------------------------------
  // TEST 9: Deleted Account Enforcement
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Deleted Account Token Invalidation:');
  await clearRateLimits();
  // Create disposable user
  const delUserEmail = `deleted.user.${timestamp}@test.com`;
  const delUser = await prisma.user.create({
    data: {
      name: 'To Be Deleted',
      email: delUserEmail,
      phone: `97777${String(timestamp).slice(-5)}`,
      password: hashedPassword,
      role: 'CUSTOMER',
      tokenVersion: 0,
      isActive: true,
    },
  });
  const delLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: delUserEmail, password: testCustomerPassword }),
  });
  const delCookie = `namma_token=${parseSetCookie(delLoginRes.headers.get('set-cookie')).value}`;

  // Delete user from DB
  await prisma.user.delete({ where: { id: delUser.id } });

  // Session token must immediately fail
  const delMeRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: delCookie } });
  assert(delMeRes.status === 401, `Deleted user session token returns 401 Unauthorized (Got ${delMeRes.status})`);

  // --------------------------------------------------------------------------
  // TEST 10: Role Demotion Immediate Effect
  // --------------------------------------------------------------------------
  console.log('\n[TEST 10] Immediate Effect of Role Demotion (Admin -> Customer):');
  await clearRateLimits();
  // Create an admin user
  const adminTestEmail = `role.test.admin.${timestamp}@test.com`;
  const adminTestUser = await prisma.user.create({
    data: {
      name: 'Temp Admin',
      email: adminTestEmail,
      phone: `96666${String(timestamp).slice(-5)}`,
      password: hashedPassword,
      role: 'ADMIN',
      tokenVersion: 0,
      isActive: true,
    },
  });

  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminTestEmail,
      password: testCustomerPassword,
      requiredRole: 'ADMIN',
    }),
  });
  const adminCookie = `namma_token=${parseSetCookie(adminLoginRes.headers.get('set-cookie')).value}`;

  // Verify admin access works
  const adminCheck1 = await fetch(`${BASE_URL}/api/admin/customers`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminCheck1.status === 200, `Admin has access to /api/admin/customers (Got ${adminCheck1.status})`);

  // Demote admin to CUSTOMER in DB
  await prisma.user.update({
    where: { id: adminTestUser.id },
    data: { role: 'CUSTOMER' },
  });

  // Next request with same token must immediately receive 403 Forbidden!
  const adminCheck2 = await fetch(`${BASE_URL}/api/admin/customers`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminCheck2.status === 403, `Demoted user immediately receives 403 Forbidden on admin endpoint (Got ${adminCheck2.status})`);

  // --------------------------------------------------------------------------
  // TEST 11: CSRF Defense on State-Changing Authenticated Requests
  // --------------------------------------------------------------------------
  console.log('\n[TEST 11] CSRF Defense on State-Changing Authenticated Requests:');
  await clearRateLimits();
  // Re-login as customer
  const custLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: 'BrandNewPassword789!' }),
  });
  const csrfTestCookie = `namma_token=${parseSetCookie(custLogin.headers.get('set-cookie')).value}`;

  // 11.1 Cross-site header attempt on POST
  const csrfCrossSite = await fetch(`${BASE_URL}/api/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrfTestCookie,
      'Sec-Fetch-Site': 'cross-site',
    },
    body: JSON.stringify({
      tag: 'Home',
      recipientName: 'Hacker',
      phone: '9999999999',
      houseNumber: '1',
      street: 'Evil Way',
      area: 'HackerVille',
      city: 'Bengaluru',
      pincode: '560001',
    }),
  });
  assert(csrfCrossSite.status === 403, `CSRF cross-site Sec-Fetch-Site request is blocked with 403 Forbidden (Got ${csrfCrossSite.status})`);

  // 11.2 Malicious Origin header attempt on POST
  const csrfBadOrigin = await fetch(`${BASE_URL}/api/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrfTestCookie,
      'Sec-Fetch-Site': 'same-site',
      Origin: 'https://evil-phishing-site.com',
    },
    body: JSON.stringify({
      tag: 'Home',
      recipientName: 'Hacker',
      phone: '9999999999',
      houseNumber: '1',
      street: 'Evil Way',
      area: 'HackerVille',
      city: 'Bengaluru',
      pincode: '560001',
    }),
  });
  assert(csrfBadOrigin.status === 403, `CSRF mismatched Origin request is blocked with 403 Forbidden (Got ${csrfBadOrigin.status})`);

  // 11.3 Safe GET request should succeed
  const safeGet = await fetch(`${BASE_URL}/api/addresses`, {
    headers: {
      Cookie: csrfTestCookie,
      'Sec-Fetch-Site': 'cross-site',
    },
  });
  assert(safeGet.status === 200, `Safe GET request is permitted without CSRF block (Got ${safeGet.status})`);

  // --------------------------------------------------------------------------
  // TEST 12: Session Fixation Defense (Fresh Distinct Tokens on Each Login)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 12] Session Fixation Prevention:');
  const loginA = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: 'BrandNewPassword789!' }),
  });
  const tokenA = parseSetCookie(loginA.headers.get('set-cookie')).value;

  // Wait 1 second so issued-at timestamp is different
  await new Promise((r) => setTimeout(r, 1100));

  const loginB = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: 'BrandNewPassword789!' }),
  });
  const tokenB = parseSetCookie(loginB.headers.get('set-cookie')).value;

  assert(tokenA !== tokenB, 'Subsequent login generates a new distinct session token (Prevents Session Fixation)');

  // --------------------------------------------------------------------------
  // TEST 13: LocalStorage Audit (No sensitive tokens stored on client)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 13] LocalStorage Frontend Codebase Audit:');
  const srcDir = path.resolve('src');
  let tokenInStorageFound = false;

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        // Search for localStorage.setItem with token/auth
        const match = content.match(/localStorage\s*\.\s*setItem\s*\(\s*['"`](?:token|jwt|auth|access_token)/i);
        if (match) {
          console.error(`Found token in localStorage in: ${full}`);
          tokenInStorageFound = true;
        }
      }
    }
  }
  scanDir(srcDir);
  assert(!tokenInStorageFound, 'Audited all src/ files: ZERO auth tokens stored in localStorage');

  // --------------------------------------------------------------------------
  // TEST 14: Tampered Session Token Rejection
  // --------------------------------------------------------------------------
  console.log('\n[TEST 14] Tampered Session Token Rejection:');
  const tamperedToken = `${customerRawToken.slice(0, -6)}tamper`;
  const tamperedRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: `namma_token=${tamperedToken}` },
  });
  assert(tamperedRes.status === 401, `Tampered token returns 401 Unauthorized (Got ${tamperedRes.status})`);

  // --------------------------------------------------------------------------
  // TEST 15: Attempt to Place Order with Revoked Session
  // --------------------------------------------------------------------------
  console.log('\n[TEST 15] Order Placement with Revoked Session Rejected:');
  // Use the revoked cookie from Test 4 (user.tokenVersion was incremented)
  const revokedOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customerAuthCookie, // Retained old cookie
      'Sec-Fetch-Site': 'same-origin',
      Origin: BASE_URL,
    },
    body: JSON.stringify({
      items: [{ productId: 'dummy', name: 'Milk', quantity: 1 }],
      address: {
        tag: 'Home',
        recipientName: 'Test',
        phone: '9888812345',
        houseNumber: '1',
        street: 'Main',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
      },
      deliverySlot: 'Morning',
      deliveryDate: 'Today',
      paymentMethod: 'COD',
    }),
  });
  assert(revokedOrderRes.status === 401, `Placing order with revoked session returns 401 Unauthorized (Got ${revokedOrderRes.status})`);

  // Clean up test users
  try {
    await prisma.user.deleteMany({
      where: {
        id: { in: [user.id, adminTestUser.id] },
      },
    });
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log('\n======================================================');
  console.log(`TASK 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Unhandled error during session security testing:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
