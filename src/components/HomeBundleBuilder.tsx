'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Check, ShoppingBag, Sparkles, CheckCircle2 } from 'lucide-react';

interface BundleProduct {
  id: string;
  name: string;
  category: string;
  weight: string;
  cut?: string;
  price: number;
  originalPrice: number;
  image: string;
}

const DEFAULT_BUNDLE: BundleProduct[] = [
  {
    id: 'prod-milk-1',
    name: 'Pure Whole Cow Milk',
    category: 'Fresh Milk',
    weight: '1 Litre',
    price: 68,
    originalPrice: 75,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'prod-paneer-1',
    name: 'Farm Fresh Malai Paneer',
    category: 'Dairy',
    weight: '200g',
    price: 110,
    originalPrice: 125,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'prod-chicken-2',
    name: 'Chicken Curry Cut (Skinless)',
    category: 'Fresh Chicken',
    weight: '500g',
    cut: 'Curry Cut (Skinless)',
    price: 135,
    originalPrice: 150,
    image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'prod-veg-1',
    name: 'Dawn-Harvested Farm Tomatoes',
    category: 'Fresh Vegetables',
    weight: '1 kg',
    price: 42,
    originalPrice: 50,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
  },
];

export default function HomeBundleBuilder() {
  const router = useRouter();
  const { user } = useAuth();
  const { addItem, setIsCartOpen } = useCart();
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_BUNDLE.map((b) => b.id));
  const [isAdded, setIsAdded] = useState(false);

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) return; // Keep at least one
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedItems = DEFAULT_BUNDLE.filter((item) => selectedIds.includes(item.id));
  const bundleTotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const originalTotal = selectedItems.reduce((sum, item) => sum + item.originalPrice, 0);
  const bundleSavings = originalTotal - bundleTotal;

  const handleAddBundleToCart = () => {
    if (!user) {
      router.push('/login?redirect=/');
      return;
    }
    selectedItems.forEach((item) => {
      addItem(
        {
          id: item.id,
          name: item.name,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: '',
          categoryId: item.category,
          image: item.image,
          basePrice: item.price,
          unit: item.weight,
          stockQuantity: 100,
          isAvailable: true,
          isFeatured: true,
        },
        item.weight,
        item.cut || null,
        1
      );
    });

    setIsAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl p-6 sm:p-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Popular Bengaluru Breakfast &amp; Lunch Box
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950">
            Build Your Daily Farm Fresh Bundle
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Toggle morning essentials to customize your morning delivery with an instant combo discount.
          </p>
        </div>

        <div className="text-left md:text-right shrink-0 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
          <span className="text-[11px] text-gray-500 block uppercase font-bold">Bundle Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              ₹{bundleTotal.toFixed(2)}
            </span>
            <span className="text-xs text-gray-400 line-through font-mono">
              ₹{originalTotal.toFixed(2)}
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
            You Save ₹{bundleSavings.toFixed(2)} (Instant Discount)
          </span>
        </div>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
        {DEFAULT_BUNDLE.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative select-none ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-600/30'
                  : 'border-gray-200 bg-white opacity-60 hover:opacity-100 hover:border-gray-300'
              }`}
            >
              <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-3 bg-gray-100">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-white/80 text-gray-400 border'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                {item.category}
              </span>
              <h4 className="font-bold text-sm text-gray-900 mt-1 line-clamp-1">{item.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Size: <strong className="text-gray-700">{item.weight}</strong>
                {item.cut && ` • ${item.cut}`}
              </p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="font-black text-sm text-emerald-950">₹{item.price}</span>
                  <span className="text-[11px] text-gray-400 line-through">₹{item.originalPrice}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800">
                  {isSelected ? 'Included ✓' : '+ Add'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Includes free temperature-controlled thermal packing for Bangalore early morning delivery.
        </p>

        <button
          type="button"
          onClick={handleAddBundleToCart}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          {isAdded ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Bundle Added to Basket!
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              Add {selectedItems.length} Items to Basket (₹{bundleTotal.toFixed(2)})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
