import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    let setting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
    if (!setting) {
      setting = await prisma.storeSetting.create({
        data: { id: 'default' },
      });
    }
    return NextResponse.json({ success: true, settings: setting });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const data = await req.json();

    const updated = await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        storeName: data.storeName,
        tagline: data.tagline,
        location: data.location,
        phone: data.phone,
        email: data.email,
        minOrderValue: parseFloat(data.minOrderValue),
        deliveryFee: parseFloat(data.deliveryFee),
        freeDeliveryThreshold: parseFloat(data.freeDeliveryThreshold),
        isStoreOpen: Boolean(data.isStoreOpen),
        isCodEnabled: Boolean(data.isCodEnabled),
        isRazorpayEnabled: Boolean(data.isRazorpayEnabled),
        deliverySlotsJson: typeof data.deliverySlots === 'string' ? data.deliverySlots : JSON.stringify(data.deliverySlots),
      },
      create: {
        id: 'default',
        storeName: data.storeName || 'Namma Dairy',
        tagline: data.tagline || 'Pure Milk • Healthy Life',
        location: data.location || 'Bengaluru, Karnataka',
        phone: data.phone || '+91 98765 43210',
        minOrderValue: parseFloat(data.minOrderValue || 99),
        deliveryFee: parseFloat(data.deliveryFee || 35),
        freeDeliveryThreshold: parseFloat(data.freeDeliveryThreshold || 499),
        isStoreOpen: Boolean(data.isStoreOpen),
        isCodEnabled: Boolean(data.isCodEnabled),
        isRazorpayEnabled: Boolean(data.isRazorpayEnabled),
        deliverySlotsJson: JSON.stringify(data.deliverySlots || []),
      },
    });

    return NextResponse.json({ success: true, message: 'Store settings saved successfully!', settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
