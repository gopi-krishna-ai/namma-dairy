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

// Inline pricing logic for parity check with src/lib/pricing.ts
function calculateWeightMultiplier(weightStr, productUnit, optionsJson) {
  if (!weightStr) return 1.0;
  const w = weightStr.toLowerCase().trim();

  const unitLower = (productUnit || '').toLowerCase().trim();
  const isFixedUnit = ['pack', 'unit', 'piece', 'box', 'item'].includes(unitLower);

  if (isFixedUnit && optionsJson) {
    try {
      const allowed = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
      if (Array.isArray(allowed)) {
        const hasKgTier = allowed.some((opt) => {
          const o = String(opt).toLowerCase();
          return (
            o.includes('1kg') ||
            o.includes('1 kg') ||
            o.includes('1 litre') ||
            o.includes('1l') ||
            o.includes('1000g')
          );
        });
        if (!hasKgTier && allowed.length === 1) {
          return 1.0;
        }
      }
    } catch {}
  }

  const bunchMatch = w.match(/^(\d+(?:\.\d+)?)\s*bunch(?:es)?\b/i);
  if (bunchMatch) return parseFloat(bunchMatch[1]);

  const multiPackMatch = w.match(/^(\d+(?:\.\d+)?)\s*(?:packs?|units?|pieces?)\b/i);
  if (multiPackMatch) return parseFloat(multiPackMatch[1]);

  const mlMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilitres?|milliliters?)\b/i);
  if (mlMatch) return Math.round((parseFloat(mlMatch[1]) / 1000) * 10000) / 10000;

  const lMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:litres?|liters?|l)\b/i);
  if (lMatch) return parseFloat(lMatch[1]);

  const kgMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?)\b/i);
  if (kgMatch) return parseFloat(kgMatch[1]);

  const gMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams?)\b/i);
  if (gMatch) return Math.round((parseFloat(gMatch[1]) / 1000) * 10000) / 10000;

  return 1.0;
}

function calculateItemUnitPrice(basePrice, weightStr, productUnit, optionsJson) {
  const mult = calculateWeightMultiplier(weightStr, productUnit, optionsJson);
  return Math.round(basePrice * mult * 100) / 100;
}

function validateWeightOption(selectedWeight, optionsJson, productName = 'Product') {
  if (!optionsJson) return true;
  const allowed = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
  if (Array.isArray(allowed) && allowed.length > 0) {
    if (!selectedWeight) {
      throw new Error(`Weight/volume option is required for "${productName}". Allowed: ${allowed.join(', ')}`);
    }
    const normSelected = selectedWeight.toLowerCase().replace(/\s+/g, '');
    const match = allowed.find((opt) => {
      const normOpt = String(opt).toLowerCase().replace(/\s+/g, '');
      return normSelected === normOpt || normOpt.startsWith(normSelected) || normSelected.startsWith(normOpt);
    });
    if (!match) {
      throw new Error(`Invalid weight/volume option "${selectedWeight}" for "${productName}". Allowed options are: ${allowed.join(', ')}`);
    }
  }
  return true;
}

function validateCuttingOption(selectedCut, cuttingOptionsJson, productName = 'Product') {
  if (!cuttingOptionsJson) return true;
  const allowed = typeof cuttingOptionsJson === 'string' ? JSON.parse(cuttingOptionsJson) : cuttingOptionsJson;
  if (Array.isArray(allowed) && allowed.length > 0) {
    if (!selectedCut) return true;
    const normSelected = selectedCut.toLowerCase().replace(/\s+/g, '');
    const match = allowed.find((opt) => {
      const normOpt = String(opt).toLowerCase().replace(/\s+/g, '');
      return normSelected === normOpt || normOpt.startsWith(normSelected) || normSelected.startsWith(normOpt);
    });
    if (!match) {
      throw new Error(`Invalid cutting option "${selectedCut}" for "${productName}". Allowed options are: ${allowed.join(', ')}`);
    }
  }
  return true;
}

