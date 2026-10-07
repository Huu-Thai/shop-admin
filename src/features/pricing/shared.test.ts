import { describe, expect, it } from 'vitest';
import { bookStatus, fromLocalInput, PERCENT_PATTERN, RATE_PATTERN, toLocalInput } from './shared';

const now = new Date('2026-10-05T12:00:00Z');

describe('pricing helpers', () => {
  it('derives a price book status from its flag and validity window', () => {
    const b = (
      o: Partial<{ isActive: boolean; validFrom: string | null; validTo: string | null }>,
    ) => ({
      isActive: true,
      validFrom: null,
      validTo: null,
      ...o,
    });
    expect(bookStatus(b({}), now)).toBe('active');
    expect(bookStatus(b({ isActive: false }), now)).toBe('inactive');
    expect(bookStatus(b({ validFrom: '2026-11-01T00:00:00Z' }), now)).toBe('scheduled');
    expect(bookStatus(b({ validTo: '2026-10-01T00:00:00Z' }), now)).toBe('expired');
    expect(
      bookStatus(b({ validFrom: '2026-10-01T00:00:00Z', validTo: '2026-12-01T00:00:00Z' }), now),
    ).toBe('active');
  });

  it('round-trips datetime-local values', () => {
    const iso = '2026-10-05T09:30:00.000Z';
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(toLocalInput(null)).toBe('');
    expect(fromLocalInput('')).toBeNull();
  });

  it('validates percents and exchange rates like the API', () => {
    for (const ok of ['0', '7.25', '19', '100', '8.8750'])
      expect(PERCENT_PATTERN.test(ok)).toBe(true);
    for (const bad of ['101', '7.12345', '-1', 'abc', ''])
      expect(PERCENT_PATTERN.test(bad)).toBe(false);
    for (const ok of ['25400', '0.0000394', '1.1']) expect(RATE_PATTERN.test(ok)).toBe(true);
    for (const bad of ['0', '0.0', '-1', '1.123456789']) expect(RATE_PATTERN.test(bad)).toBe(false);
  });
});
