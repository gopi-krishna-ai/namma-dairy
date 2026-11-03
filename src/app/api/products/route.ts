import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const availableOnly = searchParams.get('availableOnly');

    const where: any = {};

    if (categorySlug && categorySlug !== 'all') {
      where.category = { slug: categorySlug };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (availableOnly === 'true') {
      where.isAvailable = true;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ success: false, products: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    const data = await req.json();
    const {
      name,
      description,
      categoryId,
      image,
      badge,
      basePrice,
      unit,
      stockQuantity,
      isAvailable,
      isFeatured,
      options,
      cuttingOptions,
      optionsJson,
      cuttingOptionsJson,
    } = data;

    if (!name || !description || !categoryId || !image || basePrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'Please fill in all mandatory product fields.' },
        { status: 400 }
      );
    }

    // Auto generate unique slug
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let count = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    // Determine optionsJson
    let finalOptionsJson = optionsJson || null;
    if (options && Array.isArray(options) && options.length > 0) {
      finalOptionsJson = JSON.stringify(options);
    }

    // Determine cuttingOptionsJson
    let finalCuttingOptionsJson = cuttingOptionsJson || null;
    if (cuttingOptions && Array.isArray(cuttingOptions) && cuttingOptions.length > 0) {
      finalCuttingOptionsJson = JSON.stringify(cuttingOptions);
    }

    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        description: description.trim(),
        categoryId,
        image: image.trim(),
        badge: badge ? badge.trim() : null,
        basePrice: parseFloat(basePrice),
        unit: unit || 'kg',
        stockQuantity: parseFloat(stockQuantity || 50),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
        optionsJson: finalOptionsJson,
        cuttingOptionsJson: finalCuttingOptionsJson,
      },
      include: { category: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully!',
      product: newProduct,
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
