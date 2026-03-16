import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';

type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  min?: number;
  max?: number;
  minLength?: number;
  message?: string;
};

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestError(rule.message || `${rule.field} is required`);
      }

      if (value === undefined || value === null) continue;

      if (rule.type === 'string' && typeof value !== 'string') {
        throw new BadRequestError(`${rule.field} must be a string`);
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        throw new BadRequestError(`${rule.field} must be a number`);
      }

      if (rule.type === 'boolean' && typeof value !== 'boolean') {
        throw new BadRequestError(`${rule.field} must be a boolean`);
      }

      if (rule.type === 'array' && !Array.isArray(value)) {
        throw new BadRequestError(`${rule.field} must be an array`);
      }

      if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
        throw new BadRequestError(`${rule.field} must be at least ${rule.minLength} characters`);
      }

      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        throw new BadRequestError(`${rule.field} must be at least ${rule.min}`);
      }

      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        throw new BadRequestError(`${rule.field} must be at most ${rule.max}`);
      }
    }

    next();
  };
};
