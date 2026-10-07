'use client';

import { ArrowRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { createCurrency, createExchangeRate, updateCurrency } from './actions';
import { fromLocalInput, RATE_PATTERN } from './shared';
import { PRICING_TABS } from './tabs';

export function RatesView({
  currencies,
  rates,
  canWrite,
  canWriteCurrencies,
}: {
  currencies: Schemas['CurrencyDto'][];
  rates: Schemas['ExchangeRateDto'][];
  /** pricing:write — exchange rates */
  canWrite: boolean;
  /** stores:write — currencies */
  canWriteCurrencies: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [addingRate, setAddingRate] = useState<{ base: string; quote: string } | null>(null);
  const [addingCurrency, setAddingCurrency] = useState(false);
  const active = currencies.filter((c) => c.isActive);
  const rateFmt = (r: string) =>
    new Intl.NumberFormat(intl, { maximumFractionDigits: 8 }).format(Number(r));

  return (
    <>
      <PageHeader
        title={t('price.title')}
        description={t('rates.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('price.rates') }]}
      />
      <SubNav items={PRICING_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title={t('rates.currencies')}
            description={t('rates.currenciesHint')}
            actions={
              canWriteCurrencies && (
                <Button size="sm" variant="secondary" onClick={() => setAddingCurrency(true)}>
                  <Plus />
                  {t('rates.addCurrency')}
                </Button>
              )
            }
          />
          <div className="mt-4">
            <Table>
              <THead>
                <tr>
                  <TH>{t('common.code')}</TH>
                  <TH>{t('common.name')}</TH>
                  <TH>{t('rates.symbol')}</TH>
                  <TH data-align="right">{t('rates.decimals')}</TH>
                  <TH data-align="right">{t('common.active')}</TH>
                </tr>
              </THead>
              <TBody>
                {[...currencies]
                  .sort(
                    (a, b) =>
                      Number(b.isActive) - Number(a.isActive) || a.code.localeCompare(b.code),
                  )
                  .map((c) => (
                    <TR key={c.code}>
                      <TD className="font-mono font-medium">{c.code}</TD>
                      <TD>{c.name}</TD>
                      <TD>{c.symbol}</TD>
                      <TD data-align="right">{c.minorUnits}</TD>
                      <TD data-align="right">
                        <Switch
                          aria-label={`${t('common.active')} · ${c.code}`}
                          checked={c.isActive}
                          disabled={!canWriteCurrencies}
                          onCheckedChange={async (isActive) => {
                            if (
                              await runAction(updateCurrency(c.code, { isActive }), {
                                success: t('common.saved'),
                              })
                            )
                              router.refresh();
                          }}
                        />
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title={t('rates.title')}
            description={t('rates.hint')}
            actions={
              canWrite &&
              active.length > 1 && (
                <Button
                  size="sm"
                  onClick={() => setAddingRate({ base: active[0].code, quote: active[1].code })}
                >
                  <Plus />
                  {t('rates.add')}
                </Button>
              )
            }
          />
          <div className="mt-4">
            {rates.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>{t('rates.pair')}</TH>
                    <TH data-align="right">{t('rates.rate')}</TH>
                    <TH className="hidden sm:table-cell">{t('rates.since')}</TH>
                    <TH className="w-24">
                      <span className="sr-only">{t('list.actions')}</span>
                    </TH>
                  </tr>
                </THead>
                <TBody>
                  {rates.map((r) => (
                    <TR key={`${r.baseCurrencyCode}-${r.quoteCurrencyCode}`}>
                      <TD>
                        <span className="inline-flex items-center gap-2 font-mono font-medium">
                          {r.baseCurrencyCode}
                          <ArrowRight aria-hidden className="size-3.5 text-fg-subtle" />
                          {r.quoteCurrencyCode}
                        </span>
                      </TD>
                      <TD data-align="right">
                        1 {r.baseCurrencyCode} = {rateFmt(r.rate)} {r.quoteCurrencyCode}
                      </TD>
                      <TD className="hidden text-fg-muted sm:table-cell">
                        {formatDate(r.validFrom, intl, true)}
                      </TD>
                      <TD data-align="right">
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setAddingRate({
                                base: r.baseCurrencyCode,
                                quote: r.quoteCurrencyCode,
                              })
                            }
                          >
                            {t('rates.update')}
                          </Button>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyState title={t('rates.empty')} description={t('rates.emptyBody')} />
            )}
          </div>
        </Card>
      </div>
      {addingRate && (
        <RateDialog
          initial={addingRate}
          currencies={active}
          onClose={() => setAddingRate(null)}
          onSaved={() => {
            setAddingRate(null);
            router.refresh();
          }}
        />
      )}
      {addingCurrency && (
        <CurrencyDialog
          onClose={() => setAddingCurrency(false)}
          onSaved={() => {
            setAddingCurrency(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RateDialog({
  initial,
  currencies,
  onClose,
  onSaved,
}: {
  initial: { base: string; quote: string };
  currencies: Schemas['CurrencyDto'][];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [base, setBase] = useState(initial.base);
  const [quote, setQuote] = useState(initial.quote);
  const [rate, setRate] = useState('');
  const [from, setFrom] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const error =
    base === quote
      ? t('rates.err.same')
      : !RATE_PATTERN.test(rate.trim())
        ? t('rates.err.rate')
        : undefined;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('rates.add')}
        description={t('rates.addHint')}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              loading={saving}
              onClick={async () => {
                setTouched(true);
                if (error) return;
                setSaving(true);
                const ok = await runAction(
                  createExchangeRate({
                    baseCurrencyCode: base,
                    quoteCurrencyCode: quote,
                    rate: rate.trim(),
                    ...(from ? { validFrom: fromLocalInput(from) ?? undefined } : {}),
                  }),
                  { success: t('common.saved') },
                );
                setSaving(false);
                if (ok) onSaved();
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            {[
              ['rate-base', t('rates.base'), base, setBase],
              null,
              ['rate-quote', t('rates.quote'), quote, setQuote],
            ].map((x, i) =>
              x ? (
                <div key={i} className="grid content-start gap-1.5">
                  <Label htmlFor={x[0] as string}>{x[1] as string}</Label>
                  <Select value={x[2] as string} onValueChange={x[3] as (v: string) => void}>
                    <SelectTrigger id={x[0] as string} className="font-mono" />
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <ArrowRight key={i} aria-hidden className="mb-3 size-4 text-fg-subtle" />
              ),
            )}
          </div>
          <Field
            id="rate-value"
            label={t('rates.rateLabel', { base, quote })}
            error={touched ? error : undefined}
          >
            <Input
              id="rate-value"
              inputMode="decimal"
              autoFocus
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field id="rate-from" label={t('price.validFrom')} hint={t('rates.fromHint')}>
            <Input
              id="rate-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('2');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    code: !/^[A-Z]{3}$/.test(code) ? t('rates.err.code') : undefined,
    name: !name.trim() ? t('sets.err.name') : undefined,
    symbol: !symbol.trim() ? t('rates.err.symbol') : undefined,
    decimals: !/^[0-4]$/.test(decimals) ? t('rates.err.decimals') : undefined,
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('rates.addCurrency')}
        description={t('rates.addCurrencyHint')}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              loading={saving}
              onClick={async () => {
                setTouched(true);
                if (Object.values(errors).some(Boolean)) return;
                setSaving(true);
                const ok = await runAction(
                  createCurrency({
                    code,
                    name: name.trim(),
                    symbol: symbol.trim(),
                    minorUnits: Number(decimals),
                    isActive: true,
                  }),
                  { success: t('common.saved') },
                );
                setSaving(false);
                if (ok) onSaved();
              }}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="cur-code"
            label={t('common.code')}
            hint="ISO 4217"
            required
            error={touched ? errors.code : undefined}
          >
            <Input
              id="cur-code"
              autoFocus
              maxLength={3}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </Field>
          <Field
            id="cur-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input id="cur-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field
            id="cur-symbol"
            label={t('rates.symbol')}
            required
            error={touched ? errors.symbol : undefined}
          >
            <Input
              id="cur-symbol"
              maxLength={8}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </Field>
          <Field
            id="cur-dec"
            label={t('rates.decimals')}
            hint={t('rates.decimalsHint')}
            error={touched ? errors.decimals : undefined}
          >
            <Input
              id="cur-dec"
              inputMode="numeric"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              className="tabular"
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
