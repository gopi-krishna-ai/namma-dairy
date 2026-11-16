import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const CUSTOMER_EMAIL = 'customer@gmail.com';
const CUSTOMER_PASSWORD = 'customer123';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mock_sandbox_key';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_purepicks_bengaluru_secret_2026';

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

// Helper to compute genuine Razorpay HMAC-SHA256 signature
function computeRazorpaySignature(orderId, paymentId, secret = RAZORPAY_KEY_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId.trim()}|${paymentId.trim()}`)
    .digest('hex');
}

// Helper to compute Razorpay Webhook HMAC-SHA256 signature
function computeWebhookSignature(rawBody, secret = RAZORPAY_WEBHOOK_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
}

async function runRazorpaySecuritySuite() {
  console.log('================================================================');
  console.log('   RUNNING TASK 3: RAZORPAY PAYMENT GATEWAY SECURITY AUDIT      ');
  console.log('================================================================\n');

  // 1. Authenticate customer
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
  });
  const loginCookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();

  if (!loginCookie || !loginData.success) {
    console.error('FATAL: Unable to login customer for testing:', loginData);
    process.exit(1);
  }
  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: loginCookie,
  };

  // Find a product in DB
  const product = await prisma.product.findFirst({
    where: { isAvailable: true, stockQuantity: { gt: 10 } },
  });

  if (!product) {
    console.error('FATAL: No available products in DB for testing.');
    process.exit(1);
  }

  const validOption = product.optionsJson ? JSON.parse(product.optionsJson)[0] : 'Standard';

  const testAddress = {
    recipientName: 'Test Customer',
    phone: '9876543210',
    houseNumber: '101',
    street: '100 Feet Rd',
    area: 'Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
  };

  // =========================================================================
  // TEST 1: Missing Signature Rejected (400 Bad Request)
  // =========================================================================
  console.log('--- Test Suite 1: Missing & Fake Signature Validation ---');
  const missingSigRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      // razorpaySignature omitted!
    }),
  });
  const missingSigData = await missingSigRes.json();
  assert(
    missingSigRes.status === 400 && !missingSigData.success,
    'Razorpay order without signature is rejected (400 Bad Request)',
    JSON.stringify(missingSigData)
  );

  // =========================================================================
  // TEST 2: Client Submits Fake Payment ID Without Valid Signature (400 Bad Request)
  // =========================================================================
  const fakePaymentRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_fake_001',
      razorpayPaymentId: 'pay_FAKE_ID_SUBMITTED',
      razorpaySignature: 'totally_bogus_fake_hex_signature_abcdef1234567890',
    }),
  });
  const fakePaymentData = await fakePaymentRes.json();
  assert(
    fakePaymentRes.status === 400 && !fakePaymentData.success,
    'Fake payment ID with invalid signature is rejected (400 Bad Request)',
    JSON.stringify(fakePaymentData)
  );

  // =========================================================================
  // TEST 3: Invalid / Tampered Signature Rejected (Timing-safe comparison)
  // =========================================================================
  const orderId3 = 'order_test_tamper_003';
  const paymentId3 = 'pay_test_tamper_003';
  const realSig3 = computeRazorpaySignature(orderId3, paymentId3);
  // Tamper one byte in the hex signature
  const tamperedSig = realSig3.slice(0, -2) + (realSig3.endsWith('aa') ? 'bb' : 'aa');

  const tamperedSigRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: orderId3,
      razorpayPaymentId: paymentId3,
      razorpaySignature: tamperedSig,
    }),
  });
  const tamperedSigData = await tamperedSigRes.json();
  assert(
    tamperedSigRes.status === 400 && !tamperedSigData.success,
    'Tampered HMAC-SHA256 signature is rejected by timing-safe verification',
    JSON.stringify(tamperedSigData)
  );

  // =========================================================================
  // TEST 4: Wrong Order ID Mismatch Rejected
  // =========================================================================
  console.log('\n--- Test Suite 2: Order ID Mismatch & Price Integrity ---');
  const orderIdA = 'order_correct_A';
  const orderIdB = 'order_mismatched_B';
  const paymentId4 = 'pay_test_mismatch_004';
  // Signed for orderIdA, but sent with orderIdB
  const mismatchedSig = computeRazorpaySignature(orderIdA, paymentId4);

  const mismatchRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: orderIdB,
      razorpayPaymentId: paymentId4,
      razorpaySignature: mismatchedSig,
    }),
  });
  const mismatchData = await mismatchRes.json();
  assert(
    mismatchRes.status === 400 && !mismatchData.success,
    'Mismatched order ID signature is rejected (order verification formula failure)',
    JSON.stringify(mismatchData)
  );

  // =========================================================================
  // TEST 5: Price Tampering Prevention (Server Calculates Genuine Amount)
  // =========================================================================
  const testOrderId5 = `order_${Date.now()}_5`;
  const testPayId5 = `pay_${Date.now()}_5`;
  const validSig5 = computeRazorpaySignature(testOrderId5, testPayId5);

  // Attempt to pass malicious price of ₹1.00
  const tamperPriceRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: product.id,
          quantity: 2,
          selectedWeight: validOption,
          unitPrice: 0.5, // Client attempts to tamper unit price to ₹0.50
          totalPrice: 1.0, // Client attempts to tamper total to ₹1.00
        },
      ],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: testOrderId5,
      razorpayPaymentId: testPayId5,
      razorpaySignature: validSig5,
      totalAmount: 1.0, // Client attempts to pay ₹1.00
    }),
  });
  const tamperPriceData = await tamperPriceRes.json();
  // Server must calculate the real product price, NOT the client's ₹1.00
  const isServerPriceEnforced =
    tamperPriceData.success &&
    tamperPriceData.order &&
    tamperPriceData.order.totalAmount > 50 &&
    tamperPriceData.order.totalAmount !== 1.0;

  assert(
    isServerPriceEnforced,
    `Server strictly calculates price from catalog (Order total ₹${tamperPriceData.order?.totalAmount}, client ₹1 ignored)`,
    JSON.stringify(tamperPriceData)
  );

  // =========================================================================
  // TEST 6: Successful Payment Verification Marks Order PAID & CONFIRMED
  // =========================================================================
  console.log('\n--- Test Suite 3: Successful Payment & Duplicate Protection ---');
  const validOrder6 = `order_genuine_${Date.now()}_6`;
  const validPay6 = `pay_genuine_${Date.now()}_6`;
  const validSig6 = computeRazorpaySignature(validOrder6, validPay6);

  const successOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: validOrder6,
      razorpayPaymentId: validPay6,
      razorpaySignature: validSig6,
    }),
  });
  const successOrderData = await successOrderRes.json();
  const isOrderPaid =
    successOrderRes.status === 201 &&
    successOrderData.success &&
    successOrderData.order.paymentStatus === 'PAID' &&
    successOrderData.order.status === 'CONFIRMED' &&
    successOrderData.order.razorpayPaymentId === validPay6;

  assert(
    isOrderPaid,
    `Authentic HMAC-SHA256 signature marks order PAID and status CONFIRMED (#${successOrderData.order?.orderNumber})`,
    JSON.stringify(successOrderData)
  );

  // =========================================================================
  // TEST 7: Duplicate Payment Processing Blocked (409 Conflict)
  // =========================================================================
  const duplicateOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: validOrder6,
      razorpayPaymentId: validPay6, // Same payment ID reused!
      razorpaySignature: validSig6,
    }),
  });
  const duplicateOrderData = await duplicateOrderRes.json();
  assert(
    duplicateOrderRes.status === 409 && !duplicateOrderData.success,
    'Reusing the same razorpayPaymentId is rejected with 409 Conflict',
    JSON.stringify(duplicateOrderData)
  );

  // Also verify duplicate payment block on /api/payment/razorpay verify_payment
  const duplicateVerifyRes = await fetch(`${BASE_URL}/api/payment/razorpay`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'verify_payment',
      razorpay_order_id: validOrder6,
      razorpay_payment_id: validPay6,
      razorpay_signature: validSig6,
    }),
  });
  const duplicateVerifyData = await duplicateVerifyRes.json();
  assert(
    duplicateVerifyRes.status === 409 && !duplicateVerifyData.verified,
    'Verification endpoint rejects previously claimed payment ID with 409 Conflict',
    JSON.stringify(duplicateVerifyData)
  );

  // =========================================================================
  // TEST 8: Client Cannot Mark Order PAID Directly on COD
  // =========================================================================
  console.log('\n--- Test Suite 4: COD & Direct State Tampering Prevention ---');
  const codTamperRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'COD',
      paymentStatus: 'PAID', // Client tries to mark COD as PAID directly
      status: 'DELIVERED', // Client tries to mark status as DELIVERED directly
    }),
  });
  const codTamperData = await codTamperRes.json();
  const isCodStatusProtected =
    codTamperRes.status === 201 &&
    codTamperData.order.paymentStatus === 'PENDING' &&
    codTamperData.order.status === 'PLACED';

  assert(
    isCodStatusProtected,
    'Direct client attempt to mark paymentStatus as PAID is ignored; forced to PENDING / PLACED',
    JSON.stringify(codTamperData)
  );

  // =========================================================================
  // TEST 9: Legitimate Cash on Delivery (COD) Works Seamlessly
  // =========================================================================
  const codOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2, selectedWeight: validOption }],
      address: testAddress,
      paymentMethod: 'COD',
      deliverySlot: 'Morning Slot (8:30 AM - 11:30 AM)',
      deliveryDate: 'Today',
    }),
  });
  const codOrderData = await codOrderRes.json();
  const isCodSuccessful =
    codOrderRes.status === 201 &&
    codOrderData.success &&
    codOrderData.order.paymentMethod === 'COD' &&
    codOrderData.order.paymentStatus === 'PENDING';

  assert(
    isCodSuccessful,
    `Legitimate Cash on Delivery (COD) order placed smoothly with PENDING status (#${codOrderData.order?.orderNumber})`,
    JSON.stringify(codOrderData)
  );

  // =========================================================================
  // TEST 10: Webhook Signature Verification (Raw Body HMAC-SHA256)
  // =========================================================================
  console.log('\n--- Test Suite 5: Webhook Signature & Idempotency ---');
  // First, create an order in PENDING state to test webhook capture
  const pendingOrderId = `order_webhook_test_${Date.now()}`;
  const pendingPayId = `pay_webhook_test_${Date.now()}`;
  const pendingSig = computeRazorpaySignature(pendingOrderId, pendingPayId);

  // Create order via COD or directly in DB with razorpayOrderId
  const testPendingOrder = await prisma.order.create({
    data: {
      orderNumber: `ND-TEST-${Date.now().toString().slice(-4)}`,
      userId: loginData.user.id,
      status: 'PLACED',
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PENDING',
      razorpayOrderId: pendingOrderId,
      subtotal: 250,
      deliveryFee: 35,
      discount: 0,
      totalAmount: 285,
      deliveryAddress: JSON.stringify(testAddress),
      deliverySlot: 'Morning Slot',
      deliveryDate: 'Today',
    },
  });

  // Construct official Razorpay payment.captured webhook payload
  const webhookEventId = `evt_test_${Date.now()}`;
  const webhookPayload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_test123',
    event: 'payment.captured',
    event_id: webhookEventId,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: pendingPayId,
          entity: 'payment',
          amount: 28500,
          currency: 'INR',
          status: 'captured',
          order_id: pendingOrderId,
          method: 'upi',
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });

  const validWebhookSig = computeWebhookSignature(webhookPayload, RAZORPAY_WEBHOOK_SECRET);

  // Send webhook without signature (must fail 400)
  const noSigWebhookRes = await fetch(`${BASE_URL}/api/payment/razorpay/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: webhookPayload,
  });
  assert(
    noSigWebhookRes.status === 400,
    'Webhook request without x-razorpay-signature header is rejected (400 Bad Request)'
  );

  // Send webhook with invalid signature (must fail 400)
  const invalidSigWebhookRes = await fetch(`${BASE_URL}/api/payment/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'invalid_hex_signature_1234567890abcdef',
    },
    body: webhookPayload,
  });
  assert(
    invalidSigWebhookRes.status === 400,
    'Webhook request with forged signature is rejected (400 Bad Request)'
  );

  // Send webhook with valid signature (must succeed 200)
  const validWebhookRes = await fetch(`${BASE_URL}/api/payment/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validWebhookSig,
    },
    body: webhookPayload,
  });
  const validWebhookData = await validWebhookRes.json();
  assert(
    validWebhookRes.status === 200 && validWebhookData.success,
    'Webhook request with authentic signature processes successfully (200 OK)',
    JSON.stringify(validWebhookData)
  );

  // Verify DB state transitioned to PAID & CONFIRMED
  const updatedOrder = await prisma.order.findUnique({
    where: { id: testPendingOrder.id },
  });
  assert(
    updatedOrder.paymentStatus === 'PAID' && updatedOrder.status === 'CONFIRMED',
    `payment.captured webhook transitioned order state to PAID & CONFIRMED (Order: ${updatedOrder.orderNumber})`
  );

  // =========================================================================
  // TEST 11: Idempotent Webhook Processing (Duplicate Event Handling)
  // =========================================================================
  const duplicateWebhookRes = await fetch(`${BASE_URL}/api/payment/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validWebhookSig,
    },
    body: webhookPayload, // Identical event re-sent
  });
  const duplicateWebhookData = await duplicateWebhookRes.json();
  assert(
    duplicateWebhookRes.status === 200 &&
      duplicateWebhookData.success &&
      duplicateWebhookData.message.includes('idempotent'),
    'Duplicate webhook event returns 200 OK idempotent response without re-processing',
    JSON.stringify(duplicateWebhookData)
  );

  // =========================================================================
  // TEST 12: Payment Failure Webhook Handling (payment.failed -> FAILED)
  // =========================================================================
  const failOrderId = `order_fail_test_${Date.now()}`;
  const failPayId = `pay_fail_test_${Date.now()}`;
  const testFailOrder = await prisma.order.create({
    data: {
      orderNumber: `ND-FAIL-${Date.now().toString().slice(-4)}`,
      userId: loginData.user.id,
      status: 'PLACED',
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PENDING',
      razorpayOrderId: failOrderId,
      subtotal: 150,
      deliveryFee: 35,
      discount: 0,
      totalAmount: 185,
      deliveryAddress: JSON.stringify(testAddress),
      deliverySlot: 'Evening Slot',
      deliveryDate: 'Today',
    },
  });

  const failWebhookPayload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_test123',
    event: 'payment.failed',
    event_id: `evt_fail_${Date.now()}`,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: failPayId,
          entity: 'payment',
          amount: 18500,
          currency: 'INR',
          status: 'failed',
          order_id: failOrderId,
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Payment was declined by customer issuing bank.',
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });

  const failWebhookSig = computeWebhookSignature(failWebhookPayload, RAZORPAY_WEBHOOK_SECRET);
  const failWebhookRes = await fetch(`${BASE_URL}/api/payment/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': failWebhookSig,
    },
    body: failWebhookPayload,
  });

  const updatedFailOrder = await prisma.order.findUnique({
    where: { id: testFailOrder.id },
  });
  assert(
    failWebhookRes.status === 200 && updatedFailOrder.paymentStatus === 'FAILED',
    'payment.failed webhook transitions order paymentStatus to FAILED',
    `Status: ${updatedFailOrder.paymentStatus}`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`  RAZORPAY PAYMENT GATEWAY SECURITY SUITE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('>>> ALL RAZORPAY PAYMENT GATEWAY SECURITY AUDIT CHECKS PASSED SUCCESSFULLY! <<<\n');
  } else {
    console.error('>>> SOME SECURITY CHECKS FAILED! <<<\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

runRazorpaySecuritySuite().catch(async (e) => {
  console.error('Fatal execution error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
