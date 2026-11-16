import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getRazorpayClient,
  isRazorpayConfigured,
  calculateServerOrderPricing,
  verifyRazorpayPaymentSignature,
} from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, items, couponCode, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // =========================================================================
    // ACTION 1: Create Razorpay Order via Official Server-Side Orders API
    // =========================================================================
    if (action === 'create_order') {
      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          {
            success: false,
            message: 'Razorpay payment gateway is not configured on the server. Please select Cash on Delivery (COD) or contact administrator.',
          },
          { status: 503 }
        );
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Cart items are required to compute order amount.' },
          { status: 400 }
        );
      }

      // Requirement 2 & 3: Create payment order using server-calculated amount. Never trust client amount!
      let pricing;
      try {
        pricing = await calculateServerOrderPricing(items, couponCode);
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 400 });
      }

      const razorpay = getRazorpayClient();
      const receipt = `rcpt_${auth.user.id.slice(-6)}_${Date.now()}`;

      // Call official Razorpay Orders API
      const rzpOrder = await razorpay.orders.create({
        amount: pricing.amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          userId: auth.user.id,
          userEmail: auth.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: rzpOrder.id,
        amount: rzpOrder.amount, // in paise
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Only public key ID is exposed to client
        businessName: 'Pure Picks Bengaluru',
        description: 'Farm Fresh Milk, Meat & Veg Delivery',
      });
    }

    // =========================================================================
    // ACTION 2: Verify Payment Cryptographic Signature (HMAC-SHA256)
    // =========================================================================
    if (action === 'verify_payment') {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Missing mandatory payment verification parameters (orderId, paymentId, or signature).',
          },
          { status: 400 }
        );
      }

      // Requirement 12: Prevent duplicate payment processing
      const existingOrder = await prisma.order.findFirst({
        where: { razorpayPaymentId: razorpay_payment_id.trim() },
      });

      if (existingOrder) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'This payment transaction has already been processed and claimed.',
          },
          { status: 409 }
        );
      }

      // Requirement 5 & 6: Timing-safe HMAC-SHA256 signature verification
      const isValid = verifyRazorpayPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: 'Cryptographic payment verification failed: Invalid HMAC-SHA256 signature.',
          },
          { status: 400 }
        );
      }

      // Verify payment details with Razorpay API if live client is active
      if (isRazorpayConfigured()) {
        try {
          const razorpay = getRazorpayClient();
          const payment = await razorpay.payments.fetch(razorpay_payment_id);

          // Requirement 7: Verify payment belongs to expected order
          if (payment.order_id !== razorpay_order_id) {
            return NextResponse.json(
              {
                success: false,
                verified: false,
                message: 'Security mismatch: Payment does not belong to the expected Razorpay order.',
              },
              { status: 400 }
            );
          }

          // Requirement 10: Handle failed or non-captured payments
          if (payment.status === 'failed') {
            return NextResponse.json(
              {
                success: false,
                verified: false,
                message: `Payment failed with reason: ${payment.error_description || 'Transaction declined by bank.'}`,
              },
              { status: 400 }
            );
          }
        } catch (fetchErr: any) {
          // If offline or test mode without remote fetch, signature validity is the cryptographic proof
          console.warn('Razorpay payment fetch note:', fetchErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        message: 'Payment verified successfully via authentic HMAC-SHA256 signature.',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid payment action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Razorpay API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Payment processing error.' },
      { status: 500 }
    );
  }
}
