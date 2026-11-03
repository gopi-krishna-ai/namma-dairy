import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: auth.user.id, isRead: false },
    });

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { notificationId, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: auth.user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: auth.user.id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true, message: 'Notification updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
