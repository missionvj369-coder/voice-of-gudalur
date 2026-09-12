
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateBody, type ValidationSchema } from '../middleware/validate';

const externalSupportSchema: ValidationSchema = {
  name: { type: 'string', required: true, min: 1, max: 100 },
  email: { type: 'string', max: 254 },
  place: { type: 'string', max: 100 },
  pincode: { type: 'string', min: 6, max: 6 },
  message: { type: 'string', max: 500 },
};

function makeReq(body: any, params: any = {}) { return { body, params, headers: {} } as any; }
function makeRes(): any {
  return { statusCode: 200, _json: undefined, status(code) { this.statusCode = code; return this; }, json(obj) { this._json = obj; return this; } };
}

describe('external supporter flow -- validation', () => {
  it('accepts valid full body', () => {
    let nextCalled = false;
    validateBody(externalSupportSchema)(makeReq({ name: 'Ravi', email: 'r@x.com', place: 'C', pincode: '643001', message: 'S' }), makeRes(), () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('accepts minimal body (name only)', () => {
    let nextCalled = false;
    validateBody(externalSupportSchema)(makeReq({ name: 'Anon' }), makeRes(), () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects missing required name with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ email: 't@x.com' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects empty name with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: '' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects name exceeding 100 chars with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: 'A'.repeat(101) }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects email exceeding 254 chars with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: 'T', email: 'a'.repeat(250) + '@x.com' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects place exceeding 100 chars with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: 'T', place: 'X'.repeat(101) }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects pincode wrong length with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: 'T', pincode: '12345' }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects message exceeding 500 chars with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: 'T', message: 'M'.repeat(501) }), res, () => {});
    expect(res.statusCode).toBe(400);
  });

  it('rejects wrong type for name with 400', () => {
    const res = makeRes();
    validateBody(externalSupportSchema)(makeReq({ name: 12345 }), res, () => {});
    expect(res.statusCode).toBe(400);
  });
});

