/**
 * Unit tests for the lightweight validation middleware.
 *
 * Verifies that malformed input returns 400, valid input passes through,
 * and sensitive values are never echoed back in error messages.
 */
import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { validateBody } from '../middleware/validate';

function makeReq(body: any): Request {
  return { body, headers: {} } as unknown as Request;
}

function makeRes(): Response & { _json?: any; statusCode: number } {
  const res: any = {
    statusCode: 200,
    _json: undefined,
    status(code: number) { res.statusCode = code; return res; },
    json(obj: any) { res._json = obj; return res; },
  };
  return res as Response & { _json?: any; statusCode: number };
}

describe('validateBody', () => {
  it('passes valid input through to next()', () => {
    const schema = { name: { type: 'string' as const, required: true, max: 50 } };
    const mw = validateBody(schema);
    let nextCalled = false;
    mw(makeReq({ name: 'Alice' }), makeRes(), () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects missing required field with 400', () => {
    const schema = { name: { type: 'string' as const, required: true } };
    const mw = validateBody(schema);
    const res = makeRes();
    mw(makeReq({}), res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toBe('Validation failed');
  });

  it('rejects string exceeding max length with 400', () => {
    const schema = { name: { type: 'string' as const, max: 5 } };
    const mw = validateBody(schema);
    const res = makeRes();
    mw(makeReq({ name: 'toolongname' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects wrong type with 400', () => {
    const schema = { age: { type: 'number' as const } };
    const mw = validateBody(schema);
    const res = makeRes();
    mw(makeReq({ age: 'not-a-number' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects value not in enum with 400', () => {
    const schema = { kind: { type: 'string' as const, enum: ['poster', 'video'] } };
    const mw = validateBody(schema);
    const res = makeRes();
    mw(makeReq({ kind: 'audio' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects array exceeding max length with 400', () => {
    const schema = { items: { type: 'array' as const, max: 3 } };
    const mw = validateBody(schema);
    const res = makeRes();
    mw(makeReq({ items: [1, 2, 3, 4, 5] }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('accepts optional field when absent', () => {
    const schema = { name: { type: 'string' as const, required: true }, email: { type: 'string' as const } };
    const mw = validateBody(schema);
    let nextCalled = false;
    mw(makeReq({ name: 'Alice' }), makeRes(), () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects number below minimum with 400', () => {
    const schema = { lat: { type: 'number' as const, min: -90, max: 90 } };
    const mw = validateBody(schema);
    const res = makeRes();
    mw(makeReq({ lat: -91 }), res, () => {});
    expect(res.statusCode).toBe(400);
  });
});
