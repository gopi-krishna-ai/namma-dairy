'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Bell,
  User as UserIcon,
  Search,
  MapPin,
  Phone,
  ChevronDown,
  LogOut,
  Package,
  ShieldCheck,
  Menu,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import NammaLogo from './NammaLogo';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useNotifications } from '@/context/NotificationContext';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { itemCount, subtotal, setIsCartOpen } = useCart();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userDeliveryAddress, setUserDeliveryAddress] = useState<string | null>(null);

  // Fetch individual customer delivery address ONLY when logged in
  useEffect(() => {
    if (user) {
      fetch('/api/addresses')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.addresses && data.addresses.length > 0) {
            const defaultAddr = data.addresses.find((a: any) => a.isDefault) || data.addresses[0];
            const areaName = defaultAddr.area ? `${defaultAddr.area}, Bengaluru` : (defaultAddr.city || 'Bengaluru');
            setUserDeliveryAddress(areaName);
          } else {
            setUserDeliveryAddress(null);
          }
        })
        .catch(() => setUserDeliveryAddress(null));
    } else {
      setUserDeliveryAddress(null);
    }
  }, [user]);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Do not render the customer storefront Navbar on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      {/* 1. Top Informational Bar (Inspired by Namma Dairy Branding) */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-dairy-dark text-white text-xs py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-emerald-100 font-medium">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-400" />
              <span>Order Helpline: <strong>+91 98765 43210</strong></span>
            </span>
            <span className="hidden md:inline-block text-emerald-300">•</span>
            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>Bengaluru, Karnataka (Same-Day Delivery)</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline bg-white/15 text-white px-2.5 py-0.5 rounded-full font-semibold text-[11px] border border-white/20">
              ⚡ Free Delivery Above ₹499
            </span>
            <span className="bg-emerald-400/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[11px] border border-emerald-400/30">
              🟢 Morning 6 AM Slots Open
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <NammaLogo size="md" />

          {/* Individual Delivery Address: Only rendered after customer logs in */}
          {user && (
            <Link
              href="/account?tab=addresses"
              className="hidden lg:flex items-center gap-2 bg-dairy-cream/80 border border-brand-200/80 px-3 py-1.5 rounded-xl text-xs text-brand-950 shadow-sm cursor-pointer hover:bg-dairy-cream transition"
              title="Click to view or edit your saved delivery addresses"
            >
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
              <div className="leading-tight">
                <div className="font-semibold text-brand-900 flex items-center gap-1">
                  Deliver to:
                  <span className="text-brand-600 font-bold max-w-[130px] truncate">
                    {userDeliveryAddress || '+ Add Address'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">60-Min Express Available</span>
              </div>
            </Link>
          )}

          {/* Live Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search farm fresh milk, chicken, mutton, veggies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-10 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 transition"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-700 relative transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-brand-900" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 mt-2">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-gray-400 text-xs">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.isRead && markAsRead(n.id)}
                            className={`p-2.5 rounded-xl transition cursor-pointer text-xs ${
                              n.isRead ? 'opacity-70 hover:bg-gray-50' : 'bg-brand-50/60 hover:bg-brand-50 font-medium'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-brand-950">{n.title}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-gray-600 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Account Button / Menu */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100/80 text-brand-900 px-3 py-1.5 rounded-full border border-brand-200 transition text-xs font-semibold"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white px-3.5 py-1.5 rounded-full font-semibold text-xs shadow-sm transition"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Login / Register</span>
                </Link>
              )}

              {/* User Dropdown */}
              {isUserMenuOpen && user && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-2 animate-in fade-in slide-in-from-top-2 text-xs">
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/account"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      <UserIcon className="w-4 h-4 text-brand-600" />
                      My Profile & Addresses
                    </Link>
                    <Link
                      href="/account?tab=orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Package className="w-4 h-4 text-brand-600" />
                      Order History & Invoices
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-red-600 hover:bg-red-50 font-medium transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Shopping Cart Drawer Trigger: Only shows badge/subtotal after login */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  router.push('/login?redirect=/cart');
                } else {
                  setIsCartOpen(true);
                }
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white px-3.5 py-2 rounded-full font-bold text-xs shadow-md transition transform active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {user && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-brand-950 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">
                {user && subtotal > 0 ? `₹${subtotal.toFixed(0)}` : 'Cart'}
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-3 md:hidden relative">
          <input
            type="text"
            placeholder="Search milk, chicken, mutton, veggies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-full pl-9 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* 3. Category Links Bar */}
      <nav className="bg-dairy-cream/60 border-t border-brand-100/60 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 py-2 text-xs font-semibold text-brand-900 whitespace-nowrap">
          <Link href="/products" className="hover:text-brand-600 transition flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            All Products
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/products?category=fresh-milk-dairy" className="hover:text-brand-600 transition flex items-center gap-1.5">
            🥛 Fresh Milk & Dairy
          </Link>
          <Link href="/products?category=fresh-chicken" className="hover:text-brand-600 transition flex items-center gap-1.5">
            🍗 Fresh Chicken
          </Link>
          <Link href="/products?category=fresh-meat" className="hover:text-brand-600 transition flex items-center gap-1.5">
            🥩 Fresh Meat (Mutton)
          </Link>
          <Link href="/products?category=fresh-vegetables" className="hover:text-brand-600 transition flex items-center gap-1.5">
            🥬 Fresh Vegetables
          </Link>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 text-sm">
          <div className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-400">
            Categories
          </div>
          <Link
            href="/products?category=fresh-milk-dairy"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-1.5 text-gray-700 hover:text-brand-600 font-medium"
          >
            🥛 Fresh Milk & Dairy
          </Link>
          <Link
            href="/products?category=fresh-chicken"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-1.5 text-gray-700 hover:text-brand-600 font-medium"
          >
            🍗 Fresh Chicken (Curry & Boneless Cuts)
          </Link>
          <Link
            href="/products?category=fresh-meat"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-1.5 text-gray-700 hover:text-brand-600 font-medium"
          >
            🥩 Fresh Meat (Tender Mutton)
          </Link>
          <Link
            href="/products?category=fresh-vegetables"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-1.5 text-gray-700 hover:text-brand-600 font-medium"
          >
            🥬 Farm-Picked Fresh Vegetables
          </Link>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-1 text-gray-800 font-semibold"
                >
                  My Account ({user.name})
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="block w-full text-left py-1 text-red-600 font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-center py-2 bg-brand-700 text-white rounded-xl font-bold text-xs"
                >
                  Login / Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
