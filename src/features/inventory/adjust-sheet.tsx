'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { RadioCard, RadioGroup } from '@/components/ui/radio';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import type { Schemas } from '@/server/api';
import { variantSearch } from '../catalog/products/variant-search';
import { adjustStock } from './actions';
import { type AdjustDraft, type AdjustMode, adjustBody } from './adjust';

export interface StockTarget {
  sourceId: string;
  variantId: string;
  sku: string;
  stock: { quantity: number; reserved: number; safetyStock: number; version?: number } | null;
}

/** Receive, remove or recount stock of one variant at one source. */
export function AdjustSheet({
  target,
  sources,
  nameLocale,
  onClose,
}: {
  /** Known row, or null to receive stock for any variant. */
  target: StockTarget | null;
  sources: Schemas['InventorySourceDto'][];
  nameLocale?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useMemo(() => variantSearch({ nameLocale }), [nameLocale]);
  const [variantId, setVariantId] = useState(target?.variantId ?? '');
  const [sourceId, setSourceId] = useState(
    target?.sourceId ?? sources.find((s) => s.isActive)?.id ?? '',
  );
  const [draft, setDraft] = useState<AdjustDraft>({
    mode: 'receive',
    amount: '',
    safetyStock: target?.stock ? String(target.stock.safetyStock) : '',
    reason: 'ADJUSTMENT',
    note: '',
    reference: '',
  });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = target?.stock ?? null;
  const { body, error } = adjustBody(draft, current);
  const patch = (p: Partial<AdjustDraft>) => setDraft((d) => ({ ...d, ...p }));
  const preview =
    draft.amount.trim() && /^\d+$/.test(draft.amount)
      ? draft.mode === 'count'
        ? Number(draft.amount)
        : (current?.quantity ?? 0) + (draft.mode === 'remove' ? -1 : 1) * Number(draft.amount)
      : null;

  const save = async () => {
    setTouched(true);
    if (!variantId || !sourceId || !body) return;
    setSaving(true);
    const ok = await runAction(
      adjustStock({ ...(body as Schemas['StockAdjustmentDto']), sourceId, variantId }),
      { success: t('inv.adjusted') },
    );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={target ? target.sku : t('inv.receive')}
        description={
          target
            ? (sources.find((s) => s.id === target.sourceId)?.name ?? '')
            : t('inv.receiveHint')
        }
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('inv.apply')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          {!target && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="adj-variant">{t('price.variant')}</Label>
                <Combobox
                  id="adj-variant"
                  value={variantId ? [variantId] : []}
                  onChange={([v]) => setVariantId(v ?? '')}
                  load={search.load}
                  invalid={touched && !variantId}
                  placeholder={t('price.chooseVariant')}
                  searchPlaceholder={t('price.searchVariant')}
                  emptyText={t('common.noResults')}
                />
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="adj-source">{t('inv.source')}</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger id="adj-source" />
                  <SelectContent>
                    {sources
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {current && (
            <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border p-4 text-center">
              {[
                [t('inv.onHand'), current.quantity],
                [t('inv.reserved'), current.reserved],
                [
                  t('inv.salable'),
                  Math.max(0, current.quantity - current.reserved - current.safetyStock),
                ],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-caption text-fg-muted">{k}</dt>
                  <dd className="tabular text-h3 font-semibold text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <RadioGroup
            value={draft.mode}
            onValueChange={(v) => patch({ mode: v as AdjustMode })}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            aria-label={t('inv.mode')}
          >
            {(['receive', 'remove', 'count'] as const).map((m) => (
              <RadioCard
                key={m}
                value={m}
                title={t(`inv.mode.${m}` as MessageKey)}
                description={t(`inv.mode.${m}.hint` as MessageKey)}
              />
            ))}
          </RadioGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="adj-amount"
              label={draft.mode === 'count' ? t('inv.countedQty') : t('inv.quantity')}
              error={
                touched && error && error !== 'inv.err.safety' ? t(error as MessageKey) : undefined
              }
            >
              <Input
                id="adj-amount"
                autoFocus
                inputMode="numeric"
                value={draft.amount}
                onChange={(e) => patch({ amount: e.target.value })}
                className="tabular"
              />
            </Field>
            <Field
              id="adj-safety"
              label={t('inv.safety')}
              hint={t('inv.safetyHint')}
              error={touched && error === 'inv.err.safety' ? t(error) : undefined}
            >
              <Input
                id="adj-safety"
                inputMode="numeric"
                value={draft.safetyStock}
                onChange={(e) => patch({ safetyStock: e.target.value })}
                className="tabular"
              />
            </Field>
          </div>
          {preview !== null && current && (
            <p
              className={cn(
                'rounded-md px-3 py-2.5 text-small',
                preview < current.reserved
                  ? 'bg-danger-soft text-danger-fg'
                  : 'bg-surface-muted text-fg-muted',
              )}
            >
              {t('inv.after', { from: current.quantity, to: preview })}
            </p>
          )}
          {draft.mode === 'remove' && (
            <div className="grid gap-1.5">
              <Label htmlFor="adj-reason">{t('inv.reason')}</Label>
              <Select value={draft.reason} onValueChange={(reason) => patch({ reason })}>
                <SelectTrigger id="adj-reason" />
                <SelectContent>
                  {['ADJUSTMENT', 'RETURN', 'CORRECTION'].map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`inv.reason.${r}` as MessageKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="adj-ref" label={t('inv.reference')} hint={t('inv.referenceHint')}>
              <Input
                id="adj-ref"
                maxLength={128}
                value={draft.reference}
                onChange={(e) => patch({ reference: e.target.value })}
              />
            </Field>
            <Field id="adj-note" label={t('inv.note')}>
              <Textarea
                id="adj-note"
                rows={2}
                maxLength={500}
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
