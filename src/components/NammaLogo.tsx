import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  white?: boolean;
}

export default function NammaLogo({ className = '', size = 'md', white = false }: LogoProps) {
  const sizeClasses = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 group ${className}`}>
      {/* Cow & Milk Can Graphic Emblem inspired by Namma Dairy Branding */}
      <div className={`relative flex items-center justify-center rounded-2xl p-1.5 transition-transform duration-300 group-hover:scale-105 shadow-sm ${
        white ? 'bg-white/10 text-white' : 'bg-gradient-to-br from-brand-700 via-brand-800 to-dairy-dark text-white'
      } ${sizeClasses[size]} aspect-square`}>
        <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full drop-shadow">
          {/* Circular Badge Ring */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6 2" opacity="0.6" />
          
          {/* Milk Churn Can */}
          <path d="M42 22 h16 v6 h-16 z M36 28 h28 l4 18 h-36 z M32 46 h36 v32 c0 4 -4 8 -8 8 h-20 c-4 0 -8 -4 -8 -8 z" fill="#fcfbf7" />
          <ellipse cx="50" cy="52" rx="14" ry="4" fill="#15803d" opacity="0.8" />
          <path d="M44 56 h12 v16 h-12 z" fill="#22c55e" opacity="0.3" />

          {/* Holstein Cow Head silhouette */}
          <circle cx="50" cy="40" r="14" fill="#ffffff" />
          {/* Ears */}
          <ellipse cx="36" cy="36" rx="6" ry="3" fill="#14532d" transform="rotate(-20 36 36)" />
          <ellipse cx="64" cy="36" rx="6" ry="3" fill="#14532d" transform="rotate(20 64 36)" />
          {/* Horns */}
          <path d="M43 30 Q45 22 47 28" stroke="#d97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M57 30 Q55 22 53 28" stroke="#d97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Cow Patches */}
          <path d="M43 34 q4 2 3 8 q-6 0 -5 -7 z" fill="#14532d" />
          <path d="M56 36 q2 5 7 4 q-2 -6 -6 -5 z" fill="#14532d" />
          {/* Snout */}
          <ellipse cx="50" cy="46" rx="7" ry="5" fill="#fbcfe8" />
          <circle cx="47" cy="46" r="1" fill="#831843" />
          <circle cx="53" cy="46" r="1" fill="#831843" />

          {/* Flowing Fresh Green Leaf Swirl */}
          <path d="M20 74 C35 90 65 90 82 74 C70 82 45 84 20 74 Z" fill="#86efac" />
          <path d="M68 62 C74 54 86 56 86 66 C76 68 70 65 68 62 Z" fill="#4ade80" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className={`font-display font-extrabold tracking-tight leading-none ${textSizes[size]} ${
            white ? 'text-white' : 'text-brand-900'
          }`}>
            NAMMA <span className="text-brand-600">DAIRY</span>
          </span>
          {/* Fresh Leaf Icon */}
          <span className="text-brand-500 text-sm animate-pulse">🍃</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`font-medium tracking-wide uppercase ${taglineSizes[size]} ${
            white ? 'text-brand-100' : 'text-dairy-forest font-semibold'
          }`}>
            Pure Milk • Healthy Life
          </span>
        </div>
      </div>
    </Link>
  );
}
