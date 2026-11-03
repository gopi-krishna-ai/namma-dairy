'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Phone, MapPin, Mail, ShieldCheck, Heart, Droplets, Leaf, Award, Clock } from 'lucide-react';
import NammaLogo from './NammaLogo';

export default function Footer() {
  const pathname = usePathname();

  // Hide customer footer on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="relative bg-emerald-950 text-white border-t border-emerald-900 mt-20 overflow-hidden">
      {/* Background panoramic pasture image with dark overlay */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <Image
          src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1920&q=80"
          alt="Karnataka Dairy Farm"
          fill
          className="object-cover object-bottom"
          unoptimized
        />
      </div>

      {/* 1. Four Pillars of Trust (Directly inspired by Namma Dairy Branding Image) */}
      <div className="relative z-10 bg-emerald-900/60 border-b border-emerald-800/60 py-10 px-4 sm:px-6 lg:px-8 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* 1. Pure & Natural */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-3 shadow">
                <Droplets className="w-6 h-6 text-cyan-300" />
              </div>
              <h4 className="font-bold text-white text-base">Pure &amp; Natural</h4>
              <p className="text-xs text-emerald-200/80 mt-1">100% unadulterated whole milk and farm cuts</p>
            </div>

            {/* 2. No Added Preservatives */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-3 shadow">
                <Leaf className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="font-bold text-white text-base">No Preservatives</h4>
              <p className="text-xs text-emerald-200/80 mt-1">Zero chemicals, zero antibiotics, zero artificial hormones</p>
            </div>

            {/* 3. Farm Fresh Milk */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-3 shadow">
                <Award className="w-6 h-6 text-amber-300" />
              </div>
              <h4 className="font-bold text-white text-base">Farm Fresh Milk</h4>
              <p className="text-xs text-emerald-200/80 mt-1">Delivered direct from nature within hours of morning milking</p>
            </div>

            {/* 4. Good for Your Health */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-3 shadow">
                <Heart className="w-6 h-6 text-rose-300" />
              </div>
              <h4 className="font-bold text-white text-base">Good for Health</h4>
              <p className="text-xs text-emerald-200/80 mt-1">Wholesome nutrition for your entire family</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <NammaLogo size="lg" white={true} />
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Bengaluru&apos;s trusted local source for fresh dairy, hygienic farm chicken, tender mutton, and daily harvested vegetables. Sourced directly from local farmers and delivered in cold-chain safety.
            </p>
            <div className="pt-2 text-xs text-emerald-300 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>FSSAI Certified Food Quality Standards</span>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-emerald-800 pb-2">
              Categories
            </h4>
            <ul className="space-y-2 text-xs text-emerald-200">
              <li>
                <Link href="/products?category=fresh-milk-dairy" className="hover:text-white transition">
                  Pure Cow Milk &amp; Buffalo Milk
                </Link>
              </li>
              <li>
                <Link href="/products?category=fresh-milk-dairy" className="hover:text-white transition">
                  A2 Desi Gir Cow Milk &amp; Vedic Ghee
                </Link>
              </li>
              <li>
                <Link href="/products?category=fresh-chicken" className="hover:text-white transition">
                  Farm Chicken (Curry, Biryani, Boneless)
                </Link>
              </li>
              <li>
                <Link href="/products?category=fresh-chicken" className="hover:text-white transition">
                  Free-Range Nati Koli / Country Chicken
                </Link>
              </li>
              <li>
                <Link href="/products?category=fresh-meat" className="hover:text-white transition">
                  Tender Goat Mutton &amp; Keema Cuts
                </Link>
              </li>
              <li>
                <Link href="/products?category=fresh-vegetables" className="hover:text-white transition">
                  Farm Fresh Daily Vegetables
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service & Bengaluru Delivery Areas */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-emerald-800 pb-2">
              Service Areas (Bengaluru)
            </h4>
            <p className="text-xs text-emerald-200/80 mb-3">
              Daily morning &amp; evening slots available across:
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-emerald-200">
              {['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 'JP Nagar', 'Malleshwaram', 'Bellandur', 'Hebbal', 'Yelahanka'].map((area) => (
                <span key={area} className="bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                  {area}
                </span>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-800 text-xs text-emerald-200">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Daily Delivery Slots:
              </span>
              <p className="text-[11px] text-emerald-300 mt-1">6:00 AM - 8:00 AM • 4:00 PM - 7:00 PM</p>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-emerald-800 pb-2">
              Get in Touch
            </h4>
            <ul className="space-y-3 text-xs text-emerald-200">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Namma Dairy Farm Hub, Old Madras Road, Indiranagar, Bengaluru, Karnataka - 560038</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-white">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>care@nammadairy.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-emerald-800/80 text-center text-xs text-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Namma Dairy Bengaluru. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] text-emerald-400">
            <span>Pure Milk Direct From Nature • Cold-Chain Vacuum Packed</span>
            <span>•</span>
            <Link href="/admin/login" className="text-emerald-500/60 hover:text-emerald-300 transition">
              Staff Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
