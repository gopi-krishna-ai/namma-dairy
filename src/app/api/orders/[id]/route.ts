import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { restoreStockForOrder } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

const VALID_ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;

type PaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];

// Permitted order status transitions for administrators
const ADMIN_PERMITTED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  DISPATCHED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state: cannot transition to any other state
  CANCELLED: [], // Terminal state: cannot transition to any other state
};

// Permitted cancellations for customers
const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED'];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ success: false, message: 'Invalid order identifier.' }, { status: 400 });
    }

    const cleanId = id.trim();
    // Requirement 1: Resolve database record by primary ID or unique orderNumber
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: cleanId }, { orderNumber: cleanId }],
      },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Requirement 2 & 12: Customers can only view their own orders; prevent modifying/accessing by URL parameter
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
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ success: false, message: 'Invalid order identifier.' }, { status: 400 });
    }

    const cleanId = id.trim();
    // Requirement 1: Search by both database ID and orderNumber to resolve the authoritative record
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: cleanId }, { orderNumber: cleanId }],
      },
      include: { items: true, user: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Requirement 1: Use the resolved database order ID for every database update
    const resolvedDbOrderId = order.id;
    const isAdmin = auth.user.role === 'ADMIN';

    // Requirement 12: Prevent customers from modifying another customer's order by changing URL ID
    if (!isAdmin && order.userId !== auth.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden. You do not own this order.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { status, paymentStatus, cancelReason } = body;

    if (!status && !paymentStatus) {
      return NextResponse.json(
        { success: false, message: 'Please provide status or paymentStatus to update.' },
        { status: 400 }
      );
    }

    // Requirement 5: Customers cannot change payment status
    if (!isAdmin && paymentStatus !== undefined) {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Customers cannot modify payment status.' },
        { status: 403 }
      );
    }

    // Requirement 4 & 6: Customers cannot update order status directly (only cancel eligible orders)
    if (!isAdmin && status && status !== 'CANCELLED') {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Customers cannot update order status directly.' },
        { status: 403 }
      );
    }

    // Validate status value if provided
    if (status && !VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid order status: ${status}. Permitted statuses: ${VALID_ORDER_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    // Validate paymentStatus value if provided
    if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid payment status: ${paymentStatus}. Permitted statuses: ${VALID_PAYMENT_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    // Requirement 15: Prevent duplicate cancellation and duplicate status transitions
    if (status && status === order.status) {
      if (status === 'CANCELLED') {
        return NextResponse.json({ success: false, message: 'This order has already been cancelled.' }, { status: 400 });
      }
      return NextResponse.json({ success: false, message: `Order is already in ${status} status.` }, { status: 400 });
    }

    if (paymentStatus && !status && paymentStatus === order.paymentStatus) {
      return NextResponse.json(
        { success: false, message: `Payment is already marked as ${paymentStatus}.` },
        { status: 400 }
      );
    }

    // Status transition validation
    if (status) {
      if (!isAdmin) {
        // Customer cancellation rules
        // Requirement 10: Prevent customers from cancelling dispatched, delivered or already cancelled orders
        if (order.status === 'CANCELLED') {
          return NextResponse.json({ success: false, message: 'This order has already been cancelled.' }, { status: 400 });
        }
        if (order.status === 'DELIVERED') {
          return NextResponse.json({ success: false, message: 'Delivered orders cannot be cancelled.' }, { status: 400 });
        }
        if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status as OrderStatus)) {
          return NextResponse.json(
            {
              success: false,
              message: `This order is already being ${order.status.toLowerCase().replace(/_/g, ' ')} and cannot be cancelled by the customer.`,
            },
            { status: 400 }
          );
        }
      } else {
        // Admin status transition rules
        // Requirement 9: Validate every permitted order status transition
        const permittedNext = ADMIN_PERMITTED_TRANSITIONS[order.status as OrderStatus] || [];
        if (!permittedNext.includes(status as OrderStatus)) {
          return NextResponse.json(
            {
              success: false,
              message: `Invalid status transition from ${order.status} to ${status}.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Requirement 11: Validate cancelReason length and content
    let effectiveCancelReason: string | undefined = undefined;
    if (status === 'CANCELLED') {
      if (cancelReason !== undefined && cancelReason !== null) {
        if (typeof cancelReason !== 'string') {
          return NextResponse.json(
            { success: false, message: 'Cancellation reason must be a text string.' },
            { status: 400 }
          );
        }
        const trimmed = cancelReason.trim();
        if (trimmed.length < 3 || trimmed.length > 500) {
          return NextResponse.json(
            { success: false, message: 'Cancellation reason must be between 3 and 500 characters.' },
            { status: 400 }
          );
        }
        effectiveCancelReason = trimmed;
      } else {
        effectiveCancelReason = isAdmin
          ? 'Store administrator cancelled order.'
          : 'Customer requested cancellation.';
      }
    }

    // Requirement 7 & 8: Payment status update validations
    // Requirement 8: Never allow administrators to mark online payments as PAID without verified payment evidence
    if (paymentStatus === 'PAID') {
      if (order.paymentMethod === 'RAZORPAY') {
        if (!order.razorpayPaymentId || order.razorpayPaymentId.trim() === '') {
          return NextResponse.json(
            {
              success: false,
              message: 'Online Razorpay orders cannot be marked as PAID without verified payment ID evidence.',
            },
            { status: 400 }
          );
        }
      }
    }

    // Build updateData
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (effectiveCancelReason) {
      updateData.orderNotes = order.orderNotes
        ? `${order.orderNotes} | Cancellation reason: ${effectiveCancelReason}`
        : `Cancellation reason: ${effectiveCancelReason}`;
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    } else if (status === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID') {
      // Requirement 7: Mark COD orders as collected upon delivery
      updateData.paymentStatus = 'PAID';
    }

    // Prepare Notification Data
    const STATUS_NOTIFICATIONS: Record<string, { title: string; msg: string }> = {
      CONFIRMED: {
        title: `Order Confirmed: #${order.orderNumber} ✅`,
        msg: `Your order has been verified and confirmed by Pure Picks! We are selecting the freshest cuts for you.`,
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
        msg: `Your Pure Picks order has been delivered! Enjoy your fresh milk and farm cuts. Thank you for shopping local!`,
      },
    };

    let notificationData: { title: string; message: string } | null = null;
    if (status === 'CANCELLED') {
      const reasonSuffix = effectiveCancelReason ? ` Reason: ${effectiveCancelReason}` : '';
      if (isAdmin) {
        notificationData = {
          title: `Order Cancelled: #${order.orderNumber} ⚠️`,
          message: `Order #${order.orderNumber} has been cancelled by the store administrator.${reasonSuffix}`,
        };
      } else {
        notificationData = {
          title: `Order Cancelled: #${order.orderNumber} ❌`,
          message: `Your order #${order.orderNumber} has been cancelled successfully.${reasonSuffix}`,
        };
      }
    } else if (status && STATUS_NOTIFICATIONS[status]) {
      notificationData = {
        title: STATUS_NOTIFICATIONS[status].title,
        message: STATUS_NOTIFICATIONS[status].msg,
      };
    }

    // Requirement 1, 13 & 14: Atomic transaction for order update, stock restoration, and notification
    const { updatedOrder } = await prisma.$transaction(async (tx) => {
      // 1. If cancelling, restore inventory using resolved database order ID
      if (status === 'CANCELLED') {
        await restoreStockForOrder(tx, resolvedDbOrderId);
      }

      // 2. Update order using resolved database order ID
      const updated = await tx.order.update({
        where: { id: resolvedDbOrderId },
        data: updateData,
        include: { items: true },
      });

      // 3. Create notification inside transaction using resolved database order ID
      if (notificationData) {
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: notificationData.title,
            message: notificationData.message,
            type: 'ORDER_STATUS',
            orderId: resolvedDbOrderId,
          },
        });
      }

      return { updatedOrder: updated };
    });

    const responseMsg = status === 'CANCELLED'
      ? (isAdmin ? 'Order cancelled by administrator and inventory restored.' : 'Order cancelled successfully and inventory restored.')
      : `Order updated successfully to status ${updatedOrder.status} (Payment: ${updatedOrder.paymentStatus}).`;

    return NextResponse.json({
      success: true,
      message: responseMsg,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update order.' }, { status: 500 });
  }
}
