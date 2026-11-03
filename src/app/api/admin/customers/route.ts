import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        addresses: {
          select: {
            id: true,
            tag: true,
            houseNumber: true,
            street: true,
            area: true,
            city: true,
            pincode: true,
            isDefault: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || 'N/A',
      createdAt: c.createdAt,
      orderCount: c.orders.length,
      totalSpend: c.orders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalAmount, 0),
      lastOrder: c.orders[0]?.orderNumber || null,
      primaryArea: c.addresses[0]?.area || 'Bengaluru',
    }));

    return NextResponse.json({ success: true, customers: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
