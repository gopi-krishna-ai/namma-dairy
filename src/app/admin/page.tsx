'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Order, Product, Category, StoreSetting } from '@/lib/types';
import InvoiceModal from '@/components/InvoiceModal';
import {
  ShieldCheck,
  TrendingUp,
  Package,
  ShoppingBag,
  Users,
  Settings,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  Search,
  ExternalLink,
  LogOut,
  RefreshCw,
  Phone,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  Percent,
  Star,
  FolderPlus,
  Layers,
  Sparkles,
  Scissors,
  Weight,
  Check,
  X,
  Mail,
} from 'lucide-react';

// Category presets for fast, error-free product entry
const CATEGORY_PRESETS: Record<string, {
  defaultUnit: string;
  defaultWeights: string[];
  defaultCuts: string[];
  badges: string[];
  sampleImages: { label: string; url: string }[];
}> = {
  'fresh-milk-dairy': {
    defaultUnit: '1 Litre',
    defaultWeights: ['500ml', '1 Litre', '2 Litres', '5 Litres'],
    defaultCuts: [],
    badges: ['100% Pure Milk', 'A2 Desi Gir', 'Farm Fresh', 'Raw Milk', 'Vedic Bilona'],
    sampleImages: [
      { label: 'Whole Milk Bottle', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80' },
      { label: 'Glass Milk & Daisy', url: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80' },
      { label: 'Farm Fresh Paneer', url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80' },
      { label: 'Cultured Ghee', url: 'https://images.unsplash.com/photo-1608797178974-15b35a61dede?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  'fresh-chicken': {
    defaultUnit: '1 kg',
    defaultWeights: ['250g', '500g', '1 kg', '2 kg'],
    defaultCuts: ['Curry Cut (Skinless)', 'Curry Cut (Skin-on)', 'Biryani Cut', 'Boneless Cubes', 'Chicken Keema', 'Soup Bones', 'Whole Chicken Cleaned'],
    badges: ['Antibiotic Free', 'Farm Raised', 'Curry Cut', 'Free-Range Nati', 'Cleaned & Halal'],
    sampleImages: [
      { label: 'Raw Chicken Cuts', url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80' },
      { label: 'Boneless Cubes', url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80' },
      { label: 'Nati Koli (Country)', url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  'fresh-meat': {
    defaultUnit: '1 kg',
    defaultWeights: ['250g', '500g', '1 kg', '2 kg'],
    defaultCuts: ['Curry Cut (Medium)', 'Biryani Cut (Large Bone-in)', 'Boneless Cubes', 'Minced Mutton (Keema)', 'Chops & Ribs', 'Marrow Soup Bones'],
    badges: ['Pasture-Fed', 'Tender Goat', 'Sunday Special', 'Prime Cut', 'Cleaned & Trimmed'],
    sampleImages: [
      { label: 'Mutton Chops & Ribs', url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80' },
      { label: 'Goat Curry Cut', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
      { label: 'Fresh Keema', url: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  'fresh-vegetables': {
    defaultUnit: '1 kg',
    defaultWeights: ['250g', '500g', '1 kg', '2 kg', '5 kg'],
    defaultCuts: [],
    badges: ['Dawn Harvested', '100% Organic', 'Chemical Free', 'Ooty Fresh', 'Crisp & Washed'],
    sampleImages: [
      { label: 'Farm Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80' },
      { label: 'Spinach (Palak)', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80' },
      { label: 'Organic Veggie Crate', url: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=600&q=80' },
    ],
  },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'PRODUCTS' | 'CATEGORIES' | 'CUSTOMERS' | 'SETTINGS'>('ORDERS');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productStockFilter, setProductStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Add / Edit Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State with Interactive Array Selectors (no raw JSON needed)
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formBasePrice, setFormBasePrice] = useState<number>(100);
  const [formUnit, setFormUnit] = useState('1 kg');
  const [formStockQuantity, setFormStockQuantity] = useState<number>(50);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formSelectedWeights, setFormSelectedWeights] = useState<string[]>(['250g', '500g', '1 kg']);
  const [formSelectedCuts, setFormSelectedCuts] = useState<string[]>([]);
  const [customWeightInput, setCustomWeightInput] = useState('');
  const [customCutInput, setCustomCutInput] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Add Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatImage, setNewCatImage] = useState('');

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState('');

  // Customers State
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Settings State
  const [settings, setSettings] = useState<StoreSetting | null>(null);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Authenticate Admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/admin/login');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchOrders();
      fetchProducts();
      fetchCustomers();
      fetchSettings();

      // Auto-poll orders every 8 seconds so new customer orders appear automatically
      const pollTimer = setInterval(() => {
        fetch('/api/orders', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.orders) {
              setOrders(d.orders);
            }
          })
          .catch(() => {});
      }, 8000);

      return () => clearInterval(pollTimer);
    }
  }, [isAuthenticated, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setIsLoadingOrders(true);
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoadingOrders(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const [resProd, resCat] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);
      const dataProd = await resProd.json();
      const dataCat = await resCat.json();

      if (dataProd.success && dataProd.products) setProducts(dataProd.products);
      if (dataCat.success && dataCat.categories) setCategories(dataCat.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.success && data.customers) setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) setSettings(data.settings);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: Get category slug from category ID
  const getCategorySlug = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    return found ? found.slug : 'fresh-milk-dairy';
  };

  // When changing category in the product modal, auto-load intelligent category presets
  const handleCategoryChangeInModal = (newCatId: string) => {
    setFormCategoryId(newCatId);
    const slug = getCategorySlug(newCatId);
    const preset = CATEGORY_PRESETS[slug];
    if (preset && !editingProduct) {
      setFormUnit(preset.defaultUnit);
      setFormSelectedWeights(preset.defaultWeights);
      setFormSelectedCuts(preset.defaultCuts);
      if (preset.sampleImages[0]) {
        setFormImage(preset.sampleImages[0].url);
      }
    }
  };

  // Open "Add Product" pre-configured for a specific category
  const handleOpenAddProduct = (presetCategoryId?: string) => {
    let targetCatId = presetCategoryId;
    if (!targetCatId || targetCatId === 'ALL') {
      targetCatId = productCategoryFilter !== 'ALL' ? productCategoryFilter : categories[0]?.id || '';
    }
    // If passed a slug instead of id, resolve to id
    const foundBySlug = categories.find((c) => c.slug === targetCatId || c.id === targetCatId);
    if (foundBySlug) {
      targetCatId = foundBySlug.id;
    } else if (!targetCatId && categories[0]) {
      targetCatId = categories[0].id;
    }

    const slug = getCategorySlug(targetCatId || '');
    const preset = CATEGORY_PRESETS[slug] || CATEGORY_PRESETS['fresh-milk-dairy'];

    setEditingProduct(null);
    setFormName('');
    setFormCategoryId(targetCatId || '');
    setFormDescription('');
    setFormImage(preset?.sampleImages[0]?.url || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80');
    setFormBadge(preset?.badges[0] || 'Farm Fresh');
    setFormBasePrice(100);
    setFormUnit(preset?.defaultUnit || '1 kg');
    setFormStockQuantity(50);
    setFormIsAvailable(true);
    setFormIsFeatured(false);
    setFormSelectedWeights(preset?.defaultWeights || ['250g', '500g', '1 kg']);
    setFormSelectedCuts(preset?.defaultCuts || []);
    setCustomWeightInput('');
    setCustomCutInput('');
    setShowProductModal(true);
  };

  // Open "Edit Product"
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategoryId(prod.categoryId);
    setFormDescription(prod.description);
    setFormImage(prod.image);
    setFormBadge(prod.badge || '');
    setFormBasePrice(prod.basePrice);
    setFormUnit(prod.unit);
    setFormStockQuantity(prod.stockQuantity);
    setFormIsAvailable(prod.isAvailable);
    setFormIsFeatured(prod.isFeatured);

    try {
      setFormSelectedWeights(prod.optionsJson ? JSON.parse(prod.optionsJson) : ['1 kg']);
    } catch {
      setFormSelectedWeights(['1 kg']);
    }

    try {
      setFormSelectedCuts(prod.cuttingOptionsJson ? JSON.parse(prod.cuttingOptionsJson) : []);
    } catch {
      setFormSelectedCuts([]);
    }

    setCustomWeightInput('');
    setCustomCutInput('');
    setShowProductModal(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const payload = {
        name: formName,
        categoryId: formCategoryId,
        description: formDescription,
        image: formImage,
        badge: formBadge,
        basePrice: formBasePrice,
        unit: formUnit,
        stockQuantity: formStockQuantity,
        isAvailable: formIsAvailable,
        isFeatured: formIsFeatured,
        options: formSelectedWeights,
        cuttingOptions: formSelectedCuts,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        setEditingProduct(null);
        showToast(editingProduct ? 'Product updated successfully!' : 'New product added to store!');
        fetchProducts();
      } else {
        alert(data.message || 'Error saving product.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Instant In-Table Maintenance Handlers
  const handleQuickAdjustStock = async (prod: Product, amount: number) => {
    const newStock = Math.max(0, prod.stockQuantity + amount);
    try {
      await fetch(`/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newStock, isAvailable: newStock > 0 ? prod.isAvailable : false }),
      });
      showToast(`Stock for "${prod.name}" adjusted to ${newStock} ${prod.unit}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProductStock = async (prod: Product) => {
    try {
      await fetch(`/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !prod.isAvailable }),
      });
      showToast(`"${prod.name}" is now ${!prod.isAvailable ? 'available' : 'disabled'}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFeatured = async (prod: Product) => {
    try {
      await fetch(`/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !prod.isFeatured }),
      });
      showToast(`"${prod.name}" ${!prod.isFeatured ? 'featured on homepage' : 'unfeatured'}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReassignCategory = async (prod: Product, newCategoryId: string) => {
    try {
      await fetch(`/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newCategoryId }),
      });
      const targetCat = categories.find((c) => c.id === newCategoryId)?.name || 'Category';
      showToast(`"${prod.name}" moved to ${targetCat}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}" from Namma Dairy catalog?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`"${name}" deleted successfully.`);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          description: newCatDescription,
          image: newCatImage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCategoryModal(false);
        setNewCatName('');
        setNewCatDescription('');
        setNewCatImage('');
        showToast('New Category created!');
        fetchProducts();
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Order status update with INSTANT optimistic live update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    // 1. Immediately update state so Active Deliveries drops instantly with 0ms delay
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const isDelivered = newStatus === 'DELIVERED';
          return {
            ...o,
            status: newStatus as any,
            paymentStatus: isDelivered && o.paymentMethod === 'COD' ? 'PAID' : o.paymentStatus,
          };
        }
        return o;
      })
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'DELIVERED' ? { paymentStatus: 'PAID' } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          newStatus === 'DELIVERED'
            ? '✓ Order marked as DELIVERED! Active delivery count updated.'
            : `Order status updated to ${newStatus}`
        );
        fetchOrders(true);
      } else {
        alert(data.message || 'Failed to update order status');
        fetchOrders(true);
      }
    } catch (err: any) {
      alert(err.message);
      fetchOrders(true);
    }
  };

  // Order payment status update with instant optimistic update
  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: newPaymentStatus as any } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newPaymentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Payment status updated to ${newPaymentStatus}`);
        fetchOrders(true);
      }
    } catch (err: any) {
      alert(err.message);
      fetchOrders(true);
    }
  };

  // Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    setSettingsSavedMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSavedMessage('Store settings updated successfully!');
        setTimeout(() => setSettingsSavedMessage(''), 3000);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Calculations
  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter((o) =>
    ['PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(o.status)
  ).length;

  const deliveredOrdersCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const lowStockCount = products.filter((p) => p.stockQuantity <= 10).length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    const matchesSearch =
      orderSearchQuery === '' ||
      o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.user?.name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.user?.phone?.includes(orderSearchQuery);
    return matchesStatus && matchesSearch;
  });

  // Filtered products by category, stock, and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = productCategoryFilter === 'ALL' || p.categoryId === productCategoryFilter;
    const matchesStock =
      productStockFilter === 'ALL' ||
      (productStockFilter === 'LOW' && p.stockQuantity <= 10 && p.stockQuantity > 0) ||
      (productStockFilter === 'OUT' && p.stockQuantity <= 0);
    const matchesSearch =
      productSearchQuery === '' ||
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(productSearchQuery.toLowerCase());

    return matchesCategory && matchesStock && matchesSearch;
  });

  // Active Category Name for context button
  const currentCategoryName =
    productCategoryFilter === 'ALL'
      ? 'Product'
      : categories.find((c) => c.id === productCategoryFilter)?.name || 'Product';

  const currentCategorySlug = getCategorySlug(formCategoryId);
  const currentCategoryPreset = CATEGORY_PRESETS[currentCategorySlug] || CATEGORY_PRESETS['fresh-milk-dairy'];

  if (authLoading || (isAuthenticated && user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md">
            ND
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base tracking-wide text-white">NAMMA DAIRY</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Staff Admin Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Bengaluru Fulfillment Hub • Pure Milk, Meat &amp; Vegetables</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Always Visible Quick Add Product Button */}
          <button
            type="button"
            onClick={() => handleOpenAddProduct()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black transition-all shadow-md shadow-emerald-950/40 active:scale-95"
            title="Add a new product to catalog"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Product</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            Live Customer Storefront
          </Link>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-white block">{user?.name}</span>
            <span className="text-[10px] text-emerald-400 font-mono">Store Manager</span>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 border border-slate-700 transition-colors"
            title="Sign Out of Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-white font-mono">₹{totalRevenue.toFixed(2)}</p>
            <span className="text-[11px] text-emerald-400 mt-1 block">Live collected &amp; booked revenue</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Deliveries</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-white font-mono">{pendingOrdersCount}</p>
            <span className="text-[11px] text-amber-400 mt-1 block">Pending kitchen &amp; dispatch</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed Orders</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-white font-mono">{deliveredOrdersCount}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Successfully delivered</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Inventory Warnings</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-white font-mono">{lowStockCount}</p>
            <span className="text-[11px] text-red-400 mt-1 block">Products with &le; 10 units left</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex gap-2 text-xs sm:text-sm font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                activeTab === 'ORDERS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Package className="w-4 h-4" />
              Live Orders Fulfillment ({pendingOrdersCount})
            </button>

            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                activeTab === 'PRODUCTS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Products &amp; Inventory ({products.length})
            </button>

            <button
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Users className="w-4 h-4" />
              Customer Directory ({customers.length})
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                activeTab === 'SETTINGS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Settings className="w-4 h-4" />
              Store Settings
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddProduct()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add New Product</span>
          </button>
        </div>

        {/* TAB 1: LIVE ORDERS FULFILLMENT */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            {/* Quick Catalog Action Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Store Catalog: <strong className="text-white">{products.length} products</strong> listed across Dairy, Chicken, Meat &amp; Vegetables.</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddProduct()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Product</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider pr-1 hidden sm:inline">
                  Filter:
                </span>
                {[
                  { key: 'ALL', label: 'All Orders', count: orders.length },
                  { key: 'PLACED', label: 'Placed', count: orders.filter((o) => o.status === 'PLACED').length },
                  { key: 'CONFIRMED', label: 'Confirmed', count: orders.filter((o) => o.status === 'CONFIRMED').length },
                  { key: 'PREPARING', label: 'Kitchen Prep', count: orders.filter((o) => o.status === 'PREPARING').length },
                  { key: 'DISPATCHED', label: 'Dispatched', count: orders.filter((o) => o.status === 'DISPATCHED').length },
                  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length },
                  { key: 'DELIVERED', label: 'Delivered', count: orders.filter((o) => o.status === 'DELIVERED').length },
                  { key: 'CANCELLED', label: 'Cancelled', count: orders.filter((o) => o.status === 'CANCELLED').length },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setOrderStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      orderStatusFilter === f.key
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        orderStatusFilter === f.key
                          ? 'bg-emerald-950 text-emerald-200'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => fetchOrders()}
                  disabled={isLoadingOrders}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700 shrink-0"
                  title="Refresh order list now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search order #, customer, phone..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {isLoadingOrders ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading order records...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 text-slate-400 text-xs space-y-3">
                <p>No orders match filter &ldquo;{orderStatusFilter === 'ALL' ? 'All Orders' : orderStatusFilter}&rdquo;.</p>
                {orderStatusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('ALL')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                  >
                    View All Live Orders ({orders.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredOrders.map((order) => {
                  let parsedAddr: any = {};
                  try {
                    if (typeof order.deliveryAddress === 'string') {
                      if (order.deliveryAddress.trim().startsWith('{')) {
                        parsedAddr = JSON.parse(order.deliveryAddress);
                      } else {
                        parsedAddr = { street: order.deliveryAddress };
                      }
                    } else if (order.deliveryAddress) {
                      parsedAddr = order.deliveryAddress;
                    }
                  } catch {
                    parsedAddr = { street: String(order.deliveryAddress || '') };
                  }

                  const customerName = parsedAddr.recipientName || order.user?.name || 'Customer';
                  const customerPhone = parsedAddr.phone || order.user?.phone || 'Not provided';
                  const customerEmail = order.user?.email;

                  return (
                    <div
                      key={order.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors shadow-sm"
                    >
                      {/* TOP ROW: Order Number, Date, Badges & Fulfillment Actions */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-black text-base text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                          {order.paymentMethod === 'COD' ? (
                            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                              💵 Cash on Delivery
                            </span>
                          ) : (
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                              💳 Online Prepaid (Razorpay)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Payment Status Dropdown */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400 text-[11px]">Payment:</span>
                            <select
                              value={order.paymentStatus}
                              onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border bg-slate-800 ${
                                order.paymentStatus === 'PAID'
                                  ? 'text-emerald-400 border-emerald-700'
                                  : 'text-amber-400 border-amber-700'
                              }`}
                            >
                              <option value="PENDING">PENDING (COD)</option>
                              <option value="PAID">PAID (Verified)</option>
                              <option value="FAILED">FAILED</option>
                              <option value="REFUNDED">REFUNDED</option>
                            </select>
                          </div>

                          {/* Fulfillment Status Dropdown */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400 text-[11px]">Status:</span>
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                                order.status === 'DELIVERED'
                                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                                  : order.status === 'CANCELLED'
                                  ? 'bg-red-950 border-red-800 text-red-300'
                                  : 'bg-emerald-950 border-emerald-700 text-emerald-300'
                              }`}
                            >
                              <option value="PLACED">PLACED</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="PREPARING">PREPARING (Kitchen)</option>
                              <option value="DISPATCHED">DISPATCHED (Hub)</option>
                              <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </div>

                          {/* Quick 1-Click Status Action: Prominently show 'Mark Delivered' for active deliveries */}
                          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer"
                              title="Press to mark this order as DELIVERED & reduce active delivery count"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 stroke-[2.5]" />
                              <span>Mark Delivered</span>
                            </button>
                          ) : order.status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-black shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Delivered ✓</span>
                            </span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
                            title="Generate & View Official Tax Invoice"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>

                      {/* PROMINENT DELIVERY ADDRESS & CUSTOMER INFO CARD */}
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Customer & Address Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                                Customer &amp; Delivery Destination
                              </span>
                              {parsedAddr.tag && (
                                <span className="bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                  {parsedAddr.tag}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="font-bold text-white text-sm">
                              {customerName}
                            </div>

                            {/* Full Address Block */}
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1 leading-relaxed">
                              {parsedAddr.houseNumber && (
                                <div className="font-semibold text-white">
                                  {parsedAddr.houseNumber}
                                </div>
                              )}
                              {parsedAddr.street && (
                                <div className="text-slate-300">
                                  {parsedAddr.street}
                                </div>
                              )}
                              <div className="text-emerald-400 font-semibold">
                                {[parsedAddr.area, parsedAddr.city || 'Bengaluru', parsedAddr.pincode].filter(Boolean).join(', ')}
                              </div>
                            </div>

                            {/* Contact Links */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                              <a
                                href={`tel:${customerPhone}`}
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono font-bold hover:underline"
                                title="Click to Call Customer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {customerPhone}
                              </a>
                              {customerEmail && (
                                <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] truncate">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  {customerEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Scheduled Slot, Notes & Doorstep Payment Info */}
                        <div className="space-y-3 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              Scheduled Delivery Window
                            </span>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs">
                              <div className="text-white font-semibold">
                                {order.deliveryDate || 'Today'} &bull; {order.deliverySlot}
                              </div>
                              {order.orderNotes ? (
                                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-amber-300 flex items-start gap-1.5">
                                  <span className="font-bold shrink-0">Delivery Note:</span>
                                  <span className="italic">&ldquo;{order.orderNotes}&rdquo;</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-500 mt-1">No special delivery instructions provided.</div>
                              )}
                            </div>
                          </div>

                          {/* Doorstep Payment Collection Alert */}
                          {order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? (
                            <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div>
                                <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                  💵 Cash on Delivery (Payment Due)
                                </div>
                                <div className="text-[11px] text-amber-200/90 mt-0.5">
                                  Collect <strong className="text-white font-mono text-sm">₹{order.totalAmount.toFixed(2)}</strong> at customer doorstep
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdatePaymentStatus(order.id, 'PAID')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg text-xs transition shrink-0 shadow-sm"
                              >
                                Mark Paid &amp; Collected
                              </button>
                            </div>
                          ) : (
                            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <span className="font-bold">Payment Settled (PAID)</span>
                                {order.razorpayPaymentId ? (
                                  <span className="block text-[10px] text-slate-400 font-mono">
                                    Razorpay Payment ID: {order.razorpayPaymentId}
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-emerald-400">
                                    Cash collected / Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ORDER ITEMS LIST */}
                      <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                          Ordered Items ({order.items.length})
                        </div>
                        <div className="divide-y divide-slate-800 text-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {item.productImage && (
                                  <div className="w-9 h-9 rounded-lg overflow-hidden relative shrink-0 border border-slate-800">
                                    <Image
                                      src={item.productImage}
                                      alt={item.productName}
                                      width={36}
                                      height={36}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-white">{item.productName}</span>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                                    <span>Weight: <strong className="text-emerald-400">{item.selectedWeight}</strong></span>
                                    {item.selectedCut && (
                                      <span>Cut: <strong className="text-amber-400">{item.selectedCut}</strong></span>
                                    )}
                                    <span>Qty: {item.quantity} &times; ₹{item.unitPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-white">₹{item.totalPrice.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BOTTOM FINANCIAL SUMMARY ROW */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800">
                        <div className="text-slate-400">
                          Subtotal: ₹{order.subtotal.toFixed(2)} &bull; Delivery: {order.deliveryFee === 0 ? <strong className="text-emerald-400">FREE</strong> : `₹${order.deliveryFee.toFixed(2)}`} &bull; Discount: -₹{order.discount.toFixed(2)}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-xs mr-2">Grand Total:</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">
                            ₹{order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADVANCED CATEGORY & PRODUCT MANAGEMENT */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            {/* 4 Quick Category Add Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { slug: 'fresh-milk-dairy', label: 'Fresh Milk & Dairy', icon: '🥛', desc: 'Raw milk, curd, ghee, paneer' },
                { slug: 'fresh-chicken', label: 'Fresh Chicken', icon: '🍗', desc: 'Curry cut, boneless, whole' },
                { slug: 'fresh-meat', label: 'Fresh Meat (Mutton)', icon: '🥩', desc: 'Biryani cut, curry cut, chops' },
                { slug: 'fresh-vegetables', label: 'Fresh Vegetables', icon: '🥬', desc: 'Farm fresh greens, tomatoes' },
              ].map((catPreset) => {
                const targetCat = categories.find((c) => c.slug === catPreset.slug || c.id === catPreset.slug);
                return (
                  <button
                    key={catPreset.slug}
                    type="button"
                    onClick={() => handleOpenAddProduct(targetCat?.id || catPreset.slug)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-850 text-left transition-all group shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{catPreset.icon}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold group-hover:bg-emerald-500 group-hover:text-emerald-950 transition">
                        + Add
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block group-hover:text-emerald-300 transition">
                        + {catPreset.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {catPreset.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Category Navigation Bar & Quick Add Button */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Category Organization &amp; Filtering
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a category to inspect inventory, edit stock levels, or add new items with tailored presets.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                    New Category
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddProduct()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black transition shadow-lg shadow-emerald-950/40"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add New Product</span>
                  </button>
                </div>
              </div>

              {/* Category Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                <button
                  onClick={() => setProductCategoryFilter('ALL')}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                    productCategoryFilter === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>All Categories</span>
                  <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.2 rounded-full font-mono">
                    {products.length}
                  </span>
                </button>

                {categories.map((c) => {
                  const count = products.filter((p) => p.categoryId === c.id).length;
                  const isSelected = productCategoryFilter === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setProductCategoryFilter(c.id)}
                      className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Filters: Stock status and Product search */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-slate-400 font-semibold text-[11px]">Stock Status:</span>
                  {(['ALL', 'LOW', 'OUT'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setProductStockFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        productStockFilter === s
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s === 'ALL' && 'All Stock'}
                      {s === 'LOW' && 'Low Stock (≤10)'}
                      {s === 'OUT' && 'Out of Stock (0)'}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product title..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Products Table with Quick Maintenance Tools */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price &amp; Base Unit</th>
                      <th className="py-3 px-4">Stock Level</th>
                      <th className="py-3 px-4">Visibility &amp; Home</th>
                      <th className="py-3 px-4 text-right">Maintenance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No products found in this category matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const cat = categories.find((c) => c.id === prod.categoryId);
                        return (
                          <tr key={prod.id} className="hover:bg-slate-850 transition-colors">
                            {/* Product Title, Image & Badges */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 relative shrink-0 border border-slate-700">
                                  <Image
                                    src={prod.image}
                                    alt={prod.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 max-w-xs">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-white text-sm truncate">{prod.name}</p>
                                    {prod.isFeatured && (
                                      <span title="Featured on Homepage">
                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    {prod.badge && (
                                      <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                        {prod.badge}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                      {prod.optionsJson ? `${JSON.parse(prod.optionsJson || '[]').length} pack sizes` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category Dropdown (for quick re-assignment) */}
                            <td className="py-3 px-4">
                              <select
                                value={prod.categoryId}
                                onChange={(e) => handleReassignCategory(prod, e.target.value)}
                                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Base Price */}
                            <td className="py-3 px-4">
                              <div className="font-mono">
                                <span className="text-sm font-bold text-emerald-400">
                                  ₹{prod.basePrice.toFixed(2)}
                                </span>
                                <span className="text-slate-500 text-[11px] block">
                                  per {prod.unit}
                                </span>
                              </div>
                            </td>

                            {/* Stock with 1-Click Quick Restock Buttons */}
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <span
                                  className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                    prod.stockQuantity <= 0
                                      ? 'bg-red-950 text-red-400 border border-red-800'
                                      : prod.stockQuantity <= 10
                                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                      : 'bg-slate-800 text-slate-200'
                                  }`}
                                >
                                  {prod.stockQuantity} {prod.unit}
                                </span>

                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <span>Add:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustStock(prod, 10)}
                                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 rounded border border-slate-700 font-mono"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustStock(prod, 50)}
                                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 rounded border border-slate-700 font-mono"
                                  >
                                    +50
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Availability & Featured Switch */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductStock(prod)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                    prod.isAvailable
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-red-950 text-red-400 border border-red-800'
                                  }`}
                                  title="Toggle Customer Availability"
                                >
                                  {prod.isAvailable ? 'In Stock' : 'Disabled'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleFeatured(prod)}
                                  className={`p-1.5 rounded-lg border transition ${
                                    prod.isFeatured
                                      ? 'bg-amber-950 text-amber-400 border-amber-800'
                                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                                  }`}
                                  title={prod.isFeatured ? 'Featured on Homepage (Click to unfeature)' : 'Mark as Featured on Homepage'}
                                >
                                  <Star className={`w-3.5 h-3.5 ${prod.isFeatured ? 'fill-amber-400' : ''}`} />
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/products/${prod.slug}`}
                                  target="_blank"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  title="Preview in Store"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProduct(prod)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900 hover:text-emerald-300 text-slate-300"
                                  title="Edit Product"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 hover:text-red-300 text-slate-400"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMER DIRECTORY */}
        {activeTab === 'CUSTOMERS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Registered Bengaluru Customers</h3>
              <p className="text-xs text-slate-400">Customer profiles, total orders, and delivery addresses</p>
            </div>

            {isLoadingCustomers ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No customers registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Email &amp; Mobile</th>
                      <th className="py-3 px-4">Primary Area</th>
                      <th className="py-3 px-4">Orders Placed</th>
                      <th className="py-3 px-4">Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-850">
                        <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                        <td className="py-3 px-4">
                          <p className="text-slate-300">{c.email}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{c.phone}</p>
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">{c.primaryArea}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white">{c.orderCount} orders</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          ₹{c.totalSpend.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STORE SETTINGS */}
        {activeTab === 'SETTINGS' && settings && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">Namma Dairy Store Configuration</h3>
              <p className="text-xs text-slate-400">Delivery fees, minimum order rules, and payment toggles</p>
            </div>

            {settingsSavedMessage && (
              <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{settingsSavedMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    value={settings.minOrderValue}
                    onChange={(e) => setSettings({ ...settings, minOrderValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Customer cannot checkout below this.</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Standard Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={settings.deliveryFee}
                    onChange={(e) => setSettings({ ...settings, deliveryFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Orders at or above this receive FREE delivery.</span>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isStoreOpen}
                    onChange={(e) => setSettings({ ...settings, isStoreOpen: e.target.checked })}
                    className="rounded text-emerald-600 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Store Open for Orders</span>
                    <span className="text-[11px] text-slate-400">Accepting orders right now across Bengaluru</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isCodEnabled}
                    onChange={(e) => setSettings({ ...settings, isCodEnabled: e.target.checked })}
                    className="rounded text-emerald-600 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Enable Cash on Delivery (COD)</span>
                    <span className="text-[11px] text-slate-400">Allow customers to pay upon delivery arrival</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isRazorpayEnabled}
                    onChange={(e) => setSettings({ ...settings, isRazorpayEnabled: e.target.checked })}
                    className="rounded text-emerald-600 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Enable Razorpay Online Gateway</span>
                    <span className="text-[11px] text-slate-400">Accept UPI, Credit/Debit cards &amp; NetBanking</span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                {isSavingSettings ? 'Saving Settings...' : 'Save & Update Store Settings'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* CATEGORY-SMART ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                {editingProduct ? `Edit Product: ${editingProduct.name}` : `Add New Product to ${currentCategoryName}`}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Category Selector with intelligence */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Target Category
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Presets automatically adapt
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((c) => {
                    const isSelected = formCategoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCategoryChangeInModal(c.id)}
                        className={`p-2.5 rounded-xl text-center border transition font-bold text-xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-750'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    placeholder="e.g. Free-Range Country Chicken"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    placeholder="e.g. 100% Pure, Antibiotic Free"
                  />
                  {/* Category Quick Badges */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {currentCategoryPreset?.badges.map((b) => (
                      <span
                        key={b}
                        onClick={() => setFormBadge(b)}
                        className="cursor-pointer text-[10px] bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700"
                      >
                        +{b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  placeholder="Sourcing farm, preparation, shelf life..."
                />
              </div>

              {/* Pricing, Unit, Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    placeholder="1 kg, 1 Litre..."
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Stock Count</label>
                  <input
                    type="number"
                    required
                    value={formStockQuantity}
                    onChange={(e) => setFormStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              {/* Fractional Weights Pill Selector */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Weight className="w-3.5 h-3.5 text-emerald-400" />
                    Available Pack Sizes &amp; Fractions
                  </label>
                  <span className="text-[10px] text-slate-400">Click pills to toggle</span>
                </div>

                {/* Pre-set options toggle */}
                <div className="flex flex-wrap gap-1.5">
                  {(['250g', '500g', '1 kg', '2 kg', '5 kg', '500ml', '1 Litre', '2 Litres', '1 Pack'] as const).map((w) => {
                    const isSelected = formSelectedWeights.includes(w);
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (formSelectedWeights.length === 1) return;
                            setFormSelectedWeights(formSelectedWeights.filter((item) => item !== w));
                          } else {
                            setFormSelectedWeights([...formSelectedWeights, w]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${w}` : `+ ${w}`}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Weight adder */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add custom pack size (e.g. 750g)..."
                    value={customWeightInput}
                    onChange={(e) => setCustomWeightInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customWeightInput.trim() && !formSelectedWeights.includes(customWeightInput.trim())) {
                        setFormSelectedWeights([...formSelectedWeights, customWeightInput.trim()]);
                        setCustomWeightInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Butcher Cutting Options (only relevant for chicken and meat) */}
              {(currentCategorySlug.includes('chicken') || currentCategorySlug.includes('meat')) ? (
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-rose-950/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-rose-200 font-bold flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      Butchery Preparation Cuts (Customer selectable)
                    </label>
                    <span className="text-[10px] text-rose-300">Click to include</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Curry Cut (Skinless)',
                      'Curry Cut (Skin-on)',
                      'Biryani Cut',
                      'Boneless Cubes',
                      'Chicken Keema',
                      'Minced Mutton (Keema)',
                      'Soup Bones',
                      'Chops & Ribs',
                      'Whole Chicken Cleaned',
                    ].map((cut) => {
                      const isSelected = formSelectedCuts.includes(cut);
                      return (
                        <button
                          key={cut}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormSelectedCuts(formSelectedCuts.filter((c) => c !== cut));
                            } else {
                              setFormSelectedCuts([...formSelectedCuts, cut]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                            isSelected
                              ? 'bg-rose-700 text-white border-rose-600 shadow-sm font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          {isSelected ? `✓ ${cut}` : `+ ${cut}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom cutting style..."
                      value={customCutInput}
                      onChange={(e) => setCustomCutInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCutInput.trim() && !formSelectedCuts.includes(customCutInput.trim())) {
                          setFormSelectedCuts([...formSelectedCuts, customCutInput.trim()]);
                          setCustomCutInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 text-xs font-bold"
                    >
                      Add Cut
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-500 text-xs italic flex items-center gap-2">
                  <span>ℹ️ Butchery cutting options are not applicable for {currentCategoryName}.</span>
                </div>
              )}

              {/* Image URL & Live Preview */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Image URL &amp; Live Preview</label>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 relative shrink-0">
                    {formImage ? (
                      <Image
                        src={formImage}
                        alt="Product preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                      placeholder="https://images.unsplash.com/..."
                    />
                    {/* Sample Image Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] text-slate-400">Sample Photos:</span>
                      {currentCategoryPreset?.sampleImages.map((s) => (
                        <span
                          key={s.label}
                          onClick={() => setFormImage(s.url)}
                          className="cursor-pointer text-[10px] text-emerald-400 hover:underline bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="rounded text-emerald-600 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Available for Ordering</span>
                    <span className="text-[10px] text-slate-400">Show on store</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-emerald-600 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Feature on Homepage</span>
                    <span className="text-[10px] text-slate-400">Show in top featured row</span>
                  </div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg"
                >
                  {isSavingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Add to Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-400" />
              Add New Store Category
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Organic Farm Eggs"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCatDescription}
                  onChange={(e) => setNewCatDescription(e.target.value)}
                  placeholder="Brief description for customers..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Hero Image URL</label>
                <input
                  type="text"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Create Category
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
