'use client';

import { Calculator } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { GatewayError, gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { variantSearch } from '../catalog/products/variant-search';
import { fromLocalInput } from './shared';
import { PRICING_TABS } from './tabs';

type Preview = Schemas['PricePreviewDto'];

/** Explains which book and tier price a variant gets for a store, customer group and quantity. */
export function PreviewTool({
  stores,
  groups,
  nameLocale,
  initialVariant,
}: {
  stores: Schemas['StoreDto'][];
  groups: Schemas['CustomerGroupDto'][];
  nameLocale?: string;
  initialVariant?: { id: string; sku: string };
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const search = useMemo(() => variantSearch({ nameLocale }), [nameLocale]);
  const [variantId, setVariantId] = useState(initialVariant?.id ?? '');
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [group, setGroup] = useState(
    groups.find((g) => g.code === 'guest')?.code ?? groups[0]?.code ?? 'guest',
  );
  const [qty, setQty] = useState('1');
  const [at, setAt] = useState('');
  const [currency, setCurrency] = useState('');
  const [result, setResult] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const store = stores.find((s) => s.id === storeId);

  const run = async () => {
    if (!variantId || !storeId || !/^\d+$/.test(qty) || Number(qty) < 1) return;
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ variantId, storeId, customerGroup: group, qty });
      if (currency) q.set('currency', currency);
      const iso = fromLocalInput(at);
      if (iso) q.set('at', iso);
      setResult(await gw<Preview>(`prices/preview?${q}`));
    } catch (e) {
      setResult(null);
      setError(e instanceof GatewayError ? e.message : t('media.err.network'));
    } finally {
      setLoading(false);
    }
  };
  const money = (n: number) => (result ? formatMoney(n, result.currency, intl) : '');

  return (
    <>
      <PageHeader
        title={t('price.title')}
        description={t('preview.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('price.preview') }]}
      />
      <SubNav items={PRICING_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('preview.inputs')} />
          <CardBody className="grid gap-4 pt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pv-variant">{t('price.variant')}</Label>
              <Combobox
                id="pv-variant"
                value={variantId ? [variantId] : []}
                onChange={([v]) => setVariantId(v ?? '')}
                load={search.load}
                labels={initialVariant ? { [initialVariant.id]: initialVariant.sku } : undefined}
                placeholder={t('price.chooseVariant')}
                searchPlaceholder={t('price.searchVariant')}
                emptyText={t('common.noResults')}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pv-store">{t('stores.store')}</Label>
              <Select
                value={storeId}
                onValueChange={(v) => {
                  setStoreId(v);
                  setCurrency('');
                }}
              >
                <SelectTrigger id="pv-store" />
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="pv-group">{t('price.group')}</Label>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger id="pv-group" />
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.code}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="pv-currency">{t('gc.currency')}</Label>
                <Select
                  value={currency || '__store'}
                  onValueChange={(v) => setCurrency(v === '__store' ? '' : v)}
                >
                  <SelectTrigger id="pv-currency" />
                  <SelectContent>
                    <SelectItem value="__store">
                      {t('preview.storeCurrency', { code: store?.defaultCurrencyCode ?? '' })}
                    </SelectItem>
                    {(store?.currencyCodes ?? [])
                      .filter((c) => c !== store?.defaultCurrencyCode)
                      .map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
              <Field id="pv-qty" label={t('preview.qty')}>
                <Input
                  id="pv-qty"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="tabular"
                />
              </Field>
              <Field id="pv-at" label={t('preview.at')} hint={t('preview.atHint')}>
                <Input
                  id="pv-at"
                  type="datetime-local"
                  value={at}
                  onChange={(e) => setAt(e.target.value)}
                />
              </Field>
            </div>
            <Button onClick={run} loading={loading} disabled={!variantId || !storeId}>
              <Calculator />
              {t('preview.run')}
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
          {result && !result.applied ? (
            <Card>
              <EmptyState
                icon={<Calculator />}
                title={t('preview.noPrice')}
                description={t('preview.noPriceBody')}
              />
            </Card>
          ) : result?.applied ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  [t('preview.unit'), money(result.applied.net), result.applied.priceBook],
                  [
                    t('preview.lineTax', { rate: `${Number(result.taxRate)}%` }),
                    money(result.lineTax),
                    null,
                  ],
                  [t('preview.lineGross', { qty: result.qty }), money(result.lineGross), null],
                ].map(([label, value, sub], i) => (
                  <Card
                    key={i}
                    className={cn('p-5', i === 2 && 'bg-surface-inverse text-fg-inverse')}
                  >
                    <p
                      className={cn(
                        'text-small',
                        i === 2 ? 'text-fg-inverse-muted' : 'text-fg-muted',
                      )}
                    >
                      {label}
                    </p>
                    <p
                      className={cn(
                        'tabular mt-2 text-h2 font-semibold',
                        i === 2 ? 'text-white' : 'text-fg',
                      )}
                    >
                      {value}
                    </p>
                    {sub && <p className="mt-1 font-mono text-caption text-fg-muted">{sub}</p>}
                  </Card>
                ))}
              </div>
              <Card className="overflow-hidden">
                <CardHeader title={t('preview.tiers')} description={t('preview.tiersHint')} />
                <div className="mt-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>{t('price.minQty')}</TH>
                        <TH data-align="right">{t('preview.net')}</TH>
                        <TH data-align="right">{t('preview.gross')}</TH>
                        <TH>{t('price.book')}</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {result.tiers.map((tier) => {
                        const applied =
                          tier.minQty === result.applied!.minQty &&
                          tier.priceBook === result.applied!.priceBook;
                        return (
                          <TR
                            key={`${tier.priceBook}-${tier.minQty}`}
                            data-state={applied ? 'selected' : undefined}
                          >
                            <TD className="tabular">
                              {tier.minQty}+{' '}
                              {applied && (
                                <Badge tone="accent" className="ml-2">
                                  {t('preview.applied')}
                                </Badge>
                              )}
                            </TD>
                            <TD data-align="right">{money(tier.net)}</TD>
                            <TD data-align="right">{money(tier.gross)}</TD>
                            <TD className="font-mono text-small">{tier.priceBook}</TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              </Card>
              <Card>
                <CardHeader title={t('preview.books')} description={t('preview.booksHint')} />
                <CardBody className="pt-4">
                  <ol className="grid gap-2">
                    {result.books.map((b, i) => (
                      <li key={b} className="flex items-center gap-3 text-body">
                        <span className="tabular flex size-6 items-center justify-center rounded-full bg-surface-muted text-caption font-semibold">
                          {i + 1}
                        </span>
                        <span className="font-mono">{b}</span>
                        {i === 0 && <Badge tone="success">{t('preview.wins')}</Badge>}
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            </>
          ) : (
            !error && (
              <Card>
                <EmptyState
                  icon={<Calculator />}
                  title={t('preview.emptyTitle')}
                  description={t('preview.emptyBody')}
                />
              </Card>
            )
          )}
        </div>
      </div>
    </>
  );
}
