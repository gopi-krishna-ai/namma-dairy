const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Namma Dairy Database...');

  // 1. Clean existing records
  await prisma.notification.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.storeSetting.deleteMany({});

  // 2. Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Namma Dairy Admin',
      email: 'admin@nammadairy.com',
      phone: '+91 98765 43210',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Ananya Sharma',
      email: 'customer@gmail.com',
      phone: '+91 98450 12345',
      password: customerPassword,
      role: 'CUSTOMER',
      addresses: {
        create: [
          {
            tag: 'Home',
            recipientName: 'Ananya Sharma',
            phone: '+91 98450 12345',
            houseNumber: 'Flat 302, Green Meadows',
            street: '12th Main Road, HAL 2nd Stage',
            area: 'Indiranagar',
            city: 'Bengaluru',
            pincode: '560038',
            isDefault: true,
          },
          {
            tag: 'Work',
            recipientName: 'Ananya Sharma',
            phone: '+91 98450 12345',
            houseNumber: 'Tower B, 4th Floor',
            street: 'Prestige Tech Park, Outer Ring Road',
            area: 'Marathahalli - Bellandur',
            city: 'Bengaluru',
            pincode: '560103',
            isDefault: false,
          },
        ],
      },
    },
  });

  console.log('Created Users: Admin & Customer');

  // 4. Create Categories
  const catDairy = await prisma.category.create({
    data: {
      name: 'Fresh Milk & Dairy',
      slug: 'fresh-milk-dairy',
      description: 'Pure, unadulterated farm fresh milk, desi ghee, paneer, and curd delivered within hours of morning milking.',
      icon: 'MilkWashing',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
      orderIndex: 1,
    },
  });

  const catChicken = await prisma.category.create({
    data: {
      name: 'Fresh Chicken',
      slug: 'fresh-chicken',
      description: '100% antibiotic-residue-free chicken, processed hygienically and freshly cut to your culinary preference.',
      icon: 'Drumstick',
      image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80',
      orderIndex: 2,
    },
  });

  const catMeat = await prisma.category.create({
    data: {
      name: 'Fresh Meat',
      slug: 'fresh-meat',
      description: 'Pasture-fed tender mutton, goat, and prime cuts expertly trimmed, vacuum sealed, and chilled fresh.',
      icon: 'Beef',
      image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80',
      orderIndex: 3,
    },
  });

  const catVeg = await prisma.category.create({
    data: {
      name: 'Fresh Vegetables',
      slug: 'fresh-vegetables',
      description: 'Directly sourced from Karnataka farm clusters. Crisp, naturally grown veggies harvested daily at dawn.',
      icon: 'Carrot',
      image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=800&q=80',
      orderIndex: 4,
    },
  });

  console.log('Created 4 Categories');

  // 5. Create Products
  const productsData = [
    // --- Fresh Milk & Dairy ---
    {
      name: 'Namma Farm Fresh Cow Milk',
      slug: 'namma-farm-fresh-cow-milk',
      description: 'Raw, pure, unpasteurized whole cow milk. Chilled immediately after milking and delivered fresh to your doorstep in glass bottles.',
      categoryId: catDairy.id,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
      badge: 'Farm Fresh Daily',
      basePrice: 68.0,
      unit: 'litre',
      stockQuantity: 120,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['500ml', '1 Litre', '2 Litres']),
      cuttingOptionsJson: null,
    },
    {
      name: 'A2 Desi Gir Cow Milk',
      slug: 'a2-desi-gir-cow-milk',
      description: 'Certified 100% pure A2 beta-casein milk from indigenous grass-fed Gir cows. Easy on digestion, exceptionally wholesome and nutrient rich.',
      categoryId: catDairy.id,
      image: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=800&q=80',
      badge: 'A2 Certified',
      basePrice: 110.0,
      unit: 'litre',
      stockQuantity: 65,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['500ml', '1 Litre', '2 Litres']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Farm Fresh Buffalo Milk',
      slug: 'farm-fresh-buffalo-milk',
      description: 'High fat (7.5%+), rich, thick and creamy buffalo milk. Ideal for making traditional filter coffee, rich curd, and homemade sweets.',
      categoryId: catDairy.id,
      image: 'https://images.unsplash.com/photo-1568651318029-7d07936087b3?auto=format&fit=crop&w=800&q=80',
      badge: 'High Cream',
      basePrice: 78.0,
      unit: 'litre',
      stockQuantity: 80,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['500ml', '1 Litre']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Traditional Bilona Desi Cow Ghee',
      slug: 'traditional-bilona-desi-cow-ghee',
      description: 'Handcrafted using ancient Vedic Bilona method from curd cultured milk. Granular texture, divine aroma, zero artificial flavor or color.',
      categoryId: catDairy.id,
      image: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=800&q=80',
      badge: 'Vedic Bilona',
      basePrice: 850.0,
      unit: 'pack',
      stockQuantity: 40,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['250g Jar', '500g Jar', '1kg Jar']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Fresh Malai Paneer',
      slug: 'fresh-malai-paneer',
      description: 'Melt-in-mouth cottage cheese crafted from pure whole milk without any starch or preservatives. Soft, juicy, and rich in protein.',
      categoryId: catDairy.id,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
      badge: 'Super Soft',
      basePrice: 140.0,
      unit: 'pack',
      stockQuantity: 90,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['200g Pack', '500g Pack', '1kg Pack']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Thick Farm Curd / Dahi',
      slug: 'thick-farm-curd-dahi',
      description: 'Naturally set thick curd made from fresh whole cow milk. Creamy texture with natural probiotic active cultures.',
      categoryId: catDairy.id,
      image: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=800&q=80',
      badge: 'Probiotic Rich',
      basePrice: 45.0,
      unit: 'pack',
      stockQuantity: 110,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['500g Tub', '1kg Tub']),
      cuttingOptionsJson: null,
    },

    // --- Fresh Chicken ---
    {
      name: 'Tender Farm Broiler Chicken',
      slug: 'tender-farm-broiler-chicken',
      description: 'Tender, juicy, 100% grain-fed broiler chicken. Raised humanely in biosecure farms with zero antibiotics or hormone promoters.',
      categoryId: catChicken.id,
      image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80',
      badge: 'Antibiotic-Free',
      basePrice: 220.0,
      unit: 'kg',
      stockQuantity: 75,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['500g', '1 kg', '2 kg']),
      cuttingOptionsJson: JSON.stringify(['Curry Cut (Skinless)', 'Curry Cut (With Skin)', 'Biryani Cut (Large Pieces)', 'Whole Bird Cleaned']),
    },
    {
      name: 'Country Chicken / Nati Koli',
      slug: 'country-chicken-nati-koli',
      description: 'Authentic free-range country fowl (Nati Koli). Firmer muscle, deep rustic flavor, and high nutritional density beloved in Karnataka curries.',
      categoryId: catChicken.id,
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80',
      badge: 'Authentic Nati Koli',
      basePrice: 460.0,
      unit: 'kg',
      stockQuantity: 45,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['500g', '1 kg']),
      cuttingOptionsJson: JSON.stringify(['Traditional Curry Cut', 'Biryani Cut', 'Skinless Curry Cut']),
    },
    {
      name: 'Fresh Chicken Breast Boneless',
      slug: 'fresh-chicken-breast-boneless',
      description: 'Ultra-lean, high-protein tender chicken fillets. Hand-trimmed of fat, ideal for grills, stir-fries, meal preps, and healthy diets.',
      categoryId: catChicken.id,
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80',
      badge: 'High Protein',
      basePrice: 340.0,
      unit: 'kg',
      stockQuantity: 60,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['250g', '500g', '1 kg']),
      cuttingOptionsJson: JSON.stringify(['Whole Fillets', 'Bite-Sized Cubes', 'Thin Strips']),
    },
    {
      name: 'Juicy Chicken Drumsticks',
      slug: 'juicy-chicken-drumsticks',
      description: 'Plump and meaty bone-in drumsticks. Perfectly scored for marination, grilling, tandoor, or rich slow-cooked chicken curries.',
      categoryId: catChicken.id,
      image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80',
      badge: 'Party Cut',
      basePrice: 280.0,
      unit: 'kg',
      stockQuantity: 50,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['500g (approx 4-5 pcs)', '1 kg (approx 8-10 pcs)']),
      cuttingOptionsJson: JSON.stringify(['Skinless Trimmed', 'Skin On']),
    },
    {
      name: 'Fresh Chicken Keema / Mince',
      slug: 'fresh-chicken-keema-mince',
      description: 'Finely ground boneless chicken mince. Perfect for making homemade chicken patties, kebabs, samosas, and flavorful keema masala.',
      categoryId: catChicken.id,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      badge: 'Finely Ground',
      basePrice: 320.0,
      unit: 'kg',
      stockQuantity: 40,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['250g', '500g', '1 kg']),
      cuttingOptionsJson: null,
    },

    // --- Fresh Meat (Mutton / Goat) ---
    {
      name: 'Tender Goat Mutton - Curry Cut',
      slug: 'tender-goat-mutton-curry-cut',
      description: 'Freshly cut succulent meat from young, pasture-raised goats. Balanced mix of bone and prime meat pieces for rich Sunday gravies.',
      categoryId: catMeat.id,
      image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80',
      badge: 'Tender Young Goat',
      basePrice: 790.0,
      unit: 'kg',
      stockQuantity: 55,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['250g', '500g', '1 kg']),
      cuttingOptionsJson: JSON.stringify(['Medium Curry Cut', 'Small Curry Cut', 'Fat-Trimmed Cut']),
    },
    {
      name: 'Mutton Biryani Cut (Rich Bone-In)',
      slug: 'mutton-biryani-cut-rich-bone-in',
      description: 'Specially selected larger cuts from shoulder and leg. Retains juicy marrow and tender texture through long dum biryani cooking.',
      categoryId: catMeat.id,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      badge: 'Chef Special',
      basePrice: 840.0,
      unit: 'kg',
      stockQuantity: 45,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['500g', '1 kg', '2 kg']),
      cuttingOptionsJson: JSON.stringify(['Biryani Cut (Large)', 'Biryani Cut (Medium)']),
    },
    {
      name: 'Boneless Goat Mutton',
      slug: 'boneless-goat-mutton',
      description: '100% prime boneless cuts hand-carved from the leg and shoulder. Pure, tender, high-yield meat for roasts, boti kebabs, and stews.',
      categoryId: catMeat.id,
      image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
      badge: 'Zero Bone Waste',
      basePrice: 960.0,
      unit: 'kg',
      stockQuantity: 30,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['250g', '500g', '1 kg']),
      cuttingOptionsJson: JSON.stringify(['Bite-Sized Cubes', 'Curry Cut Boneless', 'Steak Slices']),
    },
    {
      name: 'Mutton Nalli & Soup Marrow Bones',
      slug: 'mutton-nalli-soup-marrow-bones',
      description: 'Rich shank and marrow bones packed with collagen and mineral-dense marrow. Essential for Paya soup, Nihari, and therapeutic bone broth.',
      categoryId: catMeat.id,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      badge: 'Nutrient Dense',
      basePrice: 420.0,
      unit: 'kg',
      stockQuantity: 35,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['500g Pack', '1 kg Pack']),
      cuttingOptionsJson: JSON.stringify(['Soup Cut (Short)', 'Full Shank Cut']),
    },

    // --- Fresh Vegetables ---
    {
      name: 'Farm Fresh Bengaluru Tomatoes',
      slug: 'farm-fresh-bengaluru-tomatoes',
      description: 'Vine-ripened, naturally grown local tomatoes. Firm, juicy with the perfect tang for sambar, rasam, and everyday curries.',
      categoryId: catVeg.id,
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
      badge: 'Harvested Today',
      basePrice: 38.0,
      unit: 'kg',
      stockQuantity: 150,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['500g', '1 kg', '2 kg']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Crispy Nashik Red Onions',
      slug: 'crispy-nashik-red-onions',
      description: 'Crisp, firm, pungent red onions. Essential kitchen staple for gravies, tadkas, salads, and biryani garnishes.',
      categoryId: catVeg.id,
      image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
      badge: 'Kitchen Essential',
      basePrice: 42.0,
      unit: 'kg',
      stockQuantity: 180,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['1 kg', '2 kg', '5 kg Bag']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Fresh Farm Spinach / Palak',
      slug: 'fresh-farm-spinach-palak',
      description: 'Fresh tender green spinach leaves harvested early morning from Hoskote farm belts. Washed, soil-free, and nutrient packed.',
      categoryId: catVeg.id,
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=80',
      badge: 'Farm Greens',
      basePrice: 25.0,
      unit: 'bunch',
      stockQuantity: 95,
      isAvailable: true,
      isFeatured: true,
      optionsJson: JSON.stringify(['1 Bunch (250g)', '2 Bunches (500g)']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Crunchy French Beans',
      slug: 'crunchy-french-beans',
      description: 'Crisp, slender, tender green beans. Stringless, hand-picked, and delicious in stir-fries, poriyal, and mixed vegetable curries.',
      categoryId: catVeg.id,
      image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=80',
      badge: 'Fresh Pick',
      basePrice: 54.0,
      unit: 'pack',
      stockQuantity: 70,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['250g Pack', '500g Pack', '1 kg Pack']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Sweet Ooty Carrots',
      slug: 'sweet-ooty-carrots',
      description: 'Naturally sweet, crunchy high-altitude Ooty carrots. Deep orange color, rich in beta-carotene, ideal for raw salads, juices, and halwa.',
      categoryId: catVeg.id,
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?auto=format&fit=crop&w=800&q=80',
      badge: 'Ooty Grown',
      basePrice: 48.0,
      unit: 'pack',
      stockQuantity: 85,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['500g Pack', '1 kg Pack']),
      cuttingOptionsJson: null,
    },
    {
      name: 'Kitchen Aromatics: Green Chilli & Ginger Pack',
      slug: 'kitchen-aromatics-chilli-ginger',
      description: 'Fresh fiery green chillies and fragrant organic ginger roots. Freshly packed combo for everyday aromatic Indian seasoning.',
      categoryId: catVeg.id,
      image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
      badge: 'Combo Saver',
      basePrice: 35.0,
      unit: 'pack',
      stockQuantity: 120,
      isAvailable: true,
      isFeatured: false,
      optionsJson: JSON.stringify(['200g Combo Pack']),
      cuttingOptionsJson: null,
    },
  ];

  for (const p of productsData) {
    await prisma.product.create({ data: p });
  }

  console.log(`Created ${productsData.length} Sample Products across 4 Categories`);

  // 6. Create Default Store Settings
  await prisma.storeSetting.create({
    data: {
      id: 'default',
      storeName: 'Namma Dairy',
      tagline: 'Pure Milk • Healthy Life',
      location: 'Bengaluru, Karnataka',
      phone: '+91 98765 43210',
      email: 'care@nammadairy.com',
      minOrderValue: 199.0,
      deliveryFee: 35.0,
      freeDeliveryThreshold: 499.0,
      isStoreOpen: true,
      isCodEnabled: true,
      isRazorpayEnabled: true,
      deliverySlotsJson: JSON.stringify([
        'Early Morning (6:00 AM - 8:00 AM)',
        'Morning Slot (8:30 AM - 11:30 AM)',
        'Evening Slot (4:00 PM - 7:00 PM)',
        'Express Delivery (Within 60 Mins)',
      ]),
    },
  });

  // 7. Seed Initial Order & Notification for Customer
  const sampleProduct1 = await prisma.product.findFirst({ where: { slug: 'namma-farm-fresh-cow-milk' } });
  const sampleProduct2 = await prisma.product.findFirst({ where: { slug: 'tender-farm-broiler-chicken' } });

  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ND-2026-7842',
      userId: customer.id,
      status: 'DISPATCHED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: 508.0,
      deliveryFee: 0.0,
      discount: 50.0,
      totalAmount: 458.0,
      deliveryAddress: JSON.stringify({
        recipientName: 'Ananya Sharma',
        phone: '+91 98450 12345',
        houseNumber: 'Flat 302, Green Meadows',
        street: '12th Main Road, HAL 2nd Stage',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
      }),
      deliverySlot: 'Morning Slot (8:30 AM - 11:30 AM)',
      deliveryDate: 'Today',
      orderNotes: 'Please ring bell twice upon arrival',
      items: {
        create: [
          {
            productId: sampleProduct1.id,
            productName: sampleProduct1.name,
            productImage: sampleProduct1.image,
            unit: 'litre',
            selectedWeight: '2 Litres',
            selectedCut: null,
            unitPrice: 136.0,
            quantity: 1,
            totalPrice: 136.0,
          },
          {
            productId: sampleProduct2.id,
            productName: sampleProduct2.name,
            productImage: sampleProduct2.image,
            unit: 'kg',
            selectedWeight: '1 kg',
            selectedCut: 'Curry Cut (Skinless)',
            unitPrice: 220.0,
            quantity: 1,
            totalPrice: 220.0,
          },
        ],
      },
    },
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        title: 'Order Dispatched 🚚',
        message: 'Your order #ND-2026-7842 is out for delivery with our fresh delivery associate. Track status in your account.',
        type: 'ORDER_STATUS',
        orderId: order1.id,
        isRead: false,
      },
      {
        userId: customer.id,
        title: 'Order Confirmed ✅',
        message: 'Namma Dairy has received your morning order #ND-2026-7842. Preparing your fresh cuts & pure milk.',
        type: 'ORDER_STATUS',
        orderId: order1.id,
        isRead: true,
      },
      {
        userId: customer.id,
        title: 'Welcome to Namma Dairy! 🥛',
        message: 'Enjoy ₹50 OFF on your first fresh grocery order using code NAMMA50 at checkout.',
        type: 'PROMOTION',
        isRead: true,
      },
    ],
  });

  console.log('Seeded Sample Order & Notifications');
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
