import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

export const metadata: Metadata = {
  title: 'Namma Dairy - Pure Milk • Healthy Life | Fresh Meat, Chicken & Vegetables Bengaluru',
  description:
    'Order 100% farm fresh unadulterated milk, grass-fed A2 cow milk, antibiotic-free chicken, tender goat mutton, and organic vegetables delivered to your doorstep in Bengaluru, Karnataka.',
  keywords: [
    'Namma Dairy',
    'Pure Milk Bengaluru',
    'Fresh Chicken Delivery Bengaluru',
    'Tender Mutton Bengaluru',
    'A2 Gir Cow Milk Indiranagar',
    'Farm Fresh Milk Online',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col justify-between">
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
