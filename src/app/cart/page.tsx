'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag, Sparkles } from 'lucide-react';

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    discount,
    total,
    freeDeliveryThreshold,
    minOrderValue,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const freeDeliveryRemaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In to View Your Basket</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Please log in to your account to view your items, manage quantities, and complete your order.
          </p>
          <Link
            href="/login?redirect=/cart"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20"
          >
            Sign In / Register
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Basket is Empty</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Looks like you haven&apos;t added any fresh farm milk, tender meat cuts, or farm vegetables yet.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20"
          >
            Start Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f1] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-emerald-100">
          <div>
            <h1 className="text-3xl font-extrabold text-emerald-950">Your Shopping Basket</h1>
            <p className="text-sm text-gray-600 mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'} selected for fresh delivery in Bengaluru
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>

        {/* Free Delivery Meter */}
        <div className="bg-white rounded-2xl p-4 mb-8 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-medium text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {freeDeliveryRemaining > 0 ? (
                <>Add <strong className="text-emerald-700">₹{freeDeliveryRemaining.toFixed(2)}</strong> more for <strong>FREE DELIVERY</strong></>
              ) : (
                <span className="text-emerald-700 font-bold">🎉 Congratulations! You have unlocked FREE delivery!</span>
              )}
            </span>
            <span className="text-gray-500 font-mono text-xs">₹{subtotal.toFixed(0)} / ₹{freeDeliveryThreshold}</span>
          </div>
          <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100/70 shadow-sm flex flex-col sm:flex-row items-center gap-4 hover:border-emerald-200 transition-colors"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-emerald-50 shrink-0 relative">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 w-full text-center sm:text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{item.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1 justify-center sm:justify-start">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 rounded">
                          Pack: {item.selectedWeight}
                        </span>
                        {item.selectedCut && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-900 rounded">
                            Cut: {item.selectedCut}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors hidden sm:block"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-left">
                      <span className="text-xs text-gray-500 block">Unit price: ₹{item.unitPrice.toFixed(2)}</span>
                      <span className="text-lg font-bold text-emerald-950">₹{item.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center font-bold text-sm text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors sm:hidden"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Summary and Checkout */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* Coupon Box */}
            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                Apply Promo Code
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm">
                  <span className="font-mono font-bold text-emerald-800">
                    {appliedCoupon.code} (-₹{discount.toFixed(2)})
                  </span>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-red-600 font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. NAMMA50, PUREMILK"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-900 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-600 font-medium">{couponError}</p>}
                  <p className="text-[11px] text-gray-500">
                    Try <strong className="text-emerald-700">NAMMA50</strong> for ₹50 off orders over ₹299 or <strong className="text-emerald-700">PUREMILK</strong> for 10% off.
                  </p>
                </form>
              )}
            </div>

            {/* Order Total Box */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>

              <div className="space-y-2.5 text-sm text-gray-600 pb-4 border-b border-gray-100">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                    ) : (
                      `₹${deliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-base font-bold text-gray-900 block">Total Amount</span>
                  <span className="text-xs text-gray-500">Inclusive of all local GST taxes</span>
                </div>
                <span className="text-2xl font-black text-emerald-900">₹{total.toFixed(2)}</span>
              </div>

              {subtotal < minOrderValue && total < minOrderValue ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  Minimum order amount is <strong>₹{minOrderValue}</strong>. Add ₹{(minOrderValue - Math.max(subtotal, total)).toFixed(2)} more to proceed.
                </div>
              ) : (
                <Link
                  href="/checkout"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}

              <div className="pt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Cold-Chain Freshness Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
