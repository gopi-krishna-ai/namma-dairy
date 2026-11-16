import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { calculateServerOrderPricing, verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { reserveStockForItems } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};

    // Customer can ONLY see their own orders; admin can see all
    if (auth.user.role !== 'ADMIN') {
      where.userId = auth.user.id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      items,
      address,
      deliverySlot,
      deliveryDate,
      paymentMethod,
      orderNotes,
      couponCode,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = body;

    // 1. Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart is empty. Please add items.' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ success: false, message: 'Delivery address is required.' }, { status: 400 });
    }

    const cleanPaymentMethod = paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : 'COD';

    // 2. Requirement 2 & 3: Never trust client amount. Calculate pricing strictly on backend.
    let pricing;
    try {
      pricing = await calculateServerOrderPricing(items, couponCode);
    } catch (pricingError: any) {
      return NextResponse.json({ success: false, message: pricingError.message }, { status: 400 });
    }

    // Minimum order check from store settings
    const settings = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
    const minOrder = settings?.minOrderValue ?? 99;

    if (pricing.subtotal < minOrder && pricing.totalAmount < minOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum order amount is ₹${minOrder}. Your current order total is ₹${pricing.totalAmount.toFixed(2)}. Please add more items.`,
        },
        { status: 400 }
      );
    }

    // 3. Payment verification & status transitions
    let paymentStatus: 'PENDING' | 'PAID' = 'PENDING';
    let orderStatus: 'PLACED' | 'CONFIRMED' = 'PLACED';
    let cleanOrderId: string | null = null;
    let cleanPaymentId: string | null = null;
    let cleanSignature: string | null = null;

    if (cleanPaymentMethod === 'RAZORPAY') {
      // Requirement 4, 8 & 9: Online orders require authentic payment verification credentials
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json(
          {
            success: false,
            message: 'Razorpay orders require verified payment credentials (order ID, payment ID, and cryptographic signature).',
          },
          { status: 400 }
        );
      }

      cleanOrderId = String(razorpayOrderId).trim();
      cleanPaymentId = String(razorpayPaymentId).trim();
      cleanSignature = String(razorpaySignature).trim();

      // Requirement 12: Prevent duplicate payment processing & duplicate order creation
      const existingOrderWithPayment = await prisma.order.findFirst({
        where: { razorpayPaymentId: cleanPaymentId },
      });

      if (existingOrderWithPayment) {
        return NextResponse.json(
          {
            success: false,
            message: 'Duplicate payment detected. This Razorpay payment ID has already been claimed for another order.',
          },
          { status: 409 }
        );
      }

      // Requirement 5 & 6: Cryptographic HMAC-SHA256 timing-safe verification
      const isSignatureValid = verifyRazorpayPaymentSignature({
        razorpay_order_id: cleanOrderId,
        razorpay_payment_id: cleanPaymentId,
        razorpay_signature: cleanSignature,
      });

      if (!isSignatureValid) {
        return NextResponse.json(
          {
            success: false,
            message: 'Cryptographic payment verification failed: Invalid HMAC-SHA256 signature.',
          },
          { status: 400 }
        );
      }

      // Genuinely verified: mark as PAID and CONFIRMED
      paymentStatus = 'PAID';
      orderStatus = 'CONFIRMED';
    } else {
      // Cash on Delivery
      paymentStatus = 'PENDING';
      orderStatus = 'PLACED';
      cleanOrderId = null;
      cleanPaymentId = null;
      cleanSignature = null;
    }

    // 4. Generate Order Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ND-2026-${randomSuffix}`;

    // 5. Atomic transaction: conditionally reserve stock, create order, and emit in-app notification
    // Requirement 6, 7 & 8: Simultaneous orders cannot oversell; rollback on failure
    // Requirement 13 & 14: Ensure notifications are generated only after successful database updates inside transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // Conditionally decrement stock with WHERE stockQuantity >= required
      await reserveStockForItems(tx, pricing.orderItemsData);

      // Create Order record with inventory tracking
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: auth.user.id,
          status: orderStatus,
          paymentMethod: cleanPaymentMethod,
          paymentStatus,
          razorpayOrderId: cleanOrderId,
          razorpayPaymentId: cleanPaymentId,
          razorpaySignature: cleanSignature,
          subtotal: pricing.subtotal,
          deliveryFee: pricing.deliveryFee,
          discount: pricing.discount,
          totalAmount: pricing.totalAmount,
          deliveryAddress: typeof address === 'string' ? address : JSON.stringify(address),
          deliverySlot: deliverySlot || 'Morning Slot (8:30 AM - 11:30 AM)',
          deliveryDate: deliveryDate || 'Today',
          orderNotes: orderNotes || null,
          inventoryReserved: true,
          inventoryRestored: false,
          items: {
            create: pricing.orderItemsData.map((oi) => ({
              productId: oi.productId,
              productName: oi.productName,
              productImage: oi.productImage,
              unit: oi.unit,
              selectedWeight: oi.selectedWeight,
              selectedCut: oi.selectedCut,
              unitPrice: oi.unitPrice,
              quantity: oi.quantity,
              totalPrice: oi.totalPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Requirement 13 & 14: In-App Notification created atomically inside transaction with resolved order ID
      await tx.notification.create({
        data: {
          userId: auth.user.id,
          title: `Order Placed: #${createdOrder.orderNumber} 🛒`,
          message: `Your fresh order of ₹${createdOrder.totalAmount.toFixed(2)} (${cleanPaymentMethod} - ${paymentStatus}) has been placed successfully for ${createdOrder.deliverySlot}. Our team is preparing your farm-fresh items!`,
          type: 'ORDER_STATUS',
          orderId: createdOrder.id,
        },
      });

      return createdOrder;
    });

    return NextResponse.json(
      {
        success: true,
        message: cleanPaymentMethod === 'RAZORPAY' ? 'Payment verified and order placed successfully!' : 'Order placed successfully with Cash on Delivery!',
        order: newOrder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
