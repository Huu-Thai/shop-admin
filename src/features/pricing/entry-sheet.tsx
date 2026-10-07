'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { parsePositive, toMajor } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { variantSearch } from '../catalog/products/variant-search';
import { deletePriceEntry, setPriceEntries } from './actions';

interface Tier {
  key: number;
  id?: string;
  minQty: string;
  amount: string;
  compareAt: string;
}
let seq = 0;

/** Pure: validates tiers and builds the upsert payload and the entries to delete. */
export function tiersPayload(
  tiers: { id?: string; minQty: string; amount: string; compareAt: string }[],
  existing: { id: string; minQty: number }[],
  currency: string,
) {
  const errors: Record<number, string> = {};
  const seen = new Set<number>();
  const entries = tiers.flatMap((tr, i) => {
    const minQty = Number(tr.minQty);
    const amount = parsePositive(tr.amount, currency);
    const compareAt = tr.compareAt.trim() ? parsePositive(tr.compareAt, currency) : null;
    if (!/^\d+$/.test(tr.minQty) || minQty < 1) errors[i] = 'price.err.minQty';
    else if (seen.has(minQty)) errors[i] = 'price.err.duplicateTier';
    else if (amount === undefined) errors[i] = 'price.err.amount';
    else if (compareAt === undefined) errors[i] = 'price.err.amount';
    else if (compareAt !== null && compareAt <= amount) errors[i] = 'price.err.compareAt';
    seen.add(minQty);
    return errors[i] ? [] : [{ minQty, amount: amount!, compareAtAmount: compareAt }];
  });
  const kept = new Set(entries.map((e) => e.minQty));
  const remove = existing.filter((e) => !kept.has(e.minQty)).map((e) => e.id);
  return { entries, remove, errors };
}

export function EntrySheet({
  bookId,
  currency,
  variant,
  existing,
  nameLocale,
  onClose,
}: {
  bookId: string;
  currency: string;
  /** Editing one variant's prices, or null to add prices for a new variant. */
  variant: { id: string; sku: string } | null;
  existing: Schemas['PriceEntryDto'][];
  nameLocale?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useMemo(() => variantSearch({ nameLocale }), [nameLocale]);
  const [variantId, setVariantId] = useState(variant?.id ?? '');
  const [tiers, setTiers] = useState<Tier[]>(() =>
    existing.length
      ? [...existing]
          .sort((a, b) => a.minQty - b.minQty)
          .map((e) => ({
            key: ++seq,
            id: e.id,
            minQty: String(e.minQty),
            amount: toMajor(e.amount, currency),
            compareAt: e.compareAtAmount != null ? toMajor(e.compareAtAmount, currency) : '',
          }))
      : [{ key: ++seq, minQty: '1', amount: '', compareAt: '' }],
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const { entries, remove, errors } = tiersPayload(tiers, existing, currency);

  const save = async () => {
    setTouched(true);
    if (!variantId || Object.keys(errors).length || !entries.length) return;
    setSaving(true);
    try {
      const ok = await runAction(
        setPriceEntries(
          bookId,
          entries.map((e) => ({ ...e, variantId })),
        ),
      );
      if (!ok) return;
      for (const id of remove) if (!(await runAction(deletePriceEntry(bookId, id)))) return;
      toast.success(t('common.saved'));
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const patch = (i: number, p: Partial<Tier>) =>
    setTiers((ts) => ts.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={variant ? variant.sku : t('price.addPrices')}
        description={t('price.tiersHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          {!variant && (
            <div className="grid gap-1.5">
              <Label htmlFor="pe-variant">
                {t('price.variant')}
                <span aria-hidden className="ml-0.5 text-danger">
                  *
                </span>
              </Label>
              <Combobox
                id="pe-variant"
                value={variantId ? [variantId] : []}
                onChange={([v]) => setVariantId(v ?? '')}
                load={search.load}
                invalid={touched && !variantId}
                placeholder={t('price.chooseVariant')}
                searchPlaceholder={t('price.searchVariant')}
                emptyText={t('common.noResults')}
              />
              {touched && !variantId && (
                <p className="text-small text-danger-fg">{t('price.err.variant')}</p>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <div className="grid grid-cols-[96px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase">
              <span>{t('price.minQty')}</span>
              <span>{t('price.price')}</span>
              <span>{t('price.compareAt')}</span>
              <span />
            </div>
            {tiers.map((tr, i) => (
              <div key={tr.key} className="grid gap-1">
                <div className="grid grid-cols-[96px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2">
                  <Input
                    aria-label={`${t('price.minQty')} ${i + 1}`}
                    inputMode="numeric"
                    value={tr.minQty}
                    onChange={(e) => patch(i, { minQty: e.target.value })}
                    className="tabular"
                  />
                  <MoneyInput
                    aria-label={`${t('price.price')} ${i + 1}`}
                    currency={currency}
                    value={tr.amount}
                    autoFocus={i === 0 && !!variant}
                    onChange={(e) => patch(i, { amount: e.target.value })}
                    aria-invalid={(touched && !!errors[i]) || undefined}
                  />
                  <MoneyInput
                    aria-label={`${t('price.compareAt')} ${i + 1}`}
                    currency={currency}
                    placeholder={t('common.optional')}
                    value={tr.compareAt}
                    onChange={(e) => patch(i, { compareAt: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('common.remove')}
                    disabled={tiers.length === 1}
                    onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {touched && errors[i] && (
                  <p className="text-small text-danger-fg">
                    {t(errors[i] as Parameters<typeof t>[0])}
                  </p>
                )}
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                setTiers((ts) => [
                  ...ts,
                  {
                    key: ++seq,
                    minQty: String(Math.max(...ts.map((x) => Number(x.minQty) || 1)) * 2 || 10),
                    amount: '',
                    compareAt: '',
                  },
                ])
              }
            >
              <Plus />
              {t('price.addTier')}
            </Button>
          </div>
          <p className="rounded-md bg-surface-muted px-3 py-2.5 text-small text-fg-muted">
            {t('price.tiersExplain')}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
