'use client';

import { ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { StatusBadge } from './status';
import { FULFILLMENT_STATUSES, ORDER_STATUSES, PAYMENT_STATUSES } from './tones';

export const PERIODS = ['today', '7d', '30d', '90d'] as const;

export function OrdersList({
  orders,
  total,
  page,
  limit,
  stores,
}: {
  orders: Schemas['AdminOrderSummaryDto'][];
  total: number;
  page: number;
  limit: number;
  stores: Schemas['StoreDto'][];
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const filtered = [
    'search',
    'status',
    'paymentStatus',
    'fulfillmentStatus',
    'storeId',
    'period',
    'customerId',
  ].some((k) => params.get(k));
  const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader
        title={t('orders.title')}
        description={t('orders.description')}
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('orders.title') }]}
      />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('orders.search')} />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={ORDER_STATUSES.map((s) => ({
              value: s,
              label: t(`ostatus.${s}` as MessageKey),
            }))}
          />
          <FilterSelect
            param="paymentStatus"
            label={t('order.payment')}
            allLabel={t('orders.anyPayment')}
            options={PAYMENT_STATUSES.map((s) => ({
              value: s,
              label: t(`pstatus.${s}` as MessageKey),
            }))}
          />
          <FilterSelect
            param="fulfillmentStatus"
            label={t('orders.fulfillment')}
            allLabel={t('orders.anyFulfillment')}
            options={FULFILLMENT_STATUSES.map((s) => ({
              value: s,
              label: t(`fstatus.${s}` as MessageKey),
            }))}
          />
          {stores.length > 1 && (
            <FilterSelect
              param="storeId"
              label={t('stores.store')}
              allLabel={t('price.allStores')}
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          <FilterSelect
            param="period"
            label={t('dash.period')}
            allLabel={t('orders.anyTime')}
            options={PERIODS.map((p) => ({
              value: p,
              label: t(`orders.period.${p}` as MessageKey),
            }))}
          />
          {params.get('customerId') && (
            <Button
              variant="secondary"
              size="sm"
              className="h-10"
              onClick={() => set({ customerId: null })}
              aria-label={t('orders.clearCustomer')}
            >
              {t('orders.oneCustomer')}
              <X />
            </Button>
          )}
        </ListToolbar>
        {orders.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('order.number')}</TH>
                <TH>{t('order.customer')}</TH>
                <TH>{t('order.status')}</TH>
                <TH className="hidden md:table-cell">{t('order.payment')}</TH>
                <TH className="hidden lg:table-cell">{t('orders.fulfillment')}</TH>
                <TH className="hidden xl:table-cell">{t('stores.store')}</TH>
                <TH data-align="right">{t('order.total')}</TH>
                <TH data-align="right" className="hidden sm:table-cell">
                  {t('order.placed')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link
                      href={`/orders/${o.id}`}
                      className="focus-ring rounded-xs font-mono text-small font-medium whitespace-nowrap hover:underline"
                    >
                      {o.number}
                    </Link>
                  </TD>
                  <TD className="max-w-[240px] truncate text-fg-muted">{o.email}</TD>
                  <TD>
                    <StatusBadge status={o.status} />
                  </TD>
                  <TD className="hidden md:table-cell">
                    <StatusBadge status={o.paymentStatus} kind="payment" />
                  </TD>
                  <TD className="hidden lg:table-cell">
                    <StatusBadge status={o.fulfillmentStatus} kind="fulfillment" />
                  </TD>
                  <TD className="hidden text-fg-muted xl:table-cell">{storeName(o.storeId)}</TD>
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
            title={filtered ? t('list.noMatch') : t('orders.empty')}
            description={filtered ? undefined : t('orders.emptyBody')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({
                      search: null,
                      status: null,
                      paymentStatus: null,
                      fulfillmentStatus: null,
                      storeId: null,
                      period: null,
                      customerId: null,
                    })
                  }
                >
                  {t('list.clearFilters')}
                </Button>
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
    </>
  );
}
