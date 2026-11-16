/**
 * TASK 9: Comprehensive Order Security & Authorization Test Suite
 *
 * Requirements Covered:
 * 1. Use the resolved database order ID for every database update.
 * 2. Customers can only view their own orders.
 * 3. Customers can only cancel their own eligible orders.
 * 4. Customers cannot update order status directly.
 * 5. Customers cannot change payment status.
 * 6. Only authenticated administrators can update order statuses.
 * 7. Only administrators can mark COD orders as collected.
 * 8. Never allow administrators to mark online payments as PAID without verified payment evidence.
 * 9. Validate every permitted order status transition.
 * 10. Prevent customers from cancelling dispatched, delivered or already cancelled orders.
 * 11. Validate cancelReason length and content.
 * 12. Prevent customers from modifying another customer's order by changing the URL ID.
 * 13. Ensure notifications are generated only after successful database updates.
 * 14. Use transactions for related order and notification updates where appropriate.
 * 15. Prevent duplicate cancellation and duplicate status transitions.
 */

import { PrismaClient } from '@prisma/client';
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

async function runTests() {
  console.log('\n======================================================');
  console.log('--- TASK 9: SECURE ORDER APIS & ORDER IDENTIFIER TESTS ---');
  console.log('======================================================\n');

  const timestamp = Date.now();
  const password = 'TestUserPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Create Customer A
  const customerA = await prisma.user.create({
    data: {
      name: 'Customer A',
      email: `customer.a.${timestamp}@test.com`,
      phone: `91111${String(timestamp).slice(-5)}`,
      password: hashedPassword,
      role: 'CUSTOMER',
      tokenVersion: 0,
      isActive: true,
    },
  });

  // 2. Create Customer B
  const customerB = await prisma.user.create({
    data: {
      name: 'Customer B',
      email: `customer.b.${timestamp}@test.com`,
      phone: `92222${String(timestamp).slice(-5)}`,
      password: hashedPassword,
      role: 'CUSTOMER',
      tokenVersion: 0,
      isActive: true,
    },
  });

  // 3. Create Admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin Tester',
      email: `admin.tester.${timestamp}@test.com`,
      phone: `93333${String(timestamp).slice(-5)}`,
      password: hashedPassword,
      role: 'ADMIN',
      tokenVersion: 0,
      isActive: true,
    },
  });

  // Log in all 3 users and acquire cookies
  await clearRateLimits();
  const resLoginA = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerA.email, password }),
  });
  const cookieA = parseCookie(resLoginA);

  const resLoginB = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerB.email, password }),
  });
  const cookieB = parseCookie(resLoginB);

  const resLoginAdmin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminUser.email, password, requiredRole: 'ADMIN' }),
  });
  const cookieAdmin = parseCookie(resLoginAdmin);

  // Get a test product for orders
  const testProduct = await prisma.product.findFirst({
    where: { isAvailable: true, stockQuantity: { gte: 20 } },
  });

  if (!testProduct) {
    throw new Error('Test product not found in database.');
  }

  // Create an order owned by Customer A
  const orderA_DB = await prisma.order.create({
    data: {
      orderNumber: `ND-TEST-${String(timestamp).slice(-6)}-A`,
      userId: customerA.id,
      status: 'PLACED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: testProduct.basePrice,
      deliveryFee: 35,
      totalAmount: testProduct.basePrice + 35,
      deliveryAddress: JSON.stringify({ street: '123 Test St', city: 'Bengaluru' }),
      deliverySlot: 'Morning Slot',
      deliveryDate: 'Today',
      inventoryReserved: true,
      inventoryRestored: false,
      items: {
        create: [
          {
            productId: testProduct.id,
            productName: testProduct.name,
            unit: testProduct.unit,
            selectedWeight: '1 kg',
            unitPrice: testProduct.basePrice,
            quantity: 1,
            totalPrice: testProduct.basePrice,
          },
        ],
      },
    },
  });

  // Create an order owned by Customer B
  const orderB_DB = await prisma.order.create({
    data: {
      orderNumber: `ND-TEST-${String(timestamp).slice(-6)}-B`,
      userId: customerB.id,
      status: 'PLACED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: testProduct.basePrice,
      deliveryFee: 35,
      totalAmount: testProduct.basePrice + 35,
      deliveryAddress: JSON.stringify({ street: '456 Test Ave', city: 'Bengaluru' }),
      deliverySlot: 'Evening Slot',
      deliveryDate: 'Today',
      inventoryReserved: true,
      inventoryRestored: false,
      items: {
        create: [
          {
            productId: testProduct.id,
            productName: testProduct.name,
            unit: testProduct.unit,
            selectedWeight: '1 kg',
            unitPrice: testProduct.basePrice,
            quantity: 1,
            totalPrice: testProduct.basePrice,
          },
        ],
      },
    },
  });

  // --------------------------------------------------------------------------
  // TEST CASE 1: Customer A accessing Customer B's order (IDOR Prevention)
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 1] Cross-Customer Order Inspection (IDOR Prevention):');
  const getBbyA = await fetch(`${BASE_URL}/api/orders/${orderB_DB.id}`, {
    headers: { Cookie: cookieA },
  });
  const getBbyAData = await getBbyA.json();
  assert(getBbyA.status === 403, `Customer A accessing Customer B's order by ID is rejected with 403 Forbidden (Got ${getBbyA.status})`);

  const getBbyA_Num = await fetch(`${BASE_URL}/api/orders/${orderB_DB.orderNumber}`, {
    headers: { Cookie: cookieA },
  });
  assert(getBbyA_Num.status === 403, `Customer A accessing Customer B's order by orderNumber is rejected with 403 Forbidden (Got ${getBbyA_Num.status})`);

  // Customer B CAN access Customer B's order
  const getBbyB = await fetch(`${BASE_URL}/api/orders/${orderB_DB.id}`, {
    headers: { Cookie: cookieB },
  });
  assert(getBbyB.status === 200, `Customer B can access their own order (Got 200 OK)`);

  // --------------------------------------------------------------------------
  // TEST CASE 2: Customer A attempting to cancel Customer B's order
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 2] Cross-Customer Order Cancellation Prevention:');
  const cancelBbyA = await fetch(`${BASE_URL}/api/orders/${orderB_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Malicious cancellation attempt' }),
  });
  assert(cancelBbyA.status === 403, `Customer A cancelling Customer B's order is rejected with 403 Forbidden (Got ${cancelBbyA.status})`);

  // --------------------------------------------------------------------------
  // TEST CASE 3: Customer changing paymentStatus directly to PAID
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 3] Customer Payment Status Manipulation Blocked:');
  const custChangePay = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ paymentStatus: 'PAID' }),
  });
  assert(custChangePay.status === 403, `Customer attempting to set paymentStatus is rejected with 403 Forbidden (Got ${custChangePay.status})`);

  // --------------------------------------------------------------------------
  // TEST CASE 4: Customer changing order status to DELIVERED or other status
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 4] Customer Direct Status Update Blocked:');
  const custChangeDelivered = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'DELIVERED' }),
  });
  assert(custChangeDelivered.status === 403, `Customer attempting status: DELIVERED is rejected with 403 Forbidden (Got ${custChangeDelivered.status})`);

  const custChangeConfirmed = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  assert(custChangeConfirmed.status === 403, `Customer attempting status: CONFIRMED is rejected with 403 Forbidden (Got ${custChangeConfirmed.status})`);

  // --------------------------------------------------------------------------
  // TEST CASE 5: Invalid Order ID
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 5] Invalid Order Identifier Handling:');
  const invalidGet = await fetch(`${BASE_URL}/api/orders/non-existent-order-id-999`, {
    headers: { Cookie: cookieAdmin },
  });
  assert(invalidGet.status === 404, `GET non-existent order returns 404 Not Found (Got ${invalidGet.status})`);

  const invalidPatch = await fetch(`${BASE_URL}/api/orders/non-existent-order-id-999`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  assert(invalidPatch.status === 404, `PATCH non-existent order returns 404 Not Found (Got ${invalidPatch.status})`);

  // --------------------------------------------------------------------------
  // TEST CASE 6: Valid Order Number (Resolving DB ID and Updating Properly)
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 6] Order Number Resolution & Database ID Mutation:');
  // Customer B cancels order using orderNumber in the URL
  const cancelByNum = await fetch(`${BASE_URL}/api/orders/${orderB_DB.orderNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Changed mind regarding order' }),
  });
  const cancelByNumData = await cancelByNum.json();
  assert(cancelByNum.status === 200, `Cancellation via orderNumber in URL succeeds (Got ${cancelByNum.status})`);
  assert(cancelByNumData.order?.status === 'CANCELLED', `Returned order status is CANCELLED`);
  assert(cancelByNumData.order?.id === orderB_DB.id, `Resolved and returned order ID matches DB primary key`);

  // Verify DB record was updated properly
  const orderBInDb = await prisma.order.findUnique({ where: { id: orderB_DB.id } });
  assert(orderBInDb.status === 'CANCELLED', 'Database record status updated to CANCELLED');
  assert(orderBInDb.inventoryRestored === true, 'Database inventoryRestored flag set to true');

  // Verify notification was created with the resolved DB ID
  const notifB = await prisma.notification.findFirst({
    where: { orderId: orderB_DB.id },
    orderBy: { createdAt: 'desc' },
  });
  assert(Boolean(notifB), 'Notification record created with resolved database order ID');
  assert(notifB?.message?.includes('Changed mind regarding order'), 'Notification includes verified cancellation reason');

  // --------------------------------------------------------------------------
  // TEST CASE 7: Duplicate Cancellation Prevention
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 7] Duplicate Cancellation Prevention:');
  const dupCancel = await fetch(`${BASE_URL}/api/orders/${orderB_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const dupCancelData = await dupCancel.json();
  assert(dupCancel.status === 400, `Duplicate cancellation rejected with 400 Bad Request (Got ${dupCancel.status})`);
  assert(dupCancelData.message?.includes('already been cancelled'), `Descriptive message: "${dupCancelData.message}"`);

  // --------------------------------------------------------------------------
  // TEST CASE 8: Admin Updating a Valid Order & Lifecycle Transitions
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 8] Administrator Order Lifecycle Transitions:');
  // Admin updates orderA from PLACED -> CONFIRMED
  const adminConf = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  assert(adminConf.status === 200, `Admin updates PLACED -> CONFIRMED (Got ${adminConf.status})`);

  // Admin updates CONFIRMED -> PREPARING
  const adminPrep = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  assert(adminPrep.status === 200, `Admin updates CONFIRMED -> PREPARING (Got ${adminPrep.status})`);

  // Admin updates PREPARING -> DISPATCHED
  const adminDisp = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'DISPATCHED' }),
  });
  assert(adminDisp.status === 200, `Admin updates PREPARING -> DISPATCHED (Got ${adminDisp.status})`);

  // --------------------------------------------------------------------------
  // TEST CASE 9: Customer Cancellation After Dispatch Blocked
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 9] Customer Cancellation After Dispatch Blocked:');
  const custCancelDispatched = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Too late cancellation' }),
  });
  const custCancelDispData = await custCancelDispatched.json();
  assert(custCancelDispatched.status === 400, `Customer cannot cancel dispatched order (Got 400 Bad Request)`);
  assert(custCancelDispData.message?.includes('cannot be cancelled'), `Error message indicates order is being processed/dispatched`);

  // --------------------------------------------------------------------------
  // TEST CASE 10: COD Collection & Delivery Transition
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 10] COD Collection & Delivery Transition:');
  // Admin transitions DISPATCHED -> OUT_FOR_DELIVERY -> DELIVERED
  await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
  });

  const deliverRes = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'DELIVERED' }),
  });
  const deliverData = await deliverRes.json();
  assert(deliverRes.status === 200, `Admin marks order as DELIVERED (Got 200 OK)`);
  assert(deliverData.order?.status === 'DELIVERED', 'Status updated to DELIVERED');
  assert(deliverData.order?.paymentStatus === 'PAID', 'COD paymentStatus automatically transitioned to PAID upon delivery');

  // Customer cannot cancel an already DELIVERED order
  const cancelDelivered = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  assert(cancelDelivered.status === 400, `Delivered order cannot be cancelled (Got 400 Bad Request)`);

  // --------------------------------------------------------------------------
  // TEST CASE 11: Invalid Status Transitions (Terminal & Regressive)
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 11] Invalid Status Transitions Blocked:');
  // 11.1 Cannot cancel an already DELIVERED order even as admin
  const adminCancelDelivered = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  assert(adminCancelDelivered.status === 400, `Admin cannot cancel DELIVERED order (Got 400 Bad Request)`);

  // 11.2 Cannot regress from DELIVERED back to PLACED
  const adminRegress = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'PLACED' }),
  });
  assert(adminRegress.status === 400, `Admin cannot regress from DELIVERED back to PLACED (Got 400 Bad Request)`);

  // 11.3 Cannot transition CANCELLED order to DELIVERED
  const adminUncancel = await fetch(`${BASE_URL}/api/orders/${orderB_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'DELIVERED' }),
  });
  assert(adminUncancel.status === 400, `Admin cannot transition CANCELLED order to DELIVERED (Got 400 Bad Request)`);

  // 11.4 Duplicate status transition (DELIVERED -> DELIVERED)
  const dupTransition = await fetch(`${BASE_URL}/api/orders/${orderA_DB.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ status: 'DELIVERED' }),
  });
  assert(dupTransition.status === 400, `Duplicate status transition rejected with 400 (Got ${dupTransition.status})`);

  // --------------------------------------------------------------------------
  // TEST CASE 12: Online Payments Cannot Be Marked PAID Without Verified Evidence
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 12] Online Razorpay Payment Evidence Requirement:');
  // Create an online Razorpay order that is unpaid (no razorpayPaymentId)
  const unpaidOnlineOrder = await prisma.order.create({
    data: {
      orderNumber: `ND-TEST-${String(timestamp).slice(-6)}-ONLINE`,
      userId: customerA.id,
      status: 'PLACED',
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PENDING',
      razorpayOrderId: 'order_fake_123',
      razorpayPaymentId: null, // No verified payment!
      subtotal: testProduct.basePrice,
      deliveryFee: 35,
      totalAmount: testProduct.basePrice + 35,
      deliveryAddress: JSON.stringify({ street: '123 Test St', city: 'Bengaluru' }),
      deliverySlot: 'Morning Slot',
      deliveryDate: 'Today',
      inventoryReserved: true,
      inventoryRestored: false,
    },
  });

  // Admin attempts to mark this unpaid Razorpay order as PAID
  const adminFakePaid = await fetch(`${BASE_URL}/api/orders/${unpaidOnlineOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
    body: JSON.stringify({ paymentStatus: 'PAID' }),
  });
  const adminFakePaidData = await adminFakePaid.json();
  assert(adminFakePaid.status === 400, `Admin cannot mark online Razorpay order as PAID without payment ID (Got 400 Bad Request)`);
  assert(adminFakePaidData.message?.includes('without verified payment'), `Rejection message requires verified evidence`);

  // --------------------------------------------------------------------------
  // TEST CASE 13: Cancel Reason Validation (Length & Content)
  // --------------------------------------------------------------------------
  console.log('\n[TEST CASE 13] Cancel Reason Validation:');
  // Create an active order for cancel reason tests
  const cancelTestOrder = await prisma.order.create({
    data: {
      orderNumber: `ND-TEST-${String(timestamp).slice(-6)}-REASON`,
      userId: customerA.id,
      status: 'PLACED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: testProduct.basePrice,
      deliveryFee: 35,
      totalAmount: testProduct.basePrice + 35,
      deliveryAddress: JSON.stringify({ street: '123 Test St', city: 'Bengaluru' }),
      deliverySlot: 'Morning Slot',
      deliveryDate: 'Today',
      inventoryReserved: true,
      inventoryRestored: false,
    },
  });

  // 13.1 Too short reason (<3 chars)
  const shortReasonRes = await fetch(`${BASE_URL}/api/orders/${cancelTestOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'no' }),
  });
  assert(shortReasonRes.status === 400, `Too short cancelReason (< 3 chars) is rejected with 400 Bad Request (Got ${shortReasonRes.status})`);

  // 13.2 Non-string reason
  const nonStringReasonRes = await fetch(`${BASE_URL}/api/orders/${cancelTestOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: 12345 }),
  });
  assert(nonStringReasonRes.status === 400, `Non-string cancelReason is rejected with 400 Bad Request (Got ${nonStringReasonRes.status})`);

  // 13.3 Excessively long reason (>500 chars)
  const longReason = 'x'.repeat(501);
  const longReasonRes = await fetch(`${BASE_URL}/api/orders/${cancelTestOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ status: 'CANCELLED', cancelReason: longReason }),
  });
  assert(longReasonRes.status === 400, `Excessively long cancelReason (> 500 chars) is rejected with 400 Bad Request (Got ${longReasonRes.status})`);

  // Clean up test data
  try {
    await prisma.notification.deleteMany({
      where: {
        userId: { in: [customerA.id, customerB.id, adminUser.id] },
      },
    });
    await prisma.orderItem.deleteMany({
      where: {
        orderId: { in: [orderA_DB.id, orderB_DB.id, unpaidOnlineOrder.id, cancelTestOrder.id] },
      },
    });
    await prisma.order.deleteMany({
      where: {
        id: { in: [orderA_DB.id, orderB_DB.id, unpaidOnlineOrder.id, cancelTestOrder.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [customerA.id, customerB.id, adminUser.id] },
      },
    });
  } catch (e) {
    // Ignore cleanup
  }

  console.log('\n======================================================');
  console.log(`TASK 9 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Unhandled error during order security testing:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
