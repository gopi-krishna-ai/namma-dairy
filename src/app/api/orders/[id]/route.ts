import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Role isolation: Customers can only view their own order
    if (auth.user.role !== 'ADMIN' && order.userId !== auth.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden. Access denied.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { status, paymentStatus, cancelReason } = body;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // If Customer is requesting cancellation
    if (auth.user.role !== 'ADMIN') {
      if (order.userId !== auth.user.id) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }

      if (status !== 'CANCELLED') {
        return NextResponse.json({ success: false, message: 'Unauthorized action.' }, { status: 403 });
      }

      // Check if cancellation is allowed
      if (!['PLACED', 'CONFIRMED'].includes(order.status)) {
        return NextResponse.json({
          success: false,
          message: 'This order is already being prepared or dispatched and cannot be cancelled automatically.',
        }, { status: 400 });
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: `Order Cancelled: #${order.orderNumber} ❌`,
          message: `Your order #${order.orderNumber} has been cancelled successfully.${cancelReason ? ` Reason: ${cancelReason}` : ''}`,
          type: 'ORDER_STATUS',
          orderId: order.id,
        },
      });

      return NextResponse.json({ success: true, message: 'Order cancelled successfully', order: updated });
    }

    // ADMIN status update logic
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    } else if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
      // Cash on Delivery collected upon physical doorstep handover
      updateData.paymentStatus = 'PAID';
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    // Notify customer on status update
    const statusNotifications: Record<string, { title: string; msg: string }> = {
      CONFIRMED: {
        title: `Order Confirmed: #${order.orderNumber} ✅`,
        msg: `Your order has been verified and confirmed by Namma Dairy! We are selecting the freshest cuts for you.`,
      },
      PREPARING: {
        title: `Order in Kitchen: #${order.orderNumber} 🔪`,
        msg: `Fresh butchery and custom cut packing underway under cold-chain hygiene protocols.`,
      },
      DISPATCHED: {
        title: `Order Dispatched: #${order.orderNumber} 📦`,
        msg: `Your package has left our Bengaluru fulfillment hub in temperature-controlled bags.`,
      },
      OUT_FOR_DELIVERY: {
        title: `Out for Delivery: #${order.orderNumber} 🛵`,
        msg: `Our delivery partner is en route to your address. Please be ready to receive your items!`,
      },
      DELIVERED: {
        title: `Order Delivered: #${order.orderNumber} 🏡`,
        msg: `Your Namma Dairy order has been delivered! Enjoy your fresh milk and farm cuts. Thank you for shopping local!`,
      },
      CANCELLED: {
        title: `Order Cancelled: #${order.orderNumber} ⚠️`,
        msg: `Order #${order.orderNumber} has been cancelled by the store administrator.`,
      },
    };

    if (status && statusNotifications[status]) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: statusNotifications[status].title,
          message: statusNotifications[status].msg,
          type: 'ORDER_STATUS',
          orderId: order.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status || paymentStatus}.`,
      order: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
