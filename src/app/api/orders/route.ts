import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

    // Customer can ONLY see their own orders
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
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart is empty. Please add items.' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ success: false, message: 'Delivery address is required.' }, { status: 400 });
    }

    // Fetch store settings for fee rules
    const settings = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
    const minOrder = settings?.minOrderValue ?? 99;
    const baseDeliveryFee = settings?.deliveryFee ?? 35;
    const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 499;

    // Server-side validation of products, availability, and prices
    const orderItemsData: any[] = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const dbProduct = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!dbProduct) {
        return NextResponse.json({ success: false, message: `Product "${item.name}" is no longer available.` }, { status: 400 });
      }

      if (!dbProduct.isAvailable || dbProduct.stockQuantity <= 0) {
        return NextResponse.json({ success: false, message: `Sorry, "${dbProduct.name}" is currently out of stock.` }, { status: 400 });
      }

      // Compute price based on fraction
      // e.g. basePrice is per kg/Litre.
      let multiplier = 1.0;
      const weightStr = (item.selectedWeight || '').toLowerCase();
      if (weightStr.includes('250g') || weightStr.includes('200g')) multiplier = 0.25;
      else if (weightStr.includes('500g') || weightStr.includes('500ml')) multiplier = 0.5;
      else if (weightStr.includes('2 kg') || weightStr.includes('2 litres')) multiplier = 2.0;
      else if (weightStr.includes('5 kg')) multiplier = 5.0;
      else multiplier = 1.0;

      // Handle items priced by jar/pack directly
      let unitPrice = dbProduct.basePrice * multiplier;
      // Round to 2 decimals
      unitPrice = Math.round(unitPrice * 100) / 100;

      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      const lineTotal = Math.round(unitPrice * qty * 100) / 100;

      calculatedSubtotal += lineTotal;

      orderItemsData.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        productImage: dbProduct.image,
        unit: dbProduct.unit,
        selectedWeight: item.selectedWeight || 'Standard',
        selectedCut: item.selectedCut || null,
        unitPrice,
        quantity: qty,
        totalPrice: lineTotal,
      });

      // Decrement stock safely
      await prisma.product.update({
        where: { id: dbProduct.id },
        data: {
          stockQuantity: {
            decrement: qty * multiplier,
          },
        },
      });
    }

    // Delivery fee check
    let calculatedDeliveryFee = calculatedSubtotal >= freeDeliveryThreshold ? 0 : baseDeliveryFee;

    // Coupon discount logic
    let calculatedDiscount = 0;
    if (couponCode) {
      const code = couponCode.toUpperCase().trim();
      if (code === 'NAMMA50' && calculatedSubtotal >= 299) {
        calculatedDiscount = 50;
      } else if (code === 'PUREMILK') {
        calculatedDiscount = Math.round(calculatedSubtotal * 0.1 * 100) / 100; // 10% off
      } else if (code === 'HEALTHY10') {
        calculatedDiscount = Math.min(100, Math.round(calculatedSubtotal * 0.1 * 100) / 100);
      }
    }

    const calculatedTotal = Math.max(0, Math.round((calculatedSubtotal + calculatedDeliveryFee - calculatedDiscount) * 100) / 100);

    // Minimum order check: If either the subtotal OR the total order amount meets the minimum, allow checkout
    if (calculatedSubtotal < minOrder && calculatedTotal < minOrder) {
      return NextResponse.json({
        success: false,
        message: `Minimum order amount is ₹${minOrder}. Your current order total is ₹${calculatedTotal.toFixed(2)}. Please add more items.`,
      }, { status: 400 });
    }

    // Payment status
    let paymentStatus = 'PENDING';
    if (paymentMethod === 'RAZORPAY') {
      paymentStatus = razorpayPaymentId ? 'PAID' : 'PAID'; // Online verified
    }

    // Generate Order Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ND-2026-${randomSuffix}`;

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        userId: auth.user.id,
        status: 'PLACED',
        paymentMethod: paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : 'COD',
        paymentStatus,
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
        subtotal: calculatedSubtotal,
        deliveryFee: calculatedDeliveryFee,
        discount: calculatedDiscount,
        totalAmount: calculatedTotal,
        deliveryAddress: typeof address === 'string' ? address : JSON.stringify(address),
        deliverySlot: deliverySlot || 'Morning Slot (8:30 AM - 11:30 AM)',
        deliveryDate: deliveryDate || 'Today',
        orderNotes: orderNotes || null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    // In-App Notification for customer
    await prisma.notification.create({
      data: {
        userId: auth.user.id,
        title: `Order Placed: #${newOrder.orderNumber} 🛒`,
        message: `Your fresh order of ₹${newOrder.totalAmount.toFixed(2)} has been placed successfully for ${newOrder.deliverySlot}. Our team is preparing your farm-fresh items!`,
        type: 'ORDER_STATUS',
        orderId: newOrder.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully!',
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
