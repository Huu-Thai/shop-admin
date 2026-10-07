import { ArrowUpRight, Banknote, PackageOpen, ShoppingBag, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Stat } from '@/components/ui/stat';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Greeting } from '@/features/dashboard/greeting';
import { SalesChart } from '@/features/dashboard/sales-chart';
import { StatusBadge } from '@/features/orders/status';
import { ORDER_TONE } from '@/features/orders/tones';
import { intlLocale } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';
import { cn } from '@/lib/cn';
import { change, formatDate, formatNumber } from '@/lib/format';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { getMe } from '@/server/auth';

export const metadata: Metadata = { title: 'Dashboard' };

const PERIODS = [7, 30, 90] as const;

export default async function DashboardPage({ searchParams }: PageProps<'/'>) {
  const [me, t, locale, sp] = await Promise.all([getMe(), getT(), getLocale(), searchParams]);
  const intl = intlLocale(locale);
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 30;
  const currency =
    typeof sp.currency === 'string' && /^[A-Z]{3}$/.test(sp.currency) ? sp.currency : undefined;
  const name = me.firstName || me.email.split('@')[0];
  const canSales = hasPermission(me.permissions, 'orders:read');

  const [overview, recent] = canSales
    ? await Promise.all([
        call(
          adminApi().GET('/api/v1/admin/reports/overview', {
            params: { query: { days, currency } },
          }),
        ),
        call(
          adminApi().GET('/api/v1/admin/orders', {
            params: { query: { limit: 6, order: 'desc' } },
          }),
        ),
      ])
    : [null, null];

  const href = (next: { days?: number; currency?: string }) => {
    const q = new URLSearchParams();
    const d = next.days ?? days;
    const c = next.currency ?? overview?.currency ?? undefined;
    if (d !== 30) q.set('days', String(d));
    if (c && overview && overview.currencies.length > 1) q.set('currency', c);
    const s = q.toString();
    return s ? `/?${s}` : '/';
  };

  const cur = overview?.current;
  const prev = overview?.previous;
  const hasSales = !!overview && overview.current.orders > 0;

  return (
    <div className="grid gap-6">
      {/* Hero — the one inverse block per page (docs/STYLE-GUIDE.md §8 Dashboard) */}
      <section className="relative overflow-hidden rounded-xl bg-surface-inverse px-6 py-7 text-fg-inverse md:px-8 md:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-accent opacity-25 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-small text-fg-inverse-muted">{formatDate(new Date(), intl)}</p>
            <h1 className="mt-1 text-h1 tracking-[-0.02em] text-white md:text-display">
              <Greeting name={name} />
            </h1>
            <p className="mt-2 max-w-[60ch] text-body-lg text-fg-inverse-muted">
              {t('dash.hero', { days })}
            </p>
          </div>
          {canSales && (
            <div className="flex flex-wrap items-center gap-3">
              <nav aria-label={t('dash.period')} className="flex rounded-md bg-white/10 p-1">
                {PERIODS.map((p) => (
                  <Link
                    key={p}
                    href={href({ days: p })}
                    aria-current={p === days ? 'true' : undefined}
                    scroll={false}
                    className={cn(
                      'focus-ring rounded-sm px-3 py-1.5 text-small font-medium transition-colors',
                      p === days ? 'bg-accent text-accent-fg' : 'text-fg-inverse hover:bg-white/10',
                    )}
                  >
                    {t('dash.days', { days: p })}
                  </Link>
                ))}
              </nav>
              {overview && overview.currencies.length > 1 && (
                <nav aria-label={t('dash.currency')} className="flex rounded-md bg-white/10 p-1">
                  {overview.currencies.map((c) => (
                    <Link
                      key={c}
                      href={href({ currency: c })}
                      aria-current={c === overview.currency ? 'true' : undefined}
                      scroll={false}
                      className={cn(
                        'focus-ring tabular rounded-sm px-3 py-1.5 text-small font-medium transition-colors',
                        c === overview.currency
                          ? 'bg-white text-ink-900'
                          : 'text-fg-inverse hover:bg-white/10',
                      )}
                    >
                      {c}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          )}
        </div>
      </section>

      {!canSales && (
        <Card>
          <CardBody className="text-body text-fg-muted">{t('dash.noAccess')}</CardBody>
        </Card>
      )}

      {cur && prev && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label={t('dash.revenue')}
            value={cur.revenue.formatted || '—'}
            change={change(cur.revenue.amount, prev.revenue.amount)}
            hint={t('dash.vsPrevious', { days })}
            icon={<Banknote />}
          />
          <Stat
            label={t('dash.orders')}
            value={formatNumber(cur.orders, intl)}
            change={change(cur.orders, prev.orders)}
            hint={t('dash.vsPrevious', { days })}
            icon={<ShoppingBag />}
          />
          <Stat
            label={t('dash.aov')}
            value={cur.averageOrderValue.formatted || '—'}
            change={change(cur.averageOrderValue.amount, prev.averageOrderValue.amount)}
            hint={t('dash.vsPrevious', { days })}
            icon={<ArrowUpRight />}
          />
          <Stat
            label={t('dash.newCustomers')}
            value={formatNumber(cur.newCustomers, intl)}
            change={change(cur.newCustomers, prev.newCustomers)}
            hint={t('dash.vsPrevious', { days })}
            icon={<UserPlus />}
          />
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title={t('dash.sales')}
              description={t('dash.salesHint')}
              actions={overview.currency && <Badge tone="outline">{overview.currency}</Badge>}
            />
            <CardBody className="pt-4">
              {hasSales && overview.currency ? (
                <SalesChart data={overview.daily} currency={overview.currency} />
              ) : (
                <EmptyState
                  icon={<PackageOpen />}
                  title={t('dash.noSales')}
                  description={t('dash.noSalesBody')}
                  className="h-[300px]"
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('dash.topProducts')} description={t('dash.topProductsHint')} />
            <CardBody className="pt-4">
              {overview.topProducts.length ? (
                <ol className="grid gap-1">
                  {overview.topProducts.map((p, i) => {
                    const max = overview.topProducts[0].revenue.amount || 1;
                    return (
                      <li key={`${p.productId}-${p.sku}`} className="grid gap-1.5 rounded-md py-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex min-w-0 items-baseline gap-2.5">
                            <span className="tabular w-4 shrink-0 text-caption font-semibold text-fg-subtle">
                              {i + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-body font-medium text-fg">
                                {p.name}
                              </span>
                              <span className="block truncate font-mono text-caption text-fg-muted">
                                {p.sku} ·{' '}
                                {t('dash.sold', {
                                  n: formatNumber(p.quantity, intl),
                                })}
                              </span>
                            </span>
                          </span>
                          <span className="tabular shrink-0 text-body font-semibold text-fg">
                            {p.revenue.formatted}
                          </span>
                        </div>
                        <div className="ml-[26px] h-1.5 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              i === 0 ? 'bg-accent' : 'bg-ink-300 dark:bg-ink-600',
                            )}
                            style={{
                              width: `${Math.max(4, (p.revenue.amount / max) * 100)}%`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState icon={<PackageOpen />} title={t('dash.noSales')} className="py-12" />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {overview && recent && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="overflow-hidden xl:col-span-2">
            <CardHeader
              title={t('dash.recentOrders')}
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/orders">{t('dash.viewAll')}</Link>
                </Button>
              }
            />
            <div className="mt-4">
              {recent.data.length ? (
                <Table>
                  <THead>
                    <tr>
                      <TH>{t('order.number')}</TH>
                      <TH>{t('order.customer')}</TH>
                      <TH>{t('order.status')}</TH>
                      <TH className="hidden md:table-cell">{t('order.payment')}</TH>
                      <TH data-align="right">{t('order.total')}</TH>
                      <TH data-align="right" className="hidden sm:table-cell">
                        {t('order.placed')}
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {recent.data.map((o) => (
                      <TR key={o.id}>
                        <TD className="font-mono text-small font-medium">
                          <Link
                            href={`/orders/${o.id}`}
                            className="focus-ring rounded-xs hover:underline"
                          >
                            {o.number}
                          </Link>
                        </TD>
                        <TD className="max-w-[220px] truncate text-fg-muted">{o.email}</TD>
                        <TD>
                          <StatusBadge status={o.status} />
                        </TD>
                        <TD className="hidden md:table-cell">
                          <StatusBadge status={o.paymentStatus} kind="payment" />
                        </TD>
                        <TD data-align="right" className="font-medium">
                          {o.grandTotal.formatted}
                        </TD>
                        <TD
                          data-align="right"
                          className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                        >
                          {formatDate(o.placedAt, intl, true)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <EmptyState
                  icon={<ShoppingBag />}
                  title={t('dash.noSales')}
                  description={t('dash.noSalesBody')}
                  className="pb-10"
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('dash.byStatus')} description={t('dash.days', { days })} />
            <CardBody className="pt-4">
              <StatusBars rows={overview.byStatus} intl={intl} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatusBars({ rows, intl }: { rows: { status: string; count: number }[]; intl: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (!total) return <p className="py-8 text-center text-body text-fg-muted">—</p>;
  const color: Record<string, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    neutral: 'bg-ink-400',
  };
  return (
    <div className="grid gap-5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        {rows.map((r) => (
          <span
            key={r.status}
            className={color[ORDER_TONE[r.status] ?? 'neutral']}
            style={{ width: `${(r.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.status} className="flex items-center justify-between gap-3 text-body">
            <StatusBadge status={r.status} />
            <span className="tabular flex items-baseline gap-2">
              <span className="font-semibold text-fg">{formatNumber(r.count, intl)}</span>
              <span className="w-12 text-right text-caption text-fg-muted">
                {((r.count / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
