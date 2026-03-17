import mongoose from 'mongoose';
import config from './config';
import User from './models/user.model';
import Category from './models/category.model';
import Product from './models/product.model';
import Review from './models/review.model';
import Order from './models/order.model';
import Cart from './models/cart.model';
import { generateSlug } from './utils/helpers';

const seed = async () => {
  try {
    if (!config.database_url) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(config.database_url);
    console.log('MongoDB connected for seeding');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Review.deleteMany({}),
      Order.deleteMany({}),
      Cart.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // ========================
    // 1. Seed Users (2 admin + 3 regular users)
    // ========================
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@nexcart.com',
        password: '123456',
        role: 'ADMIN',
        phone: '+8801711000001',
        address: {
          street: '123 Admin Street',
          city: 'Dhaka',
          state: 'Dhaka',
          zipCode: '1205',
          country: 'Bangladesh',
        },
      },
      {
        name: 'Store Manager',
        email: 'manager@nexcart.com',
        password: '123456',
        role: 'ADMIN',
        phone: '+8801711000002',
      },
      {
        name: 'John Doe',
        email: 'john@nexcart.com',
        password: '123456',
        role: 'USER',
        phone: '+8801711000003',
        address: {
          street: '45 Gulshan Avenue',
          city: 'Dhaka',
          state: 'Dhaka',
          zipCode: '1212',
          country: 'Bangladesh',
        },
      },
      {
        name: 'Jane Smith',
        email: 'jane@nexcart.com',
        password: '123456',
        role: 'USER',
        phone: '+8801711000004',
        address: {
          street: '78 Dhanmondi Road',
          city: 'Dhaka',
          state: 'Dhaka',
          zipCode: '1209',
          country: 'Bangladesh',
        },
      },
      {
        name: 'Bob Wilson',
        email: 'bob@nexcart.com',
        password: '123456',
        role: 'USER',
        phone: '+8801711000005',
        address: {
          street: '12 Banani Lane',
          city: 'Dhaka',
          state: 'Dhaka',
          zipCode: '1213',
          country: 'Bangladesh',
        },
      },
    ]);
    console.log(`Created ${users.length} users`);

    const admin = users[0];
    const john = users[2];
    const jane = users[3];
    const bob = users[4];

    // ========================
    // 2. Seed Categories (8 categories)
    // ========================
    const categoryData = [
      { name: 'Electronics', description: 'Smartphones, laptops, tablets, and electronic gadgets', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661' },
      { name: 'Clothing', description: 'Men and women fashion, casual and formal wear', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8' },
      { name: 'Home & Kitchen', description: 'Furniture, appliances, and kitchen essentials', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136' },
      { name: 'Books', description: 'Fiction, non-fiction, academic, and self-help books', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d' },
      { name: 'Sports & Outdoors', description: 'Sports equipment, fitness gear, and outdoor accessories', image: 'https://images.unsplash.com/photo-1461896836934-bd45ba8c0e78' },
      { name: 'Beauty & Health', description: 'Skincare, makeup, personal care, and wellness products', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348' },
      { name: 'Toys & Games', description: 'Kids toys, board games, puzzles, and educational toys', image: 'https://images.unsplash.com/photo-1558060318-bc5987aa51b4' },
      { name: 'Automotive', description: 'Car accessories, tools, and vehicle maintenance products', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7' },
    ];

    const categories = await Category.create(
      categoryData.map((c) => ({ ...c, slug: generateSlug(c.name), productCount: 0 }))
    );
    console.log(`Created ${categories.length} categories`);

    // ========================
    // 3. Seed Products (25 products)
    // ========================
    const productData = [
      // Electronics (5)
      { title: 'iPhone 15 Pro Max', description: 'Apple iPhone 15 Pro Max with A17 Pro chip, 256GB storage, titanium design, and advanced camera system with 5x optical zoom.', price: 1199, discountPrice: 1099, images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569'], category: categories[0]._id, brand: 'Apple', stock: 50, tags: ['iphone', 'apple', 'smartphone', 'flagship'], specifications: [{ key: 'Storage', value: '256GB' }, { key: 'Chip', value: 'A17 Pro' }, { key: 'Display', value: '6.7 inch Super Retina XDR' }], isFeatured: true },
      { title: 'Samsung Galaxy S24 Ultra', description: 'Samsung Galaxy S24 Ultra with Snapdragon 8 Gen 3, S Pen, 200MP camera, and Galaxy AI features built in for a smarter experience.', price: 1299, discountPrice: 1199, images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c'], category: categories[0]._id, brand: 'Samsung', stock: 40, tags: ['samsung', 'galaxy', 'smartphone', 'android'], specifications: [{ key: 'Storage', value: '256GB' }, { key: 'RAM', value: '12GB' }, { key: 'Camera', value: '200MP' }], isFeatured: true },
      { title: 'MacBook Air M3', description: 'Apple MacBook Air with M3 chip delivers incredible performance with up to 18 hours of battery life in a stunningly thin and light design.', price: 1099, discountPrice: 999, images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8'], category: categories[0]._id, brand: 'Apple', stock: 30, tags: ['macbook', 'laptop', 'apple'], specifications: [{ key: 'Chip', value: 'M3' }, { key: 'RAM', value: '8GB' }, { key: 'Storage', value: '256GB SSD' }], isFeatured: true },
      { title: 'Sony WH-1000XM5 Headphones', description: 'Industry-leading noise canceling headphones with exceptional sound quality, 30-hour battery life, and multipoint connectivity.', price: 399, discountPrice: 349, images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb'], category: categories[0]._id, brand: 'Sony', stock: 80, tags: ['headphones', 'sony', 'noise-canceling', 'wireless'], specifications: [{ key: 'Battery Life', value: '30 hours' }, { key: 'Driver', value: '30mm' }] },
      { title: 'iPad Air 2024', description: 'iPad Air with M2 chip, 11-inch Liquid Retina display, and support for Apple Pencil Pro. Perfect for creativity and productivity on the go.', price: 599, discountPrice: 0, images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0'], category: categories[0]._id, brand: 'Apple', stock: 45, tags: ['ipad', 'tablet', 'apple'], specifications: [{ key: 'Chip', value: 'M2' }, { key: 'Display', value: '11 inch Liquid Retina' }] },

      // Clothing (4)
      { title: 'Classic Fit Cotton Polo Shirt', description: 'Premium cotton polo shirt with a classic fit design. Breathable fabric, ribbed collar, and two-button placket. Available in multiple colors for everyday comfort and style.', price: 49.99, discountPrice: 39.99, images: ['https://images.unsplash.com/photo-1625910513413-5fc08ef22263'], category: categories[1]._id, brand: 'Ralph Lauren', stock: 200, tags: ['polo', 'shirt', 'men', 'casual'], specifications: [{ key: 'Material', value: '100% Cotton' }, { key: 'Fit', value: 'Classic' }] },
      { title: 'Slim Fit Denim Jeans', description: 'Modern slim fit denim jeans crafted from premium stretch denim for all-day comfort. Features a mid-rise waist and tapered leg design.', price: 79.99, discountPrice: 59.99, images: ['https://images.unsplash.com/photo-1542272604-787c3835535d'], category: categories[1]._id, brand: 'Levis', stock: 150, tags: ['jeans', 'denim', 'slim-fit', 'men'], specifications: [{ key: 'Material', value: '98% Cotton, 2% Elastane' }, { key: 'Fit', value: 'Slim' }], isFeatured: true },
      { title: 'Women Floral Summer Dress', description: 'Elegant floral print summer dress with a flattering A-line silhouette. Lightweight and breathable fabric perfect for warm weather occasions.', price: 89.99, discountPrice: 69.99, images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1'], category: categories[1]._id, brand: 'Zara', stock: 100, tags: ['dress', 'women', 'floral', 'summer'] },
      { title: 'Leather Biker Jacket', description: 'Genuine leather biker jacket with asymmetric zip closure, snap-down lapels, and zippered pockets. Timeless rebellious style meets modern craftsmanship.', price: 299.99, discountPrice: 249.99, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5'], category: categories[1]._id, brand: 'H&M', stock: 35, tags: ['jacket', 'leather', 'biker', 'unisex'] },

      // Home & Kitchen (4)
      { title: 'Instant Pot Duo 7-in-1', description: 'Versatile 7-in-1 pressure cooker that replaces 7 kitchen appliances. Features 13 one-touch programs for effortless cooking with consistent delicious results.', price: 89.99, discountPrice: 69.99, images: ['https://images.unsplash.com/photo-1585515320310-259814833e62'], category: categories[2]._id, brand: 'Instant Pot', stock: 60, tags: ['instant-pot', 'pressure-cooker', 'kitchen'], specifications: [{ key: 'Capacity', value: '6 Quart' }, { key: 'Programs', value: '13' }], isFeatured: true },
      { title: 'Dyson V15 Detect Vacuum', description: 'Powerful cordless vacuum cleaner with laser dust detection, piezo sensor, and HEPA filtration. Up to 60 minutes of runtime with intelligent suction power.', price: 749, discountPrice: 649, images: ['https://images.unsplash.com/photo-1558317374-067fb5f30001'], category: categories[2]._id, brand: 'Dyson', stock: 25, tags: ['vacuum', 'dyson', 'cordless', 'cleaning'], specifications: [{ key: 'Runtime', value: '60 minutes' }, { key: 'Filtration', value: 'HEPA' }] },
      { title: 'Memory Foam Mattress Topper', description: 'Premium 3-inch gel-infused memory foam mattress topper for pressure relief and temperature regulation. CertiPUR-US certified for quality and comfort.', price: 149.99, discountPrice: 119.99, images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304'], category: categories[2]._id, brand: 'Sleep Innovations', stock: 70, tags: ['mattress', 'memory-foam', 'bedroom'] },
      { title: 'Nespresso Vertuo Coffee Machine', description: 'Automatic coffee and espresso machine with centrifusion technology. Brews 5 different cup sizes from espresso to alto, with one-touch operation.', price: 199, discountPrice: 169, images: ['https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6'], category: categories[2]._id, brand: 'Nespresso', stock: 40, tags: ['coffee', 'nespresso', 'espresso', 'kitchen'] },

      // Books (3)
      { title: 'Atomic Habits by James Clear', description: 'An easy and proven way to build good habits and break bad ones. This practical guide reveals how tiny changes in behavior can lead to remarkable results over time.', price: 16.99, discountPrice: 11.99, images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c'], category: categories[3]._id, brand: 'Avery Publishing', stock: 300, tags: ['self-help', 'habits', 'bestseller'], isFeatured: true },
      { title: 'Clean Code by Robert C. Martin', description: 'A handbook of agile software craftsmanship that teaches developers how to write code that is clean, readable, and maintainable. A must-read for every programmer.', price: 39.99, discountPrice: 29.99, images: ['https://images.unsplash.com/photo-1532012197267-da84d127e765'], category: categories[3]._id, brand: 'Pearson', stock: 150, tags: ['programming', 'software', 'engineering'] },
      { title: 'The Psychology of Money', description: 'Timeless lessons on wealth, greed, and happiness by Morgan Housel. This book explores how our relationship with money is shaped by personal experience and emotion.', price: 14.99, discountPrice: 0, images: ['https://images.unsplash.com/photo-1592496431122-2349e0fbc666'], category: categories[3]._id, brand: 'Harriman House', stock: 250, tags: ['finance', 'psychology', 'money'] },

      // Sports & Outdoors (3)
      { title: 'Nike Air Zoom Running Shoes', description: 'Lightweight running shoes with responsive Zoom Air cushioning unit and breathable mesh upper. Designed for speed and comfort on every run.', price: 129.99, discountPrice: 99.99, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff'], category: categories[4]._id, brand: 'Nike', stock: 120, tags: ['running', 'shoes', 'nike', 'fitness'], specifications: [{ key: 'Cushioning', value: 'Zoom Air' }, { key: 'Upper', value: 'Engineered Mesh' }], isFeatured: true },
      { title: 'Adjustable Dumbbell Set 50lb', description: 'Space-saving adjustable dumbbell set that replaces 15 sets of weights. Quick-change mechanism lets you switch from 5 to 50 lbs in seconds for a complete home gym workout.', price: 349, discountPrice: 299, images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48'], category: categories[4]._id, brand: 'Bowflex', stock: 30, tags: ['dumbbell', 'weights', 'home-gym', 'fitness'] },
      { title: 'Camping Tent 4-Person', description: 'Waterproof 4-person camping tent with easy setup design. Features double-wall construction, rainfly, and multiple ventilation windows for comfortable outdoor adventures.', price: 199.99, discountPrice: 159.99, images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'], category: categories[4]._id, brand: 'Coleman', stock: 45, tags: ['camping', 'tent', 'outdoor'] },

      // Beauty & Health (3)
      { title: 'CeraVe Moisturizing Cream', description: 'Dermatologist recommended daily moisturizing cream with 3 essential ceramides and hyaluronic acid. Provides 24-hour hydration and helps restore the skin barrier.', price: 18.99, discountPrice: 14.99, images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883'], category: categories[5]._id, brand: 'CeraVe', stock: 200, tags: ['skincare', 'moisturizer', 'cerave'] },
      { title: 'Oral-B Electric Toothbrush', description: 'Smart electric toothbrush with pressure sensor, 3D cleaning action, and Bluetooth connectivity. Removes up to 100% more plaque than a manual toothbrush.', price: 99.99, discountPrice: 79.99, images: ['https://images.unsplash.com/photo-1559591937-abc9fa520e56'], category: categories[5]._id, brand: 'Oral-B', stock: 90, tags: ['toothbrush', 'oral-care', 'electric'] },
      { title: 'Vitamin D3 Supplement 5000 IU', description: 'High potency vitamin D3 supplement for immune support, bone health, and mood regulation. Easy-to-swallow softgels with 360-count supply for a full year.', price: 24.99, discountPrice: 19.99, images: ['https://images.unsplash.com/photo-1550572017-edd951aa8f72'], category: categories[5]._id, brand: 'NatureWise', stock: 500, tags: ['vitamin', 'supplement', 'health'] },

      // Toys & Games (2)
      { title: 'LEGO Star Wars Millennium Falcon', description: 'Iconic LEGO Star Wars Millennium Falcon building set with 1351 pieces. Includes 7 minifigures and detailed interior with cockpit, gunner seat, and cargo hold.', price: 169.99, discountPrice: 139.99, images: ['https://images.unsplash.com/photo-1587654780291-39c9404d7dd0'], category: categories[6]._id, brand: 'LEGO', stock: 55, tags: ['lego', 'star-wars', 'building-set'], isFeatured: true },
      { title: 'Nintendo Switch OLED', description: 'Nintendo Switch OLED model with vibrant 7-inch OLED screen, wide adjustable stand, and enhanced audio. Play at home on TV or on-the-go in handheld mode.', price: 349.99, discountPrice: 319.99, images: ['https://images.unsplash.com/photo-1578303512597-81e6cc155b3e'], category: categories[6]._id, brand: 'Nintendo', stock: 35, tags: ['gaming', 'nintendo', 'switch', 'console'] },
    ];

    const products = await Product.create(
      productData.map((p) => ({
        ...p,
        slug: generateSlug(p.title),
        createdBy: admin._id,
      }))
    );
    console.log(`Created ${products.length} products`);

    // Update category product counts
    const countMap: Record<string, number> = {};
    for (const p of products) {
      const catId = p.category.toString();
      countMap[catId] = (countMap[catId] || 0) + 1;
    }
    await Promise.all(
      Object.entries(countMap).map(([catId, count]) =>
        Category.findByIdAndUpdate(catId, { productCount: count })
      )
    );
    console.log('Updated category product counts');

    // ========================
    // 4. Seed Reviews (15 reviews)
    // ========================
    const reviewData = [
      { userId: john._id, productId: products[0]._id, rating: 5, comment: 'Absolutely love the iPhone 15 Pro Max! The camera quality is insane and the titanium design feels premium.' },
      { userId: jane._id, productId: products[0]._id, rating: 4, comment: 'Great phone overall but the price is a bit steep. Battery life is excellent though.' },
      { userId: bob._id, productId: products[0]._id, rating: 5, comment: 'Best iPhone ever made. The Action button and USB-C are game changers.' },
      { userId: john._id, productId: products[1]._id, rating: 4, comment: 'Samsung Galaxy S24 Ultra is amazing. The S Pen integration and Galaxy AI features are very useful.' },
      { userId: jane._id, productId: products[1]._id, rating: 5, comment: 'Switched from iPhone to this and I am not disappointed. The 200MP camera takes stunning photos.' },
      { userId: bob._id, productId: products[2]._id, rating: 5, comment: 'MacBook Air M3 is incredibly fast and the battery lasts all day. Best laptop for students and professionals.' },
      { userId: john._id, productId: products[2]._id, rating: 4, comment: 'Lightweight and powerful. Only wish it had more than 8GB base RAM.' },
      { userId: jane._id, productId: products[5]._id, rating: 5, comment: 'Perfect polo shirt. The cotton quality is top notch and it fits perfectly.' },
      { userId: bob._id, productId: products[6]._id, rating: 4, comment: 'Great jeans. The stretch denim is very comfortable for all-day wear.' },
      { userId: john._id, productId: products[9]._id, rating: 5, comment: 'The Instant Pot changed how I cook. So many features in one appliance!' },
      { userId: jane._id, productId: products[13]._id, rating: 5, comment: 'Atomic Habits is life-changing. Simple actionable advice that actually works.' },
      { userId: bob._id, productId: products[13]._id, rating: 4, comment: 'Well written and practical. I have already started implementing the habit stacking technique.' },
      { userId: john._id, productId: products[16]._id, rating: 5, comment: 'Best running shoes I have ever owned. The Zoom Air cushioning is incredibly responsive.' },
      { userId: jane._id, productId: products[19]._id, rating: 4, comment: 'Good moisturizer for dry skin. Non-greasy and lasts all day.' },
      { userId: bob._id, productId: products[22]._id, rating: 5, comment: 'My kids spent hours building this. Quality LEGO set with great detail.' },
    ];

    const reviews = await Review.create(reviewData);
    console.log(`Created ${reviews.length} reviews`);

    // Recalculate product ratings
    const reviewedProductIds = [...new Set(reviewData.map((r) => r.productId.toString()))];
    for (const pid of reviewedProductIds) {
      const agg = await Review.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(pid) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg.length > 0) {
        await Product.findByIdAndUpdate(pid, {
          rating: Math.round(agg[0].avg * 10) / 10,
          reviewCount: agg[0].count,
        });
      }
    }
    console.log('Recalculated product ratings');

    // ========================
    // 5. Seed Orders (5 orders in various statuses)
    // ========================
    const now = new Date();
    const orderData = [
      {
        orderNumber: `NC-${now.getFullYear()}0101-00001`,
        userId: john._id,
        items: [
          { productId: products[0]._id, title: products[0].title, price: 1099, quantity: 1, image: products[0].images[0] },
          { productId: products[3]._id, title: products[3].title, price: 349, quantity: 1, image: products[3].images[0] },
        ],
        shippingAddress: { street: '45 Gulshan Avenue', city: 'Dhaka', state: 'Dhaka', zipCode: '1212', country: 'Bangladesh' },
        paymentMethod: 'CARD' as const,
        paymentStatus: 'PAID' as const,
        orderStatus: 'DELIVERED' as const,
        subtotal: 1448,
        shippingCost: 0,
        tax: 72.4,
        totalAmount: 1520.4,
        deliveredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        orderNumber: `NC-${now.getFullYear()}0102-00002`,
        userId: jane._id,
        items: [
          { productId: products[5]._id, title: products[5].title, price: 39.99, quantity: 2, image: products[5].images[0] },
          { productId: products[7]._id, title: products[7].title, price: 69.99, quantity: 1, image: products[7].images[0] },
        ],
        shippingAddress: { street: '78 Dhanmondi Road', city: 'Dhaka', state: 'Dhaka', zipCode: '1209', country: 'Bangladesh' },
        paymentMethod: 'BKASH' as const,
        paymentStatus: 'PAID' as const,
        orderStatus: 'SHIPPED' as const,
        subtotal: 149.97,
        shippingCost: 0,
        tax: 7.5,
        totalAmount: 157.47,
      },
      {
        orderNumber: `NC-${now.getFullYear()}0103-00003`,
        userId: bob._id,
        items: [
          { productId: products[13]._id, title: products[13].title, price: 11.99, quantity: 1, image: products[13].images[0] },
          { productId: products[14]._id, title: products[14].title, price: 29.99, quantity: 1, image: products[14].images[0] },
          { productId: products[15]._id, title: products[15].title, price: 14.99, quantity: 1, image: products[15].images[0] },
        ],
        shippingAddress: { street: '12 Banani Lane', city: 'Dhaka', state: 'Dhaka', zipCode: '1213', country: 'Bangladesh' },
        paymentMethod: 'COD' as const,
        paymentStatus: 'PENDING' as const,
        orderStatus: 'PROCESSING' as const,
        subtotal: 56.97,
        shippingCost: 10,
        tax: 2.85,
        totalAmount: 69.82,
      },
      {
        orderNumber: `NC-${now.getFullYear()}0104-00004`,
        userId: john._id,
        items: [
          { productId: products[16]._id, title: products[16].title, price: 99.99, quantity: 1, image: products[16].images[0] },
        ],
        shippingAddress: { street: '45 Gulshan Avenue', city: 'Dhaka', state: 'Dhaka', zipCode: '1212', country: 'Bangladesh' },
        paymentMethod: 'NAGAD' as const,
        paymentStatus: 'PENDING' as const,
        orderStatus: 'PENDING' as const,
        subtotal: 99.99,
        shippingCost: 10,
        tax: 5,
        totalAmount: 114.99,
      },
      {
        orderNumber: `NC-${now.getFullYear()}0105-00005`,
        userId: jane._id,
        items: [
          { productId: products[22]._id, title: products[22].title, price: 139.99, quantity: 1, image: products[22].images[0] },
        ],
        shippingAddress: { street: '78 Dhanmondi Road', city: 'Dhaka', state: 'Dhaka', zipCode: '1209', country: 'Bangladesh' },
        paymentMethod: 'CARD' as const,
        paymentStatus: 'REFUNDED' as const,
        orderStatus: 'CANCELLED' as const,
        subtotal: 139.99,
        shippingCost: 0,
        tax: 7,
        totalAmount: 146.99,
        cancelReason: 'Changed my mind, want a different set',
      },
    ];

    const orders = await Order.create(orderData);
    console.log(`Created ${orders.length} orders`);

    // Update sold counts for delivered/shipped orders
    await Product.findByIdAndUpdate(products[0]._id, { $inc: { sold: 1 } });
    await Product.findByIdAndUpdate(products[3]._id, { $inc: { sold: 1 } });
    await Product.findByIdAndUpdate(products[5]._id, { $inc: { sold: 2 } });
    await Product.findByIdAndUpdate(products[7]._id, { $inc: { sold: 1 } });
    console.log('Updated product sold counts');

    console.log('\n========================================');
    console.log('Seeding complete!');
    console.log('========================================');
    console.log('\nDemo Credentials:');
    console.log('  Admin:  admin@nexcart.com / 123456');
    console.log('  Admin:  manager@nexcart.com / 123456');
    console.log('  User:   john@nexcart.com / 123456');
    console.log('  User:   jane@nexcart.com / 123456');
    console.log('  User:   bob@nexcart.com / 123456');
    console.log(`\nData Summary:`);
    console.log(`  Users: ${users.length}`);
    console.log(`  Categories: ${categories.length}`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Reviews: ${reviews.length}`);
    console.log(`  Orders: ${orders.length}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
