import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { authenticate } from '../auth.middleware';
import User from '../../models/user.model';
import { UnauthorizedError } from '../../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET as string;

function makeReq(authHeader?: string): Request {
  return {
    headers: { authorization: authHeader },
  } as unknown as Request;
}

const res = {} as Response;

async function createTestUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'USER',
    ...overrides,
  });
}

describe('authenticate middleware', () => {
  it('throws UnauthorizedError when Authorization header is missing', async () => {
    const req = makeReq(undefined);
    await expect(authenticate(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when header does not start with Bearer', async () => {
    const req = makeReq('Basic sometoken');
    await expect(authenticate(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when token is malformed', async () => {
    const req = makeReq('Bearer not.a.valid.token');
    await expect(authenticate(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when token is expired', async () => {
    const user = await createTestUser();
    const expiredToken = jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, {
      expiresIn: '-1s',
    });
    const req = makeReq(`Bearer ${expiredToken}`);
    await expect(authenticate(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when user no longer exists in DB', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ userId: fakeId, role: 'USER' }, JWT_SECRET, { expiresIn: '15m' });
    const req = makeReq(`Bearer ${token}`);
    await expect(authenticate(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when user is blocked', async () => {
    const user = await createTestUser({ isBlocked: true });
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, {
      expiresIn: '15m',
    });
    const req = makeReq(`Bearer ${token}`);
    await expect(authenticate(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('attaches req.user and calls next() with a valid token', async () => {
    const user = await createTestUser();
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, {
      expiresIn: '15m',
    });
    const req = makeReq(`Bearer ${token}`) as Request & { user?: unknown };
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  });
});
