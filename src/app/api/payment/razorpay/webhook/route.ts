import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { success: false, message: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Requirement 11: Webhook verification using raw request body and webhook secret
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventId = event.event_id || event.id || `evt_${Date.now()}`;
    const eventType = event.event;

    // Requirement 12 & 13: Make webhook handling idempotent & prevent duplicate processing
    const existingLog = await prisma.paymentWebhookLog.findUnique({
      where: { eventId },
    });

    if (existingLog) {
      return NextResponse.json(
        { success: true, message: 'Event already processed (idempotent response)' },
        { status: 200 }
      );
    }

    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    // Atomic transaction: record webhook event and update order state
    await prisma.$transaction(async (tx) => {
      await tx.paymentWebhookLog.create({
        data: {
          eventId,
          eventType,
          orderId: orderId || null,
          paymentId: paymentId || null,
          payloadJson: rawBody.slice(0, 1000), // Audit snapshot
        },
      });

      // Requirement 14: Proper payment and order status transitions
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (orderId) {
          await tx.order.updateMany({
            where: { razorpayOrderId: orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'CONFIRMED',
              razorpayPaymentId: paymentId || undefined,
            },
          });
        }
      } else if (eventType === 'payment.failed') {
        if (orderId) {
          await tx.order.updateMany({
            where: { razorpayOrderId: orderId },
            data: {
              paymentStatus: 'FAILED',
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
