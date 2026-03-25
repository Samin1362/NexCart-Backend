import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupAdmin() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Admin',
    email: `admin-${Date.now()}@test.com`,
    password: 'adminpass123',
  });
  const User = (await import('../../models/user.model')).default;
  await User.findByIdAndUpdate(res.body.data.user._id, { role: 'ADMIN' });
  const loginRes = await request(app).post('/api/auth/login').send({
    email: res.body.data.user.email,
    password: 'adminpass123',
  });
  return { token: loginRes.body.data.accessToken as string, id: res.body.data.user._id as string };
}

async function setupUser() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'User',
    email: `user-${Date.now()}@test.com`,
    password: 'userpass123',
  });
  return res.body.data.accessToken as string;
}

async function createProduct(adminToken: string, stock = 20) {
  const catRes = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Cat-${Date.now()}`, description: 'Category' });
  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Order Test Product',
      description: 'Product for order tests',
      price: 30,
      images: ['https://example.com/img.jpg'],
      category: catRes.body.data._id,
      brand: 'Brand',
      stock,
    });
  return prodRes.body.data;
}

const shippingAddress = {
  street: '123 Main St',
  city: 'Dhaka',
  state: 'Dhaka',
  zipCode: '1000',
  country: 'Bangladesh',
};

async function placeOrder(userToken: string, adminToken: string) {
  const product = await createProduct(adminToken);
  await request(app)
    .post('/api/cart/add')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ productId: product._id, quantity: 2 });

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ paymentMethod: 'COD', shippingAddress });
  return res;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const admin = await setupAdmin();
    adminToken = admin.token;
    userToken = await setupUser();
  });

  it('places an order from the cart', async () => {
    const res = await placeOrder(userToken, adminToken);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('orderNumber');
    expect(res.body.data.orderStatus).toBe('PENDING');
    expect(res.body.data.paymentMethod).toBe('COD');
    expect(res.body.data.items).toHaveLength(1);
  });

  it('calculates totals correctly (subtotal + shipping + tax)', async () => {
    const res = await placeOrder(userToken, adminToken);
    const order = res.body.data;
    // 2 items × $30 = $60 subtotal, shipping = $10 (< $100 threshold), tax = 5%
    expect(order.subtotal).toBe(60);
    expect(order.shippingCost).toBe(10);
    expect(order.tax).toBeCloseTo(60 * 0.05, 1);
    expect(order.totalAmount).toBeCloseTo(60 + 10 + 60 * 0.05, 1);
  });

  it('clears the cart after placing an order', async () => {
    await placeOrder(userToken, adminToken);
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(cartRes.body.data.items).toHaveLength(0);
  });

  it('returns 400 when cart is empty', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ paymentMethod: 'COD', shippingAddress });
    expect(res.status).toBe(400);
  });

  it('deducts stock after placing an order', async () => {
    const product = await createProduct(adminToken, 10);
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product._id, quantity: 3 });
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ paymentMethod: 'COD', shippingAddress });

    const Product = (await import('../../models/product.model')).default;
    const updated = await Product.findById(product._id);
    expect(updated?.stock).toBe(7); // 10 - 3
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ paymentMethod: 'COD', shippingAddress });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const admin = await setupAdmin();
    adminToken = admin.token;
    userToken = await setupUser();
  });

  it('returns the authenticated user\'s orders', async () => {
    await placeOrder(userToken, adminToken);
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders/all', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await setupAdmin();
    adminToken = admin.token;
  });

  it('returns all orders for admin', async () => {
    const res = await request(app)
      .get('/api/orders/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 403 for regular user', async () => {
    const userToken = await setupUser();
    const res = await request(app)
      .get('/api/orders/all')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/orders/:id/cancel', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const admin = await setupAdmin();
    adminToken = admin.token;
    userToken = await setupUser();
  });

  it('cancels a PENDING order and restores stock', async () => {
    const product = await createProduct(adminToken, 10);
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product._id, quantity: 2 });
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ paymentMethod: 'COD', shippingAddress });
    const orderId = orderRes.body.data._id;

    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cancelReason: 'Changed my mind' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.orderStatus).toBe('CANCELLED');

    // Stock should be restored
    const Product = (await import('../../models/product.model')).default;
    const updated = await Product.findById(product._id);
    expect(updated?.stock).toBe(10);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const admin = await setupAdmin();
    adminToken = admin.token;
    userToken = await setupUser();
  });

  it('allows admin to update order status', async () => {
    const orderRes = await placeOrder(userToken, adminToken);
    const orderId = orderRes.body.data._id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderStatus: 'PROCESSING' });
    expect(res.status).toBe(200);
    expect(res.body.data.orderStatus).toBe('PROCESSING');
  });

  it('returns 403 when regular user tries to update status', async () => {
    const orderRes = await placeOrder(userToken, adminToken);
    const orderId = orderRes.body.data._id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderStatus: 'DELIVERED' });
    expect(res.status).toBe(403);
  });
});
