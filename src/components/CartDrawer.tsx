'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { X, Trash2, ArrowRight, ShoppingBag, ShieldCheck, Tag, Plus, Minus, CheckCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function CartDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    freeDeliveryThreshold,
    discount,
    total,
    couponCode,
    couponApplied,
    applyCoupon,
    removeCoupon,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; error: boolean } | null>(null);

  if (!isCartOpen || pathname?.startsWith('/admin')) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        />
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="font-display font-bold text-gray-900 text-base">Your Cart</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="my-auto text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Sign In to View Your Cart</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-6">
                Please sign in to access your personal shopping basket, order fresh milk, and checkout.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  router.push('/login?redirect=/cart');
                }}
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition"
              >
                Sign In / Register
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const res = applyCoupon(inputCoupon);
    setCouponMsg({ text: res.message, error: !res.success });
    if (res.success) setInputCoupon('');
  };

  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryPercent = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-dairy-cream/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-gray-900 text-base">Your Fresh Cart</h2>
                <p className="text-[11px] text-gray-500">{items.length} unique items selected</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Meter */}
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 py-2.5 text-xs">
            {amountNeededForFreeDelivery > 0 ? (
              <div>
                <div className="flex items-center justify-between text-emerald-900 font-semibold mb-1">
                  <span>Add ₹{amountNeededForFreeDelivery.toFixed(0)} more for <strong>FREE Delivery</strong></span>
                  <span>{freeDeliveryPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${freeDeliveryPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-brand-800 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>You have unlocked FREE Cold-Chain Delivery!</span>
              </div>
            )}
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-dairy-cream text-brand-700 flex items-center justify-center text-3xl">
                  🥛
                </div>
                <h3 className="font-display font-bold text-gray-800 text-base">Your Cart is Empty</h3>
                <p className="text-xs text-gray-500 max-w-xs">
                  Fill your basket with pure farm milk, tender chicken cuts, fresh mutton, and farm-picked veggies!
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition shadow-sm"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-3.5 flex gap-3 first:pt-0 last:pb-0">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-1">{item.name}</h4>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-600 p-0.5 transition"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                      <span className="bg-dairy-cream text-brand-900 px-2 py-0.5 rounded font-semibold border border-brand-100">
                        {item.selectedWeight}
                      </span>
                      {item.selectedCut && (
                        <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded font-medium border border-rose-100">
                          {item.selectedCut}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold text-brand-950 font-display">
                        ₹{item.totalPrice.toFixed(0)}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-gray-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-dairy-cream/30 space-y-3">
              {/* Coupon Form */}
              <div>
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="font-bold text-emerald-900">Code &quot;{couponCode}&quot; Applied!</span>
                      <span className="text-emerald-700 font-semibold">(-₹{discount.toFixed(0)})</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-red-600 hover:text-red-700 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Try NAMMA50 or PUREMILK"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs uppercase placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      type="submit"
                      className="bg-brand-800 hover:bg-brand-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponMsg && (
                  <p className={`text-[11px] mt-1 ${couponMsg.error ? 'text-red-600' : 'text-emerald-700'}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Bill Details */}
              <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon Discount</span>
                    <span className="font-semibold">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-gray-900">
                    {deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-brand-950 pt-2 border-t border-gray-200">
                  <span>Total Amount</span>
                  <span className="font-display text-base">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  router.push('/checkout');
                }}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white py-3 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
