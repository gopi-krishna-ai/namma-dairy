import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'namma-dairy-jwt-super-secret-key-bengaluru-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  name: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getUserFromRequest(req: NextRequest) {
  // Check cookie first
  let token = req.cookies.get('namma_token')?.value;

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  } catch (e) {
    return null;
  }
}

export async function requireAuth(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { error: 'Unauthorized. Please login to continue.', status: 401, user: null };
  }
  return { error: null, status: 200, user };
}

export async function requireAdmin(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return auth;
  }
  if (auth.user.role !== 'ADMIN') {
    return { error: 'Forbidden. Admin credentials required.', status: 403, user: null };
  }
  return auth;
}
