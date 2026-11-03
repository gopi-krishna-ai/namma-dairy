'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Order } from '@/lib/types';
import InvoiceModal from '@/components/InvoiceModal';
import {
  CheckCircle,
  Truck,
  Clock,
  MapPin,
  FileText,
  ArrowRight,
  PhoneCall,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Could not load order details.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve order.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-emerald-900">Retrieving your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-red-100 shadow-sm">
          <p className="text-red-600 font-bold mb-2">Order Notice</p>
          <p className="text-sm text-gray-600 mb-6">{error || 'Order could not be located.'}</p>
          <Link
            href="/account"
            className="inline-flex items-center justify-center py-2.5 px-5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
          >
            Check Your Orders
          </Link>
        </div>
      </div>
    );
  }

  let parsedAddress: any = {};
  try {
    parsedAddress = typeof order.deliveryAddress === 'string' ? JSON.parse(order.deliveryAddress) : order.deliveryAddress;
  } catch (e) {
    parsedAddress = { recipientName: 'Customer', street: order.deliveryAddress };
  }

  return (
    <div className="min-h-screen bg-[#fbf8f1] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Success Card */}
        <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500" />

          <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <CheckCircle className="w-10 h-10 stroke-[2]" />
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full mb-3 border border-emerald-200">
            Order Confirmed • #{order.orderNumber}
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 mb-2">
            Thank You For Ordering!
          </h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Your fresh farm delivery has been booked. Our butchery and dairy team in Bengaluru has begun preparing your items.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-gray-500 block uppercase font-bold tracking-wider">Scheduled Slot</span>
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                {order.deliverySlot}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">{order.deliveryDate}</span>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-gray-500 block uppercase font-bold tracking-wider">Payment Status</span>
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid via Razorpay'}
              </span>
              <span className={`text-[10px] font-bold block mt-0.5 ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.paymentStatus === 'PAID' ? 'Payment Verified (PAID)' : 'Collect ₹' + order.totalAmount.toFixed(2) + ' on arrival'}
              </span>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-gray-500 block uppercase font-bold tracking-wider">Delivery Area</span>
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                {parsedAddress.area || 'Bengaluru'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5 truncate">{parsedAddress.houseNumber}, {parsedAddress.street}</span>
            </div>
          </div>
        </div>

        {/* Order Details & Items Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
              Items in This Delivery
            </h2>
            <button
              onClick={() => setShowInvoice(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              Download GST Invoice
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-gray-900">{item.productName}</p>
                  <div className="flex flex-wrap gap-1.5 mt-0.5 text-[11px] text-gray-500">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">Weight: {item.selectedWeight}</span>
                    {item.selectedCut && (
                      <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">Cut: {item.selectedCut}</span>
                    )}
                    <span>Qty: {item.quantity} × ₹{item.unitPrice.toFixed(2)}</span>
                  </div>
                </div>
                <span className="font-bold text-gray-900 font-mono text-sm sm:text-base">
                  ₹{item.totalPrice.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Bill summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono">₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className="font-mono">{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toFixed(2)}`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount</span>
                <span className="font-mono">-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-900 font-bold pt-2 border-t border-gray-200 text-base">
              <span>Total Amount</span>
              <span className="text-emerald-950 font-black font-mono">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/account"
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs sm:text-sm text-center hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Track Delivery in Dashboard
            </Link>
            <Link
              href="/products"
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Customer Help Box */}
        <div className="bg-emerald-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm">Need help or changes to your delivery?</h4>
            <p className="text-xs text-emerald-200 mt-0.5">
              Call our Bengaluru fulfillment hotline anytime from 6:00 AM to 9:00 PM.
            </p>
          </div>
          <a
            href="tel:+919876543210"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs shrink-0 hover:bg-emerald-50 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            +91 98765 43210
          </a>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && order && (
        <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  );
}
