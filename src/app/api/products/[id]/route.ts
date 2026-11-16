import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

async function updateProductHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const data = await req.json();

    if (data.basePrice !== undefined) {
      const bp = parseFloat(data.basePrice);
      if (!Number.isFinite(bp) || bp <= 0) {
        return NextResponse.json({ success: false, message: 'Base price must be a positive number greater than 0.' }, { status: 400 });
      }
    }

    if (data.stockQuantity !== undefined) {
      const sq = parseFloat(data.stockQuantity);
      if (!Number.isFinite(sq) || sq < 0) {
        return NextResponse.json({ success: false, message: 'Stock quantity must be a non-negative number.' }, { status: 400 });
      }
    }

    let optionsJson = data.optionsJson;
    if (data.options && Array.isArray(data.options)) {
      optionsJson = JSON.stringify(data.options);
    }

    let cuttingOptionsJson = data.cuttingOptionsJson;
    if (data.cuttingOptions && Array.isArray(data.cuttingOptions)) {
      cuttingOptionsJson = JSON.stringify(data.cuttingOptions);
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() : undefined,
        categoryId: data.categoryId || undefined,
        image: data.image !== undefined ? data.image.trim() : undefined,
        badge: data.badge !== undefined ? (data.badge ? data.badge.trim() : null) : undefined,
        basePrice: data.basePrice !== undefined ? parseFloat(data.basePrice) : undefined,
        unit: data.unit || undefined,
        stockQuantity: data.stockQuantity !== undefined ? parseFloat(data.stockQuantity) : undefined,
        isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : undefined,
        isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : undefined,
        optionsJson: optionsJson !== undefined ? optionsJson : undefined,
        cuttingOptionsJson: cuttingOptionsJson !== undefined ? cuttingOptionsJson : undefined,
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const PUT = updateProductHandler;
export const PATCH = updateProductHandler;

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }
    await prisma.product.delete({ where: { id: product.id } });
    return NextResponse.json({ success: true, message: 'Product removed from store successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
