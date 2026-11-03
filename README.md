# 🥛 Namma Dairy - Online Meat, Milk & Vegetable Delivery

> **"Pure Milk • Healthy Life"**
> Fresh Farm Delivery Platform in Bengaluru, Karnataka

An end-to-end, production-ready e-commerce platform built strictly around the **Namma Dairy** brand identity and visual guidelines.

---

## 🌟 Brand Identity & Highlights

- **Brand Name**: Namma Dairy
- **Tagline**: Pure Milk • Healthy Life
- **Subtitle**: Fresh Milk Direct from Nature
- **Helpline**: `+91 98765 43210`
- **Location**: Bengaluru, Karnataka (Indiranagar, Koramangala, HSR Layout, Whitefield, Jayanagar, Malleshwaram, JP Nagar, etc.)
- **4 Core Pillars**:
  1. 💧 **Pure & Natural** — 100% pure raw unadulterated milk and farm produce.
  2. 🍃 **No Added Preservatives** — Naturally handled without artificial preservatives.
  3. 🐄 **Farm Fresh Milk** — Directly sourced from local Karnataka dairy farmers.
  4. ❤️ **Good for Your Health** — High-protein, nutrient-dense natural food.

---

## 👥 Dual Login Interfaces & Demo Credentials

The platform enforces **strict role-based access control (RBAC)** on both backend APIs and frontend routes.

| Portal | Role | URL | Email | Password | Quick Access |
|---|---|---|---|---|---|
| **Customer Storefront** | Customer | `/login` | `customer@gmail.com` | `customer123` | **1-Click Demo Login button** available on page |
| **Admin Control Hub** | Admin | `/admin/login` | `admin@nammadairy.com` | `admin123` | **1-Click Demo Admin button** available on page |

> 🔒 **Security Notice**: Customers attempting to access `/admin` or administrative APIs are automatically blocked on the server with `403 Forbidden` and redirected.

---

## 🛒 Key Customer Features

1. **Category Catalog**:
   - 🥛 **Fresh Milk & Dairy**: Whole Farm Milk, Buffalo Milk, Farm Ghee, Fresh Malai Paneer, Organic Curd.
   - 🍗 **Fresh Chicken**: Whole Chicken, Country Farm Chicken (Nati Koli), Curry Cut, Tender Boneless Breast, Chicken Keema, Biryani Cut.
   - 🥩 **Fresh Meat**: Pasture-fed Goat Mutton, Ribs & Chops, Tender Keema, Mutton Soup Bones.
   - 🥦 **Fresh Vegetables**: Dawn-harvested Farm Tomatoes, Country Spinach (Palak), Green Chillies, Ginger, Onions.

2. **Fractional Quantities & Live Dynamic Pricing**:
   - Supports **250g, 500g, 1 kg, 2 kg, 500ml, 1 Litre, 2 Litres**.
   - Price updates instantly on the card when weight or quantity changes.

3. **Butchery Cutting & Preparation Options**:
   - Custom cuts: *Curry Cut (Skinless)*, *Curry Cut (Skin-on)*, *Boneless Cubes*, *Biryani Cut*, *Fine Keema/Mince*, *Soup Bones*.

4. **Cart Drawer & Dedicated Cart Page**:
   - Live subtotal calculation.
   - Dynamic **Free Delivery Progress Bar** (Free delivery above ₹499).
   - Promo coupon engine:
     - `NAMMA50`: ₹50 off orders over ₹299.
     - `PUREMILK`: 10% instant discount.
     - `HEALTHY10`: 10% health discount up to ₹100.
   - Minimum order enforcement (₹199).

5. **Bengaluru Delivery Slots & Address Management**:
   - Delivery Windows:
     - *Early Morning (6:00 AM - 8:00 AM)* (Direct farm milking)
     - *Morning (8:30 AM - 11:30 AM)* (Butchery fresh)
     - *Evening (4:00 PM - 7:00 PM)* (Dinner preparation)
     - *Express 90-Min Slot* (Rapid dispatch)
   - Save multiple addresses with labels (`Home`, `Work`, `Other`).

6. **Payment Gateways**:
   - **Cash on Delivery (COD)**: Recorded as pending payment until doorstep delivery.
   - **Razorpay Online Payment**: Integrated payment gateway with simulated UPI (GPay, PhonePe, Paytm, BHIM), Cards & NetBanking with server-side signature verification.

