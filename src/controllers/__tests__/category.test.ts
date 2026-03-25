import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAdmin() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Admin User',
    email: `admin-${Date.now()}@example.com`,
    password: 'adminpass123',
  });
  // Manually set role to ADMIN via the model (only way without a separate admin-create endpoint)
  const User = (await import('../../models/user.model')).default;
  await User.findByIdAndUpdate(res.body.data.user._id, { role: 'ADMIN' });
  // Re-login to get an admin token
  const loginRes = await request(app).post('/api/auth/login').send({
    email: res.body.data.user.email,
    password: 'adminpass123',
  });
  return loginRes.body.data.accessToken as string;
}

async function registerUser() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Normal User',
    email: `user-${Date.now()}@example.com`,
    password: 'userpass123',
  });
  return res.body.data.accessToken as string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('returns empty array when no categories exist', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST /api/categories', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await registerAdmin();
  });

  it('creates a category successfully as admin', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', description: 'Electronic gadgets' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Electronics');
    expect(res.body.data).toHaveProperty('slug');
  });

  it('auto-generates a slug from the name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Home & Garden', description: 'Home stuff' });
    expect(res.body.data.slug).toMatch(/home/);
  });

  it('returns 403 when a regular user tries to create a category', async () => {
    const userToken = await registerUser();
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Books', description: 'Books and media' });
    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Sports', description: 'Sports equipment' });
    expect(res.status).toBe(401);
  });

  it('returns 409 when category name already exists', async () => {
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Duplicate', description: 'First one' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Duplicate', description: 'Second one' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/categories/:slug', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await registerAdmin();
  });

  it('returns the category by slug', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Clothing', description: 'Fashion' });
    const slug = createRes.body.data.slug;

    const res = await request(app).get(`/api/categories/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Clothing');
  });

  it('returns 404 for non-existent slug', async () => {
    const res = await request(app).get('/api/categories/non-existent-slug');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/categories/:id', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await registerAdmin();
  });

  it('updates a category as admin', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'OldName', description: 'Old' });
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NewName' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('NewName');
  });

  it('returns 403 when a regular user tries to update', async () => {
    const userToken = await registerUser();
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Protected', description: 'Protected category' });
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/categories/:id', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await registerAdmin();
  });

  it('deletes a category with zero products', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ToDelete', description: 'Will be deleted' });
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 when a regular user tries to delete', async () => {
    const userToken = await registerUser();
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ProtectedDel', description: 'Protected' });
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