function validateQuantity(qty, productName = 'item') {
  if (qty === undefined || qty === null) throw new Error(`Quantity is required for ${productName}.`);
  const num = Number(qty);
  if (!Number.isFinite(num)) throw new Error(`Invalid quantity provided for ${productName}: must be a finite number.`);
  if (num <= 0) throw new Error(`Quantity for ${productName} must be greater than zero.`);
  if (!Number.isInteger(num)) throw new Error(`Quantity for ${productName} must be a whole unit.`);
  if (num > 100) throw new Error(`Quantity for ${productName} exceeds maximum allowed limit of 100 units.`);
  return num;
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
  console.log('   RUNNING TASK 6: PRODUCT PRICING & WEIGHT CALCULATION AUDIT   ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: UNIT TESTS - Multiplier & Pricing Calculations
  // -------------------------------------------------------------------------
  console.log('[SECTION 1] Multiplier & Pricing Calculation Strategy');

  // Base price ₹200/kg test cases from prompt:
  // - 250g = ₹50
  // - 500g = ₹100
  // - 750g = ₹150
  // - 1kg = ₹200
  // - 2kg = ₹400
  const base200 = 200.0;
  assert(calculateItemUnitPrice(base200, '250g', 'kg') === 50.0, 'Base ₹200/kg: 250g equals ₹50');
  assert(calculateItemUnitPrice(base200, '500g', 'kg') === 100.0, 'Base ₹200/kg: 500g equals ₹100');
  assert(calculateItemUnitPrice(base200, '750g', 'kg') === 150.0, 'Base ₹200/kg: 750g equals ₹150');
  assert(calculateItemUnitPrice(base200, '1 kg', 'kg') === 200.0, 'Base ₹200/kg: 1kg equals ₹200');
  assert(calculateItemUnitPrice(base200, '2 kg', 'kg') === 400.0, 'Base ₹200/kg: 2kg equals ₹400');
  assert(calculateItemUnitPrice(base200, '200g', 'kg') === 40.0, 'Base ₹200/kg: 200g equals ₹40 (not ₹50)');
  assert(calculateItemUnitPrice(base200, '5 kg', 'kg') === 1000.0, 'Base ₹200/kg: 5kg equals ₹1000');

  // Base price ₹80/litre test cases from prompt:
  // - 500ml = ₹40
  // - 750ml = ₹60
  // - 1 litre = ₹80
  const base80 = 80.0;
  assert(calculateItemUnitPrice(base80, '500ml', 'litre') === 40.0, 'Base ₹80/litre: 500ml equals ₹40');
  assert(calculateItemUnitPrice(base80, '750ml', 'litre') === 60.0, 'Base ₹80/litre: 750ml equals ₹60');
  assert(calculateItemUnitPrice(base80, '1 Litre', 'litre') === 80.0, 'Base ₹80/litre: 1 litre equals ₹80');
  assert(calculateItemUnitPrice(base80, '2 Litres', 'litre') === 160.0, 'Base ₹80/litre: 2 litres equals ₹160');

  // Fixed-price products:
  // Kitchen Aromatics: Green Chilli & Ginger Pack, basePrice: ₹35, unit: 'pack', optionsJson: ['200g Combo Pack']
  const fixedPackOptions = JSON.stringify(['200g Combo Pack']);
  assert(
    calculateItemUnitPrice(35.0, '200g Combo Pack', 'pack', fixedPackOptions) === 35.0,
    'Fixed-price pack: 200g Combo Pack retains base price ₹35 (not ₹7)'
  );

  // Scaled-pack products:
  // Desi Ghee ₹850, unit: 'pack', optionsJson: ['250g Jar', '500g Jar', '1kg Jar']
  const scaledPackOptions = JSON.stringify(['250g Jar', '500g Jar', '1kg Jar']);
  assert(
    calculateItemUnitPrice(850.0, '250g Jar', 'pack', scaledPackOptions) === 212.5,
    'Scaled pack: 250g Jar of Desi Ghee (₹850/kg) is ₹212.50'
  );
  assert(
    calculateItemUnitPrice(850.0, '500g Jar', 'pack', scaledPackOptions) === 425.0,
    'Scaled pack: 500g Jar of Desi Ghee (₹850/kg) is ₹425.00'
  );
  assert(
    calculateItemUnitPrice(850.0, '1kg Jar', 'pack', scaledPackOptions) === 850.0,
    'Scaled pack: 1kg Jar of Desi Ghee is ₹850.00'
  );

  // Bunches:
  assert(calculateItemUnitPrice(25.0, '1 Bunch (250g)', 'bunch') === 25.0, 'Bunch: 1 Bunch equals ₹25');
  assert(calculateItemUnitPrice(25.0, '2 Bunches (500g)', 'bunch') === 50.0, 'Bunch: 2 Bunches equals ₹50');

  // Consistent 2-decimal rounding:
  assert(
    calculateItemUnitPrice(333.33, '750g', 'kg') === 250.0,
    'Consistent rounding: 333.33 * 0.75 = 249.9975 rounds cleanly to 250.00'
  );

  // -------------------------------------------------------------------------
  // SECTION 2: UNIT TESTS - Validation of Options & Quantities
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 2] Validation Strategy (Options, Cuts, Quantities)');

  // Weight validation
  const validWeightOpts = JSON.stringify(['250g', '500g', '1 kg', '2 kg']);
  assert(validateWeightOption('500g', validWeightOpts, 'Test Meat') === true, 'Valid weight option "500g" accepted');
  let invalidWeightThrown = false;
  try {
    validateWeightOption('350g', validWeightOpts, 'Test Meat');
  } catch (e) {
    invalidWeightThrown = e.message.includes('Invalid weight/volume option');
  }
  assert(invalidWeightThrown, 'Unsupported weight "350g" rejected with descriptive error');

  // Cutting options validation
  const validCuts = JSON.stringify(['Curry Cut', 'Biryani Cut', 'Boneless']);
  assert(validateCuttingOption('Curry Cut', validCuts, 'Test Chicken') === true, 'Valid cutting option accepted');
  assert(validateCuttingOption(null, validCuts, 'Test Chicken') === true, 'Null/omitted cutting option accepted (optional)');
  let invalidCutThrown = false;
  try {
    validateCuttingOption('Deep Fried Strips', validCuts, 'Test Chicken');
  } catch (e) {
    invalidCutThrown = e.message.includes('Invalid cutting option');
  }
  assert(invalidCutThrown, 'Unsupported cutting option rejected with descriptive error');

  // Quantity validation
  assert(validateQuantity(1) === 1, 'Valid quantity 1 accepted');
  assert(validateQuantity(10) === 10, 'Valid quantity 10 accepted');
  assert(validateQuantity(100) === 100, 'Valid boundary quantity 100 accepted');

  let zeroQtyThrown = false;
  try { validateQuantity(0); } catch (e) { zeroQtyThrown = e.message.includes('greater than zero'); }
  assert(zeroQtyThrown, 'Zero quantity rejected');

  let negQtyThrown = false;
  try { validateQuantity(-5); } catch (e) { negQtyThrown = e.message.includes('greater than zero'); }
  assert(negQtyThrown, 'Negative quantity rejected');

  let fracQtyThrown = false;
  try { validateQuantity(1.5); } catch (e) { fracQtyThrown = e.message.includes('whole unit'); }
  assert(fracQtyThrown, 'Fractional quantity (1.5) rejected');

  let excessQtyThrown = false;
  try { validateQuantity(101); } catch (e) { excessQtyThrown = e.message.includes('exceeds maximum'); }
  assert(excessQtyThrown, 'Excessive quantity (101) rejected');

  // -------------------------------------------------------------------------
  // SECTION 3: HTTP API INTEGRATION TESTS (Real Server Execution)
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 3] Live API Integration Tests');

  await clearRateLimits();

  // Login as Customer
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: cookie,
  };

  // Fetch live products
  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const { products } = await productsRes.json();

  const milkProd = products.find((p) => p.unit === 'litre');
  const meatProd = products.find((p) => p.unit === 'kg' && p.cuttingOptionsJson);
  const fixedVegProd = products.find((p) => p.slug === 'kitchen-aromatics-chilli-ginger');

  assert(Boolean(milkProd), `Found test liquid product: "${milkProd?.name}" (${milkProd?.basePrice}/litre)`);
  assert(Boolean(meatProd), `Found test meat product: "${meatProd?.name}" (${meatProd?.basePrice}/kg)`);
  assert(Boolean(fixedVegProd), `Found test fixed-pack product: "${fixedVegProd?.name}" (₹${fixedVegProd?.basePrice}/pack)`);

  // Ensure stock is available
  await prisma.product.update({ where: { id: milkProd.id }, data: { stockQuantity: 50, isAvailable: true } });
  await prisma.product.update({ where: { id: meatProd.id }, data: { stockQuantity: 50, isAvailable: true } });
  await prisma.product.update({ where: { id: fixedVegProd.id }, data: { stockQuantity: 50, isAvailable: true } });

  // Test 3.1: Live Order with Liquid Product 500ml
  // Milk: 500ml = 0.5 * basePrice
  const expectedMilkPrice = Math.round(milkProd.basePrice * 0.5 * 100) / 100;
  const orderRes1 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: milkProd.id,
          selectedWeight: '500ml',
          quantity: 4, // 4 * expectedMilkPrice
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  const orderData1 = await orderRes1.json();
  assert(
    (orderRes1.status === 200 || orderRes1.status === 201) && orderData1.success,
    `Order with 500ml liquid placed successfully (Order ID: ${orderData1.order?.orderNumber})`
  );
  const milkOrderItem = orderData1.order?.items?.[0];
  assert(
    milkOrderItem?.unitPrice === expectedMilkPrice,
    `Server calculated exact 500ml unitPrice ₹${expectedMilkPrice} (base: ₹${milkProd.basePrice}/L)`
  );
  assert(
    milkOrderItem?.totalPrice === Math.round(expectedMilkPrice * 4 * 100) / 100,
    `Server calculated line total ₹${Math.round(expectedMilkPrice * 4 * 100) / 100}`
  );

  // Test 3.2: Tampered Frontend Price Attack
  // Client attempts to send fake unitPrice: 1 and totalPrice: 1
  const orderRes2 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: milkProd.id,
          selectedWeight: '500ml',
          quantity: 2,
          unitPrice: 1.0, // Tampered!
          totalPrice: 2.0, // Tampered!
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  const orderData2 = await orderRes2.json();
  const tamperedItem = orderData2.order?.items?.[0];
  assert(
    tamperedItem?.unitPrice === expectedMilkPrice,
    `Tampered price rejected: Server enforced authentic price ₹${expectedMilkPrice} instead of ₹1.00`
  );

  // Test 3.3: Invalid Weight Option Rejection
  const orderRes3 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: milkProd.id,
          selectedWeight: '350ml', // NOT in ['500ml', '1 Litre', '2 Litres']
          quantity: 1,
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  const orderData3 = await orderRes3.json();
  assert(
    orderRes3.status === 400 && orderData3.message.includes('Invalid weight/volume option'),
    'Order with unsupported weight (350ml) rejected with 400 Bad Request'
  );

  // Test 3.4: Invalid Cutting Option Rejection
  const orderRes4 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: meatProd.id,
          selectedWeight: JSON.parse(meatProd.optionsJson)[0],
          selectedCut: 'Deep Fried In Batter', // Unsupported cutting option
          quantity: 1,
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  const orderData4 = await orderRes4.json();
  assert(
    orderRes4.status === 400 && orderData4.message.includes('Invalid cutting option'),
    'Order with unsupported cutting option rejected with 400 Bad Request'
  );

  // Test 3.5: Invalid Quantity Rejection
  const orderRes5 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: milkProd.id,
          selectedWeight: '1 Litre',
          quantity: -2,
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  assert(orderRes5.status === 400, 'Negative quantity rejected with 400 Bad Request');

  const orderRes6 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: milkProd.id,
          selectedWeight: '1 Litre',
          quantity: 2.5,
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  assert(orderRes6.status === 400, 'Fractional quantity (2.5) rejected with 400 Bad Request');

  // Test 3.6: Fixed Pack Price Order
  const orderRes7 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: fixedVegProd.id,
          selectedWeight: '200g Combo Pack',
          quantity: 3, // 3 * ₹35 = ₹105 (exceeds min order ₹99)
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  const orderData7 = await orderRes7.json();
  assert((orderRes7.status === 200 || orderRes7.status === 201) && orderData7.success, 'Fixed-price pack order placed successfully');
  const fixedItem = orderData7.order?.items?.[0];
  assert(
    fixedItem?.unitPrice === 35.0,
    `Fixed pack unitPrice is exactly ₹35.00 (not scaled by 200g)`
  );
  assert(
    fixedItem?.totalPrice === 105.0,
    `Fixed pack totalPrice is exactly ₹105.00 for 3 packs`
  );

  // Test 3.7: Stock Deduction Parity
  // Initial stock: 50. Ordering 2 x 500g (multiplier 0.5) should deduct 1.0kg, leaving 49.0kg
  const meatInitial = await prisma.product.findUnique({ where: { id: meatProd.id } });
  const meatCut = JSON.parse(meatProd.cuttingOptionsJson)[0];
  const meatWeight = JSON.parse(meatProd.optionsJson).find(o => o.includes('500g')) || '500g';
  const orderRes8 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: meatProd.id,
          selectedWeight: meatWeight,
          selectedCut: meatCut,
          quantity: 2, // 2 * 0.5 = 1.0 unit
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'COD',
    }),
  });
  assert(orderRes8.status === 200 || orderRes8.status === 201, 'Order with 2 x 500g placed successfully');
  const meatAfter = await prisma.product.findUnique({ where: { id: meatProd.id } });
  assert(
    meatAfter.stockQuantity === meatInitial.stockQuantity - 1.0,
    `Stock deduction accurate: 2 x 500g deducted exactly 1.0 unit (${meatInitial.stockQuantity} -> ${meatAfter.stockQuantity})`
  );

  // Test 3.8: Razorpay create_order Option Validation
  const rzpInvalidRes = await fetch(`${BASE_URL}/api/payment/razorpay`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'create_order',
      items: [
        {
          productId: meatProd.id,
          selectedWeight: '9999kg',
          selectedCut: meatCut,
          quantity: 2,
        },
      ],
    }),
  });
  const rzpInvalidData = await rzpInvalidRes.json();
  assert(
    rzpInvalidRes.status === 400 && rzpInvalidData.message.includes('Invalid weight/volume option'),
    'Razorpay order creation verifies weight options and rejects invalid options (400 Bad Request)'
  );

  // Test 3.9: Razorpay Verified Paid Order Backend Pricing Parity
  const crypto = await import('crypto');
  const rzpSecret = process.env.RAZORPAY_KEY_SECRET || 'purepicks_rzp_mock_secret_key_2026_test';
  const rzpOrderId = `order_pricing_${Date.now()}`;
  const rzpPaymentId = `pay_pricing_${Date.now()}`;
  const rzpSignature = crypto
    .createHmac('sha256', rzpSecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest('hex');

  const expectedSubtotal = Math.round(meatProd.basePrice * 0.5 * 2 * 100) / 100;
  const expectedDelivery = expectedSubtotal >= 499 ? 0 : 35;
  const expectedTotal = expectedSubtotal + expectedDelivery;

  const rzpOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: meatProd.id,
          selectedWeight: meatWeight,
          selectedCut: meatCut,
          quantity: 2,
          unitPrice: 1.0, // Frontend tamper attempt
          totalPrice: 2.0, // Frontend tamper attempt
        },
      ],
      address: '123 Test Street, Bengaluru',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: rzpSignature,
    }),
  });
  const rzpOrderData = await rzpOrderRes.json();
  assert(
    (rzpOrderRes.status === 200 || rzpOrderRes.status === 201) && rzpOrderData.success,
    `Razorpay verified order created with status CONFIRMED and PAID`
  );
  assert(
    rzpOrderData.order?.totalAmount === expectedTotal,
    `Razorpay order backend total ₹${rzpOrderData.order?.totalAmount} equals expected server price ₹${expectedTotal} (ignored frontend ₹2.00 tamper)`
  );
  assert(
    rzpOrderData.order?.subtotal === expectedSubtotal,
    `Razorpay order subtotal ₹${rzpOrderData.order?.subtotal} equals expected ₹${expectedSubtotal}`
  );
  assert(
    rzpOrderData.order?.deliveryFee === expectedDelivery,
    `Razorpay order delivery fee ₹${rzpOrderData.order?.deliveryFee} equals expected ₹${expectedDelivery}`
  );

  console.log('\n================================================================');
  console.log(`TASK 6 AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
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
