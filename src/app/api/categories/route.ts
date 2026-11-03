import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ success: false, categories: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, description, image, icon } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Category name is required' }, { status: 400 });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let count = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const maxOrder = await prisma.category.findFirst({
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const orderIndex = (maxOrder?.orderIndex ?? 0) + 1;

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description ? description.trim() : null,
        image: image ? image.trim() : null,
        icon: icon ? icon.trim() : null,
        orderIndex,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Category created successfully!',
      category: newCategory,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id, name, description, image, icon, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        image: image !== undefined ? image.trim() : undefined,
        icon: icon !== undefined ? icon.trim() : undefined,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : undefined,
      },
    });

    return NextResponse.json({ success: true, message: 'Category updated successfully!', category: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
