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
  } catch (e) {
    // ignore
  }
}

async function runInventorySecuritySuite() {
  console.log('================================================================');
  console.log('   RUNNING TASK 5: INVENTORY, OVERSELLING & TRANSACTION AUDIT    ');
  console.log('================================================================\n');

  await clearRateLimits();

  // 1. Authenticate customer
  const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
  });
  const custCookie = custLoginRes.headers.get('set-cookie');
  const custHeaders = {
    'Content-Type': 'application/json',
    Cookie: custCookie,
  };

  // 2. Authenticate admin
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
  const adminHeaders = {
    'Content-Type': 'application/json',
    Cookie: adminCookie,
  };

  // Create isolated test products for reproducible, clean assertions
  const category = await prisma.category.findFirst();

  const testProduct1 = await prisma.product.create({
    data: {
      name: `Inventory Test Milk ${Date.now()}`,
      slug: `inv-test-milk-${Date.now()}`,
      description: 'Test inventory milk product',
      categoryId: category.id,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
      basePrice: 80.0,
      unit: 'litre',
      stockQuantity: 10.0,
      isAvailable: true,
      optionsJson: JSON.stringify(['500ml', '1 Litre', '2 Litres']),
    },
  });

  const testProductScarce = await prisma.product.create({
    data: {
      name: `Scarce Item Last One ${Date.now()}`,
      slug: `scarce-item-${Date.now()}`,
      description: 'Product with only 1 unit in stock for race testing',
      categoryId: category.id,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
      basePrice: 150.0,
      unit: 'pack',
      stockQuantity: 1.0, // Exactly 1 unit available
      isAvailable: true,
      optionsJson: JSON.stringify(['Standard']),
    },
  });

  const testProductOutOfStock = await prisma.product.create({
    data: {
      name: `Out of Stock Paneer ${Date.now()}`,
      slug: `oos-paneer-${Date.now()}`,
      description: 'Zero stock product for rollback testing',
      categoryId: category.id,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
      basePrice: 120.0,
      unit: 'pack',
      stockQuantity: 0.0, // Out of stock
      isAvailable: false,
      optionsJson: JSON.stringify(['Standard']),
    },
  });

  const testAddress = {
    recipientName: 'Inventory Tester',
    phone: '9876543210',
    houseNumber: 'A-101',
    street: 'MG Road',
    area: 'Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
  };

  // =========================================================================
  // TEST SUITE 1: Quantity & Weight Validation
  // =========================================================================
  console.log('--- Test Suite 1: Quantity and Option Validation ---');
  {
    // Test 1a: Zero quantity rejected
    const zeroQtyRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 0, selectedWeight: '1 Litre' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    assert(
      zeroQtyRes.status === 400,
      'Zero quantity is rejected with 400 Bad Request (Requirement 2 & 3)'
    );

    // Test 1b: Negative quantity rejected
    const negQtyRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: -2, selectedWeight: '1 Litre' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    assert(
      negQtyRes.status === 400,
      'Negative quantity is rejected with 400 Bad Request (Requirement 2 & 3)'
    );

    // Test 1c: Fractional quantity rejected
    const fracQtyRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 1.5, selectedWeight: '1 Litre' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    assert(
      fracQtyRes.status === 400,
      'Fractional quantity (1.5) is rejected with 400 Bad Request (Requirement 3)'
    );

    // Test 1d: Excessively large quantity rejected
    const hugeQtyRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 9999, selectedWeight: '1 Litre' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    assert(
      hugeQtyRes.status === 400,
      'Excessively large quantity (9999) is rejected with 400 Bad Request (Requirement 3)'
    );

    // Test 1e: Unconfigured weight option rejected
    const invalidWeightRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 1, selectedWeight: '100 Litres Monster Pack' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    assert(
      invalidWeightRes.status === 400,
      'Invalid weight option not matching product optionsJson is rejected with 400 Bad Request (Requirement 4)'
    );
  }

  // =========================================================================
  // TEST SUITE 2: Minimum-Order Validation Before Stock Reservation
  // =========================================================================
  console.log('\n--- Test Suite 2: Minimum-Order Validation Before Reservation ---');
  {
    // Settings has minOrderValue = 99. An item of 500ml milk costs 80 * 0.5 = 40.
    // Subtotal 40 < 99, so order must fail BEFORE reserving stock.
    const initialStock = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    const minOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 1, selectedWeight: '500ml' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    const minOrderData = await minOrderRes.json();
    const stockAfterMinOrderFail = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    assert(
      minOrderRes.status === 400 && !minOrderData.success,
      'Order below minimum order value is rejected (Requirement 9)',
      minOrderData.message
    );

    assert(
      stockAfterMinOrderFail === initialStock,
      `Stock remains completely unchanged after minimum-order rejection (${stockAfterMinOrderFail} === ${initialStock}) (Requirement 9)`
    );
  }

  // =========================================================================
  // TEST SUITE 3: Order Within Stock vs Exceeding Stock
  // =========================================================================
  console.log('\n--- Test Suite 3: Stock Reservation Within & Exceeding Limits ---');
  let placedOrderId = null;
  {
    const initialStock = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    // Test 3a: Order exceeding available stock
    const exceedRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 50, selectedWeight: '1 Litre' }], // 50 litres > 10 available
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    const exceedStockAfter = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    assert(
      exceedRes.status === 400,
      'Order exceeding available stock is rejected with 400 Bad Request (Requirement 5)',
      `Status: ${exceedRes.status}`
    );
    assert(
      exceedStockAfter === initialStock,
      `Stock is not decremented when requested quantity exceeds stock (${exceedStockAfter} === ${initialStock})`
    );

    // Test 3b: Order within available stock (2 units of 1 Litre = 2 litres decremented)
    const validOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 2, selectedWeight: '1 Litre' }], // Total 160 >= minOrder 99
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    const validOrderData = await validOrderRes.json();
    const stockAfterValidOrder = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    assert(
      validOrderRes.status === 201 && validOrderData.success,
      `Order within available stock successfully placed (#${validOrderData.order?.orderNumber})`,
      JSON.stringify(validOrderData)
    );
    assert(
      stockAfterValidOrder === initialStock - 2.0,
      `Stock accurately decremented by 2.0 litres (${initialStock} -> ${stockAfterValidOrder})`
    );

    placedOrderId = validOrderData.order.id;
  }

  // =========================================================================
  // TEST SUITE 4: Multi-Item Order Transactional Rollback
  // =========================================================================
  console.log('\n--- Test Suite 4: Multi-Product Atomic Transaction Rollback ---');
  {
    const stockP1Before = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;
    const stockOOSBefore = (await prisma.product.findUnique({ where: { id: testProductOutOfStock.id } })).stockQuantity;

    // Order contains Product 1 (in stock) AND Product OutOfStock (0 stock)
    const multiItemRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [
          { productId: testProduct1.id, quantity: 2, selectedWeight: '1 Litre' },
          { productId: testProductOutOfStock.id, quantity: 1, selectedWeight: 'Standard' },
        ],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    const multiItemData = await multiItemRes.json();

    const stockP1After = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;
    const stockOOSAfter = (await prisma.product.findUnique({ where: { id: testProductOutOfStock.id } })).stockQuantity;

    assert(
      multiItemRes.status === 400 && !multiItemData.success,
      'Order with one unavailable item in multi-product basket is rejected (Requirement 8)',
      multiItemData.message
    );
    assert(
      stockP1After === stockP1Before && stockOOSAfter === stockOOSBefore,
      `Complete transaction rolled back: Product 1 stock untouched (${stockP1After} === ${stockP1Before}) (Requirement 8)`
    );
  }

  // =========================================================================
  // TEST SUITE 5: High Concurrency Overselling Prevention (Race Condition)
  // =========================================================================
  console.log('\n--- Test Suite 5: Concurrent Race Condition & Overselling Prevention ---');
  {
    // testProductScarce has stockQuantity = 1.0. Two customers attempt to buy it at the exact same moment.
    const initialScarceStock = (await prisma.product.findUnique({ where: { id: testProductScarce.id } })).stockQuantity;
    assert(initialScarceStock === 1.0, 'Pre-condition: exactly 1 unit in stock for scarce test product');

    // Fire two parallel checkout requests simultaneously using Promise.all
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({
          items: [{ productId: testProductScarce.id, quantity: 1, selectedWeight: 'Standard' }],
          address: testAddress,
          paymentMethod: 'COD',
        }),
      }),
      fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({
          items: [{ productId: testProductScarce.id, quantity: 1, selectedWeight: 'Standard' }],
          address: testAddress,
          paymentMethod: 'COD',
        }),
      }),
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();
    const finalScarceStock = (await prisma.product.findUnique({ where: { id: testProductScarce.id } })).stockQuantity;

    const successes = [data1.success, data2.success].filter(Boolean).length;
    const failures = [data1.success, data2.success].filter((s) => !s).length;

    assert(
      successes === 1 && failures === 1,
      `Exactly 1 order succeeded and 1 was rejected out of 2 simultaneous requests (Successes: ${successes}, Failures: ${failures}) (Requirement 7 & 14)`
    );

    assert(
      finalScarceStock === 0.0,
      `Stock reached exactly 0 and NEVER went negative (Final stock: ${finalScarceStock}) (Requirement 7)`
    );
  }

  // =========================================================================
  // TEST SUITE 6: Customer Cancellation & Inventory Restoration
  // =========================================================================
  console.log('\n--- Test Suite 6: Customer Cancellation & Inventory Restoration ---');
  {
    // We will cancel placedOrderId (which reserved 2 litres of testProduct1)
    const stockBeforeCancel = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    const cancelRes = await fetch(`${BASE_URL}/api/orders/${placedOrderId}`, {
      method: 'PATCH',
      headers: custHeaders,
      body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Customer changed plans' }),
    });
    const cancelData = await cancelRes.json();
    const stockAfterCancel = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    assert(
      cancelRes.status === 200 && cancelData.success && cancelData.order.status === 'CANCELLED',
      'Customer cancellation succeeds and marks status CANCELLED (Requirement 10)'
    );

    assert(
      stockAfterCancel === stockBeforeCancel + 2.0,
      `Stock was reliably restored by 2.0 litres upon customer cancellation (${stockBeforeCancel} -> ${stockAfterCancel}) (Requirement 10)`
    );
  }

  // =========================================================================
  // TEST SUITE 7: Duplicate Cancellation Prevention (No Double Inventory Restoration)
  // =========================================================================
  console.log('\n--- Test Suite 7: Duplicate Cancellation Idempotency ---');
  {
    const stockBeforeDup = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    // Attempt to cancel the same order again
    const dupCancelRes = await fetch(`${BASE_URL}/api/orders/${placedOrderId}`, {
      method: 'PATCH',
      headers: custHeaders,
      body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Duplicate cancellation attempt' }),
    });
    const dupCancelData = await dupCancelRes.json();
    const stockAfterDup = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    assert(
      dupCancelRes.status === 400 && !dupCancelData.success,
      'Duplicate cancellation is rejected with 400 Bad Request (Requirement 11)',
      dupCancelData.message
    );

    assert(
      stockAfterDup === stockBeforeDup,
      `Inventory was NOT restored a second time on duplicate cancellation attempt (${stockAfterDup} === ${stockBeforeDup}) (Requirement 11)`
    );
  }

  // =========================================================================
  // TEST SUITE 8: Admin Cancellation & Inventory Restoration
  // =========================================================================
  console.log('\n--- Test Suite 8: Administrator Cancellation & Stock Restoration ---');
  {
    // Place a new order with 1 litre of testProduct1
    const newOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        items: [{ productId: testProduct1.id, quantity: 2, selectedWeight: '1 Litre' }],
        address: testAddress,
        paymentMethod: 'COD',
      }),
    });
    const newOrderData = await newOrderRes.json();
    const adminOrderId = newOrderData.order.id;

    const stockBeforeAdminCancel = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    // Admin cancels the order
    const adminCancelRes = await fetch(`${BASE_URL}/api/orders/${adminOrderId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'Store manager cancelled order' }),
    });
    const adminCancelData = await adminCancelRes.json();
    const stockAfterAdminCancel = (await prisma.product.findUnique({ where: { id: testProduct1.id } })).stockQuantity;

    assert(
      adminCancelRes.status === 200 && adminCancelData.success && adminCancelData.order.status === 'CANCELLED',
      'Administrator cancellation succeeds (Requirement 10)'
    );

    assert(
      stockAfterAdminCancel === stockBeforeAdminCancel + 2.0,
      `Stock was reliably restored by 2.0 litres upon admin cancellation (${stockBeforeAdminCancel} -> ${stockAfterAdminCancel}) (Requirement 10)`
    );
  }

  // =========================================================================
  // TEST SUITE 9: Negative Stock Global Audit
  // =========================================================================
  console.log('\n--- Test Suite 9: Global Non-Negative Stock Audit ---');
  {
    const negativeStockProducts = await prisma.product.findMany({
      where: { stockQuantity: { lt: 0 } },
    });

    assert(
      negativeStockProducts.length === 0,
      `Global inventory check: 0 products have negative stock (${negativeStockProducts.length} negative stock rows found) (Requirement 7)`
    );
  }

  // Cleanup isolated test products
  await prisma.orderItem.deleteMany({
    where: {
      productId: { in: [testProduct1.id, testProductScarce.id, testProductOutOfStock.id] },
    },
  });
  await prisma.product.deleteMany({
    where: {
      id: { in: [testProduct1.id, testProductScarce.id, testProductOutOfStock.id] },
    },
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`  INVENTORY, OVERSELLING & TRANSACTIONS SUITE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('>>> ALL INVENTORY MANAGEMENT & TRANSACTION SECURITY CHECKS PASSED! <<<\n');
  } else {
    console.error('>>> SOME INVENTORY CHECKS FAILED! <<<\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

runInventorySecuritySuite().catch(async (e) => {
  console.error('Fatal execution error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
