'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Zap, Check, Scissors, Weight, Sparkles } from 'lucide-react';
import { Product } from '@/lib/types';
import { useCart, calculateMultiplier } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  // Parse options
  let weightOptions: string[] = ['1 kg'];
  let cuttingOptions: string[] = [];

  try {
    if (product.optionsJson) weightOptions = JSON.parse(product.optionsJson);
    if (product.cuttingOptionsJson) cuttingOptions = JSON.parse(product.cuttingOptionsJson);
  } catch (e) {}

  const [selectedWeight, setSelectedWeight] = useState<string>(weightOptions[0] || '1 kg');
  const [selectedCut, setSelectedCut] = useState<string>(cuttingOptions[0] || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddedAnimation, setIsAddedAnimation] = useState(false);

  // Compute live price
  const multiplier = calculateMultiplier(selectedWeight);
  const unitCalculatedPrice = Math.round(product.basePrice * multiplier * 100) / 100;
  const totalItemPrice = Math.round(unitCalculatedPrice * quantity * 100) / 100;

  // Strikethrough comparative retail price (approx 12-15% higher)
  const retailPrice = Math.round(totalItemPrice * 1.15);

  const handleAddToCart = () => {
    if (!user) {
      router.push('/login?redirect=/products');
      return;
    }
    addItem(product, selectedWeight, selectedCut || undefined, quantity);
    setIsAddedAnimation(true);
    setTimeout(() => setIsAddedAnimation(false), 1400);
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }
    addItem(product, selectedWeight, selectedCut || undefined, quantity);
    router.push('/checkout');
  };

  const isMeatOrChicken =
    product.categoryId.includes('chicken') ||
    product.categoryId.includes('meat') ||
    cuttingOptions.length > 0;

  return (
    <div className="group bg-white rounded-3xl border border-emerald-100/80 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* 1. Image Container */}
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/3] w-full overflow-hidden bg-emerald-50/50 block">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-108 transition-transform duration-700"
          unoptimized
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 ${
                isMeatOrChicken ? 'bg-rose-600 text-white' : 'bg-emerald-700 text-white'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              {product.badge}
            </span>
          </div>
        )}

        {/* Stock Status Pill */}
        <div className="absolute top-3 right-3 z-10">
          {product.isAvailable && product.stockQuantity > 0 ? (
            product.stockQuantity < 10 ? (
              <span className="bg-amber-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
                Only {product.stockQuantity} left
              </span>
            ) : (
              <span className="bg-emerald-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Fresh Stock
              </span>
            )
          ) : (
            <span className="bg-gray-800/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
              Out of Stock
            </span>
          )}
        </div>
      </Link>

      {/* 2. Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category Tag */}
          <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block mb-1">
            {product.category?.name || 'Fresh Food'}
          </span>

          {/* Product Title */}
          <Link href={`/products/${product.slug}`} className="block">
            <h3 className="font-display font-bold text-gray-900 text-base leading-snug line-clamp-1 group-hover:text-emerald-800 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Description */}
          <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Fractional Quantity Selector */}
          <div className="mt-3.5 pt-3 border-t border-gray-100">
            <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1 mb-1.5">
              <Weight className="w-3 h-3 text-emerald-600" />
              <span>Select Pack Size:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {weightOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedWeight(opt)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border ${
                    selectedWeight === opt
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Meat / Chicken Cutting & Preparation Options */}
          {cuttingOptions.length > 0 && (
            <div className="mt-3">
              <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1 mb-1.5">
                <Scissors className="w-3 h-3 text-rose-600" />
                <span>Custom Butcher Cut:</span>
              </label>
              <select
                value={selectedCut}
                onChange={(e) => setSelectedCut(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {cuttingOptions.map((cut) => (
                  <option key={cut} value={cut}>
                    {cut}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3. Pricing & Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-xl font-black text-emerald-950 font-display">
                  ₹{totalItemPrice.toFixed(0)}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  ₹{retailPrice.toFixed(0)}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold ml-0.5">
                  Save ₹{retailPrice - totalItemPrice}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block">
                {selectedWeight} • Base: ₹{product.basePrice.toFixed(0)}/{product.unit}
              </span>
            </div>

            {/* Qty Stepper */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold"
              >
                -
              </button>
              <span className="w-7 text-center text-xs font-bold text-gray-800 font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.isAvailable || product.stockQuantity <= 0}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                isAddedAnimation
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAddedAnimation ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!product.isAvailable || product.stockQuantity <= 0}
              className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
