import { describe, expect, it } from 'vitest';
import {
  lineRefundValue,
  openToRefund,
  openToShip,
  refundable,
  suggestedRefund,
} from './order-math';

const line = (
  o: Partial<{
    id: string;
    quantity: number;
    qtyShipped: number;
    qtyRefunded: number;
    row: number;
    disc: number;
    tax: number;
  }>,
) => ({
  id: o.id ?? 'a',
  quantity: o.quantity ?? 3,
  qtyShipped: o.qtyShipped ?? 0,
  qtyRefunded: o.qtyRefunded ?? 0,
  rowTotal: { amount: o.row ?? 3000 },
  discount: { amount: o.disc ?? 300 },
  tax: { amount: o.tax ?? 270 },
});

describe('order math', () => {
  it('computes open quantities', () => {
    expect(openToShip(line({ qtyShipped: 1 }))).toBe(2);
    expect(openToRefund(line({ qtyRefunded: 3 }))).toBe(0);
  });

  it('refunds a line after discount, adding tax only for net prices, prorated (truncated)', () => {
    expect(lineRefundValue(line({}), 1, false)).toBe(990); // (3000 − 300 + 270) / 3
    expect(lineRefundValue(line({}), 1, true)).toBe(900); // (3000 − 300) / 3
    expect(lineRefundValue(line({ row: 1000, disc: 0, tax: 0 }), 1, true)).toBe(333);
    expect(lineRefundValue(line({}), 0, false)).toBe(0);
  });

  it('sums the selected lines and knows what is left to refund', () => {
    const lines = [line({ id: 'a' }), line({ id: 'b', quantity: 1, row: 500, disc: 0, tax: 0 })];
    expect(suggestedRefund(lines, { a: 2, b: 1 }, true)).toBe(1800 + 500);
    expect(refundable({ amountPaid: { amount: 5000 }, amountRefunded: { amount: 1200 } })).toBe(
      3800,
    );
  });
});
