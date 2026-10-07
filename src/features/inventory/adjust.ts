/** Stock adjustment form → API body. Pure (unit-tested). */

export type AdjustMode = 'receive' | 'remove' | 'count';

export interface AdjustDraft {
  mode: AdjustMode;
  amount: string;
  safetyStock: string;
  reason: string;
  note: string;
  reference: string;
}

export function adjustBody(
  d: AdjustDraft,
  current: { quantity: number; reserved: number; safetyStock: number; version?: number } | null,
): { body?: Record<string, unknown>; error?: string } {
  const n = Number(d.amount);
  const safetyChanged =
    d.safetyStock.trim() !== '' && Number(d.safetyStock) !== (current?.safetyStock ?? 0);
  if (d.safetyStock.trim() && !/^\d+$/.test(d.safetyStock.trim()))
    return { error: 'inv.err.safety' };
  if (d.amount.trim() === '' && !safetyChanged) return { error: 'inv.err.amount' };
  const change: Record<string, unknown> = {};
  if (d.amount.trim() !== '') {
    if (!/^\d+$/.test(d.amount.trim())) return { error: 'inv.err.amount' };
    if (d.mode === 'count') change.quantity = n;
    else {
      if (n === 0) return { error: 'inv.err.amount' };
      change.delta = d.mode === 'remove' ? -n : n;
    }
    const after = d.mode === 'count' ? n : (current?.quantity ?? 0) + (change.delta as number);
    if (after < 0) return { error: 'inv.err.negative' };
    if (current && after < current.reserved) return { error: 'inv.err.belowReserved' };
  }
  return {
    body: {
      ...change,
      ...(safetyChanged ? { safetyStock: Number(d.safetyStock) } : {}),
      reason:
        d.mode === 'receive'
          ? 'RECEIPT'
          : d.mode === 'count'
            ? 'CORRECTION'
            : d.reason || 'ADJUSTMENT',
      ...(d.note.trim() ? { note: d.note.trim() } : {}),
      ...(d.reference.trim() ? { reference: d.reference.trim() } : {}),
      ...(current?.version !== undefined ? { expectedVersion: current.version } : {}),
    },
  };
}
