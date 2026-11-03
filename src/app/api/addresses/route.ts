import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: auth.user.id },
      orderBy: { isDefault: 'desc' },
    });
    return NextResponse.json({ success: true, addresses });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const data = await req.json();
    const { tag, recipientName, phone, houseNumber, street, area, city, pincode, isDefault } = data;

    if (!recipientName || !phone || !houseNumber || !street || !area || !pincode) {
      return NextResponse.json({ success: false, message: 'Please provide all delivery address fields.' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: auth.user.id },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: auth.user.id,
        tag: tag || 'Home',
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        houseNumber: houseNumber.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city?.trim() || 'Bengaluru',
        pincode: pincode.trim(),
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ success: true, address: newAddress, message: 'Address saved!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Address ID required' }, { status: 400 });

    await prisma.address.deleteMany({
      where: { id, userId: auth.user.id },
    });

    return NextResponse.json({ success: true, message: 'Address deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
