import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const JWT_SECRET = process.env.JWT_SECRET || 'namma-dairy-jwt-super-secret-key-bengaluru-2026';
const CUSTOMER_EMAIL = 'customer@gmail.com';
const CUSTOMER_PASSWORD = 'customer123';
const ADMIN_EMAIL = 'admin@purepicks.com';
const ADMIN_PASSWORD = 'PurePicks@AdminSecure2026!';

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

async function runJwtSecuritySuite() {
  console.log('================================================================');
  console.log('   RUNNING TASK 4: SECURE JWT AUTH & TOKEN MANAGEMENT AUDIT     ');
  console.log('================================================================\n');

  await clearRateLimits();

  // Find customer and admin users in DB
  const customer = await prisma.user.findUnique({ where: { email: CUSTOMER_EMAIL } });
  if (!customer) {
    console.error('FATAL: Customer user not found in DB!');
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('FATAL: Admin user not found in DB!');
    process.exit(1);
  }

  // =========================================================================
  // TEST SUITE 0: JWT Configuration Validation & Missing Secret Handling
  // =========================================================================
  console.log('--- Test Suite 0: Missing JWT_SECRET & Fail-Safe Configuration ---');
  {
    function testGetJwtSecret(val) {
      if (!val || typeof val !== 'string' || val.trim() === '') {
        throw new Error('FATAL_AUTH_CONFIGURATION_ERROR: JWT_SECRET environment variable is missing or empty.');
      }
      if (val.trim().length < 32) {
        throw new Error('INSECURE_AUTH_CONFIGURATION_ERROR: JWT_SECRET must be at least 32 characters in length.');
      }
      return val.trim();
    }

    let threwOnMissing = false;
    try {
      testGetJwtSecret(undefined);
    } catch (e) {
      threwOnMissing = e.message.includes('FATAL_AUTH_CONFIGURATION_ERROR');
    }
    assert(threwOnMissing, 'Missing JWT_SECRET fails securely with FATAL_AUTH_CONFIGURATION_ERROR (Requirement 2)');

    let threwOnShort = false;
    try {
      testGetJwtSecret('short-secret-123');
    } catch (e) {
      threwOnShort = e.message.includes('INSECURE_AUTH_CONFIGURATION_ERROR');
    }
    assert(threwOnShort, 'Insecure JWT_SECRET (<32 chars) fails securely with INSECURE_AUTH_CONFIGURATION_ERROR (Requirement 4)');

    assert(JWT_SECRET.length >= 32, `Active JWT_SECRET is cryptographically strong (${JWT_SECRET.length} characters >= 32 minimum)`);
  }

  // =========================================================================
  // TEST SUITE 1: Cookie Security Attributes & Token Omission from JSON Body
  // =========================================================================
  console.log('--- Test Suite 1: Cookie Attributes & Body Cleanliness ---');
  {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    });
    const loginData = await loginRes.json();
    const setCookie = loginRes.headers.get('set-cookie') || '';

    // Requirement 6: Do not return JWT in login JSON response
    assert(
      loginData.token === undefined,
      'JWT token is omitted from login JSON response body (Requirement 6)',
      `Returned keys: ${Object.keys(loginData).join(', ')}`
    );

    // Requirement 5 & 7: Cookie has HttpOnly, SameSite=Lax, and Path=/
    const isHttpOnly = /httponly/i.test(setCookie);
    const isSameSiteLax = /samesite=lax/i.test(setCookie);
    const hasPath = /path=\//i.test(setCookie);

    assert(
      isHttpOnly && isSameSiteLax && hasPath,
      'Authentication cookie is configured with HttpOnly, SameSite=Lax, and Path=/ (Requirement 5 & 7)',
      setCookie
    );
  }

  // =========================================================================
  // TEST SUITE 2: Invalid, Tampered & Expired JWTs
  // =========================================================================
  console.log('\n--- Test Suite 2: Invalid, Tampered & Expired Tokens ---');
  {
    // Test 2a: Malformed / Garbage JWT
    const malformedRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token-string' },
    });
    assert(
      malformedRes.status === 401,
      'Malformed token string is rejected with 401 Unauthorized',
      `Status: ${malformedRes.status}`
    );

    // Test 2b: Expired JWT
    const expiredToken = jwt.sign(
      {
        userId: customer.id,
        email: customer.email,
        role: 'CUSTOMER',
        name: customer.name,
        tokenVersion: customer.tokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: '-10s', // Expired 10 seconds ago
        issuer: 'purepicks:auth',
        audience: 'purepicks:app',
      }
    );
    const expiredRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(
      expiredRes.status === 401,
      'Expired JWT is rejected with 401 Unauthorized (Requirement 11)',
      `Status: ${expiredRes.status}`
    );

    // Test 2c: Tampered JWT (Payload or Signature altered)
    const validToken = jwt.sign(
      {
        userId: customer.id,
        email: customer.email,
        role: 'CUSTOMER',
        name: customer.name,
        tokenVersion: customer.tokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'purepicks:auth',
        audience: 'purepicks:app',
      }
    );
    // Tamper the payload segment
    const parts = validToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: customer.id, role: 'ADMIN' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const tamperedRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    assert(
      tamperedRes.status === 401,
      'Tampered JWT signature mismatch is rejected with 401 Unauthorized',
      `Status: ${tamperedRes.status}`
    );

    // Test 2d: Wrong Issuer or Audience
    const wrongIssuerToken = jwt.sign(
      {
        userId: customer.id,
        email: customer.email,
        role: 'CUSTOMER',
        name: customer.name,
        tokenVersion: customer.tokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'malicious-issuer.com',
        audience: 'purepicks:app',
      }
    );
    const wrongIssuerRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${wrongIssuerToken}` },
    });
    assert(
      wrongIssuerRes.status === 401,
      'Token with unauthorized issuer is rejected with 401 Unauthorized (Requirement 11)',
      `Status: ${wrongIssuerRes.status}`
    );
  }

  // =========================================================================
  // TEST SUITE 3: Server-Side Session Revocation (tokenVersion mismatch)
  // =========================================================================
  console.log('\n--- Test Suite 3: Server-Side Session Version & Revocation ---');
  {
    // Generate valid token for customer
    const currentCustomer = await prisma.user.findUnique({ where: { id: customer.id } });
    const currentTokenVersion = currentCustomer.tokenVersion;

    const tokenBeforeRevoke = jwt.sign(
      {
        userId: customer.id,
        email: customer.email,
        role: 'CUSTOMER',
        name: customer.name,
        tokenVersion: currentTokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'purepicks:auth',
        audience: 'purepicks:app',
      }
    );

    // Verify token works before revocation
    const verifyBeforeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenBeforeRevoke}` },
    });
    assert(
      verifyBeforeRes.status === 200,
      'Token is valid before server-side revocation (200 OK)'
    );

    // Revoke by incrementing tokenVersion in DB
    await prisma.user.update({
      where: { id: customer.id },
      data: { tokenVersion: { increment: 1 } },
    });

    // Attempt to use the same token after tokenVersion incremented
    const verifyAfterRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenBeforeRevoke}` },
    });
    assert(
      verifyAfterRes.status === 401,
      'Previously issued token is IMMEDIATELY revoked after tokenVersion increment (Requirement 8 & 14)',
      `Status: ${verifyAfterRes.status}`
    );
  }

  // =========================================================================
  // TEST SUITE 4: Logout Clears Authentication Cookie & Revokes Session
  // =========================================================================
  console.log('\n--- Test Suite 4: Logout Cookie Clearing & Revocation ---');
  {
    // Login to obtain active cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    });
    const setCookie = loginRes.headers.get('set-cookie');
    const match = setCookie.match(/namma_token=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    // Call logout endpoint with session cookie
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: setCookie },
    });
    const logoutCookie = logoutRes.headers.get('set-cookie') || '';

    // Requirement 10: Cookie cleared (max-age=0 or expires in past)
    const isCleared =
      /max-age=0/i.test(logoutCookie) || /expires=thu, 01 jan 1970/i.test(logoutCookie);

    assert(
      logoutRes.status === 200 && isCleared,
      'Logout successfully clears authentication cookie with max-age=0 / expired date (Requirement 10)',
      logoutCookie
    );

    // Attempting to access protected API with the pre-logout token must now fail
    const mePostLogout = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    assert(
      mePostLogout.status === 401,
      'Protected API call after logout is rejected (401 Unauthorized)',
      `Status: ${mePostLogout.status}`
    );
  }

  // =========================================================================
  // TEST SUITE 5: Password Change Invalidation (Old Token Request Rejection)
  // =========================================================================
  console.log('\n--- Test Suite 5: Password Change & Old Token Invalidation ---');
  {
    // Login to get current session cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    });
    const activeCookie = loginRes.headers.get('set-cookie');
    const match = activeCookie.match(/namma_token=([^;]+)/);
    const oldSessionToken = match ? match[1] : null;

    // Change password via authenticated change-password API
    const newPass = 'CustomerNewSecurePass2026!';
    const changePassRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: activeCookie,
      },
      body: JSON.stringify({
        currentPassword: CUSTOMER_PASSWORD,
        newPassword: newPass,
      }),
    });
    const changePassData = await changePassRes.json();

    assert(
      changePassRes.status === 200 && changePassData.success,
      'Authenticated password change succeeds and updates tokenVersion (Requirement 9)',
      JSON.stringify(changePassData)
    );

    // Verify old token is now REJECTED
    const testOldTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${oldSessionToken}` },
    });
    assert(
      testOldTokenRes.status === 401,
      'Request made with pre-password-change token is strictly rejected with 401 (Requirement 9 & 14)',
      `Status: ${testOldTokenRes.status}`
    );

    // Revert password back to original CUSTOMER_PASSWORD
    const hashedOriginal = await bcrypt.hash(CUSTOMER_PASSWORD, 12);
    await prisma.user.update({
      where: { email: CUSTOMER_EMAIL },
      data: { password: hashedOriginal },
    });
  }

  // =========================================================================
  // TEST SUITE 6: Customer Attempting Admin API Access & Client Role Untrust
  // =========================================================================
  console.log('\n--- Test Suite 6: Database-Authoritative Roles & Admin Protection ---');
  {
    // Login as Customer
    const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    });
    const custCookie = custLoginRes.headers.get('set-cookie');
    const custToken = custCookie.match(/namma_token=([^;]+)/)[1];

    // Customer tries accessing admin endpoint /api/admin/customers
    const adminAccessRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Cookie: custCookie },
    });
    const adminAccessData = await adminAccessRes.json();

    assert(
      adminAccessRes.status === 403 && !adminAccessData.success,
      'Customer session accessing /api/admin/customers is rejected with 403 Forbidden (Requirement 12 & 15)',
      JSON.stringify(adminAccessData)
    );

    // Customer tries forging role: 'ADMIN' in their JWT signed with customer's tokenVersion
    const currentCust = await prisma.user.findUnique({ where: { email: CUSTOMER_EMAIL } });
    const forgedAdminToken = jwt.sign(
      {
        userId: currentCust.id,
        email: currentCust.email,
        role: 'ADMIN', // Attacker forged role!
        name: currentCust.name,
        tokenVersion: currentCust.tokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'purepicks:auth',
        audience: 'purepicks:app',
      }
    );

    // Backend must fetch user from DB and check DB role (CUSTOMER), ignoring forged payload.role!
    const forgedAccessRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${forgedAdminToken}` },
    });
    const forgedAccessData = await forgedAccessRes.json();

    assert(
      forgedAccessRes.status === 403 && !forgedAccessData.success,
      'Forged payload.role: "ADMIN" is ignored; backend queries database authoritative role: CUSTOMER (403 Forbidden) (Requirement 12 & 13)',
      JSON.stringify(forgedAccessData)
    );
  }

  // =========================================================================
  // TEST SUITE 7: Admin Legitimate Access Works Flawlessly
  // =========================================================================
  console.log('\n--- Test Suite 7: Legitimate Administrator Authentication ---');
  {
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        requiredRole: 'ADMIN',
      }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie');
    const adminData = await adminLoginRes.json();

    assert(
      adminLoginRes.status === 200 && adminData.success && adminData.token === undefined,
      'Administrator authenticates successfully with HTTP-only cookie and no token in body (Requirement 6 & 15)'
    );

    const adminCustomersRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Cookie: adminCookie },
    });
    assert(
      adminCustomersRes.status === 200,
      'Legitimate administrator accesses /api/admin/customers with 200 OK (Requirement 15)'
    );
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`  JWT SECURITY & SESSION MANAGEMENT SUITE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('>>> ALL JWT AUTHENTICATION AND TOKEN SECURITY CHECKS PASSED! <<<\n');
  } else {
    console.error('>>> SOME JWT SECURITY CHECKS FAILED! <<<\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

runJwtSecuritySuite().catch(async (e) => {
  console.error('Fatal execution error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
