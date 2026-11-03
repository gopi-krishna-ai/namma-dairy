import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        dairy: {
          cream: "#fbf8f1",
          ivory: "#f4ede0",
          light: "#faf6ed",
          gold: "#d97706",
          dark: "#0c3b24",
          forest: "#064e3b",
        },
        meat: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(12, 59, 36, 0.08)',
        'card': '0 2px 12px -1px rgba(12, 59, 36, 0.06)',
        'hover': '0 10px 25px -3px rgba(12, 59, 36, 0.12)',
      }
    },
  },
  plugins: [],
};
export default config;
