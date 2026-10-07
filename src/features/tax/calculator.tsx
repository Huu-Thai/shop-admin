'use client';

import { Calculator, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { GatewayError, gw } from '@/lib/gateway-client';
import { parsePositive } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { PRICING_TABS } from '../pricing/tabs';

interface Line {
  key: string;
  amount: string;
  taxClass: string;
}

/** Runs the tax engine for a destination and basket — the same calculation checkout uses. */
export function TaxCalculator({
  classes,
  currencies,
}: {
  classes: Schemas['TaxClassDto'][];
  currencies: string[];
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const productClasses = classes
    .filter((c) => c.type === 'PRODUCT')
    .sort((a, b) => Number(b.code === 'standard') - Number(a.code === 'standard'));
  const customerClasses = classes.filter((c) => c.type === 'CUSTOMER');
  const [country, setCountry] = useState('US');
  const [region, setRegion] = useState('');
  const [postcode, setPostcode] = useState('');
  const [customer, setCustomer] = useState(customerClasses[0]?.code ?? '');
  const [inclusive, setInclusive] = useState(false);
  const [currency, setCurrency] = useState(currencies[0] ?? 'USD');
  const [lines, setLines] = useState<Line[]>([
    { key: 'line-1', amount: '100', taxClass: productClasses[0]?.code ?? '' },
  ]);
  const [result, setResult] = useState<Schemas['TaxResultDto'] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const money = (n: number) => formatMoney(n, currency, intl);

  const run = async () => {
    setError('');
    const parsed = lines.map((l) => ({ ...l, minor: parsePositive(l.amount, currency) }));
    if (!/^[A-Z]{2}$/.test(country) || parsed.some((l) => l.minor === undefined)) {
      setError(t('tax.err.calc'));
      return;
    }
    setLoading(true);
    try {
      setResult(
        await gw<Schemas['TaxResultDto']>('tax/calculate', {
          method: 'POST',
          body: {
            destination: {
              countryCode: country,
              ...(region ? { regionCode: region } : {}),
              ...(postcode ? { postcode } : {}),
            },
            ...(customer ? { customerTaxClass: customer } : {}),
            pricesIncludeTax: inclusive,
            lines: parsed.map((l) => ({
              key: l.key,
              amount: l.minor!,
              ...(l.taxClass ? { productTaxClass: l.taxClass } : {}),
            })),
          },
        }),
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof GatewayError ? e.message : t('media.err.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('price.title')}
        description={t('tax.calcDescription')}
        breadcrumbs={[
          { label: t('nav.catalog') },
          { label: t('tax.title'), href: '/tax' },
          { label: t('tax.calculator') },
        ]}
      />
      <SubNav items={PRICING_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('tax.basket')} />
          <CardBody className="grid gap-4 pt-4">
            <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <Field id="tc-country" label={t('tax.country')}>
                <Input
                  id="tc-country"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </Field>
              <Field id="tc-region" label={t('tax.region')}>
                <Input
                  id="tc-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </Field>
              <Field id="tc-postcode" label={t('tax.postcode')}>
                <Input
                  id="tc-postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="tc-customer">{t('tax.customerClass')}</Label>
                <Select
                  value={customer || '__none'}
                  onValueChange={(v) => setCustomer(v === '__none' ? '' : v)}
                >
                  <SelectTrigger id="tc-customer" />
                  <SelectContent>
                    <SelectItem value="__none">{t('tax.anyCustomer')}</SelectItem>
                    {customerClasses.map((c) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="tc-currency">{t('gc.currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="tc-currency" />
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
              <span className="text-body text-fg">{t('price.includesTax')}</span>
              <Switch checked={inclusive} onCheckedChange={setInclusive} />
            </label>
            <div className="grid gap-2">
              <Label>{t('tax.lines')}</Label>
              {lines.map((l, i) => (
                <div
                  key={l.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2"
                >
                  <MoneyInput
                    aria-label={`${t('gc.amount')} ${i + 1}`}
                    currency={currency}
                    value={l.amount}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)),
                      )
                    }
                  />
                  <Select
                    value={l.taxClass}
                    onValueChange={(v) =>
                      setLines((ls) => ls.map((x, j) => (j === i ? { ...x, taxClass: v } : x)))
                    }
                  >
                    <SelectTrigger aria-label={`${t('tax.productClass')} ${i + 1}`} />
                    <SelectContent>
                      {productClasses.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('common.remove')}
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="justify-self-start"
                onClick={() =>
                  setLines((ls) => [
                    ...ls,
                    {
                      key: `line-${ls.length + 1}-${Date.now()}`,
                      amount: '',
                      taxClass: productClasses[0]?.code ?? '',
                    },
                  ])
                }
              >
                <Plus />
                {t('tax.addLine')}
              </Button>
            </div>
            <Button onClick={run} loading={loading}>
              <Calculator />
              {t('tax.calculate')}
            </Button>
          </CardBody>
        </Card>

        <div className="grid gap-6">
          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-small text-danger-fg"
            >
              {error}
            </p>
          )}
          {result ? (
            <>
              {result.totals && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    [t('preview.net'), result.totals.net],
                    [t('tax.title'), result.totals.tax],
                    [t('preview.gross'), result.totals.gross],
                  ].map(([label, value], i) => (
                    <Card key={i} className="p-5">
                      <p className="text-small text-fg-muted">{label}</p>
                      <p className="tabular mt-2 text-h2 font-semibold text-fg">
                        {money(value as number)}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
              <Card className="overflow-hidden">
                <CardHeader
                  title={t('tax.applied')}
                  description={
                    result.zones.length
                      ? t('tax.appliedZones', {
                          zones: result.zones.join(', '),
                          rounding:
                            result.rounding === 'LINE' ? t('tax.roundLine') : t('tax.roundTotal'),
                        })
                      : t('tax.noZoneMatched')
                  }
                />
                <div className="mt-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>{t('tax.line')}</TH>
                        <TH data-align="right">{t('preview.net')}</TH>
                        <TH data-align="right">{t('tax.title')}</TH>
                        <TH data-align="right">{t('preview.gross')}</TH>
                        <TH className="hidden md:table-cell">{t('tax.rates')}</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {result.lines.map((l, i) => (
                        <TR key={l.key}>
                          <TD>{i + 1}</TD>
                          <TD data-align="right">{money(l.net)}</TD>
                          <TD data-align="right">{money(l.tax)}</TD>
                          <TD data-align="right" className="font-medium">
                            {money(l.gross)}
                          </TD>
                          <TD className="hidden text-small text-fg-muted md:table-cell">
                            {l.taxes.map((x) => `${x.name} ${Number(x.rate)}%`).join(' + ') || '—'}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>
            </>
          ) : (
            !error && (
              <Card>
                <EmptyState
                  icon={<Calculator />}
                  title={t('tax.calcEmpty')}
                  description={t('tax.calcEmptyBody')}
                />
              </Card>
            )
          )}
        </div>
      </div>
    </>
  );
}
