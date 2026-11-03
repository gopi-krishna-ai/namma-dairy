import React from 'react';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, SlidersHorizontal, Search, ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: {
    category?: string;
    search?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const currentCategorySlug = searchParams.category || 'all';
  const searchQuery = searchParams.search || '';

  const categories = await prisma.category.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  const where: any = { isAvailable: true };

  if (currentCategorySlug && currentCategorySlug !== 'all') {
    where.category = { slug: currentCategorySlug };
  }

  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery } },
      { description: { contains: searchQuery } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const currentCategory = categories.find((c) => c.slug === currentCategorySlug);

  // Background image per category
  const bannerImages: Record<string, string> = {
    'fresh-milk-dairy': 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=1600&q=80',
    'fresh-chicken': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1600&q=80',
    'fresh-meat': 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1600&q=80',
    'fresh-vegetables': 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=1600&q=80',
    all: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1600&q=80',
  };

  const currentBannerImg = bannerImages[currentCategorySlug] || bannerImages.all;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Category Banner with Relevant Background Image */}
      <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-white shadow-xl border border-emerald-900/40">
        <div className="absolute inset-0 z-0">
          <Image
            src={currentBannerImg}
            alt={currentCategory?.name || 'Farm Products'}
            fill
            className="object-cover object-center"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/80 to-emerald-900/70" />
        </div>

        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Farm Direct Catalog • Bengaluru</span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-4xl text-white">
            {currentCategory ? currentCategory.name : 'All Farm Fresh Products'}
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
            {currentCategory
              ? currentCategory.description
              : 'Pure raw whole cow milk, antibiotic-free chicken cuts, tender pasture-fed goat mutton, and dawn-harvested fresh vegetables delivered straight to your Bengaluru home daily.'}
          </p>

          <div className="pt-1 flex items-center gap-4 text-xs font-semibold text-emerald-200">
            <span>Showing {products.length} fresh products</span>
            <span>•</span>
            <span>Same-Day &amp; Morning 6 AM Slots Available</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <Link
            href="/products"
            className={`px-4 py-2 rounded-xl transition-all ${
              currentCategorySlug === 'all'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'
            }`}
          >
            All Products
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`px-4 py-2 rounded-xl transition-all ${
                currentCategorySlug === c.slug
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'
              }`}
            >
              {c.name} ({c._count?.products || 0})
            </Link>
          ))}
        </div>

        {/* Live Search Display */}
        {searchQuery && (
          <div className="text-xs text-gray-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            Results for: <strong className="text-emerald-950 font-bold">&quot;{searchQuery}&quot;</strong>{' '}
            <Link href="/products" className="text-emerald-700 underline ml-2">
              Clear
            </Link>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-emerald-100 shadow-sm max-w-md mx-auto space-y-4">
          <ShoppingBag className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">No Products Found</h3>
          <p className="text-xs text-gray-500">
            We couldn&apos;t find any items matching your filter. Try exploring our other farm categories.
          </p>
          <Link
            href="/products"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
          >
            View All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}
    </div>
  );
}
