import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../validate.middleware';
import { BadRequestError } from '../../utils/errors';

function makeReq(body: Record<string, unknown>): Request {
  return { body } as Request;
}

const res = {} as Response;
const next: NextFunction = vi.fn();

describe('validate middleware', () => {
  describe('required rule', () => {
    it('throws BadRequestError when required field is missing', () => {
      const mw = validate([{ field: 'email', required: true }]);
      expect(() => mw(makeReq({}), res, next)).toThrow(BadRequestError);
    });

    it('throws when required field is an empty string', () => {
      const mw = validate([{ field: 'email', required: true }]);
      expect(() => mw(makeReq({ email: '' }), res, next)).toThrow(BadRequestError);
    });

    it('throws with custom message', () => {
      const mw = validate([{ field: 'name', required: true, message: 'Name is required' }]);
      expect(() => mw(makeReq({}), res, next)).toThrow('Name is required');
    });

    it('calls next() when required field is present', () => {
      const nextFn = vi.fn();
      const mw = validate([{ field: 'email', required: true }]);
      mw(makeReq({ email: 'a@b.com' }), res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('type rule', () => {
    it('throws when field is wrong type: string expected, number given', () => {
      const mw = validate([{ field: 'name', type: 'string' }]);
      expect(() => mw(makeReq({ name: 123 }), res, next)).toThrow(BadRequestError);
    });

    it('throws when field is wrong type: number expected, string given', () => {
      const mw = validate([{ field: 'price', type: 'number' }]);
      expect(() => mw(makeReq({ price: 'ten' }), res, next)).toThrow(BadRequestError);
    });

    it('throws when field is wrong type: boolean expected, string given', () => {
      const mw = validate([{ field: 'active', type: 'boolean' }]);
      expect(() => mw(makeReq({ active: 'true' }), res, next)).toThrow(BadRequestError);
    });

    it('throws when field is wrong type: array expected, object given', () => {
      const mw = validate([{ field: 'tags', type: 'array' }]);
      expect(() => mw(makeReq({ tags: {} }), res, next)).toThrow(BadRequestError);
    });

    it('passes when field is correct type', () => {
      const nextFn = vi.fn();
      const mw = validate([{ field: 'price', type: 'number' }]);
      mw(makeReq({ price: 9.99 }), res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('skips type check when field is absent (not required)', () => {
      const nextFn = vi.fn();
      const mw = validate([{ field: 'phone', type: 'string' }]);
      mw(makeReq({}), res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('minLength rule', () => {
    it('throws when string is shorter than minLength', () => {
      const mw = validate([{ field: 'password', minLength: 6 }]);
      expect(() => mw(makeReq({ password: 'abc' }), res, next)).toThrow(BadRequestError);
    });

    it('passes when string meets minLength', () => {
      const nextFn = vi.fn();
      const mw = validate([{ field: 'password', minLength: 6 }]);
      mw(makeReq({ password: 'secret' }), res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('min / max rule', () => {
    it('throws when number is below min', () => {
      const mw = validate([{ field: 'price', type: 'number', min: 0 }]);
      expect(() => mw(makeReq({ price: -1 }), res, next)).toThrow(BadRequestError);
    });

    it('throws when number exceeds max', () => {
      const mw = validate([{ field: 'rating', type: 'number', max: 5 }]);
      expect(() => mw(makeReq({ rating: 6 }), res, next)).toThrow(BadRequestError);
    });

    it('passes when number is within range', () => {
      const nextFn = vi.fn();
      const mw = validate([{ field: 'rating', type: 'number', min: 1, max: 5 }]);
      mw(makeReq({ rating: 3 }), res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('multiple rules', () => {
    it('validates all rules and fails on first violation', () => {
      const mw = validate([
        { field: 'email', required: true, type: 'string' },
        { field: 'password', required: true, minLength: 6 },
      ]);
      expect(() => mw(makeReq({ email: 'a@b.com' }), res, next)).toThrow(BadRequestError);
    });

    it('calls next when all rules pass', () => {
      const nextFn = vi.fn();
      const mw = validate([
        { field: 'email', required: true, type: 'string' },
        { field: 'password', required: true, minLength: 6 },
      ]);
      mw(makeReq({ email: 'a@b.com', password: 'secret123' }), res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });
});