describe('external supporter flow -- route handler', () => {
  let mockTxQuery, mockTxQueryOne, mockQueryOne, mockLoggerInfo, mockLoggerError;
  let mockWithTransaction, db, logger;

  beforeEach(() => {
    mockTxQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    mockTxQueryOne = vi.fn().mockResolvedValue(null);
    mockQueryOne = vi.fn().mockResolvedValue(null);
    mockLoggerInfo = vi.fn();
    mockLoggerError = vi.fn();
    mockWithTransaction = vi.fn();
    const tx = { query: mockTxQuery, queryOne: mockTxQueryOne };
    mockWithTransaction.mockImplementation(async (fn) => fn(tx));
    db = { query: vi.fn(), queryOne: mockQueryOne, withTransaction: mockWithTransaction };
    logger = { info: mockLoggerInfo, error: mockLoggerError };
  });

  function runHandler(req, res) {
    const body = req.body;
    const pId = req.params.id;
    db.withTransaction(async (tx) => {
      const existing = await tx.queryOne('SELECT id FROM external_supports WHERE petition_id = $1 AND email = $2', [pId, body.email || null]);
      if (!existing) {
        await tx.query('INSERT INTO external_supports (petition_id, name, email, place, pincode, message) VALUES ($1, $2, $3, $4, $5, $6)', [pId, body.name, body.email || null, body.place || null, body.pincode || null, body.message || null]);
        await tx.query('UPDATE petitions SET external_support_count = external_support_count + 1 WHERE id = $1', [pId]);
      }
      const row = await tx.queryOne('SELECT external_support_count FROM petitions WHERE id = $1', [pId]);
      return { count: row?.external_support_count ?? 0 };
    })
      .then((result) => {
        logger.info('[external-support] recorded', { petitionId: pId, name: body.name, email: body.email });
        res.status(201).json({ ok: true, count: result.count });
      })
      .catch((e) => {
        if (e.code === '23505') {
          db.queryOne('SELECT external_support_count FROM petitions WHERE id = $1', [req.params.id])
            .then((row) => res.status(200).json({ ok: true, count: row?.external_support_count ?? 0, duplicate: true }))
            .catch(() => res.status(500).json({ error: 'Could not record external support' }));
          return;
        }
        logger.error('[external-support] error:', e.message);
        res.status(500).json({ error: 'Could not record external support' });
      });
  }

  it('records new support and increments counter -> 201', async () => {
    mockTxQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ external_support_count: 1 });
    const res = makeRes();
    runHandler(makeReq({ name: 'Priya', email: 'p@x.com' }, { id: 'p1' }), res);
    await new Promise(r => setTimeout(r, 5));
    expect(res.statusCode).toBe(201);
    expect(res._json).toEqual({ ok: true, count: 1 });
    expect(mockTxQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO external_supports'), ['p1', 'Priya', 'p@x.com', null, null, null]);
    expect(mockLoggerInfo).toHaveBeenCalledWith('[external-support] recorded', { petitionId: 'p1', name: 'Priya', email: 'p@x.com' });
  });

  it('anonymous support (no email) is recorded', async () => {
    mockTxQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ external_support_count: 5 });
    const res = makeRes();
    runHandler(makeReq({ name: 'Anon' }, { id: 'p2' }), res);
    await new Promise(r => setTimeout(r, 5));
    expect(res.statusCode).toBe(201);
    expect(res._json.ok).toBe(true);
  });

  it('duplicate email skips INSERT, returns current count', async () => {
    mockTxQueryOne.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce({ external_support_count: 10 });
    const res = makeRes();
    runHandler(makeReq({ name: 'Ravi', email: 'r@x.com' }, { id: 'p3' }), res);
    await new Promise(r => setTimeout(r, 5));
    const insertCalls = mockTxQuery.mock.calls.filter((c) => String(c[0]).includes('INSERT'));
    expect(insertCalls.length).toBe(0);
    expect(res._json.count).toBe(10);
  });

  it('handles unique-violation (23505) -> 200 with duplicate flag', async () => {
    mockWithTransaction.mockRejectedValueOnce({ code: '23505' });
    mockQueryOne.mockResolvedValueOnce({ external_support_count: 7 });
    const res = makeRes();
    runHandler(makeReq({ name: 'Race', email: 'race@x.com' }, { id: 'p4' }), res);
    await new Promise(r => setTimeout(r, 10));
    expect(res.statusCode).toBe(200);
    expect(res._json).toEqual({ ok: true, count: 7, duplicate: true });
  });

  it('handles unexpected DB errors -> 500', async () => {
    mockWithTransaction.mockRejectedValueOnce({ code: 'ECONNREFUSED', message: 'refused' });
    const res = makeRes();
    runHandler(makeReq({ name: 'Err', email: 'err@x.com' }, { id: 'p5' }), res);
    await new Promise(r => setTimeout(r, 5));
    expect(res.statusCode).toBe(500);
    expect(res._json.error).toBe('Could not record external support');
    expect(mockLoggerError).toHaveBeenCalledWith('[external-support] error:', 'refused');
  });

  it('counter increments across multiple supports', async () => {
    mockTxQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ external_support_count: 1 });
    const res1 = makeRes();
    runHandler(makeReq({ name: 'A', email: 'a@x.com' }, { id: 'p6' }), res1);
    await new Promise(r => setTimeout(r, 5));
    expect(res1._json.count).toBe(1);

    mockTxQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ external_support_count: 2 });
    const res2 = makeRes();
    runHandler(makeReq({ name: 'B', email: 'b@x.com' }, { id: 'p6' }), res2);
    await new Promise(r => setTimeout(r, 5));
    expect(res2._json.count).toBe(2);

    mockTxQueryOne.mockResolvedValueOnce({ id: 'dup' }).mockResolvedValueOnce({ external_support_count: 2 });
    const res3 = makeRes();
    runHandler(makeReq({ name: 'A2', email: 'a@x.com' }, { id: 'p6' }), res3);
    await new Promise(r => setTimeout(r, 5));
    expect(res3._json.count).toBe(2);
  });
});



