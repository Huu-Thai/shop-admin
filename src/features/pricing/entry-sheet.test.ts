import { describe, expect, it } from 'vitest';
import { tiersPayload } from './entry-sheet';

const tier = (minQty: string, amount: string, compareAt = '') => ({ minQty, amount, compareAt });

describe('price tiers', () => {
  it('builds entries in minor units and deletes tiers that were removed', () => {
    const r = tiersPayload(
      [tier('1', '25', '30'), tier('10', '18.50')],
      [
        { id: 'a', minQty: 1 },
        { id: 'b', minQty: 5 },
      ],
      'USD',
    );
    expect(r.errors).toEqual({});
    expect(r.entries).toEqual([
      { minQty: 1, amount: 2500, compareAtAmount: 3000 },
      { minQty: 10, amount: 1850, compareAtAmount: null },
    ]);
    expect(r.remove).toEqual(['b']);
  });

  it('flags invalid tiers', () => {
    const r = tiersPayload(
      [tier('0', '5'), tier('2', 'x'), tier('3', '10', '9'), tier('3', '8'), tier('4', '1.234')],
      [],
      'USD',
    );
    expect(r.errors).toEqual({
      0: 'price.err.minQty',
      1: 'price.err.amount',
      2: 'price.err.compareAt',
      3: 'price.err.duplicateTier',
      4: 'price.err.amount',
    });
    expect(r.entries).toEqual([]);
  });
});
