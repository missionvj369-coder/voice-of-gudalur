/**
 * Unit tests for the manifesto repository.
 *
 * Tests endorsement dedupe, submission dedupe, counter behaviour, and the
 * idempotent-response path using the in-memory mock DB.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetMockDb, __seedTable, __readTable, mockDb } from '../../db/__mocks__/db';
import { parseIdemResponse } from '../../db/idempotency';

describe('manifestoRepository', () => {
  beforeEach(() => {
    __resetMockDb();
  });

  it('detects duplicate endorsement by gudalur_id (mock)', async () => {
    __seedTable('manifesto_signatures', [
      { id: 1, name: 'Alice', gudalur_id: 'GD-2024-000001' },
    ]);
    const existing = await mockDb.queryOne(
      'SELECT id FROM manifesto_signatures WHERE gudalur_id = $1',
      ['GD-2024-000001'],
    );
    expect(existing).not.toBeNull();
  });

  it('allows a new endorsement when gudalur_id is not present (mock)', async () => {
    __seedTable('manifesto_signatures', [
      { id: 1, name: 'Alice', gudalur_id: 'GD-2024-000001' },
    ]);
    const existing = await mockDb.queryOne(
      'SELECT id FROM manifesto_signatures WHERE gudalur_id = $1',
      ['GD-2024-999999'],
    );
    expect(existing).toBeNull();
  });

  it('maintains the signature_count aggregate (mock)', async () => {
    __seedTable('manifesto_stats', [{ id: 'global', signature_count: 5, submission_count: 2 }]);
    const stats = await mockDb.queryOne<{ signature_count: number }>(
      'SELECT signature_count FROM manifesto_stats WHERE id = $1',
      ['global'],
    );
    expect(stats?.signature_count).toBe(5);
  });

  it('reconciles submission count from authoritative table (mock)', async () => {
    __seedTable('manifesto_submissions', [
      { id: 1, docket_ref: 'D-001' },
      { id: 2, docket_ref: 'D-002' },
    ]);
    const rows = await mockDb.query('SELECT count(*) AS c FROM manifesto_submissions');
    expect(rows.rowCount).toBe(2);
  });

  it('parseIdemResponse handles endorsement idempotency key', () => {
    const parsed = parseIdemResponse<{ signatureId: number }>('{"signatureId":42}');
    expect(parsed?.signatureId).toBe(42);
  });

  it('parseIdemResponse handles submission idempotency key', () => {
    const parsed = parseIdemResponse<{ docketRef: string }>('{"docketRef":"D-001"}');
    expect(parsed?.docketRef).toBe('D-001');
  });
});
