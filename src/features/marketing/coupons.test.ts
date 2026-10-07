import { describe, expect, it } from 'vitest';
import { couponState } from './coupons-panel';

const base = {
  id: 'c',
  promotionId: 'p',
  code: 'SAVE10',
  usageLimit: null,
  usesPerCustomer: null,
  timesUsed: 0,
  expiresAt: null,
  isActive: true,
  batchId: null,
  createdAt: '2026-01-01T00:00:00Z',
};
const now = new Date('2026-06-01T00:00:00Z');

describe('coupon state', () => {
  it('is off, expired or used up before it is active', () => {
    expect(couponState(base, now)).toBe('active');
    expect(couponState({ ...base, isActive: false }, now)).toBe('inactive');
    expect(couponState({ ...base, expiresAt: '2026-05-31T23:59:59Z' }, now)).toBe('expired');
    expect(couponState({ ...base, usageLimit: 3, timesUsed: 3 }, now)).toBe('usedUp');
    expect(couponState({ ...base, usageLimit: 3, timesUsed: 2 }, now)).toBe('active');
  });
});
