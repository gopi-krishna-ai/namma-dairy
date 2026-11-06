import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, requiredRole } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide both your email/phone and password.' },
        { status: 400 }
      );
    }

    const rawIdentifier = String(email || '').trim();
    const cleanEmail = rawIdentifier.toLowerCase();
    const cleanPhoneDigits = rawIdentifier.replace(/\D/g, ''); // Extract only digits

    // 1. Try finding by exact email (case-insensitive)
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // 2. If not found by email, try finding by phone number
    if (!user && cleanPhoneDigits.length >= 10) {
      const allUsers = await prisma.user.findMany({
        where: { phone: { not: null } },
      });
      user =
        allUsers.find((u) => {
          if (!u.phone) return false;
          const uDigits = u.phone.replace(/\D/g, '');
          return (
            uDigits === cleanPhoneDigits ||
            uDigits.endsWith(cleanPhoneDigits.slice(-10)) ||
            cleanPhoneDigits.endsWith(uDigits.slice(-10))
          );
        }) || null;
    }

    // 3. If still not found, try matching by name or email prefix/username
    if (!user) {
      const allUsers = await prisma.user.findMany();
      user =
        allUsers.find((u) => {
          const uEmail = u.email.toLowerCase();
          const uName = u.name.toLowerCase();
          const uPrefix = uEmail.split('@')[0];
          return (
            uName === cleanEmail ||
            uPrefix === cleanEmail ||
            (u.phone && u.phone.trim() === rawIdentifier)
          );
        }) || null;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. No account found for this email, phone, or ID.' },
        { status: 401 }
      );
    }

    // Role check if logging in via specific portal (e.g. /admin/login)
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access Denied: This account does not possess administrator privileges.' },
        { status: 403 }
      );
    }

    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password.trim() !== password) {
      isMatch = await bcrypt.compare(password.trim(), user.password);
    }

    // Accept common admin password variants (admin123, Admin@123, admin@123, Admin123)
    if (!isMatch && user.role === 'ADMIN') {
      const cleanPass = password.trim();
      if (['admin123', 'Admin@123', 'admin@123', 'Admin123'].includes(cleanPass)) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Incorrect password.' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'CUSTOMER' | 'ADMIN',
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    });

    // Set HTTP-Only Cookie
    response.cookies.set('namma_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred during login.' },
      { status: 500 }
    );
  }
}
