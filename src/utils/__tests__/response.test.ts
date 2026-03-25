import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError } from '../response';
import type { Response } from 'express';

// Build a minimal mock of Express Response
function mockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;
  // status() must return res so the chain res.status(x).json(y) works
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe('sendSuccess', () => {
  it('sets the given status code', () => {
    const res = mockRes();
    sendSuccess(res, 200, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns success: true and the message', () => {
    const res = mockRes();
    sendSuccess(res, 200, 'Done');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Done' })
    );
  });

  it('includes data when provided', () => {
    const res = mockRes();
    const data = { id: '1', name: 'Test' };
    sendSuccess(res, 201, 'Created', data);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data })
    );
  });

  it('includes pagination meta when provided', () => {
    const res = mockRes();
    const meta = { page: 1, limit: 10, total: 50, totalPages: 5 };
    sendSuccess(res, 200, 'Listed', [], meta);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ meta })
    );
  });

  it('omits data and meta fields when not provided', () => {
    const res = mockRes();
    sendSuccess(res, 200, 'No content');
    const call = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data).toBeUndefined();
    expect(call.meta).toBeUndefined();
  });
});

describe('sendError', () => {
  it('sets the given status code', () => {
    const res = mockRes();
    sendError(res, 404, 'Not found');
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns success: false and the message', () => {
    const res = mockRes();
    sendError(res, 400, 'Bad request');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Bad request' })
    );
  });

  it('includes errorDetails when provided', () => {
    const res = mockRes();
    sendError(res, 500, 'Server error', 'Stack trace here');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorDetails: 'Stack trace here' })
    );
  });

  it('omits errorDetails when not provided', () => {
    const res = mockRes();
    sendError(res, 400, 'Oops');
    const call = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.errorDetails).toBeUndefined();
  });
});
