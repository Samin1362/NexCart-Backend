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

async function createCategory(adminToken: string, name = 'Test Category') {
  const res = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name, description: 'Test category description' });
  return res.body.data;
}

function productPayload(categoryId: string, overrides = {}) {
  return {
    title: 'Wireless Headphones',
    description: 'Premium sound quality headphones with ANC',
    price: 99.99,
    images: ['https://example.com/headphones.jpg'],
    category: categoryId,
    brand: 'SoundMax',
    stock: 50,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/products', () => {
  let adminToken: string;
  let categoryId: string;

  beforeEach(async () => {
    adminToken = await setupAdmin();
    const cat = await createCategory(adminToken);
    categoryId = cat._id;
  });

  it('creates a product as admin', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId));
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Wireless Headphones');
    expect(res.body.data).toHaveProperty('slug');
  });

  it('returns 403 when a regular user tries to create', async () => {
    const userToken = await setupUser();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send(productPayload(categoryId));
    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/products').send(productPayload(categoryId));
    expect(res.status).toBe(401);
  });

  it('returns 400 when discountPrice >= price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { discountPrice: 100 })); // same as price
    expect(res.status).toBe(400);
  });

  it('returns 400 when images array is empty', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { images: [] }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products', () => {
  let adminToken: string;
  let categoryId: string;

  beforeEach(async () => {
    adminToken = await setupAdmin();
    const cat = await createCategory(adminToken);
    categoryId = cat._id;
    // Create two products
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { title: 'Product A', price: 50 }));
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { title: 'Product B', price: 150 }));
  });

  it('returns a list of products publicly', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('returns pagination meta', async () => {
    const res = await request(app).get('/api/products');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('totalPages');
  });

  it('filters by priceMax', async () => {
    const res = await request(app).get('/api/products?priceMax=100');
    expect(res.status).toBe(200);
    res.body.data.forEach((p: { price: number }) => {
      expect(p.price).toBeLessThanOrEqual(100);
    });
  });
});

describe('GET /api/products/featured', () => {
  it('returns featured products publicly', async () => {
    const res = await request(app).get('/api/products/featured');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/products/:slug', () => {
  let adminToken: string;
  let productSlug: string;

  beforeEach(async () => {
    adminToken = await setupAdmin();
    const cat = await createCategory(adminToken);
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(cat._id));
    productSlug = createRes.body.data.slug;
  });

  it('returns the product by slug', async () => {
    const res = await request(app).get(`/api/products/${productSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe(productSlug);
  });

  it('returns 404 for a non-existent slug', async () => {
    const res = await request(app).get('/api/products/non-existent-product-slug');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/products/:id', () => {
  let adminToken: string;
  let productId: string;

  beforeEach(async () => {
    adminToken = await setupAdmin();
    const cat = await createCategory(adminToken);
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(cat._id));
    productId = createRes.body.data._id;
  });

  it('updates a product as admin', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated Headphones', stock: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Headphones');
    expect(res.body.data.stock).toBe(100);
  });

  it('returns 403 when a regular user tries to update', async () => {
    const userToken = await setupUser();
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/products/:id', () => {
  let adminToken: string;
  let productId: string;

  beforeEach(async () => {
    adminToken = await setupAdmin();
    const cat = await createCategory(adminToken);
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(cat._id));
    productId = createRes.body.data._id;
  });

  it('soft-deletes a product as admin', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 when a regular user tries to delete', async () => {
    const userToken = await setupUser();
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
