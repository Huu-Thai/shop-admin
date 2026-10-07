'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatMoney } from '@/lib/format';
import { toMajor, toMinor } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { refundOrder } from './actions';
import { openToRefund, refundable, suggestedRefund } from './order-math';

/**
 * Refund returned lines (optionally back to stock) or any amount up to what was paid. The
 * idempotency key is fixed for the dialog, so a retried submit can't refund twice.
 */
export function RefundDialog({
  order,
  onClose,
}: {
  order: Schemas['AdminOrderDto'];
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const currency = order.currency;
  const key = useMemo(() => crypto.randomUUID(), []);
  const lines = order.items.filter((l) => openToRefund(l) > 0);
  const max = refundable(order.totals);
  const [mode, setMode] = useState<'items' | 'amount'>(lines.length ? 'items' : 'amount');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState(true);
  const [amount, setAmount] = useState('');
  const [amountEdited, setAmountEdited] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const selection = Object.fromEntries(Object.entries(qty).map(([k, v]) => [k, Number(v) || 0]));
  const badQty = lines.some((l) => {
    const v = qty[l.id];
    return v !== undefined && v !== '' && (!/^\d+$/.test(v) || Number(v) > openToRefund(l));
  });
  const suggestion = Math.min(
    max,
    suggestedRefund(lines, selection, order.totals.pricesIncludeTax),
  );
  const shownAmount = amountEdited ? amount : suggestion ? toMajor(suggestion, currency) : '';
  const minor = toMinor(shownAmount, currency);
  const chosen = lines.filter((l) => (selection[l.id] ?? 0) > 0);
  const error =
    mode === 'items' && badQty
      ? t('refund.err.qty')
      : mode === 'items' && !chosen.length
        ? t('refund.err.none')
        : !Number.isSafeInteger(minor) || minor <= 0
          ? t('price.err.amount')
          : minor > max
            ? t('refund.err.max', { max: formatMoney(max, currency, intl) })
            : undefined;

  const submit = async () => {
    setTouched(true);
    if (error) return;
    setSaving(true);
    const ok = await runAction(
      refundOrder(
        order.id,
        {
          restock: mode === 'items' && restock,
          ...(mode === 'items'
            ? { items: chosen.map((l) => ({ orderItemId: l.id, quantity: selection[l.id] })) }
            : {}),
          // Send the amount unless it is exactly what the API would compute from the lines.
          ...(mode === 'amount' || amountEdited ? { amount: minor } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
        key,
      ),
    );
    setSaving(false);
    if (ok) {
      toast.success(ok.status === 'SUCCEEDED' ? t('refund.succeeded') : t('refund.pending'));
      onClose();
      router.refresh();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl"
        title={t('refund.title', { number: order.number })}
        description={t('refund.hint', { max: formatMoney(max, currency, intl) })}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button variant="danger" loading={saving} onClick={submit}>
              {Number.isSafeInteger(minor) && minor > 0
                ? t('refund.submitAmount', { amount: formatMoney(minor, currency, intl) })
                : t('refund.submit')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          {lines.length > 0 && (
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as 'items' | 'amount')}
              className="flex flex-wrap gap-6"
            >
              <Radio
                id="rf-items"
                value="items"
                label={t('refund.byItems')}
                hint={t('refund.byItemsHint')}
              />
              <Radio
                id="rf-amount"
                value="amount"
                label={t('refund.byAmount')}
                hint={t('refund.byAmountHint')}
              />
            </RadioGroup>
          )}
          {mode === 'items' && (
            <>
              <div className="-mx-6 border-y border-border">
                <Table>
                  <THead>
                    <tr>
                      <TH>{t('prod.product')}</TH>
                      <TH data-align="right">{t('refund.refundable')}</TH>
                      <TH data-align="right" className="w-28">
                        {t('refund.return')}
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {lines.map((l) => (
                      <TR key={l.id}>
                        <TD>
                          <span className="block font-medium">{l.name}</span>
                          <span className="block font-mono text-caption text-fg-muted">
                            {l.sku} · {l.unitPrice.formatted}
                          </span>
                        </TD>
                        <TD data-align="right">{openToRefund(l)}</TD>
                        <TD data-align="right">
                          <Input
                            aria-label={`${t('refund.return')} · ${l.sku}`}
                            inputMode="numeric"
                            placeholder="0"
                            value={qty[l.id] ?? ''}
                            onChange={(e) => {
                              setQty((q) => ({ ...q, [l.id]: e.target.value }));
                              setAmountEdited(false);
                            }}
                            className="tabular h-9 text-right"
                          />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              <label className="flex items-center gap-2.5 text-body text-fg">
                <Checkbox checked={restock} onCheckedChange={(v) => setRestock(v === true)} />
                {t('refund.restock')}
              </label>
            </>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="rf-amount-input">{t('refund.amount')}</Label>
              <MoneyInput
                id="rf-amount-input"
                currency={currency}
                value={shownAmount}
                onChange={(e) => {
                  setAmountEdited(true);
                  setAmount(e.target.value);
                }}
                aria-invalid={(touched && !!error) || undefined}
              />
              {mode === 'items' && !amountEdited && suggestion > 0 && (
                <p className="text-small text-fg-muted">{t('refund.suggested')}</p>
              )}
            </div>
            <Field id="rf-reason" label={t('refund.reason')}>
              <Textarea
                id="rf-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </div>
          {touched && error && (
            <p role="alert" className="text-small text-danger-fg">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
