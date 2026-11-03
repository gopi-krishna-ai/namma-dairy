import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Full name, email address, and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email address already exists. Please login instead.' },
        { status: 409 }
      );
    }

    const cleanPassword = password.trim();
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        role: 'CUSTOMER',
      },
    });

    // Create a welcome notification
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        title: 'Welcome to Namma Dairy! 🥛',
        message: 'Your account is ready. Order 100% farm fresh milk, free-range chicken, tender mutton, and fresh vegetables delivered to your doorstep in Bengaluru!',
        type: 'PROMOTION',
      },
    });

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: 'CUSTOMER',
      name: newUser.name,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Welcome to Namma Dairy.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
      token,
    });

    response.cookies.set('namma_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed due to a server error.' },
      { status: 500 }
    );
  }
}
