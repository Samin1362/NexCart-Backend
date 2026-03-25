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
  return loginRes.body.data.accessToken as string;
}

async function setupUser() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'User',
    email: `user-${Date.now()}@test.com`,
    password: 'userpass123',
  });
  return res.body.data.accessToken as string;
}

async function createProduct(adminToken: string) {
  const catRes = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Cat-${Date.now()}`, description: 'Test category' });

  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Test Product',
      description: 'A great test product',
      price: 49.99,
      images: ['https://example.com/img.jpg'],
      category: catRes.body.data._id,
      brand: 'TestBrand',
      stock: 20,
    });
  return prodRes.body.data;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/cart', () => {
  it('returns an empty cart for a new user', async () => {
    const token = await setupUser();
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.totalAmount).toBe(0);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/cart/add', () => {
  let userToken: string;
  let productId: string;

  beforeEach(async () => {
    const adminToken = await setupAdmin();
    userToken = await setupUser();
    const product = await createProduct(adminToken);
    productId = product._id;
  });

  it('adds a product to the cart', async () => {
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(2);
  });

  it('increases quantity when the same product is added again', async () => {
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });

    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(3);
  });

  it('returns 400 when quantity exceeds stock', async () => {
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 999 });
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/cart/add').send({ productId, quantity: 1 });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/cart/update', () => {
  let userToken: string;
  let productId: string;

  beforeEach(async () => {
    const adminToken = await setupAdmin();
    userToken = await setupUser();
    const product = await createProduct(adminToken);
    productId = product._id;
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });
  });

  it('updates item quantity in cart', async () => {
    const res = await request(app)
      .patch('/api/cart/update')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(5);
  });

  it('returns 400 when quantity exceeds stock', async () => {
    const res = await request(app)
      .patch('/api/cart/update')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 999 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/cart/remove/:productId', () => {
  let userToken: string;
  let productId: string;

  beforeEach(async () => {
    const adminToken = await setupAdmin();
    userToken = await setupUser();
    const product = await createProduct(adminToken);
    productId = product._id;
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });
  });

  it('removes an item from the cart', async () => {
    const res = await request(app)
      .delete(`/api/cart/remove/${productId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});

describe('DELETE /api/cart/clear', () => {
  let userToken: string;
  let productId: string;

  beforeEach(async () => {
    const adminToken = await setupAdmin();
    userToken = await setupUser();
    const product = await createProduct(adminToken);
    productId = product._id;
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 2 });
  });

  it('clears all items from the cart', async () => {
    const res = await request(app)
      .delete('/api/cart/clear')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.totalAmount).toBe(0);
  });
});
