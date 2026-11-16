import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const ADMIN_EMAIL = 'admin@purepicks.com';
const SECURE_ADMIN_PASSWORD = 'PurePicks@AdminSecure2026!';
const CUSTOMER_EMAIL = 'customer@gmail.com';
const CUSTOMER_PASSWORD = 'customer123';

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

async function runAdminSecuritySuite() {
  console.log('================================================================');
  console.log('     RUNNING TASK 2: ADMINISTRATOR AUTHENTICATION SECURITY      ');
  console.log('================================================================\n');

  await clearRateLimits();

  // Ensure admin user has secure password hash stored in DB
  const hashedAdminPassword = await bcrypt.hash(SECURE_ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  if (!adminUser) {
    console.error('FATAL: Admin user not found in DB!');
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      email: ADMIN_EMAIL,
      password: hashedAdminPassword,
      tokenVersion: 1,
    },
  });

  // Ensure customer exists with known password
  const hashedCustomerPassword = await bcrypt.hash(CUSTOMER_PASSWORD, 10);
  await prisma.user.update({
    where: { email: CUSTOMER_EMAIL },
    data: {
      password: hashedCustomerPassword,
      role: 'CUSTOMER',
      tokenVersion: 0,
    },
  });

  // -------------------------------------------------------------
  // TEST CASE 1: Correct admin password must work
  // -------------------------------------------------------------
  console.log('--- Test Case 1: Correct admin password must authenticate successfully ---');
  let adminToken = null;
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: SECURE_ADMIN_PASSWORD,
        requiredRole: 'ADMIN',
      }),
    });
    const data = await res.json();
    const cookieHeader = res.headers.get('set-cookie') || '';
    const cookieTokenMatch = cookieHeader.match(/namma_token=([^;]+)/);
    adminToken = cookieTokenMatch ? cookieTokenMatch[1] : null;

    assert(
      res.status === 200 && data.success === true && adminToken && data.token === undefined && data.user.role === 'ADMIN',
      'Correct admin password authenticates successfully, sets HTTP-only cookie, and excludes token from JSON',
      JSON.stringify(data)
    );
  }

  // -------------------------------------------------------------
  // TEST CASE 2: Incorrect admin password must fail
  // -------------------------------------------------------------
  console.log('\n--- Test Case 2: Incorrect admin password must fail ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: 'IncorrectPassword999!',
        requiredRole: 'ADMIN',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false && data.message === 'Invalid credentials. Please verify your identifier and password.',
      'Incorrect admin password fails with 401 and generic anti-enumeration response',
      JSON.stringify(data)
    );
  }

  // -------------------------------------------------------------
  // TEST CASE 3: admin123 must not bypass authentication
  // -------------------------------------------------------------
  console.log('\n--- Test Case 3: admin123 must NOT bypass authentication ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: 'admin123',
        requiredRole: 'ADMIN',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false,
      'admin123 legacy bypass is completely blocked and fails authentication (401)',
      JSON.stringify(data)
    );
  }

  // -------------------------------------------------------------
  // TEST CASE 4: Admin@123 must not bypass authentication
  // -------------------------------------------------------------
  console.log('\n--- Test Case 4: Admin@123 must NOT bypass authentication ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: 'Admin@123',
        requiredRole: 'ADMIN',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false,
      'Admin@123 legacy bypass is completely blocked and fails authentication (401)',
      JSON.stringify(data)
    );
  }

  // Test other common variants
  {
    for (const variant of ['admin@123', 'Admin123']) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: variant,
          requiredRole: 'ADMIN',
        }),
      });
      const data = await res.json();
      assert(
        res.status === 401 && data.success === false,
        `Variant '${variant}' is strictly blocked (401)`,
        JSON.stringify(data)
      );
    }
  }

  // -------------------------------------------------------------
  // TEST CASE 5: Customer cannot log in through the admin portal
  // -------------------------------------------------------------
  console.log('\n--- Test Case 5: Customer cannot log in through the admin portal ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: CUSTOMER_EMAIL,
        password: CUSTOMER_PASSWORD,
        requiredRole: 'ADMIN', // Logging in via admin portal
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.success === false && data.message.includes('Access Denied'),
      'Valid customer credentials attempting admin login are strictly rejected with 403 Access Denied',
      JSON.stringify(data)
    );
  }

  // -------------------------------------------------------------
  // TEST CASE 6: Customer cannot change their role to ADMIN
  // -------------------------------------------------------------
  console.log('\n--- Test Case 6: Customer cannot change their role to ADMIN via registration ---');
  {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious User',
        email: 'attacker-priv-esc@gmail.com',
        password: 'AttackerPassword123!',
        phone: '9999900001',
        role: 'ADMIN', // Attempt privilege escalation
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.success === false && data.message.includes('prohibited'),
      'Registration with role: ADMIN is strictly forbidden with 403 error',
      JSON.stringify(data)
    );

    // Verify in database that no user was created with role ADMIN
    const attackerInDb = await prisma.user.findUnique({ where: { email: 'attacker-priv-esc@gmail.com' } });
    assert(attackerInDb === null, 'No user record created in DB for forbidden admin registration request');
  }

  // -------------------------------------------------------------
  // TEST CASE 7: Unauthenticated requests cannot access admin APIs
  // -------------------------------------------------------------
  console.log('\n--- Test Case 7: Unauthenticated requests cannot access admin APIs ---');
  {
    // Test 7a: Unauthenticated access to /api/admin/customers
    const unauthRes = await fetch(`${BASE_URL}/api/admin/customers`);
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.success === false,
      'Unauthenticated request to /api/admin/customers returns 401 Unauthorized',
      JSON.stringify(unauthData)
    );

    // Test 7b: Customer session access to /api/admin/customers
    const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    });
    const custCookieHeader = custLoginRes.headers.get('set-cookie') || '';
    const custTokenMatch = custCookieHeader.match(/namma_token=([^;]+)/);
    const custToken = custTokenMatch ? custTokenMatch[1] : null;

    const custRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const custData = await custRes.json();
    assert(
      custRes.status === 403 && custData.success === false,
      'Customer JWT accessing /api/admin/customers returns 403 Forbidden',
      JSON.stringify(custData)
    );

    // Test 7c: Verified Admin access to /api/admin/customers succeeds
    const adminRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminData = await adminRes.json();
    assert(
      adminRes.status === 200 && adminData.success === true && Array.isArray(adminData.customers),
      'Legitimate Admin JWT successfully accesses /api/admin/customers (200 OK)',
      `Returned ${adminData.customers?.length} customers`
    );

    // Test 7d: Unauthenticated access to admin promotion endpoint /api/admin/users
    const promoRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, newRole: 'ADMIN' }),
    });
    assert(
      promoRes.status === 401,
      'Unauthenticated request to /api/admin/users promotion endpoint returns 401 Unauthorized'
    );
  }

  // -------------------------------------------------------------
  // TEST CASE 8: Consistent login failure prevents account enumeration
  // -------------------------------------------------------------
  console.log('\n--- Test Case 8: Consistent failure responses prevent account enumeration ---');
  await clearRateLimits();
  {
    const nonExistentRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'definitely-does-not-exist@purepicks.com',
        password: 'SomeRandomPassword123!',
      }),
    });
    const nonExistentData = await nonExistentRes.json();

    const existingWrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: 'IncorrectPassword999!',
      }),
    });
    const existingWrongPassData = await existingWrongPassRes.json();

    assert(
      nonExistentRes.status === existingWrongPassRes.status &&
      nonExistentData.message === existingWrongPassData.message,
      'Responses for non-existent email and wrong password are 100% IDENTICAL (status 401 & same message)',
      `Non-existent: "${nonExistentData.message}" vs Existing: "${existingWrongPassData.message}"`
    );
  }

  console.log('\n================================================================');
  console.log(`TASK 2 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runAdminSecuritySuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
