export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  orderIndex: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  image: string;
  badge?: string | null;
  basePrice: number;
  unit: string;
  stockQuantity: number;
  isAvailable: boolean;
  isFeatured: boolean;
  optionsJson?: string | null;
  cuttingOptionsJson?: string | null;
  category?: Category;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  unit: string;
  selectedWeight: string;
  selectedCut?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Address {
  id: string;
  userId: string;
  tag: string;
  recipientName: string;
  phone: string;
  houseNumber: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  productName: string;
  productImage?: string | null;
  unit: string;
  selectedWeight?: string | null;
  selectedCut?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: 'COD' | 'RAZORPAY';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  deliveryAddress: string; // JSON parsed
  deliverySlot: string;
  deliveryDate: string;
  orderNotes?: string | null;
  createdAt: string;
  items: OrderItem[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface StoreSetting {
  id: string;
  storeName: string;
  tagline: string;
  location: string;
  phone: string;
  email: string;
  minOrderValue: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isStoreOpen: boolean;
  isCodEnabled: boolean;
  isRazorpayEnabled: boolean;
  deliverySlotsJson: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt?: string;
}
