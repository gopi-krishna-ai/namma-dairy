import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { identifier, newPassword } = await req.json();

    if (!identifier || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Please provide your registered email or phone, and a new password.' },
        { status: 400 }
      );
    }

    if (newPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const rawId = String(identifier).trim();
    const cleanEmail = rawId.toLowerCase();
    const cleanDigits = rawId.replace(/\D/g, '');

    // 1. Find by email
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // 2. Find by phone
    if (!user && cleanDigits.length >= 10) {
      const allUsers = await prisma.user.findMany({ where: { phone: { not: null } } });
      user =
        allUsers.find((u) => {
          if (!u.phone) return false;
          const uDigits = u.phone.replace(/\D/g, '');
          return (
            uDigits === cleanDigits ||
            uDigits.endsWith(cleanDigits.slice(-10)) ||
            cleanDigits.endsWith(uDigits.slice(-10))
          );
        }) || null;
    }

    // 3. Find by name or prefix
    if (!user) {
      const allUsers = await prisma.user.findMany();
      user =
        allUsers.find((u) => {
          return (
            u.name.toLowerCase() === cleanEmail ||
            u.email.toLowerCase().split('@')[0] === cleanEmail
          );
        }) || null;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No registered account found matching that email or phone number.' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully! You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error while resetting password.' },
      { status: 500 }
    );
  }
}
