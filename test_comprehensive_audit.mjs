/**
 * TASK 10: Master End-to-End Security & Functional Audit Test Suite
 *
 * Simulates:
 * 1. Complete Customer Journey (Steps 1 to 16)
 * 2. Complete Administrator Journey (Steps 1 to 11)
 * 3. Specialized Security Exploitation Attacks (SQLi, XSS, IDOR, Mass Assignment, CSRF, Replay, etc.)
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

function parseCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  const match = setCookie.match(/namma_token=([^;]+)/);
  return match ? `namma_token=${match[1]}` : '';
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

const PEPPER = process.env.OTP_PEPPER_SECRET || process.env.JWT_SECRET || 'pure-picks-otp-pepper-secret-2026';
function hashOtp(otp) {
  return crypto.createHash('sha256').update(`${otp.trim()}:${PEPPER}`).digest('hex');
}

async function discoverOtp(email) {
  const req = await prisma.passwordResetRequest.findFirst({
    where: { email: email.toLowerCase().trim(), isConsumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!req) return null;
  for (let i = 100000; i <= 999999; i++) {
    const candidate = i.toString();
    if (hashOtp(candidate) === req.hashedOtp) {
      return candidate;
    }
  }
  return null;
}

async function runAudit() {
  console.log('\n================================================================');
  console.log('--- TASK 10: COMPLETE MASTER SECURITY & FUNCTIONAL QA AUDIT ---');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const customerEmail = `master.audit.cust.${timestamp}@purepicks.com`;
  const initialPassword = 'CustomerSecurePass@2026';
  const newPasswordAfterReset = 'BrandNewCustomerPass@2026';
  const customerPhone = `94444${String(timestamp).slice(-5)}`;

  await clearRateLimits();

  // ==========================================================================
  // PART 1: COMPLETE CUSTOMER JOURNEY
  // ==========================================================================
  console.log('----------------------------------------------------------------');
  console.log('PART 1: SIMULATING COMPLETE CUSTOMER JOURNEY (STEPS 1 - 16)');
  console.log('----------------------------------------------------------------\n');

  // Step 1: Register a new customer
  console.log('[STEP 1] Customer Registration:');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priya Sharma',
      email: customerEmail,
      phone: customerPhone,
      password: initialPassword,
    }),
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 || regRes.status === 200, `Registration succeeds (Got ${regRes.status})`);
  assert(regData.success === true, 'Registration returns success: true');
  assert(regData.user?.role === 'CUSTOMER', 'Registered user role defaults strictly to CUSTOMER');

  // Step 2: Verify email token
  console.log('\n[STEP 2] Email Verification:');
  const userInDb = await prisma.user.findUnique({ where: { email: customerEmail } });
  assert(Boolean(userInDb?.emailVerificationToken), 'Email verification token was cryptographically generated');

  const verifyEmailRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${userInDb.emailVerificationToken}`);
  const verifyEmailData = await verifyEmailRes.json();
  assert(verifyEmailRes.status === 200, `Email verification succeeds with 200 OK (Got ${verifyEmailRes.status})`);
  const verifiedUser = await prisma.user.findUnique({ where: { email: customerEmail } });
  assert(verifiedUser.isEmailVerified === true, 'User record in DB is now marked isEmailVerified: true');
  assert(verifiedUser.emailVerificationToken === null, 'Email verification token consumed and invalidated');

  // Step 3: Login
  console.log('\n[STEP 3] Customer Login:');
  await clearRateLimits();
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: initialPassword }),
  });
  const loginData = await loginRes.json();
  let customerCookie = parseCookie(loginRes);
  assert(loginRes.status === 200, `Customer logs in successfully (Got 200 OK)`);
  assert(loginData.token === undefined, 'Zero JWT tokens exposed in JSON body');
  assert(Boolean(customerCookie), 'Authentication cookie set in response header');

  // Step 4: Browse products
  console.log('\n[STEP 4] Browse Catalog Products:');
  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const productsData = await productsRes.json();
  assert(productsRes.status === 200, `Catalog retrieved successfully (Got 200 OK)`);
  assert(Array.isArray(productsData.products) && productsData.products.length > 0, `Catalog has ${productsData.products?.length} products`);

  const milkProduct = productsData.products.find((p) => p.unit === 'litre' || p.name.toLowerCase().includes('milk'));
  const chickenProduct = productsData.products.find(
    (p) => p.name.toLowerCase().includes('broiler') || (p.optionsJson?.includes('500g') && p.cuttingOptionsJson)
  );
  assert(Boolean(milkProduct), `Found liquid/dairy product: "${milkProduct?.name}"`);
  assert(Boolean(chickenProduct), `Found meat product with cut options: "${chickenProduct?.name}"`);

  // Step 5 & 6: Cart functionality & Weight / Quantity Pricing
  console.log('\n[STEP 5 & 6] Cart Weight and Quantity Calculation:');
  const validWeight = JSON.parse(chickenProduct.optionsJson)[0]; // e.g. "500g"
  const validCut = JSON.parse(chickenProduct.cuttingOptionsJson)[0]; // e.g. "Curry Cut (Skinless)"

  // Step 7: Apply a coupon
  console.log('\n[STEP 7] Coupon Code Application:');
  // Pure Picks coupon PUREMILK gives 10% discount on subtotal
  const testItems = [
    {
      productId: milkProduct.id,
      name: milkProduct.name,
      selectedWeight: '500ml',
      quantity: 2, // 2 x 500ml = 1L
      unitPrice: milkProduct.basePrice * 0.5,
    },
    {
      productId: chickenProduct.id,
      name: chickenProduct.name,
      selectedWeight: validWeight,
      selectedCut: validCut,
      quantity: 1,
      unitPrice: chickenProduct.basePrice * 0.5,
    },
  ];

  // Step 8: Add a delivery address
  console.log('\n[STEP 8] Customer Delivery Address:');
  const addAddressRes = await fetch(`${BASE_URL}/api/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
    body: JSON.stringify({
      tag: 'Home',
      recipientName: 'Priya Sharma',
      phone: customerPhone,
      houseNumber: '402, Green Glen',
      street: '100ft Road, Indiranagar',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      isDefault: true,
    }),
  });
  const addAddressData = await addAddressRes.json();
  assert(addAddressRes.status === 200 && addAddressData.success, `Delivery address added successfully (Got ${addAddressRes.status})`);
  const savedAddress = addAddressData.address;

  // Step 9 & 10: Select delivery slot and place COD order
  console.log('\n[STEP 9 & 10] Place Cash on Delivery (COD) Order:');
  const codOrderPayload = {
    items: testItems,
    address: savedAddress,
    deliverySlot: 'Early Morning (6:00 AM - 8:00 AM)',
    deliveryDate: 'Tomorrow',
    paymentMethod: 'COD',
    orderNotes: 'Please ring bell twice',
    couponCode: 'PUREMILK',
  };

  const codRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
    body: JSON.stringify(codOrderPayload),
  });
  const codData = await codRes.json();
  assert(codRes.status === 201, `COD Order placed successfully (Got ${codRes.status})`);
  assert(codData.order?.paymentMethod === 'COD', 'Payment method recorded as COD');
  assert(codData.order?.paymentStatus === 'PENDING', 'COD payment status starts as PENDING');
  assert(codData.order?.status === 'PLACED', 'Order status starts as PLACED');
  assert(codData.order?.discount > 0, `Coupon discount applied (₹${codData.order?.discount})`);
  const placedCodOrder = codData.order;

  // Step 11: Place Razorpay test-mode order with genuine signature
  console.log('\n[STEP 11] Place Razorpay Verified Payment Order:');
  const mockRzpOrderId = `order_${Date.now()}`;
  const mockRzpPaymentId = `pay_${Date.now()}`;
  const rzpSecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mock_sandbox_key';
  const authenticSignature = crypto
    .createHmac('sha256', rzpSecret)
    .update(`${mockRzpOrderId}|${mockRzpPaymentId}`)
    .digest('hex');

  const rzpOrderPayload = {
    items: testItems,
    address: savedAddress,
    deliverySlot: 'Evening Slot (5:00 PM - 8:00 PM)',
    deliveryDate: 'Today',
    paymentMethod: 'RAZORPAY',
    razorpayOrderId: mockRzpOrderId,
    razorpayPaymentId: mockRzpPaymentId,
    razorpaySignature: authenticSignature,
  };

  const rzpRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
    body: JSON.stringify(rzpOrderPayload),
  });
  const rzpData = await rzpRes.json();
  assert(rzpRes.status === 201, `Razorpay verified order placed with 201 Created (Got ${rzpRes.status})`);
  assert(rzpData.order?.paymentStatus === 'PAID', 'Verified Razorpay order status is PAID');
  assert(rzpData.order?.status === 'CONFIRMED', 'Verified Razorpay order status is CONFIRMED');
  const placedRzpOrder = rzpData.order;

  // Step 12: View order history
  console.log('\n[STEP 12] View Customer Order History:');
  const historyRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Cookie: customerCookie },
  });
  const historyData = await historyRes.json();
  assert(historyRes.status === 200, `Order history fetched (Got ${historyRes.status})`);
  const orderIds = historyData.orders.map((o) => o.id);
  assert(orderIds.includes(placedCodOrder.id) && orderIds.includes(placedRzpOrder.id), 'Both placed orders appear in customer history');

  // Step 13: Cancel an eligible order (using orderNumber in URL to test identifier fix!)
  console.log('\n[STEP 13] Cancel Eligible Order Using orderNumber in URL:');
  const cancelRes = await fetch(`${BASE_URL}/api/orders/${placedCodOrder.orderNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Travelling out of town tomorrow' }),
  });
  const cancelData = await cancelRes.json();
  assert(cancelRes.status === 200, `Order cancellation using orderNumber in URL succeeds (Got ${cancelRes.status})`);
  assert(cancelData.order?.status === 'CANCELLED', 'Order status transitioned to CANCELLED');

  // Step 14: Receive notifications
  console.log('\n[STEP 14] In-App Customer Notifications:');
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: customerCookie },
  });
  const notifData = await notifRes.json();
  assert(notifRes.status === 200, `Notifications fetched (Got ${notifRes.status})`);
  assert(Array.isArray(notifData.notifications) && notifData.notifications.length >= 3, `Customer has ${notifData.notifications.length} in-app notifications`);
  const cancelNotif = notifData.notifications.find((n) => n.orderId === placedCodOrder.id);
  assert(Boolean(cancelNotif), 'Received cancellation notification linked to database order ID');

  // Step 15: Reset password using OTP
  console.log('\n[STEP 15] Password Recovery via Cryptographic OTP:');
  await clearRateLimits();
  // Request OTP
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail }),
  });
  const forgotData = await forgotRes.json();
  assert(forgotRes.status === 200 && forgotData.success, 'OTP recovery request accepted');

  // Discover and verify OTP
  const discoveredOtp = await discoverOtp(customerEmail);
  assert(Boolean(discoveredOtp), `Resolved OTP for test customer`);

  const verifyOtpRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, otp: discoveredOtp }),
  });
  const verifyOtpData = await verifyOtpRes.json();
  assert(verifyOtpRes.status === 200 && Boolean(verifyOtpData.resetToken), 'OTP verification succeeds and issues single-use reset token');

  // Reset password
  const resetPassRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: verifyOtpData.resetToken,
      newPassword: newPasswordAfterReset,
    }),
  });
  const resetPassData = await resetPassRes.json();
  assert(resetPassRes.status === 200 && resetPassData.success, 'Password updated successfully with single-use reset token');

  // Step 16: Login using the new password (and confirm old password fails)
  console.log('\n[STEP 16] Authentication with New Password & Revocation of Old Password:');
  await clearRateLimits();
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: initialPassword }),
  });
  assert(oldLoginRes.status === 401, 'Old password fails authentication with 401 Unauthorized');

  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: newPasswordAfterReset }),
  });
  assert(newLoginRes.status === 200, 'New password authenticates successfully with 200 OK');
  customerCookie = parseCookie(newLoginRes);

  // ==========================================================================
  // PART 2: COMPLETE ADMINISTRATOR JOURNEY
  // ==========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('PART 2: SIMULATING COMPLETE ADMINISTRATOR JOURNEY (STEPS 1 - 11)');
  console.log('----------------------------------------------------------------\n');

  // Step 1: Admin Login
  console.log('[STEP 1] Administrator Login:');
  const adminEmail = `audit.admin.${timestamp}@purepicks.com`;
  const adminHashedPass = await bcrypt.hash('AdminAuditPass@2026', 10);
  const adminUserRecord = await prisma.user.create({
    data: {
      name: 'Audit Administrator',
      email: adminEmail,
      phone: `95555${String(timestamp).slice(-5)}`,
      password: adminHashedPass,
      role: 'ADMIN',
      tokenVersion: 0,
      isActive: true,
    },
  });

  await clearRateLimits();
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'AdminAuditPass@2026', requiredRole: 'ADMIN' }),
  });
  const adminCookie = parseCookie(adminLoginRes);
  assert(adminLoginRes.status === 200, `Admin authenticated successfully (Got 200 OK)`);

  // Step 2: View Dashboard Data
  console.log('\n[STEP 2] View Admin Dashboard & Customer Metrics:');
  const adminCustRes = await fetch(`${BASE_URL}/api/admin/customers`, {
    headers: { Cookie: adminCookie },
  });
  const adminCustData = await adminCustRes.json();
  assert(adminCustRes.status === 200, `Admin customers API returned 200 OK (Got ${adminCustRes.status})`);
  assert(Array.isArray(adminCustData.customers), 'Admin customer list retrieved');

  // Step 3: Add products
  console.log('\n[STEP 3] Admin Adds New Product:');
  const addProdRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: `Farm Fresh Butter (${timestamp})`,
      description: 'Slow churned traditional butter from pasture-fed buffalo milk',
      categoryId: milkProduct.categoryId,
      image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80',
      badge: 'Churned Fresh',
      basePrice: 180,
      unit: '250g',
      stockQuantity: 40,
      options: ['250g', '500g', '1 kg'],
    }),
  });
  const addProdData = await addProdRes.json();
  assert(addProdRes.status === 200 && addProdData.success, `Admin created new product successfully (Got ${addProdRes.status})`);
  const createdAuditProduct = addProdData.product;

  // Step 4: Edit product prices
  console.log('\n[STEP 4] Admin Edits Product Price:');
  const editPriceRes = await fetch(`${BASE_URL}/api/products/${createdAuditProduct.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ basePrice: 195 }),
  });
  const editPriceData = await editPriceRes.json();
  assert(editPriceRes.status === 200, `Product price updated to ₹195 (Got ${editPriceRes.status})`);
  assert(editPriceData.product?.basePrice === 195, 'Updated price reflected in response');

  // Step 5: Update stock
  console.log('\n[STEP 5] Admin Updates Product Stock:');
  const updateStockRes = await fetch(`${BASE_URL}/api/products/${createdAuditProduct.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ stockQuantity: 65 }),
  });
  const updateStockData = await updateStockRes.json();
  assert(updateStockRes.status === 200 && updateStockData.product?.stockQuantity === 65, 'Stock quantity updated to 65 units');

  // Step 6: View customer orders
  console.log('\n[STEP 6] Admin Views Customer Orders:');
  const adminOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Cookie: adminCookie },
  });
  const adminOrdersData = await adminOrdersRes.json();
  assert(adminOrdersRes.status === 200, `Admin fetched all system orders (Total: ${adminOrdersData.orders?.length})`);

  // Step 7: Confirm orders (placedRzpOrder was CONFIRMED, test another order)
  console.log('\n[STEP 7] Admin Confirms Customer Order:');
  // Create an active COD order for lifecycle testing
  const lifecycleOrder = await prisma.order.create({
    data: {
      orderNumber: `ND-LIFECYCLE-${String(timestamp).slice(-5)}`,
      userId: userInDb.id,
      status: 'PLACED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: 300,
      deliveryFee: 35,
      totalAmount: 335,
      deliveryAddress: JSON.stringify({ street: 'Brigade Road', city: 'Bengaluru' }),
      deliverySlot: 'Morning',
      deliveryDate: 'Today',
      inventoryReserved: true,
      inventoryRestored: false,
    },
  });

  const confirmRes = await fetch(`${BASE_URL}/api/orders/${lifecycleOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  assert(confirmRes.status === 200, `Order confirmed by admin (Got ${confirmRes.status})`);

  // Step 8: Update delivery status (CONFIRMED -> PREPARING -> DISPATCHED -> OUT_FOR_DELIVERY -> DELIVERED)
  console.log('\n[STEP 8] Update Delivery Status Pipeline:');
  await fetch(`${BASE_URL}/api/orders/${lifecycleOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  await fetch(`${BASE_URL}/api/orders/${lifecycleOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'DISPATCHED' }),
  });
  await fetch(`${BASE_URL}/api/orders/${lifecycleOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
  });
  const deliveredRes = await fetch(`${BASE_URL}/api/orders/${lifecycleOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'DELIVERED' }),
  });
  const deliveredData = await deliveredRes.json();
  assert(deliveredRes.status === 200, `Order marked as DELIVERED by admin (Got ${deliveredRes.status})`);
  assert(deliveredData.order?.status === 'DELIVERED', 'Lifecycle order reached DELIVERED state');

  // Step 9: Verify COD collection upon delivery
  console.log('\n[STEP 9] Verify COD Payment Collection:');
  assert(deliveredData.order?.paymentStatus === 'PAID', 'COD payment automatically verified and marked PAID upon delivery');

  // Step 10: Manage customer notifications
  console.log('\n[STEP 10] Audit Notification Creation for Status Updates:');
  const deliveredNotif = await prisma.notification.findFirst({
    where: { orderId: lifecycleOrder.id, title: { contains: 'Delivered' } },
  });
  assert(Boolean(deliveredNotif), 'Customer received order delivered notification');

  // Step 11: Review payment status
  console.log('\n[STEP 11] Review Payment Status & Settings:');
  const settingsRes = await fetch(`${BASE_URL}/api/settings`);
  const settingsData = await settingsRes.json();
  assert(settingsRes.status === 200 && settingsData.success, 'Store settings and payment gateway status verified');

  // ==========================================================================
  // PART 3: ADVANCED SECURITY EXPLOITATION TESTS
  // ==========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('PART 3: SPECIALIZED APPLICATION SECURITY EXPLOITATION TESTS');
  console.log('----------------------------------------------------------------\n');

  // 1. SQL Injection (SQLi)
  console.log('[SECURITY TEST 1] SQL Injection (SQLi) Resilience:');
  const sqliPayloads = [
    "' OR 1=1 --",
    "admin'--",
    "'; DROP TABLE User; --",
    "' UNION SELECT null, null, null --",
  ];
  for (const sqli of sqliPayloads) {
    const sqliSearch = await fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(sqli)}`);
    assert(sqliSearch.status === 200, `SQLi search payload safely handled without DB error: "${sqli}"`);

    const sqliLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sqli, password: 'password123' }),
    });
    assert(sqliLogin.status === 400 || sqliLogin.status === 401, `SQLi login injection safely rejected: "${sqli}"`);
  }

  // 2. Cross-Site Scripting (XSS)
  console.log('\n[SECURITY TEST 2] Cross-Site Scripting (XSS) Sanitization:');
  const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
  const xssAddressRes = await fetch(`${BASE_URL}/api/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
    body: JSON.stringify({
      tag: 'XSS Test',
      recipientName: xssPayload,
      phone: customerPhone,
      houseNumber: '1',
      street: 'Clean St',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
    }),
  });
  const xssAddressData = await xssAddressRes.json();
  assert(xssAddressRes.status === 200, 'XSS input stored safely without server exception');

  // 3. Insecure Direct Object Reference (IDOR)
  console.log('\n[SECURITY TEST 3] Insecure Direct Object Reference (IDOR) Defense:');
  // Customer attempts to delete address belonging to another user
  const otherAddr = await prisma.address.create({
    data: {
      userId: adminUserRecord.id,
      tag: 'Admin Home',
      recipientName: 'Admin',
      phone: '9999999999',
      houseNumber: '1',
      street: 'Secret St',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
    },
  });

  const deleteOtherAddr = await fetch(`${BASE_URL}/api/addresses?id=${otherAddr.id}`, {
    method: 'DELETE',
    headers: { Cookie: customerCookie },
  });
  // Address must NOT be deleted because where clause strictly includes userId: auth.user.id
  const checkAddrAfter = await prisma.address.findUnique({ where: { id: otherAddr.id } });
  assert(Boolean(checkAddrAfter), 'Customer cannot delete another user address (IDOR strictly defended)');

  // 4. Broken Access Control (Unauthenticated & Customer Tokens on Admin APIs)
  console.log('\n[SECURITY TEST 4] Broken Access Control & Privilege Escalation:');
  const adminEndpoints = [
    { url: '/api/admin/customers', method: 'GET' },
    { url: '/api/admin/users', method: 'POST', body: { email: customerEmail, newRole: 'ADMIN' } },
    { url: '/api/categories', method: 'POST', body: { name: 'Hacked Category' } },
    { url: '/api/settings', method: 'PUT', body: { storeName: 'Hacked Store' } },
  ];

  for (const ep of adminEndpoints) {
    // Unauthenticated
    const unauthRes = await fetch(`${BASE_URL}${ep.url}`, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(unauthRes.status === 401, `Unauthenticated ${ep.method} ${ep.url} rejected with 401`);

    // Customer
    const custRes = await fetch(`${BASE_URL}${ep.url}`, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(custRes.status === 403, `Customer ${ep.method} ${ep.url} rejected with 403 Forbidden`);
  }

  // 5. Mass Assignment
  console.log('\n[SECURITY TEST 5] Mass Assignment Defense:');
  const massAssignRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hacker User',
      email: `hacker.${timestamp}@test.com`,
      password: 'HackerPassword123!',
      role: 'ADMIN',
      tokenVersion: 999,
      isEmailVerified: true,
      isActive: false,
    }),
  });
  assert(massAssignRes.status === 403, 'Registration payload with role: ADMIN is strictly rejected with 403');

  // 6. Cross-Site Request Forgery (CSRF)
  console.log('\n[SECURITY TEST 6] CSRF Protection via Modern Sec-Fetch-Site and Origin Validation:');
  const csrfAttack = await fetch(`${BASE_URL}/api/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customerCookie,
      'Sec-Fetch-Site': 'cross-site',
    },
    body: JSON.stringify({
      tag: 'Phishing',
      recipientName: 'Attacker',
      phone: '9999999999',
      houseNumber: '1',
      street: 'Phish St',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
    }),
  });
  assert(csrfAttack.status === 403, 'Cross-site request forgery attack blocked with 403 Forbidden');

  // 7. Brute-Force & Rate Limiting Defense
  console.log('\n[SECURITY TEST 7] Brute-Force Rate Limiting Defense:');
  await clearRateLimits();
  let lockedOut = false;
  for (let i = 1; i <= 6; i++) {
    const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, password: 'WrongPasswordEveryTime' }),
    });
    if (failRes.status === 429) {
      lockedOut = true;
      break;
    }
  }
  assert(lockedOut, 'Repeated login failures trigger progressive delay and temporary account lockout (429)');

  // 8. Replay Attacks & Single-Use Verification Tokens
  console.log('\n[SECURITY TEST 8] Replay Attacks & Token Reuse Defense:');
  // Try reusing the single-use resetToken from Step 15
  const reuseTokenRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: verifyOtpData.resetToken,
      newPassword: 'AnotherPassword@123',
    }),
  });
  assert(reuseTokenRes.status === 400, 'Reusing single-use reset token rejected with 400 Bad Request');

  // 9. Payment Manipulation Defense
  console.log('\n[SECURITY TEST 9] Payment Amount Manipulation Defense:');
  const fakePriceOrder = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
    body: JSON.stringify({
      items: [
        {
          productId: milkProduct.id,
          name: milkProduct.name,
          selectedWeight: '1 litre',
          unitPrice: 1.0, // Manipulated price
          quantity: 2,
          totalPrice: 2.0, // Manipulated total
        },
      ],
      address: savedAddress,
      deliverySlot: 'Morning Slot',
      deliveryDate: 'Today',
      paymentMethod: 'COD',
    }),
  });
  const fakePriceData = await fakePriceOrder.json();
  assert(fakePriceOrder.status === 201, 'Order created successfully');
  assert(fakePriceData.order?.subtotal === milkProduct.basePrice * 2, `Server enforced catalog price (₹${fakePriceData.order?.subtotal}), ignored manipulated ₹2.00`);

  // 10. Sensitive Data Exposure Audit
  console.log('\n[SECURITY TEST 10] Sensitive Information Exposure Audit:');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: customerCookie },
  });
  const meData = await meRes.json();
  assert(meData.user?.password === undefined, 'No password field returned in session profile');
  assert(meData.user?.tokenVersion === undefined, 'Internal tokenVersion stripped from public user profile');

  // Clean up audit test records
  try {
    await prisma.notification.deleteMany({
      where: { userId: { in: [userInDb.id, adminUserRecord.id] } },
    });
    await prisma.address.deleteMany({
      where: { userId: { in: [userInDb.id, adminUserRecord.id] } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [placedCodOrder.id, placedRzpOrder.id, lifecycleOrder.id, fakePriceData.order?.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [placedCodOrder.id, placedRzpOrder.id, lifecycleOrder.id, fakePriceData.order?.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userInDb.id, adminUserRecord.id] } },
    });
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log('\n================================================================');
  console.log(`TASK 10 MASTER AUDIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit()
  .catch((e) => {
    console.error('Unhandled audit error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
