'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useNotifications } from '@/context/NotificationContext';
import { Order, Address } from '@/lib/types';
import InvoiceModal from '@/components/InvoiceModal';
import {
  Package,
  MapPin,
  Bell,
  User,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  XCircle,
  Plus,
  Trash2,
  Truck,
  Shield,
  ChevronRight,
  Phone,
  Sparkles,
} from 'lucide-react';

export default function CustomerAccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { addToCart } = useCart();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'ADDRESSES' | 'NOTIFICATIONS'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Selected Order for Invoice modal
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Cancel order modal
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Add address modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    tag: 'Home',
    recipientName: '',
    phone: '',
    houseNumber: '',
    street: '',
    area: 'Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
    isDefault: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchAddresses();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const res = await fetch('/api/addresses');
      const data = await res.json();
      if (data.success && data.addresses) {
        setAddresses(data.addresses);
      }
    } catch (err) {
      console.error('Fetch addresses error:', err);
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
        setShowAddressModal(false);
        fetchAddresses();
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return;
    try {
      await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOrderSubmit = async () => {
    if (!cancellingOrder) return;
    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/orders/${cancellingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancelReason: cancelReason || 'Customer requested cancellation',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCancellingOrder(null);
        setCancelReason('');
        fetchOrders();
      } else {
        alert(data.message || 'Could not cancel order.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      // Re-populate cart
      addToCart(
        {
          id: item.productId || item.id,
          name: item.productName,
          slug: item.productName.toLowerCase().replace(/\s+/g, '-'),
          description: '',
          categoryId: '',
          image: item.productImage || '/placeholder.jpg',
          basePrice: item.unitPrice,
          unit: item.unit,
          stockQuantity: 100,
          isAvailable: true,
          isFeatured: false,
        },
        item.selectedWeight || '1 kg',
        item.selectedCut || null,
        item.quantity
      );
    });
    router.push('/cart');
  };

  const renderStatusTracker = (status: string) => {
    const steps = [
      { key: 'PLACED', label: 'Placed' },
      { key: 'CONFIRMED', label: 'Confirmed' },
      { key: 'PREPARING', label: 'In Kitchen' },
      { key: 'DISPATCHED', label: 'Dispatched' },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
      { key: 'DELIVERED', label: 'Delivered' },
    ];

    if (status === 'CANCELLED') {
      return (
        <div className="bg-red-50 text-red-700 text-xs font-bold py-2 px-3 rounded-xl border border-red-200 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600" />
          <span>This order was cancelled</span>
        </div>
      );
    }

    const currentIndex = steps.findIndex((s) => s.key === status);

    return (
      <div className="w-full pt-3 pb-1">
        <div className="grid grid-cols-6 gap-1 relative">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={step.key} className="text-center">
                <div
                  className={`w-6 h-6 mx-auto rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-200'
                      : 'bg-gray-200 text-gray-500'
                  } ${isCurrent ? 'animate-pulse scale-110' : ''}`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  className={`block text-[10px] mt-1 font-semibold truncate ${
                    isCurrent
                      ? 'text-emerald-900 font-bold'
                      : isCompleted
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] bg-[#fbf8f1] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f1] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Admin notice banner if logged in as Admin */}
        {user?.role === 'ADMIN' && (
          <div className="bg-emerald-950 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold">You are authenticated as Store Administrator</p>
                <p className="text-[11px] text-emerald-200">
                  Switch to the Namma Dairy management portal to process orders, edit stock, and adjust pricing.
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs transition-colors shrink-0"
            >
              Open Admin Dashboard &rarr;
            </Link>
          </div>
        )}

        {/* User Profile Card */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-2xl shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-black text-emerald-950">{user?.name}</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {user?.role === 'ADMIN' ? 'Administrator' : 'Bengaluru Customer'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 justify-center sm:justify-start">
                <span>{user?.email}</span>
                {user?.phone && <span>• {user.phone}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-600 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'ORDERS'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-gray-600 hover:bg-emerald-50'
            }`}
          >
            <Package className="w-4 h-4" />
            My Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('ADDRESSES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'ADDRESSES'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-gray-600 hover:bg-emerald-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Saved Addresses ({addresses.length})
          </button>

          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative ${
              activeTab === 'NOTIFICATIONS'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-gray-600 hover:bg-emerald-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: ORDERS */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            {isLoadingOrders ? (
              <div className="py-12 text-center text-xs text-gray-400">Loading your orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-emerald-100 shadow-sm max-w-lg mx-auto">
                <Package className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Orders Placed Yet</h3>
                <p className="text-xs text-gray-500 mb-6">
                  Browse fresh milk, farm chicken cuts, mutton, and fresh vegetables for doorstep delivery.
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                let parsedAddr: any = {};
                try {
                  parsedAddr = typeof order.deliveryAddress === 'string' ? JSON.parse(order.deliveryAddress) : order.deliveryAddress;
                } catch {
                  parsedAddr = { street: order.deliveryAddress };
                }

                const canCancel = ['PLACED', 'CONFIRMED'].includes(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4 hover:border-emerald-200 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-emerald-950">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>•</span>
                          <span>Slot: {order.deliverySlot} ({order.deliveryDate})</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Tax Invoice
                        </button>
                        <button
                          onClick={() => handleReorder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reorder Items
                        </button>
                        {canCancel && (
                          <button
                            onClick={() => setCancellingOrder(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual Progress Stepper */}
                    <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                      {renderStatusTracker(order.status)}
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-gray-50 text-xs">
                      {order.items.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {item.productImage && (
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 overflow-hidden relative shrink-0">
                                <Image
                                  src={item.productImage}
                                  alt={item.productName}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900">{item.productName}</p>
                              <p className="text-[11px] text-gray-500">
                                {item.selectedWeight} {item.selectedCut ? `• Cut: ${item.selectedCut}` : ''} • Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold font-mono text-gray-900">₹{item.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Info */}
                    <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="text-gray-500">
                        <span>Delivering to: </span>
                        <strong className="text-gray-700">
                          {parsedAddr.recipientName || 'You'}, {parsedAddr.houseNumber}, {parsedAddr.street}, {parsedAddr.area}
                        </strong>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">
                          {order.paymentMethod === 'COD' ? 'Cash On Delivery' : 'Paid Online (Razorpay)'}:{' '}
                          <span className={order.paymentStatus === 'PAID' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                            {order.paymentStatus}
                          </span>
                        </span>
                        <span className="text-base font-black text-emerald-950 font-mono">
                          ₹{order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: SAVED ADDRESSES */}
        {activeTab === 'ADDRESSES' && (
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Your Saved Bengaluru Addresses</h3>
                <p className="text-xs text-gray-500">Delivery locations for milk, meat, and vegetables</p>
              </div>
              <button
                onClick={() => {
                  setNewAddress({
                    tag: 'Home',
                    recipientName: user?.name || '',
                    phone: user?.phone || '',
                    houseNumber: '',
                    street: '',
                    area: 'Indiranagar',
                    city: 'Bengaluru',
                    pincode: '560038',
                    isDefault: addresses.length === 0,
                  });
                  setShowAddressModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Address
              </button>
            </div>

            {isLoadingAddresses ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading addresses...</div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No addresses saved yet. Click &quot;Add Address&quot; above to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-colors bg-white relative space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {addr.tag}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Default Address
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Delete Address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="font-bold text-sm text-gray-900">{addr.recipientName}</p>
                    <p className="text-xs text-gray-600">
                      {addr.houseNumber}, {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                    </p>
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" /> {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">In-App Notification Center</h3>
                <p className="text-xs text-gray-500">Live order confirmations, dispatch notices, and updates</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                <Bell className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
                No notifications right now.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      notif.isRead
                        ? 'bg-gray-50/50 border-gray-200 text-gray-700'
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!notif.isRead && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />}
                        <h4 className="font-bold text-xs sm:text-sm">{notif.title}</h4>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 pl-4">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Order Dialog */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-100">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cancel Order #{cancellingOrder.orderNumber}?
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Fresh farm products can only be cancelled before kitchen butchery begins. Please tell us why you are cancelling:
            </p>

            <div className="space-y-2 mb-4">
              {[
                'Changed delivery time preference',
                'Ordered incorrect quantity or cut',
                'Placed by mistake',
                'Other reason',
              ].map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 text-xs text-gray-700 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-emerald-700"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelOrderSubmit}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-4">Add Bengaluru Delivery Address</h3>
            <form onSubmit={handleCreateAddress} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={newAddress.recipientName}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">House / Flat No.</label>
                <input
                  type="text"
                  required
                  value={newAddress.houseNumber}
                  onChange={(e) => setNewAddress({ ...newAddress, houseNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street / Landmark</label>
                <input
                  type="text"
                  required
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Area</label>
                  <select
                    value={newAddress.area}
                    onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
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
                    ].map((a) => (
                      <option key={a} value={a}>
                        {a}
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 text-xs text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      )}
    </div>
  );
}
