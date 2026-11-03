'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import {
  ShieldCheck,
  CheckCircle2,
  Truck,
  Clock,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Heart,
  Droplets,
  Leaf,
  Plus,
  Minus,
  PhoneCall,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState<string>('1 kg');
  const [selectedCut, setSelectedCut] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddedToast, setIsAddedToast] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/products`);
      const data = await res.json();
      if (data.success && data.products) {
        const found = data.products.find((p: Product) => p.slug === slug || p.id === slug);
        if (found) {
          setProduct(found);
          let options: string[] = [];
          try {
            options = JSON.parse(found.optionsJson || '[]');
          } catch {}
          if (options.length > 0) setSelectedWeight(options[0]);

          let cuts: string[] = [];
          try {
            cuts = JSON.parse(found.cuttingOptionsJson || '[]');
          } catch {}
          if (cuts.length > 0) setSelectedCut(cuts[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-emerald-100">
          <p className="font-bold text-gray-900 mb-2">Product Not Found</p>
          <p className="text-xs text-gray-600 mb-6">The product you are looking for may have been updated or moved.</p>
          <Link
            href="/products"
            className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs"
          >
            Back to Products Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Parse options
  let weightOptions: string[] = ['1 kg'];
  let cuttingOptions: string[] = [];
  try {
    if (product.optionsJson) weightOptions = JSON.parse(product.optionsJson);
    if (product.cuttingOptionsJson) cuttingOptions = JSON.parse(product.cuttingOptionsJson);
  } catch (e) {}

  // Multiplier calculation
  let multiplier = 1.0;
  const w = selectedWeight.toLowerCase();
  if (w.includes('250g') || w.includes('200g')) multiplier = 0.25;
  else if (w.includes('500g') || w.includes('500ml')) multiplier = 0.5;
  else if (w.includes('2 kg') || w.includes('2 litres')) multiplier = 2.0;
  else if (w.includes('5 kg')) multiplier = 5.0;

  const currentUnitPrice = Math.round(product.basePrice * multiplier * 100) / 100;
  const currentTotalPrice = Math.round(currentUnitPrice * quantity * 100) / 100;

  const handleAddToCart = () => {
    addToCart(product, selectedWeight, selectedCut, quantity);
    setIsAddedToast(true);
    setTimeout(() => setIsAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart(product, selectedWeight, selectedCut, quantity);
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#fbf8f1] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/products" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> All Farm Products
          </Link>
          <span>/</span>
          <span className="text-gray-700">{product.category?.name || 'Fresh Grocery'}</span>
          <span>/</span>
          <span className="text-emerald-950 font-bold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Product Grid */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Image */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-3xl overflow-hidden bg-emerald-50/50 aspect-square relative border border-emerald-100 shadow-inner">
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority
                className="object-cover"
              />
              {product.badge && (
                <div className="absolute top-4 left-4 bg-emerald-700 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-md">
                  {product.badge}
                </div>
              )}
            </div>

            {/* 4 Brand Pillars Mini Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
                <Droplets className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">Pure &amp; Natural</h4>
                  <p className="text-[10px] text-gray-500">Zero adulteration guaranteed</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
                <Leaf className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">No Preservatives</h4>
                  <p className="text-[10px] text-gray-500">100% natural shelf life</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">Direct From Farms</h4>
                  <p className="text-[10px] text-gray-500">Karnataka rural partners</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
                <Heart className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">Good for Health</h4>
                  <p className="text-[10px] text-gray-500">Nutrient-dense freshness</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Buying Controls */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                {product.category?.name || 'Farm Direct Fresh'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-emerald-950">{product.name}</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">{product.description}</p>
            </div>

            {/* Pricing Section */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-gray-500 block">Unit Price for {selectedWeight}</span>
                <span className="text-3xl font-black text-emerald-950 font-mono">
                  ₹{currentUnitPrice.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 ml-1.5 font-medium">
                  (Base: ₹{product.basePrice.toFixed(0)}/{product.unit})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                  {product.stockQuantity > 0 ? 'Fresh Stock Available' : 'Out of Stock'}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">Delivery in Bengaluru</span>
              </div>
            </div>

            {/* Fractional Weight Selector */}
            {weightOptions.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Select Pack / Weight Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {weightOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedWeight(opt)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedWeight === opt
                          ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/25 ring-2 ring-emerald-600'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meat & Chicken Cutting Options */}
            {cuttingOptions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Butchery Cut &amp; Prep
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">Customized at Hub</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {cuttingOptions.map((cut) => (
                    <button
                      key={cut}
                      type="button"
                      onClick={() => setSelectedCut(cut)}
                      className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                        selectedCut === cut
                          ? 'bg-amber-50 text-amber-950 border-amber-500 ring-1 ring-amber-500 font-bold'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {cut}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector and Total */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs font-bold text-gray-700 block mb-1">Quantity</span>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-sm text-gray-900 font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-500 block">Total for {quantity} pack(s)</span>
                <span className="text-2xl font-black text-emerald-950 font-mono">
                  ₹{currentTotalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 px-4 rounded-xl border-2 border-emerald-700 text-emerald-800 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  Add to Basket
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-colors shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Buy Now
                </button>
              </div>

              {isAddedToast && (
                <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Added {quantity} × {product.name} ({selectedWeight}) to basket!
                </div>
              )}
            </div>

            {/* Delivery Guarantee Info */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <Clock className="w-4 h-4 text-emerald-700" />
                Bengaluru Same-Day Delivery available for orders placed before 5 PM
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                100% replacement guarantee if seal is broken or quality does not meet standards
              </div>
            </div>
          </div>
        </div>

        {/* Customer Support Strip */}
        <div className="bg-emerald-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm">Have specific custom cutting questions?</h4>
            <p className="text-xs text-emerald-200">
              Speak directly with our Master Butcher or Dairy Supervisor in Bengaluru.
            </p>
          </div>
          <a
            href="tel:+919876543210"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs shrink-0 hover:bg-emerald-50 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            Call +91 98765 43210
          </a>
        </div>
      </div>
    </div>
  );
}
