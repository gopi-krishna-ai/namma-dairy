import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from './prisma';
import {
  validateQuantity,
  calculateWeightMultiplier,
  calculateItemUnitPrice,
  validateWeightOption,
  validateCuttingOption,
} from './pricing';

export interface CartItemInput {
  productId: string;
  quantity: number;
  selectedWeight?: string;
  selectedCut?: string;
}

export interface CalculatedOrderPricing {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  amountInPaise: number;
  orderItemsData: Array<{
    productId: string;
    productName: string;
    productImage: string;
    unit: string;
    selectedWeight: string;
    selectedCut: string | null;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    stockMultiplier: number;
  }>;
}

/**
 * Validates and retrieves the official Razorpay server-side SDK instance.
 * Fails safely if credentials are not configured.
 */
export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'CONFIGURATION_ERROR: Razorpay payment gateway credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are missing. Please configure them in your server environment.'
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Checks whether Razorpay credentials are fully configured on the server.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Computes official HMAC-SHA256 signature for Razorpay payment verification.
 * Formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function generateExpectedPaymentSignature(orderId: string, paymentId: string, secret?: string): string {
  const keySecret = secret || process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is required to generate payment verification signature.');
  }

  return crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId.trim()}|${paymentId.trim()}`)
    .digest('hex');
}

/**
 * Timing-safe HMAC-SHA256 signature verification for payment callbacks.
 * Protects against timing side-channel attacks.
 */
export function verifyRazorpayPaymentSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  secret,
}: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  secret?: string;
}): boolean {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  try {
    const expected = generateExpectedPaymentSignature(razorpay_order_id, razorpay_payment_id, secret);
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(razorpay_signature.trim(), 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Timing-safe HMAC-SHA256 webhook signature verification using raw request payload.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret?: string
): boolean {
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader || !rawBody) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const signatureBuf = Buffer.from(signatureHeader.trim(), 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Server-side order calculation strictly from database prices and rules.
 * Never trusts the payment amount received from the browser.
 */
export async function calculateServerOrderPricing(
  items: CartItemInput[],
  couponCode?: string
): Promise<CalculatedOrderPricing> {
  const settings = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
  const baseDeliveryFee = settings?.deliveryFee ?? 35;
  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 499;

  let calculatedSubtotal = 0;
  const orderItemsData: CalculatedOrderPricing['orderItemsData'] = [];

  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new Error('Valid Product ID is required for each cart item.');
    }

    const dbProduct = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!dbProduct) {
      throw new Error(`Product with ID "${item.productId}" was not found in catalog.`);
    }

    if (!dbProduct.isAvailable || dbProduct.stockQuantity <= 0) {
      throw new Error(`Product "${dbProduct.name}" is currently out of stock.`);
    }

    // Requirement 2 & 3: Validate quantity as a positive finite whole number
    const validQty = validateQuantity(item.quantity, dbProduct.name);

    // Requirement 4: Validate requested weight against configured options
    validateWeightOption(item.selectedWeight, dbProduct.optionsJson, dbProduct.name);

    // Requirement 13: Validate cutting option against configured options
    validateCuttingOption(item.selectedCut, dbProduct.cuttingOptionsJson, dbProduct.name);

    const multiplier = calculateWeightMultiplier(item.selectedWeight, dbProduct.unit, dbProduct.optionsJson);
    const requiredStock = validQty * multiplier;

    // Requirement 5: Check available stock against actual requested quantity and weight
    if (dbProduct.stockQuantity < requiredStock) {
      throw new Error(
        `Insufficient stock for "${dbProduct.name}". Only ${dbProduct.stockQuantity} ${dbProduct.unit} available (requested: ${requiredStock} ${dbProduct.unit}).`
      );
    }

    const unitPrice = calculateItemUnitPrice(dbProduct.basePrice, item.selectedWeight, dbProduct.unit, dbProduct.optionsJson);
    const lineTotal = Math.round(unitPrice * validQty * 100) / 100;

    calculatedSubtotal += lineTotal;

    orderItemsData.push({
      productId: dbProduct.id,
      productName: dbProduct.name,
      productImage: dbProduct.image,
      unit: dbProduct.unit,
      selectedWeight: item.selectedWeight || 'Standard',
      selectedCut: item.selectedCut || null,
      unitPrice,
      quantity: validQty,
      totalPrice: lineTotal,
      stockMultiplier: multiplier,
    });
  }

  // Delivery fee
  const deliveryFee = calculatedSubtotal >= freeDeliveryThreshold ? 0 : baseDeliveryFee;

  // Coupon discount
  let discount = 0;
  if (couponCode) {
    const code = couponCode.toUpperCase().trim();
    if (code === 'NAMMA50' && calculatedSubtotal >= 299) {
      discount = 50;
    } else if (code === 'PUREMILK') {
      discount = Math.round(calculatedSubtotal * 0.1 * 100) / 100;
    } else if (code === 'HEALTHY10') {
      discount = Math.min(100, Math.round(calculatedSubtotal * 0.1 * 100) / 100);
    }
  }

  const totalAmount = Math.max(0, Math.round((calculatedSubtotal + deliveryFee - discount) * 100) / 100);
  const amountInPaise = Math.round(totalAmount * 100);

  return {
    subtotal: calculatedSubtotal,
    deliveryFee,
    discount,
    totalAmount,
    amountInPaise,
    orderItemsData,
  };
}
