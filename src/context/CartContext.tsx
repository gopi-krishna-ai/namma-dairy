'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, CartItem } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, selectedWeight?: string, selectedCut?: string | null, qty?: number) => void;
  addToCart: (product: Product, selectedWeight?: string, selectedCut?: string | null, qty?: number) => void;
  removeItem: (itemId: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderValue: number;
  discount: number;
  total: number;
  couponCode: string;
  couponApplied: boolean;
  appliedCoupon: { code: string; discount: number } | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function calculateMultiplier(weightStr?: string | null): number {
  if (!weightStr) return 1.0;
  const w = weightStr.toLowerCase();
  if (w.includes('250g') || w.includes('200g')) return 0.25;
  if (w.includes('500g') || w.includes('500ml')) return 0.5;
  if (w.includes('2 kg') || w.includes('2 litres')) return 2.0;
  if (w.includes('5 kg')) return 5.0;
  return 1.0;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Scoped to authenticated user only: Clean up stale unauthenticated carts & load user's individual cart
  useEffect(() => {
    if (authLoading) return;

    try {
      // Remove any legacy unauthenticated global cart
      localStorage.removeItem('namma_dairy_cart');
      localStorage.removeItem('namma_dairy_coupon');
    } catch (e) {}

    if (!user) {
      // Not logged in: Cart must be completely empty
      setItems([]);
      setCouponCode('');
      setCouponApplied(false);
      setIsInitialized(true);
      return;
    }

    // Authenticated user: Load individual cart
    try {
      const userCartKey = `namma_dairy_cart_${user.id}`;
      const userCouponKey = `namma_dairy_coupon_${user.id}`;
      const saved = localStorage.getItem(userCartKey);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems([]);
      }
      const savedCoupon = localStorage.getItem(userCouponKey);
      if (savedCoupon) {
        const c = JSON.parse(savedCoupon);
        setCouponCode(c.code);
        setCouponApplied(c.applied);
      } else {
        setCouponCode('');
        setCouponApplied(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitialized(true);
    }
  }, [user, authLoading]);

  // Save to individual user storage
  useEffect(() => {
    if (!isInitialized || !user) return;
    try {
      const userCartKey = `namma_dairy_cart_${user.id}`;
      const userCouponKey = `namma_dairy_coupon_${user.id}`;
      localStorage.setItem(userCartKey, JSON.stringify(items));
      localStorage.setItem(userCouponKey, JSON.stringify({ code: couponCode, applied: couponApplied }));
    } catch (e) {
      console.error(e);
    }
  }, [items, couponCode, couponApplied, isInitialized, user]);

  const addItem = (product: Product, selectedWeight?: string, selectedCut?: string | null, qty = 1) => {
    if (!user) {
      router.push('/login?redirect=/products');
      return;
    }

    let chosenWeight = selectedWeight;
    if (!chosenWeight) {
      try {
        chosenWeight = product.optionsJson ? JSON.parse(product.optionsJson)[0] : '1 kg';
      } catch {
        chosenWeight = '1 kg';
      }
    }

    let chosenCut = selectedCut;
    if (chosenCut === undefined && product.cuttingOptionsJson) {
      try {
        chosenCut = JSON.parse(product.cuttingOptionsJson)[0] || null;
      } catch {
        chosenCut = null;
      }
    }

    const mult = calculateMultiplier(chosenWeight);
    const calculatedUnitPrice = Math.round(product.basePrice * mult * 100) / 100;

    // Unique key for item with selected options
    const uniqueId = `${product.id}-${chosenWeight}-${chosenCut || 'none'}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === uniqueId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + qty;
        updated[existingIndex].quantity = newQty;
        updated[existingIndex].totalPrice = Math.round(newQty * calculatedUnitPrice * 100) / 100;
        return updated;
      } else {
        const newItem: CartItem = {
          id: uniqueId,
          productId: product.id,
          name: product.name,
          image: product.image,
          unit: product.unit,
          selectedWeight: chosenWeight || '1 kg',
          selectedCut: chosenCut || null,
          unitPrice: calculatedUnitPrice,
          quantity: qty,
          totalPrice: Math.round(qty * calculatedUnitPrice * 100) / 100,
        };
        return [...prev, newItem];
      }
    });

    setIsCartOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQty,
            totalPrice: Math.round(newQty * item.unitPrice * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    if (user) {
      try {
        localStorage.removeItem(`namma_dairy_cart_${user.id}`);
        localStorage.removeItem(`namma_dairy_coupon_${user.id}`);
      } catch (e) {}
    }
    setItems([]);
    setCouponCode('');
    setCouponApplied(false);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;

  const minOrderValue = 99;
  const freeDeliveryThreshold = 499;
  const baseDeliveryFee = 35;
  const deliveryFee = subtotal === 0 || subtotal >= freeDeliveryThreshold ? 0 : baseDeliveryFee;

  let discount = 0;
  if (couponApplied) {
    const c = couponCode.toUpperCase().trim();
    if (c === 'NAMMA50' && subtotal >= 299) {
      discount = 50;
    } else if (c === 'PUREMILK') {
      discount = Math.round(subtotal * 0.1 * 100) / 100;
    } else if (c === 'HEALTHY10') {
      discount = Math.min(100, Math.round(subtotal * 0.1 * 100) / 100);
    }
  }

  const total = Math.max(0, Math.round((subtotal + deliveryFee - discount) * 100) / 100);

  const applyCoupon = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return { success: false, message: 'Please enter a coupon code.' };

    if (cleanCode === 'NAMMA50') {
      if (subtotal < 299) {
        return { success: false, message: 'Code NAMMA50 is valid on orders of ₹299 or above.' };
      }
      setCouponCode('NAMMA50');
      setCouponApplied(true);
      return { success: true, message: 'Success! ₹50 OFF applied to your cart.' };
    }

    if (cleanCode === 'PUREMILK') {
      setCouponCode('PUREMILK');
      setCouponApplied(true);
      return { success: true, message: 'Success! 10% Farm Fresh Discount applied.' };
    }

    if (cleanCode === 'HEALTHY10') {
      setCouponCode('HEALTHY10');
      setCouponApplied(true);
      return { success: true, message: 'Success! 10% Healthy Life Discount applied.' };
    }

    return { success: false, message: 'Invalid or expired coupon code. Try NAMMA50 or PUREMILK.' };
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
  };

  const appliedCoupon = couponApplied ? { code: couponCode, discount } : null;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addToCart: addItem,
        removeItem,
        removeFromCart: removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        deliveryFee,
        freeDeliveryThreshold,
        minOrderValue,
        discount,
        total,
        couponCode,
        couponApplied,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
