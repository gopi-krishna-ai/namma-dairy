import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

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
  } catch (e) {}
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   RUNNING TASK 7: SECURE LOGIN, REGISTRATION & ACCOUNT AUDIT   ');
  console.log('================================================================\n');

  await clearRateLimits();

  // -------------------------------------------------------------------------
  // SECTION 1: LOGIN SECURITY, ACCOUNT LOCKOUT & ENUMERATION PREVENTION
  // -------------------------------------------------------------------------
  console.log('[SECTION 1] Login Rate Limiting, Temporary Lockout & Enumeration Protection');

  // Test 1.1: Format Validation for Login
  const badFormatRes1 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'somepassword123' }),
  });
  const badFormatData1 = await badFormatRes1.json();
  assert(
    badFormatRes1.status === 400 && !badFormatData1.success,
    'Malformed email identifier rejected with 400 Bad Request'
  );

  const badPhoneRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '12345', password: 'somepassword123' }),
  });
  assert(
    badPhoneRes.status === 400,
    'Invalid short phone number rejected with 400 Bad Request'
  );

  // Test 1.2: Account Enumeration Prevention (Identical status code and response for existing vs non-existing user)
  const nonExistentEmail = `nonexistent_${Date.now()}@purepicks.com`;
  const nonExistentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: nonExistentEmail, password: 'WrongPassword123!' }),
  });
  const nonExistentData = await nonExistentRes.json();

  const wrongPasswordRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CUSTOMER_EMAIL, password: 'WrongPassword123!' }),
  });
  const wrongPasswordData = await wrongPasswordRes.json();

  assert(
    nonExistentRes.status === 401 && wrongPasswordRes.status === 401,
    'Non-existent account and wrong password both return identical status 401'
  );
  assert(
    nonExistentData.message === wrongPasswordData.message,
    `Generic authentication error prevents account enumeration ("${wrongPasswordData.message}")`
  );

  // Test 1.3: Temporary Account Lockout after repeated failed login attempts
  // Target a designated test account
  const lockoutTargetEmail = `lockout_test_${Date.now()}@purepicks.com`;
  // Create user
  await prisma.user.create({
    data: {
      name: 'Lockout Test User',
      email: lockoutTargetEmail,
      password: '$2a$12$e8Y5t1hK4l5y3r9e.hkW4YxvK8jjYfrweY1cPT44E6hcsjuPQML3A',
      role: 'CUSTOMER',
      isEmailVerified: true,
    },
  });

  // Make 5 consecutive failed attempts
  for (let i = 1; i <= 5; i++) {
    await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutTargetEmail, password: `wrong_${i}` }),
    });
  }

  // 6th attempt must be rejected with 429 Temporary Lockout
  const lockedRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: lockoutTargetEmail, password: 'anypassword' }),
  });
  const lockedData = await lockedRes.json();
  assert(
    lockedRes.status === 429 && lockedData.message.includes('temporarily locked'),
    'Account temporarily locked out after 5 consecutive failed login attempts (429)'
  );
  assert(
    lockedData.message.includes('seconds') || lockedData.message.includes('minutes'),
    'Lockout message indicates temporary duration (avoids permanent account lockout vulnerability)'
  );

  // Test 1.4: Multi-IP Brute Force Target Protection (Account-identifier level rate limit)
  // An attacker distributing requests across multiple distinct IP addresses targeting one account
  const multiIpTarget = `multi_ip_${Date.now()}@purepicks.com`;
  for (let ipIdx = 1; ipIdx <= 6; ipIdx++) {
    await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `198.51.100.${ipIdx}`,
      },
      body: JSON.stringify({ email: multiIpTarget, password: `bad_${ipIdx}` }),
    });
  }
  const multiIpRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `198.51.100.99`,
    },
    body: JSON.stringify({ email: multiIpTarget, password: 'test' }),
  });
  assert(
    multiIpRes.status === 429,
    'Multiple IPs attacking the same account identifier are blocked by account-level protection (429)'
  );

  // Test 1.5: IP Rate Limiting (20 repeated failed login attempts from a single IP)
  const singleIp = `203.0.113.${(Date.now() % 200) + 10}`;
  let ipRateLimited = false;
  for (let i = 1; i <= 25; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': singleIp,
      },
      body: JSON.stringify({ email: `ip_target_${Date.now()}_${i}@test.com`, password: 'password123' }),
    });
    if (res.status === 429) {
      const data = await res.json();
      if (data.message.includes('Too many login attempts from this IP')) {
        ipRateLimited = true;
        break;
      }
    }
  }
  assert(ipRateLimited, 'IP address making >20 failed login attempts is rate-limited with 429');

  // Test 1.6: Efficient Indexed Phone Number Login
  // Update customer with a known 10-digit phone
  const testPhone = '9876543210';
  await prisma.user.update({
    where: { email: CUSTOMER_EMAIL },
    data: { phone: testPhone },
  });
  await clearRateLimits();

  const phoneLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testPhone, password: CUSTOMER_PASSWORD }),
  });
  const phoneLoginData = await phoneLoginRes.json();
  assert(
    phoneLoginRes.status === 200 && phoneLoginData.success,
    `Indexed phone number login succeeded for ${testPhone}`
  );

  // Also test with +91 prefix
  const plusPhoneLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `+91${testPhone}`, password: CUSTOMER_PASSWORD }),
  });
  const plusPhoneData = await plusPhoneLoginRes.json();
  assert(
    plusPhoneLoginRes.status === 200 && plusPhoneData.success,
    `Indexed phone number login succeeded with +91 country prefix (+91${testPhone})`
  );

  // -------------------------------------------------------------------------
  // SECTION 2: REGISTRATION SECURITY & ACCOUNT CREATION
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 2] Registration Validation, Role Hardening & Abuse Prevention');

  await clearRateLimits();

  // Test 2.1: Weak Password Rejection (< 8 characters)
  const weakPassRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weak Pass User',
      email: `weak_${Date.now()}@purepicks.com`,
      password: '1234567', // 7 chars
    }),
  });
  const weakPassData = await weakPassRes.json();
  assert(
    weakPassRes.status === 400 && weakPassData.message.includes('at least 8 characters'),
    'Weak password (< 8 chars) rejected with 400 Bad Request'
  );

  // Test 2.2: Invalid Email Rejection
  const invalidEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Invalid Email User',
      email: 'invalid-email-format@notadomain',
      password: 'ValidPassword123!',
    }),
  });
  assert(invalidEmailRes.status === 400, 'Invalid email format rejected with 400 Bad Request');

  // Test 2.3: Invalid Phone Format Rejection
  const invalidPhoneRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Invalid Phone User',
      email: `valid_${Date.now()}@purepicks.com`,
      phone: '12345', // Short phone
      password: 'ValidPassword123!',
    }),
  });
  assert(invalidPhoneRes.status === 400, 'Invalid phone number format rejected with 400 Bad Request');

  // Test 2.4: Privilege Escalation Block (Register with role: ADMIN)
  const adminRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hacker Admin',
      email: `hacker_${Date.now()}@purepicks.com`,
      password: 'ValidPassword123!',
      role: 'ADMIN',
    }),
  });
  assert(
    adminRegRes.status === 403,
    'Customer registering with role ADMIN strictly forbidden with 403'
  );

  // Test 2.5: Successful Registration & Email Verification Generation
  const newEmail = `fresh_customer_${Date.now()}@purepicks.com`;
  const newPhone = '98' + String(Date.now()).slice(-8);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fresh Customer',
      email: `  ${newEmail.toUpperCase()}  `, // Test normalization
      phone: newPhone,
      password: 'ValidSecurePassword2026!',
    }),
  });
  const regData = await regRes.json();
  assert(regRes.status === 200 && regData.success, 'Registration with valid details succeeded');

  // Verify in DB that email was normalized to lowercase and trimmed
  const createdUser = await prisma.user.findUnique({ where: { email: newEmail } });
  assert(
    createdUser && createdUser.email === newEmail,
    `Email address was cleanly normalized to lowercase without whitespace (${newEmail})`
  );
  assert(
    createdUser.role === 'CUSTOMER',
    'Created user role is strictly CUSTOMER'
  );
  assert(
    Boolean(createdUser.emailVerificationToken),
    'Cryptographic email verification token generated and stored'
  );
  assert(
    createdUser.isEmailVerified === false,
    'Newly registered user is created with isEmailVerified: false'
  );

  // Test 2.6: Mass Assignment Prevention
  await clearRateLimits();
  const massAssignEmail = `mass_assign_${Date.now()}@purepicks.com`;
  const massAssignRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mass Assign User',
      email: massAssignEmail,
      password: 'ValidSecurePassword2026!',
      // Injected privileged properties:
      tokenVersion: 99,
      isEmailVerified: true,
      role: 'CUSTOMER',
    }),
  });
  assert(massAssignRes.status === 200, 'Registration with extra properties handled safely');
  const massUser = await prisma.user.findUnique({ where: { email: massAssignEmail } });
  assert(
    massUser.tokenVersion === 0 && massUser.isEmailVerified === false,
    'Mass assignment prevented: injected tokenVersion and isEmailVerified ignored'
  );

  // Test 2.7: Duplicate Email Registration Prevention
  await clearRateLimits();
  const dupEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Email Attempt',
      email: newEmail,
      password: 'ValidSecurePassword2026!',
    }),
  });
  assert(
    dupEmailRes.status === 409,
    'Duplicate email registration rejected with 409 Conflict'
  );

  // Test 2.8: Duplicate Phone Registration Prevention
  const dupPhoneRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Phone Attempt',
      email: `other_${Date.now()}@purepicks.com`,
      phone: newPhone, // Already used by Fresh Customer
      password: 'ValidSecurePassword2026!',
    }),
  });
  assert(
    dupPhoneRes.status === 409,
    'Duplicate phone registration rejected with 409 Conflict'
  );

  // Test 2.9: Email Verification Endpoint
  // Verify with invalid token
  const invalidVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=invalid_token_12345`);
  assert(invalidVerifyRes.status === 400, 'Invalid email verification token rejected with 400');

  // Verify with authentic token
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${createdUser.emailVerificationToken}`);
  const verifyData = await verifyRes.json();
  assert(
    verifyRes.status === 200 && verifyData.success,
    'Valid email verification token succeeds (200 OK)'
  );

  const verifiedUser = await prisma.user.findUnique({ where: { id: createdUser.id } });
  assert(
    verifiedUser.isEmailVerified === true && verifiedUser.emailVerificationToken === null,
    'User status transitioned to isEmailVerified: true and token consumed'
  );

  // Test 2.10: Automated Registration Abuse (IP Rate Limit)
  const spamIp = '198.51.100.77';
  let regSpamBlocked = false;
  for (let i = 1; i <= 7; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': spamIp,
      },
      body: JSON.stringify({
        name: `Bot User ${i}`,
        email: `bot_${i}_${Date.now()}@spam.com`,
        password: 'ValidPassword123!',
      }),
    });
    if (res.status === 429) {
      regSpamBlocked = true;
      break;
    }
  }
  assert(
    regSpamBlocked,
    'Automated registration abuse blocked by IP rate limiting (429 Too Many Requests)'
  );

  console.log('\n================================================================');
  console.log(`TASK 7 AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Test suite runner crashed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
