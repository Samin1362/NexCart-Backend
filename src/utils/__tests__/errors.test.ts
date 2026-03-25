import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../errors';

describe('AppError', () => {
  it('sets message and statusCode', () => {
    const err = new AppError('Something broke', 500);
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(500);
  });

  it('marks the error as operational', () => {
    const err = new AppError('op error', 400);
    expect(err.isOperational).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new AppError('err', 400);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it('uses default message when none provided', () => {
    expect(new NotFoundError().message).toBe('Resource not found');
  });

  it('accepts a custom message', () => {
    expect(new NotFoundError('User not found').message).toBe('User not found');
  });
});

describe('BadRequestError', () => {
  it('has statusCode 400', () => {
    expect(new BadRequestError().statusCode).toBe(400);
  });

  it('uses default message when none provided', () => {
    expect(new BadRequestError().message).toBe('Bad request');
  });

  it('accepts a custom message', () => {
    expect(new BadRequestError('Email is required').message).toBe('Email is required');
  });
});

describe('UnauthorizedError', () => {
  it('has statusCode 401', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it('uses default message when none provided', () => {
    expect(new UnauthorizedError().message).toBe('Unauthorized');
  });

  it('accepts a custom message', () => {
    expect(new UnauthorizedError('Token expired').message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has statusCode 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('uses default message when none provided', () => {
    expect(new ForbiddenError().message).toBe('Forbidden');
  });

  it('accepts a custom message', () => {
    expect(new ForbiddenError('Admins only').message).toBe('Admins only');
  });
});

describe('ConflictError', () => {
  it('has statusCode 409', () => {
    expect(new ConflictError().statusCode).toBe(409);
  });

  it('uses default message when none provided', () => {
    expect(new ConflictError().message).toBe('Conflict');
  });

  it('accepts a custom message', () => {
    expect(new ConflictError('Email already registered').message).toBe('Email already registered');
  });
});
