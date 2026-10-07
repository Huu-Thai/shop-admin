'use client';

import { FlaskConical, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { GatewayError, gw } from '@/lib/gateway-client';
import { toMajor, toMinor } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { variantSearch } from '../catalog/products/variant-search';
import { MARKETING_TABS } from './tabs';

type Evaluation = Schemas['EvaluationDto'];
interface Line {
  key: number;
  variantId: string;
  sku: string;
  quantity: string;
  unitPrice: string;
}

const COUPON_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPLIED: 'success',
  NOT_APPLICABLE: 'warning',
  NOT_FOUND: 'danger',
  INACTIVE: 'neutral',
  EXPIRED: 'warning',
  USED_UP: 'warning',
  ALREADY_USED: 'warning',
};
let lineSeq = 0;
const blankLine = (): Line => ({
  key: ++lineSeq,
  variantId: '',
  sku: '',
  quantity: '1',
  unitPrice: '',
});

/**
 * Runs a cart through the promotion engine without placing an order: which promotions apply,
 * what each line saves and why a coupon is (not) accepted.
 */
export function Simulator({
  websites,
  stores,
  groups,
  promotions,
  initialWebsiteId,
  nameLocale,
}: {
  websites: Schemas['WebsiteDto'][];
  stores: Schemas['StoreDto'][];
  groups: Schemas['CustomerGroupDto'][];
  /** id → name, to link applied promotions. */
  promotions: Record<string, string>;
  initialWebsiteId?: string;
  nameLocale?: string;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const search = useMemo(() => variantSearch({ nameLocale }), [nameLocale]);
  const [websiteId, setWebsiteId] = useState(
    websites.find((w) => w.id === initialWebsiteId)?.id ?? websites[0]?.id ?? '',
  );
  const website = websites.find((w) => w.id === websiteId);
  const store =
    stores.find((s) => s.id === website?.defaultStoreId) ??
    stores.find((s) => s.websiteId === websiteId);
  const currencies = [
    ...new Set(
      stores
        .filter((s) => s.websiteId === websiteId)
        .flatMap((s) => [s.defaultCurrencyCode, ...s.currencyCodes]),
    ),
  ];
  const [currency, setCurrency] = useState(store?.defaultCurrencyCode ?? currencies[0] ?? 'USD');
  const [group, setGroup] = useState(
    groups.find((g) => g.code === 'guest')?.code ?? groups[0]?.code ?? 'guest',
  );
  const [coupon, setCoupon] = useState('');
  const [shipping, setShipping] = useState('');
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const money = (minor: string | number) =>
    formatMoney(Number(minor), result?.currencyCode ?? currency, intl);

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /** Fill the unit price from the price books, as the storefront would charge it. */
  const priceOf = async (key: number, variantId: string) => {
    if (!store) return;
    try {
      const q = new URLSearchParams({
        variantId,
        storeId: store.id,
        customerGroup: group,
        qty: '1',
        currency,
      });
      const p = await gw<Schemas['PricePreviewDto']>(`prices/preview?${q}`);
      if (p.applied)
        setLine(key, {
          unitPrice: toMajor(store.pricesIncludeTax ? p.applied.gross : p.applied.net, currency),
        });
    } catch {
      // No price for this store: the admin types one.
    }
  };

  const valid = lines.filter(
    (l) =>
      l.sku &&
      /^\d+$/.test(l.quantity) &&
      Number(l.quantity) >= 1 &&
      Number.isSafeInteger(toMinor(l.unitPrice, currency)) &&
      toMinor(l.unitPrice, currency) >= 0,
  );
  const shippingMinor = shipping.trim() ? toMinor(shipping, currency) : 0;

  const run = async () => {
    if (!valid.length || !(shippingMinor >= 0)) return;
    setRunning(true);
    setError('');
    try {
      setResult(
        await gw<Evaluation>('marketing/promotions/evaluate', {
          method: 'POST',
          body: {
            websiteId,
            currencyCode: currency,
            customerGroupCode: group,
            ...(coupon.trim() ? { couponCode: coupon.trim() } : {}),
            shippingAmount: shippingMinor,
            localeCode: store?.defaultLocaleCode,
            items: valid.map((l) => ({
              sku: l.sku,
              quantity: Number(l.quantity),
              unitPrice: toMinor(l.unitPrice, currency),
            })),
          },
        }),
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof GatewayError ? e.message : t('media.err.network'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('sim.title')}
        description={t('sim.description')}
        breadcrumbs={[
          { label: t('nav.customers') },
          { label: t('nav.promotions'), href: '/promotions' },
          { label: t('sim.title') },
        ]}
      />
      <SubNav items={MARKETING_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('sim.cart')} description={t('sim.cartHint')} />
          <CardBody className="grid gap-5 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {websites.length > 1 && (
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="sim-website">{t('cust.website')}</Label>
                  <Select
                    value={websiteId}
                    onValueChange={(v) => {
                      setWebsiteId(v);
                      const w = websites.find((x) => x.id === v);
                      const s =
                        stores.find((x) => x.id === w?.defaultStoreId) ??
                        stores.find((x) => x.websiteId === v);
                      setCurrency(s?.defaultCurrencyCode ?? 'USD');
                    }}
                  >
                    <SelectTrigger id="sim-website" />
                    <SelectContent>
                      {websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid content-start gap-1.5">
                <Label htmlFor="sim-currency">{t('gc.currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="sim-currency" />
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="sim-group">{t('price.group')}</Label>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger id="sim-group" />
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.code}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="hidden grid-cols-[minmax(0,1fr)_80px_140px_36px] gap-2 text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase sm:grid">
                <span>{t('price.variant')}</span>
                <span>{t('order.qty')}</span>
                <span>{t('order.unitPrice')}</span>
                <span />
              </div>
              {lines.map((l, i) => (
                <div
                  key={l.key}
                  className="grid grid-cols-[minmax(0,1fr)_80px] gap-2 sm:grid-cols-[minmax(0,1fr)_80px_140px_36px]"
                >
                  <Combobox
                    id={`sim-v-${l.key}`}
                    aria-label={`${t('price.variant')} ${i + 1}`}
                    value={l.variantId ? [l.variantId] : []}
                    onChange={([v]) => {
                      const hit = v ? search.get(v) : undefined;
                      setLine(l.key, { variantId: v ?? '', sku: hit?.sku ?? '' });
                      if (v) void priceOf(l.key, v);
                    }}
                    load={search.load}
                    labels={l.variantId ? { [l.variantId]: l.sku } : undefined}
                    placeholder={t('price.chooseVariant')}
                    searchPlaceholder={t('price.searchVariant')}
                    emptyText={t('common.noResults')}
                  />
                  <Input
                    aria-label={`${t('order.qty')} ${i + 1}`}
                    inputMode="numeric"
                    className="tabular"
                    value={l.quantity}
                    onChange={(e) =>
                      setLine(l.key, { quantity: e.target.value.replace(/\D/g, '') })
                    }
                  />
                  <MoneyInput
                    aria-label={`${t('order.unitPrice')} ${i + 1}`}
                    currency={currency}
                    value={l.unitPrice}
                    onChange={(e) => setLine(l.key, { unitPrice: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('sim.removeLine', { n: i + 1 })}
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {lines.length < 50 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="justify-self-start"
                  onClick={() => setLines((ls) => [...ls, blankLine()])}
                >
                  <Plus />
                  {t('sim.addLine')}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="sim-coupon" label={t('order.coupon')} hint={t('sim.couponHint')}>
                <Input
                  id="sim-coupon"
                  className="font-mono uppercase"
                  autoComplete="off"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/\s/g, ''))}
                />
              </Field>
              <Field id="sim-shipping" label={t('order.shipping')} hint={t('sim.shippingHint')}>
                <MoneyInput
                  id="sim-shipping"
                  currency={currency}
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                />
              </Field>
            </div>
            <Button onClick={run} loading={running} disabled={!valid.length}>
              <FlaskConical />
              {t('sim.run')}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    [t('order.subtotal'), money(result.subtotal)],
                    [
                      t('order.discount'),
                      Number(result.discountTotal) ? `−${money(result.discountTotal)}` : money(0),
                    ],
                    [t('order.total'), money(result.total)],
                  ] as const
                ).map(([label, value], i) => (
                  <Card
                    key={label}
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
                        i === 1 && Number(result.discountTotal) > 0 && 'text-success-fg',
                        i === 2 && 'text-white',
                      )}
                    >
                      {value}
                    </p>
                  </Card>
                ))}
              </div>
              {result.coupon && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                  <Badge tone={COUPON_TONE[result.coupon.status] ?? 'neutral'}>
                    {t(`sim.coupon.${result.coupon.status}` as MessageKey)}
                  </Badge>
                  <code className="font-mono text-small">{result.coupon.code}</code>
                  <span className="text-small text-fg-muted">{result.coupon.message}</span>
                </div>
              )}
              {result.unknownSkus.length > 0 && (
                <p className="rounded-md bg-warning-soft px-4 py-3 text-small text-warning-fg">
                  {t('sim.unknownSkus', { skus: result.unknownSkus.join(', ') })}
                </p>
              )}
              <Card>
                <CardHeader title={t('sim.applied')} />
                <CardBody className="pt-4">
                  {result.applied.length ? (
                    <ul className="grid gap-2">
                      {result.applied.map((a) => (
                        <li
                          key={a.promotionId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                        >
                          <span className="min-w-0">
                            <Link
                              href={`/promotions/${a.promotionId}`}
                              className="focus-ring rounded-xs font-medium hover:underline"
                            >
                              {promotions[a.promotionId] ?? a.label}
                            </Link>
                            <span className="block text-small text-fg-muted">
                              {[
                                a.label !== promotions[a.promotionId] ? a.label : null,
                                a.couponCode,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            {a.freeShipping && <Badge tone="info">{t('sim.freeShipping')}</Badge>}
                            {Number(a.discount) > 0 && (
                              <span className="tabular font-medium text-success-fg">
                                −{money(a.discount)}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-small text-fg-muted">{t('sim.noneApplied')}</p>
                  )}
                  {result.freeShipping && Number(result.shippingDiscount) > 0 && (
                    <p className="mt-3 text-small text-fg-muted">
                      {t('sim.shippingSaved', { amount: money(result.shippingDiscount) })}
                    </p>
                  )}
                </CardBody>
              </Card>
              <Card className="overflow-hidden">
                <CardHeader title={t('order.items')} />
                <div className="mt-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>SKU</TH>
                        <TH data-align="right">{t('order.qty')}</TH>
                        <TH data-align="right">{t('order.total')}</TH>
                        <TH data-align="right">{t('order.discount')}</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {result.lines.map((l, i) => (
                        <TR key={`${l.sku}-${i}`}>
                          <TD className="font-mono text-small">{l.sku}</TD>
                          <TD className="tabular" data-align="right">
                            {l.quantity}
                          </TD>
                          <TD data-align="right">{money(l.lineTotal)}</TD>
                          <TD
                            data-align="right"
                            className={Number(l.discount) ? 'text-success-fg' : 'text-fg-subtle'}
                          >
                            {Number(l.discount) ? `−${money(l.discount)}` : '—'}
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
                  icon={<FlaskConical />}
                  title={t('sim.emptyTitle')}
                  description={t('sim.emptyBody')}
                />
              </Card>
            )
          )}
        </div>
      </div>
    </>
  );
}
