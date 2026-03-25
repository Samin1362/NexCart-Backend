import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authorize } from '../role.middleware';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';

function makeReq(user?: { _id: string; email: string; role: string }): Request {
  return { user } as unknown as Request;
}

const res = {} as Response;

describe('authorize middleware', () => {
  it('throws UnauthorizedError when req.user is not set', () => {
    const mw = authorize('ADMIN');
    expect(() => mw(makeReq(undefined), res, vi.fn())).toThrow(UnauthorizedError);
  });

  it('throws ForbiddenError when user role is not in allowed list', () => {
    const mw = authorize('ADMIN');
    const req = makeReq({ _id: '1', email: 'u@u.com', role: 'USER' });
    expect(() => mw(req, res, vi.fn())).toThrow(ForbiddenError);
  });

  it('calls next() when user role matches exactly', () => {
    const next = vi.fn();
    const mw = authorize('ADMIN');
    const req = makeReq({ _id: '1', email: 'a@a.com', role: 'ADMIN' });
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() when user role is one of several allowed roles', () => {
    const next = vi.fn();
    const mw = authorize('USER', 'ADMIN');
    const req = makeReq({ _id: '1', email: 'u@u.com', role: 'USER' });
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows ADMIN when both USER and ADMIN are permitted', () => {
    const next = vi.fn();
    const mw = authorize('USER', 'ADMIN');
    const req = makeReq({ _id: '1', email: 'a@a.com', role: 'ADMIN' });
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
