import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Droplets,
  Leaf,
  Heart,
  Award,
  Clock,
  Sparkles,
  Phone,
  CheckCircle2,
  MapPin,
  Flame,
  Star,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import HomeBundleBuilder from '@/components/HomeBundleBuilder';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch categories and products
  const categories = await prisma.category.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  const featuredProducts = await prisma.product.findMany({
    where: { isAvailable: true, isFeatured: true },
    include: { category: true },
    take: 8,
  });

  const allProducts = await prisma.product.findMany({
    where: { isAvailable: true },
    include: { category: true },
    take: 12,
  });

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-hidden">
      {/* 1. HERO SECTION WITH RICH FARM PASTURE BACKGROUND */}
      <section className="relative pt-6 sm:pt-12 pb-16 sm:pb-24 overflow-hidden">
        {/* Pastoral Farm Background Image with Aesthetic Cow in Sunlit Pasture */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1920&q=80"
            alt="Namma Dairy Fresh Cow in Green Pasture"
            fill
            priority
            className="object-cover object-[75%_center] lg:object-[80%_center] filter saturate-[1.1]"
            unoptimized
          />
          {/* Subtle artistic watermark of Namma Dairy emblem in background */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-80 h-80 opacity-15 pointer-events-none rounded-full overflow-hidden blur-[0.5px] hidden xl:block">
            <Image
              src="/namma-dairy-brand.jpg"
              alt="Namma Dairy Emblem"
              fill
              className="object-cover object-left mix-blend-overlay"
            />
          </div>
          {/* Aesthetic Gradients: deep emerald on left for text contrast, transparent on right to showcase the cow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b] via-[#064e3b]/85 sm:via-[#064e3b]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fbf8f1] via-transparent to-transparent opacity-95" />
        </div>

        {/* Decorative botanical flourishes */}
        <div className="absolute top-4 left-4 z-10 opacity-30 pointer-events-none hidden lg:block">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <path d="M0,0 Q50,0 80,40 Q40,80 0,0" fill="#4ade80" />
            <path d="M10,0 Q60,10 90,60 Q50,90 10,0" fill="#22c55e" />
          </svg>
        </div>
        <div className="absolute top-4 right-4 z-10 opacity-30 pointer-events-none hidden lg:block transform scale-x-[-1]">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <path d="M0,0 Q50,0 80,40 Q40,80 0,0" fill="#4ade80" />
            <path d="M10,0 Q60,10 90,60 Q50,90 10,0" fill="#22c55e" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Badge Pill */}
              <div className="inline-flex items-center gap-2 bg-emerald-900/80 border border-emerald-400/40 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide backdrop-blur-md shadow-lg">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Bengaluru&apos;s #1 Farm-Direct Fresh Food Delivery</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12] drop-shadow-md">
                Pure Milk, Fresh Meat &amp; Farm Veggies. <br />
                <span className="text-emerald-300 underline decoration-emerald-500/50 decoration-wavy decoration-2">
                  Direct from Nature.
                </span>
              </h1>

              {/* Tagline & Subtitle */}
              <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl leading-relaxed drop-shadow-sm font-normal">
                <strong className="text-white font-bold">Namma Dairy</strong> brings purity from Karnataka farms directly to your dining table. 100% pure raw unadulterated cow milk, antibiotic-free chicken cuts, tender pasture-fed goat mutton, and dawn-harvested fresh vegetables.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  href="/products?category=fresh-milk-dairy"
                  className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black px-7 py-4 rounded-2xl shadow-xl shadow-emerald-950/40 transition transform active:scale-95 flex items-center gap-2.5 text-sm"
                >
                  <span>Order Morning Milk 🥛</span>
                  <ArrowRight className="w-4 h-4 text-emerald-950" />
                </Link>

                <Link
                  href="/products?category=fresh-chicken"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-7 py-4 rounded-2xl shadow-xl shadow-rose-950/40 transition transform active:scale-95 flex items-center gap-2.5 text-sm"
                >
                  <span>Fresh Meat &amp; Cuts 🍗</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/products"
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md font-bold px-6 py-4 rounded-2xl transition text-sm shadow-md"
                >
                  Explore All Products
                </Link>
              </div>

              {/* Quick Perks Strip */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-emerald-500/30 max-w-xl mx-auto lg:mx-0 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Early 6 AM Slot</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>0% Preservatives</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Free Over ₹499</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                  <Star className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>100% Pure Tested</span>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Aesthetic Farm Fresh Cards (translucent so cow in background is highlighted) */}
            <div className="lg:col-span-5 relative flex flex-col justify-end items-center lg:items-end gap-4 pt-6 lg:pt-0">
              {/* Floating Aesthetic Glass Card 1: Dawn Harvest */}
              <div className="bg-emerald-950/40 backdrop-blur-md border border-emerald-400/30 text-white rounded-2xl p-4 shadow-xl max-w-sm w-full transition transform hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shrink-0">
                    🥛
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-300 block">
                      Dawn Milking Purity
                    </span>
                    <p className="text-xs font-bold text-white">
                      Raw Cow Milk Milked at 4:30 AM
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-200">
                  <span>Chilled below 4°C</span>
                  <span className="font-bold text-emerald-300">Unadulterated &bull; Pure</span>
                </div>
              </div>

              {/* Floating Aesthetic Glass Card 2: Four Purity Pillars */}
              <div className="bg-emerald-950/40 backdrop-blur-md border border-emerald-400/30 text-white rounded-2xl p-4 shadow-xl max-w-sm w-full transition transform hover:-translate-y-1">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-100">
                    <Droplets className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>Pure &amp; Natural</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-100">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>No Preservatives</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-100">
                    <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Farm Fresh</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-100">
                    <Heart className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                    <span>Good for Health</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-emerald-200 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" /> Bengaluru Express
                  </span>
                  <span className="text-emerald-300 font-bold">Same-Day Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FOUR MAIN PRODUCT CATEGORIES WITH RICH PHOTOGRAPHY BACKDROPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-emerald-700 font-extrabold text-xs uppercase tracking-widest block mb-1">
            Pure Farm Sourced
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-gray-900">
            Explore Our Four Signature Categories
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-2">
            Each category is harvested, chilled, and prepared under strict hygiene standards for doorstep Bengaluru delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
            // Assign rich photographic backgrounds
            const catImages: Record<string, string> = {
              'fresh-milk-dairy': 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=800&q=80',
              'fresh-chicken': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80',
              'fresh-meat': 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80',
              'fresh-vegetables': 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=800&q=80',
            };

            const bgImg = catImages[cat.slug] || cat.image || 'https://images.unsplash.com/photo-1550583724-b2692b85b150';

            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group relative h-96 rounded-3xl overflow-hidden shadow-lg border border-emerald-100/50 hover:shadow-2xl transition-all duration-500 flex flex-col justify-end p-6"
              >
                {/* Background image */}
                <Image
                  src={bgImg}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  unoptimized
                />

                {/* Dark gradient overlay for typography readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-black/20 group-hover:from-emerald-950/95 transition-colors" />

                {/* Top Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-emerald-600/90 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
                    {cat.slug === 'fresh-milk-dairy' && 'Daily Farm Milking'}
                    {cat.slug === 'fresh-chicken' && 'Antibiotic Free'}
                    {cat.slug === 'fresh-meat' && 'Pasture-Fed Cuts'}
                    {cat.slug === 'fresh-vegetables' && 'Dawn Harvested'}
                  </span>
                </div>

                {/* Count badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                    {cat._count?.products || 0} Products
                  </span>
                </div>

                {/* Content at bottom */}
                <div className="relative z-10 space-y-2">
                  <h3 className="font-display font-black text-white text-xl group-hover:text-emerald-300 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-emerald-100/80 text-xs leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                    <span>Explore Products</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center transition-transform group-hover:translate-x-1 shadow">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. INTERACTIVE BUNDLE BUILDER SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HomeBundleBuilder />
      </section>

      {/* 4. FEATURED BEST SELLERS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-emerald-700 font-extrabold text-xs uppercase tracking-widest">
                Daily Essentials
              </span>
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-gray-900 mt-1">
              Bengaluru&apos;s Most Loved Farm Fresh Picks
            </h2>
          </div>

          <Link
            href="/products"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group shrink-0"
          >
            <span>View All {allProducts.length} Products</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      </section>

      {/* 5. FARM QUALITY INFOGRAPHIC WITH BACKGROUND PHOTOGRAPHY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-white shadow-2xl border border-emerald-900">
          {/* Background image of Karnataka countryside */}
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1498408040764-ab6eb772a145?auto=format&fit=crop&w=1600&q=80"
              alt="Pasture Landscape"
              fill
              className="object-cover object-center"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/90 to-emerald-900/90" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-4 mb-12">
            <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              From Rural Karnataka Pastures To Your Home
            </span>
            <h2 className="font-display font-black text-2xl sm:text-4xl text-white leading-tight">
              Why Namma Dairy is Pure, Natural &amp; Unadulterated
            </h2>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Every drop of milk and cut of meat follows a rigorous farm-to-table hygiene protocol under refrigerated cold-chains.
            </p>
          </div>

          {/* 4 Process Steps */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow">
                4:30 AM
              </div>
              <h4 className="font-bold text-white text-base">Village Milking</h4>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Healthy, pasture-grazed Gir &amp; Holstein cows milked fresh in Mandya and Kolar district farms.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow">
                6:00 AM
              </div>
              <h4 className="font-bold text-white text-base">Purity Testing</h4>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Lactometer testing, SNF and fat verification. 0% added water, zero synthetic chemicals or hormones.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow">
                7:00 AM
              </div>
              <h4 className="font-bold text-white text-base">Cold-Chain Prep</h4>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Sanitized glass bottling for dairy and food-grade chilling for fresh customized meat cuts at 4°C.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow">
                6-8 AM
              </div>
              <h4 className="font-bold text-white text-base">Doorstep Delivery</h4>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Prompt delivery in temperature-controlled bags across all Bengaluru pin codes before morning tea!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FRESH BUTCHERY CUT GUIDE FEATURETTE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-stone-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                🥩 Customized Clean Butchery
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">
                Fresh Cuts Prepared to Your Exact Recipe Needs
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
                Unlike frozen market meats, Namma Dairy butchers fresh pasture-fed goats and antibiotic-free chicken only upon order. Choose your customized cut on every product card:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="font-bold text-white block">Curry Cut (Skinless)</span>
                  <span className="text-[11px] text-gray-400">Tender medium gravy cuts</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="font-bold text-white block">Biryani Cut</span>
                  <span className="text-[11px] text-gray-400">Large succulent bone-in</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="font-bold text-white block">Boneless Cubes</span>
                  <span className="text-[11px] text-gray-400">100% meat, zero waste</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="font-bold text-white block">Fine Keema / Mince</span>
                  <span className="text-[11px] text-gray-400">Coarsely machine ground</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="font-bold text-white block">Soup Marrow Bones</span>
                  <span className="text-[11px] text-gray-400">Nutrient-rich collagen Paya</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="font-bold text-white block">Whole Chicken Cleaned</span>
                  <span className="text-[11px] text-gray-400">Roast ready with skin</span>
                </div>
              </div>

              <div className="pt-3">
                <Link
                  href="/products?category=fresh-chicken"
                  className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-rose-950/40"
                >
                  <span>Order Custom Cuts Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
                <Image
                  src="https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80"
                  alt="Fresh Meat Butchery"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BENGALURU SERVICE AREAS TICKER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Serving All Across Bengaluru
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-4">
            Same-Day &amp; Early Morning Slots Active In Your Neighborhood
          </h3>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Indiranagar',
              'Koramangala',
              'HSR Layout',
              'Whitefield',
              'Jayanagar',
              'Malleshwaram',
              'JP Nagar',
              'Hebbal',
              'Yelahanka',
              'Electronic City',
              'Sarjapur Road',
              'Rajajinagar',
              'Marathahalli',
              'BTM Layout',
              'Banashankari',
              'Bellandur',
              'Frazer Town',
              'Sadashivanagar',
            ].map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-100"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 8. BENGALURU CUSTOMER TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-emerald-700 font-extrabold text-xs uppercase tracking-widest block mb-1">
            Local Bengaluru Love
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-gray-900">
            Trusted by 10,000+ Families Daily
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
            <p className="text-xs text-gray-600 leading-relaxed italic">
              &quot;The A2 Desi Cow Milk has the thick golden cream layer we used to get in our native village. My kids love the natural sweetness, and it arrives cold at 6:30 AM without fail!&quot;
            </p>
            <div className="pt-2 border-t border-gray-100">
              <p className="font-bold text-gray-900 text-xs">Priya Venkatesh</p>
              <p className="text-[11px] text-gray-400">Indiranagar, Bengaluru</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
            <p className="text-xs text-gray-600 leading-relaxed italic">
              &quot;The Mutton Biryani cut was tender, freshly butchered and clean. No foul smell, perfect marrow pieces. Made the best Sunday biryani for our family gathering.&quot;
            </p>
            <div className="pt-2 border-t border-gray-100">
              <p className="font-bold text-gray-900 text-xs">Karthik Reddy</p>
              <p className="text-[11px] text-gray-400">HSR Layout, Bengaluru</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
            <p className="text-xs text-gray-600 leading-relaxed italic">
              &quot;The fresh spinach and Ooty carrots are so crisp compared to regular store apps. You can tell they were harvested this morning. Total value for money!&quot;
            </p>
            <div className="pt-2 border-t border-gray-100">
              <p className="font-bold text-gray-900 text-xs">Deepa Hegde</p>
              <p className="text-[11px] text-gray-400">Whitefield, Bengaluru</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
