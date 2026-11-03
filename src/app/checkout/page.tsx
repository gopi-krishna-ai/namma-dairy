'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Address } from '@/lib/types';
import {
  MapPin,
  Clock,
  CreditCard,
  Banknote,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  ArrowLeft,
  X,
  Phone,
  User,
  Building,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
    appliedCoupon,
    clearCart,
    minOrderValue,
  } = useCart();

  // Address states
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);

  // New Address form
  const [newAddress, setNewAddress] = useState({
    tag: 'Home',
    recipientName: '',
    phone: '',
    houseNumber: '',
    street: '',
    area: 'Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
    isDefault: true,
  });

  // Delivery options
  const [deliveryDate, setDeliveryDate] = useState<'Today' | 'Tomorrow'>('Today');
  const [deliverySlot, setDeliverySlot] = useState<string>('Early Morning (6:00 AM - 8:00 AM)');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Simulated Razorpay Modal
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayMethod, setRazorpayMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);

  // Fetch customer saved addresses
  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    } else {
      setIsLoadingAddresses(false);
    }
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const res = await fetch('/api/addresses');
      const data = await res.json();
      if (data.success && data.addresses) {
        setAddresses(data.addresses);
        const defaultAddr = data.addresses.find((a: Address) => a.isDefault) || data.addresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewAddressModal(false);
        await fetchAddresses();
        setSelectedAddressId(data.address.id);
      } else {
        alert(data.message || 'Could not save address.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async (razorpayPaymentDetails?: any) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/checkout`);
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your basket is empty. Please add items before placing order.');
      return;
    }

    if (subtotal < minOrderValue && total < minOrderValue) {
      setErrorMessage(`Minimum order value is ₹${minOrderValue}. Please add more items.`);
      return;
    }

    const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddr) {
      setErrorMessage('Please select or add a Bengaluru delivery address.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const orderPayload = {
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          selectedWeight: item.selectedWeight,
          selectedCut: item.selectedCut,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        address: {
          tag: selectedAddr.tag,
          recipientName: selectedAddr.recipientName,
          phone: selectedAddr.phone,
          houseNumber: selectedAddr.houseNumber,
          street: selectedAddr.street,
          area: selectedAddr.area,
          city: selectedAddr.city,
          pincode: selectedAddr.pincode,
        },
        deliverySlot,
        deliveryDate,
        paymentMethod: razorpayPaymentDetails ? 'RAZORPAY' : paymentMethod,
        orderNotes,
        couponCode: appliedCoupon?.code,
        razorpayPaymentId: razorpayPaymentDetails?.razorpay_payment_id || null,
        razorpayOrderId: razorpayPaymentDetails?.razorpay_order_id || null,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to place order.');
      }

      // Success: clear cart and redirect to confirmation
      clearCart();
      router.push(`/order-confirmation/${data.order.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong while placing order.');
      setIsSubmitting(false);
    }
  };

  // Trigger Online Payment or COD
  const handleSubmitCheckout = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/checkout`);
      return;
    }

    if (!selectedAddressId) {
      setErrorMessage('Please select or add a delivery address.');
      return;
    }

    if (paymentMethod === 'RAZORPAY') {
      setShowRazorpayModal(true);
    } else {
      handlePlaceOrder();
    }
  };

  // Complete simulated Razorpay flow
  const handleSimulateRazorpaySuccess = async () => {
    setIsProcessingRazorpay(true);
    setTimeout(async () => {
      const fakePaymentId = `pay_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      const fakeOrderId = `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setShowRazorpayModal(false);
      setIsProcessingRazorpay(false);
      await handlePlaceOrder({
        razorpay_payment_id: fakePaymentId,
        razorpay_order_id: fakeOrderId,
      });
    }, 1500);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] flex items-center justify-center py-16 px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-emerald-100 shadow-sm">
          <Truck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Checkout is Empty</h2>
          <p className="text-sm text-gray-600 mb-6">You don&apos;t have any products in your basket to checkout.</p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors"
          >
            Browse Farm Fresh Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f1] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb navigation */}
        <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
          <Link href="/cart" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Basket
          </Link>
          <span>/</span>
          <span className="text-emerald-900 font-semibold">Secure Checkout</span>
        </div>

        <div className="flex items-center justify-between pb-4 mb-6 border-b border-emerald-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950">Confirm &amp; Place Order</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Guaranteed Fresh • Sourced daily from Karnataka farms directly to your doorstep in Bengaluru
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            256-Bit SSL Encrypted
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to complete order</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Not Logged In Prompt */}
        {!authLoading && !isAuthenticated && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 font-bold">
                !
              </div>
              <div>
                <p className="font-bold text-sm">Please log in to complete your purchase</p>
                <p className="text-xs text-amber-700">
                  Save your address, track real-time delivery status, and get farm updates.
                </p>
              </div>
            </div>
            <Link
              href="/login?redirect=/checkout"
              className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 shrink-0 shadow-md"
            >
              Customer Login / Register
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Checkout Columns */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* 1. Delivery Address Section */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                    1
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Delivery Address (Bengaluru)
                  </h2>
                </div>

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setNewAddress((prev) => ({
                        ...prev,
                        recipientName: user?.name || '',
                        phone: user?.phone || '',
                      }));
                      setShowNewAddressModal(true);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Address
                  </button>
                )}
              </div>

              {isLoadingAddresses ? (
                <div className="py-6 text-center text-xs text-gray-400">Loading your addresses...</div>
              ) : !isAuthenticated ? (
                <p className="text-sm text-gray-500 py-2">
                  Please log in to choose from your saved Bengaluru addresses.
                </p>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-emerald-100 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-3">No delivery address saved yet.</p>
                  <button
                    onClick={() => {
                      setNewAddress((prev) => ({
                        ...prev,
                        recipientName: user?.name || '',
                        phone: user?.phone || '',
                      }));
                      setShowNewAddressModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Delivery Address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-600'
                            : 'border-gray-200 hover:border-emerald-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {addr.tag}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="font-bold text-sm text-gray-900">{addr.recipientName}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {addr.houseNumber}, {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                        </p>
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-emerald-600" /> {addr.phone}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Delivery Date & Time Slot */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                  2
                </div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Select Delivery Slot
                </h2>
              </div>

              {/* Delivery Day */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Delivery Day
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setDeliveryDate('Today')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors ${
                      deliveryDate === 'Today'
                        ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                        : 'border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    Today (Same Day Fresh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryDate('Tomorrow')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors ${
                      deliveryDate === 'Tomorrow'
                        ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                        : 'border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    Tomorrow Morning
                  </button>
                </div>
              </div>

              {/* Delivery Slots */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Preferred Time Window
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Early Morning (6:00 AM - 8:00 AM)',
                      badge: 'Direct Farm Milking',
                      desc: 'Ideal for early tea & fresh milk delivery',
                    },
                    {
                      label: 'Morning (8:30 AM - 11:30 AM)',
                      badge: 'Butchery Fresh',
                      desc: 'Ideal for Sunday meat cooking & breakfast vegetables',
                    },
                    {
                      label: 'Evening (4:00 PM - 7:00 PM)',
                      badge: 'Evening Prep',
                      desc: 'Delivered fresh before dinner preparations',
                    },
                    {
                      label: 'Express 90-Min Slot',
                      badge: 'Speed Dispatch',
                      desc: 'Packed right away from closest Bengaluru hub',
                    },
                  ].map((slot) => {
                    const isSelected = deliverySlot === slot.label;
                    return (
                      <div
                        key={slot.label}
                        onClick={() => setDeliverySlot(slot.label)}
                        className={`cursor-pointer rounded-xl p-3.5 border transition-all text-left ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                            : 'border-gray-200 hover:border-emerald-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-gray-900">{slot.label}</span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {slot.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">{slot.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ring bell twice, leave with security gate at apartment..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                  3
                </div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Select Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                {/* Cash On Delivery */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-sm text-gray-900">Cash on Delivery (COD)</span>
                      <span className="text-[10px] uppercase font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        Pay upon doorstep arrival
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pay via Cash or UPI QR scan directly to our delivery executive when your package arrives.
                    </p>
                  </div>
                </label>

                {/* Razorpay Online */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="RAZORPAY"
                    checked={paymentMethod === 'RAZORPAY'}
                    onChange={() => setPaymentMethod('RAZORPAY')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-sm text-gray-900">Razorpay Online Payment</span>
                        <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Instant Confirmation
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        UPI / Cards / NetBanking
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Secure payment gateway supporting Google Pay, PhonePe, Paytm, Visa, Mastercard, RuPay &amp; Netbanking.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Button */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-4 sticky top-28">
              <h3 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100">
                Order Review ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>

              {/* Items scroll */}
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1 text-xs">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-1 border-b border-gray-50">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 overflow-hidden shrink-0 relative">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {item.selectedWeight} {item.selectedCut ? `• ${item.selectedCut}` : ''}
                      </p>
                      <p className="text-[11px] text-gray-600 font-mono">
                        Qty: {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900 shrink-0 font-mono">₹{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900 font-mono">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-mono">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${deliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span className="font-mono">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>Selected Date</span>
                  <span className="font-medium text-gray-700">{deliveryDate}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>Delivery Window</span>
                  <span className="font-medium text-gray-700">{deliverySlot}</span>
                </div>
              </div>

              {/* Total & Action Button */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-sm font-bold text-gray-900">Total Payable</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono">₹{total.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitCheckout}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Processing Order...'
                  ) : paymentMethod === 'RAZORPAY' ? (
                    <>
                      Pay ₹{total.toFixed(2)} Online
                      <Sparkles className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Place Cash On Delivery Order
                      <Truck className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-gray-500 mt-3">
                  By placing your order, you agree to Namma Dairy&apos;s fresh farm delivery terms in Bengaluru.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Address Modal */}
      {showNewAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-700" />
                Add Bengaluru Delivery Address
              </h3>
              <button
                onClick={() => setShowNewAddressModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address Label</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewAddress({ ...newAddress, tag })}
                      className={`py-1.5 text-xs font-medium rounded-lg border ${
                        newAddress.tag === tag
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={newAddress.recipientName}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600"
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">House / Flat / Villa No.</label>
                <input
                  type="text"
                  required
                  value={newAddress.houseNumber}
                  onChange={(e) => setNewAddress({ ...newAddress, houseNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600"
                  placeholder="e.g. Flat 302, Palm Heights"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street / Landmark</label>
                <input
                  type="text"
                  required
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600"
                  placeholder="e.g. 12th Main Road, near Metro station"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Area / Neighborhood</label>
                  <select
                    value={newAddress.area}
                    onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
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
                    ].map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600"
                    placeholder="5600xx"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewAddressModal(false)}
                  className="px-4 py-2 text-xs text-gray-600 font-semibold rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Razorpay Payment Gateway Modal */}
      {showRazorpayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-blue-200">
            {/* Razorpay Header */}
            <div className="bg-[#0c2340] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-lg text-emerald-400">
                  ND
                </div>
                <div>
                  <h4 className="font-bold text-sm">Namma Dairy Checkout</h4>
                  <p className="text-[11px] text-gray-300">Bengaluru • Pure Milk &amp; Meat Delivery</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-300 block">Payable</span>
                <span className="text-lg font-bold font-mono text-emerald-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Gateway Body */}
            <div className="p-5 space-y-4">
              <div className="flex gap-2 border-b border-gray-200 pb-3 text-xs">
                {(['UPI', 'CARD', 'NETBANKING'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setRazorpayMethod(method)}
                    className={`flex-1 py-1.5 font-bold rounded-lg ${
                      razorpayMethod === method
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {razorpayMethod === 'UPI' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">Enter UPI ID (Google Pay, PhonePe, Paytm, BHIM):</p>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 font-mono"
                    placeholder="mobile@upi"
                  />
                  <div className="flex gap-2">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                      <span
                        key={app}
                        onClick={() => setUpiId(`user@${app.toLowerCase()}`)}
                        className="cursor-pointer text-[10px] font-bold px-2 py-1 bg-gray-100 hover:bg-blue-50 text-gray-700 rounded border"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {razorpayMethod === 'CARD' && (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono"
                      placeholder="4532 0000 0000 0000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Valid Thru</label>
                      <input
                        type="text"
                        defaultValue="08/28"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">CVV</label>
                      <input
                        type="password"
                        defaultValue="889"
                        maxLength={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono"
                        placeholder="•••"
                      />
                    </div>
                  </div>
                </div>
              )}

              {razorpayMethod === 'NETBANKING' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak', 'Canara Bank'].map((bank) => (
                    <div
                      key={bank}
                      className="p-2 border rounded-lg text-center font-medium hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                    >
                      {bank}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessingRazorpay}
                  onClick={handleSimulateRazorpaySuccess}
                  className="w-full py-3 bg-[#0c2340] text-white text-xs font-bold rounded-xl hover:bg-[#14325a] flex items-center justify-center gap-2 shadow"
                >
                  {isProcessingRazorpay ? (
                    'Contacting Bank & Verifying...'
                  ) : (
                    <>
                      Pay ₹{total.toFixed(2)} Securely
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRazorpayModal(false)}
                  className="w-full mt-2 py-1.5 text-[11px] text-gray-500 hover:text-gray-700"
                >
                  Cancel and choose another method
                </button>
              </div>
            </div>

            <div className="bg-gray-50 px-5 py-2.5 text-center text-[10px] text-gray-400 border-t flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secured by Razorpay • PCI-DSS Level 1 Certified
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
