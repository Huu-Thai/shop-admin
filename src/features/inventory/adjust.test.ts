import { describe, expect, it } from 'vitest';
import { type AdjustDraft, adjustBody } from './adjust';

const d = (o: Partial<AdjustDraft>): AdjustDraft => ({
  mode: 'receive',
  amount: '',
  safetyStock: '',
  reason: '',
  note: '',
  reference: '',
  ...o,
});
const stock = { quantity: 10, reserved: 4, safetyStock: 1, version: 7 };

describe('stock adjustments', () => {
  it('receives, removes and counts with the version for optimistic locking', () => {
    expect(adjustBody(d({ amount: '5', reference: 'PO-1' }), stock).body).toEqual({
      delta: 5,
      reason: 'RECEIPT',
      reference: 'PO-1',
      expectedVersion: 7,
    });
    expect(
      adjustBody(d({ mode: 'remove', amount: '2', reason: 'ADJUSTMENT', note: 'damaged' }), stock)
        .body,
    ).toEqual({ delta: -2, reason: 'ADJUSTMENT', note: 'damaged', expectedVersion: 7 });
    expect(adjustBody(d({ mode: 'count', amount: '6' }), stock).body).toEqual({
      quantity: 6,
      reason: 'CORRECTION',
      expectedVersion: 7,
    });
    // a new stock row (no current) has no version
    expect(adjustBody(d({ amount: '3' }), null).body).toEqual({ delta: 3, reason: 'RECEIPT' });
  });

  it('changes only the safety stock', () => {
    expect(adjustBody(d({ safetyStock: '3' }), stock).body).toEqual({
      safetyStock: 3,
      reason: 'RECEIPT',
      expectedVersion: 7,
    });
  });

  it('refuses impossible changes before calling the API', () => {
    expect(adjustBody(d({}), stock).error).toBe('inv.err.amount');
    expect(adjustBody(d({ amount: '1.5' }), stock).error).toBe('inv.err.amount');
    expect(adjustBody(d({ mode: 'remove', amount: '11' }), stock).error).toBe('inv.err.negative');
    expect(adjustBody(d({ mode: 'remove', amount: '7' }), stock).error).toBe(
      'inv.err.belowReserved',
    );
    expect(adjustBody(d({ mode: 'count', amount: '3' }), stock).error).toBe(
      'inv.err.belowReserved',
    );
    expect(adjustBody(d({ safetyStock: '-1' }), stock).error).toBe('inv.err.safety');
  });
});
