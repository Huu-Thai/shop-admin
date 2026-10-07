/**
 * Order arithmetic shared by the ship and refund dialogs. Mirrors the shop API (refunds.service):
 * a returned line refunds its row total after discount, plus tax when prices are net, prorated by
 * quantity. Pure (unit-tested).
 */

export interface LineMoney {
  id: string;
  quantity: number;
  qtyShipped: number;
  qtyRefunded: number;
  rowTotal: { amount: number };
  discount: { amount: number };
  tax: { amount: number };
}

export const openToShip = (l: LineMoney) => Math.max(0, l.quantity - l.qtyShipped);
export const openToRefund = (l: LineMoney) => Math.max(0, l.quantity - l.qtyRefunded);

export function lineRefundValue(l: LineMoney, qty: number, pricesIncludeTax: boolean): number {
  if (qty <= 0 || l.quantity <= 0) return 0;
  const value = l.rowTotal.amount - l.discount.amount + (pricesIncludeTax ? 0 : l.tax.amount);
  // BigInt division truncates toward zero, as the API does.
  return Number((BigInt(value) * BigInt(qty)) / BigInt(l.quantity));
}

export function suggestedRefund(
  lines: LineMoney[],
  selection: Record<string, number>,
  pricesIncludeTax: boolean,
): number {
  return lines.reduce(
    (sum, l) => sum + lineRefundValue(l, selection[l.id] ?? 0, pricesIncludeTax),
    0,
  );
}

/** Still refundable on the order (captured minus refunded). */
export const refundable = (t: {
  amountPaid: { amount: number };
  amountRefunded: { amount: number };
}) => Math.max(0, t.amountPaid.amount - t.amountRefunded.amount);
