import { describe, it, expect } from 'vitest';
import { generateSlug } from '../helpers';

describe('generateSlug', () => {
  it('converts uppercase to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('my product name')).toBe('my-product-name');
  });

  it('removes special characters', () => {
    expect(generateSlug('Product @#$% Name!')).toBe('product-name');
  });

  it('collapses multiple spaces into one hyphen', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(generateSlug('  hello world  ')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('--hello world--')).toBe('hello-world');
  });

  it('handles underscores by converting to hyphens', () => {
    expect(generateSlug('hello_world')).toBe('hello-world');
  });

  it('handles an empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles a string with only special characters', () => {
    expect(generateSlug('@#$%!')).toBe('');
  });

  it('handles numbers correctly', () => {
    expect(generateSlug('Product 123')).toBe('product-123');
  });

  it('handles already-slug-formatted strings', () => {
    expect(generateSlug('already-a-slug')).toBe('already-a-slug');
  });
});