7. **Customer Dashboard & In-App Notifications**:
   - **Visual Status Stepper**: `Placed` ➔ `Confirmed` ➔ `In Kitchen` ➔ `Dispatched` ➔ `Out for Delivery` ➔ `Delivered`.
   - **Downloadable & Printable GST Tax Invoice**.
   - **1-Click Reorder past purchases**.
   - **Cancel eligible orders** with customer reason dialog.
   - **In-App Notification Hub** with unread notification badge counter.

---

## 🛠️ Key Admin Dashboard Features (`/admin`)

1. **Store Performance Metrics (KPIs)**:
   - Total Collected Revenue
   - Active / Pending Deliveries
   - Completed Orders
   - Low Stock Inventory Warnings

2. **Order Fulfillment Workflow**:
   - Filter by status (`ALL`, `PLACED`, `CONFIRMED`, `PREPARING`, `DISPATCHED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`).
   - Real-time status dropdown: transitioning status automatically triggers in-app notification to the customer.
   - Payment status updater (mark COD as `PAID` upon receipt of cash).
   - View customer contact, delivery instructions, and specific meat cuts.

3. **Inventory & Butchery Cuts Management**:
   - Table of all products with live stock count and availability status.
   - **Add New Product Modal**: upload image, category, fractional weights JSON, custom cutting options JSON, badge, price, and stock.
   - Edit prices and stock quantities.
   - Instant 1-click in-stock / out-of-stock toggle.

4. **Customer Database**:
   - View all registered Bengaluru customers, phone numbers, delivery zones, order frequency, and lifetime spend.

5. **Store Operations & Pricing Settings**:
   - Minimum order value configuration (default: ₹199).
   - Delivery fee rules (default: ₹35).
   - Free delivery threshold (default: ₹499).
   - Store open/closed toggle.
   - COD & Razorpay toggles.

---

## 🚀 Running the Project Locally

### 1. Requirements
- Node.js 18+ (tested on Node v24)
- npm 9+

### 2. Installation & Setup
```bash
# Navigate to the project directory
cd namma-dairy

# Install dependencies (already installed)
npm install

# Initialize Prisma SQLite Database & Seed Data
npx prisma db push
node prisma/seed.js

# Start Next.js Development Server
npm run dev
```

Visit **http://localhost:3000** in your web browser.

---

## 📂 Project Architecture

```
namma-dairy/
├── prisma/
│   ├── schema.prisma        # SQLite schema (User, Address, Category, Product, Order, Notification, StoreSetting)
│   ├── seed.js              # Database seeder with 21 farm products, categories, demo users
│   └── dev.db               # SQLite zero-config database
├── public/
│   └── namma-dairy-brand.jpg# Source branding card
├── src/
│   ├── app/
│   │   ├── page.tsx         # Brand homepage with hero, categories, featured cuts
│   │   ├── products/
│   │   │   ├── page.tsx     # Full product catalog with filters & search
│   │   │   └── [slug]/      # Product detail page with cuts & weight selector
│   │   ├── cart/page.tsx    # Full basket checkout review
│   │   ├── checkout/        # Address selector, slot picker, COD / Razorpay modal
│   │   ├── order-confirmation/[orderId]/ # Order placed celebration & invoice
│   │   ├── account/page.tsx # Customer order tracking, addresses & notification hub
│   │   ├── login/page.tsx   # Customer login / register with 1-click demo button
│   │   ├── admin/
│   │   │   ├── login/       # Protected admin login with 1-click demo button
│   │   │   └── page.tsx     # Full administrative control dashboard
│   │   └── api/             # Secure REST APIs with JWT & RBAC
│   ├── components/
│   │   ├── NammaLogo.tsx    # Custom SVG logo matching the branding card
│   │   ├── Navbar.tsx       # Live search, cart counter, notification badge
│   │   ├── Footer.tsx       # 4 trust pillars, Bengaluru service zones, helpline
│   │   ├── ProductCard.tsx  # Dynamic price math, weight fraction pills, cut picker
│   │   ├── CartDrawer.tsx   # Slide-over cart with free delivery meter
│   │   └── InvoiceModal.tsx # Printable official GST invoice
│   └── context/
│       ├── AuthContext.tsx  # Customer & Admin session state
│       ├── CartContext.tsx  # Weight math, coupon logic & storage
│       └── NotificationContext.tsx # Live unread alerts & notifications
```
