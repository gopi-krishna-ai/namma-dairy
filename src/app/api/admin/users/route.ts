import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/**
 * Requirement 7: Only an existing authorized administrator can create or promote another administrator.
 */
export async function POST(req: NextRequest) {
  // Enforce caller possesses valid, non-revoked administrator credentials
  const auth = await requireAdmin(req);
  if (auth.error || !auth.user) {
    return NextResponse.json(
      { success: false, message: auth.error || 'Access Denied: Administrator privileges required.' },
      { status: auth.status }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, userId, newRole, isActive } = body;

    if (!newRole && typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Either a valid target role (ADMIN or CUSTOMER) or isActive status is required.' },
        { status: 400 }
      );
    }

    if (newRole && !['ADMIN', 'CUSTOMER'].includes(newRole)) {
      return NextResponse.json(
        { success: false, message: 'Valid target role (ADMIN or CUSTOMER) is required.' },
        { status: 400 }
      );
    }

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, message: 'Please provide the target user email or userId.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          cleanEmail ? { email: cleanEmail } : { id: '__NONE__' },
          userId ? { id: String(userId) } : { id: '__NONE__' },
        ],
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Target user account not found.' },
        { status: 404 }
      );
    }

    // Update user role / isActive status and increment tokenVersion so permissions take effect immediately
    const updateData: any = {
      tokenVersion: { increment: 1 },
    };
    if (newRole) {
      updateData.role = newRole;
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    console.log(`[AUDIT] User ${targetUser.email} role updated to ${newRole} by admin ${auth.user.email} at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.name} (${updatedUser.email}) has been successfully updated to ${updatedUser.role}.`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Admin promotion error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user administrative status.' },
      { status: 500 }
    );
  }
}
