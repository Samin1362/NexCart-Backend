import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

describe('POST /api/auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is less than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'duplicate@example.com',
      password: 'password123',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Again',
      email: 'duplicate@example.com',
      password: 'password456',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'password123',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe('bob@example.com');
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 with non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh-token', () => {
  it('returns a new access token with a valid refresh token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Carol',
      email: 'carol@example.com',
      password: 'password123',
    });
    const { refreshToken } = registerRes.body.data;

    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('returns 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 with an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({
      refreshToken: 'invalid.token.here',
    });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/change-password', () => {
  it('changes password successfully', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Dave',
      email: 'dave@example.com',
      password: 'oldpass123',
    });
    const token = reg.body.data.accessToken;

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpass123', newPassword: 'newpass456' });
    expect(res.status).toBe(200);

    // Old password no longer works
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'dave@example.com',
      password: 'oldpass123',
    });
    expect(loginRes.status).toBe(401);
  });

  it('returns 401 when current password is wrong', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'mypassword',
    });
    const token = reg.body.data.accessToken;

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).patch('/api/auth/change-password').send({
      currentPassword: 'old',
      newPassword: 'new123',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('logs out successfully', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Frank',
      email: 'frank@example.com',
      password: 'password123',
    });
    const token = reg.body.data.accessToken;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
