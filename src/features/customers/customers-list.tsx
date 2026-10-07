'use client';

import { Check, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { CustomerSheet } from './customer-sheet';
import { CustomerStatus } from './customer-status';
import { CUSTOMER_TABS, fullName } from './shared';

export function CustomersList({
  customers,
  total,
  page,
  limit,
  groups,
  websites,
  locales,
  canWrite,
}: {
  customers: Schemas['CustomerDto'][];
  total: number;
  page: number;
  limit: number;
  groups: Schemas['CustomerGroupDto'][];
  websites: Schemas['WebsiteDto'][];
  locales: Schemas['LocaleDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const [creating, setCreating] = useState(false);
  const filtered = ['search', 'status', 'group', 'websiteId'].some((k) => params.get(k));
  const groupName = (code: string) => groups.find((g) => g.code === code)?.name ?? code;
  const websiteName = (id: string) => websites.find((w) => w.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader
        title={t('cust.title')}
        description={t('cust.description')}
        breadcrumbs={[{ label: t('cust.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('cust.new')}
            </Button>
          )
        }
      />
      <SubNav items={CUSTOMER_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('cust.search')} />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={(['ACTIVE', 'DISABLED'] as const).map((s) => ({
              value: s,
              label: t(`cust.status.${s}`),
            }))}
          />
          <FilterSelect
            param="group"
            label={t('price.group')}
            allLabel={t('cust.anyGroup')}
            options={groups.map((g) => ({ value: g.code, label: g.name }))}
          />
          {websites.length > 1 && (
            <FilterSelect
              param="websiteId"
              label={t('cust.website')}
              allLabel={t('common.allWebsites')}
              options={websites.map((w) => ({ value: w.id, label: w.name }))}
            />
          )}
        </ListToolbar>
        {customers.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('order.customer')}</TH>
                <TH className="hidden md:table-cell">{t('price.group')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell" data-align="center">
                  {t('cust.marketing')}
                </TH>
                {websites.length > 1 && (
                  <TH className="hidden xl:table-cell">{t('cust.website')}</TH>
                )}
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('cust.lastLogin')}
                </TH>
                <TH className="hidden lg:table-cell" data-align="right">
                  {t('cust.joined')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {customers.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/customers/${c.id}`}
                      className="focus-ring group flex min-w-0 items-center gap-3 rounded-sm"
                    >
                      <Avatar name={fullName(c) || c.email} className="size-8 text-caption" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:underline">
                          {fullName(c) || c.email}
                        </span>
                        <span className="block max-w-[260px] truncate text-small text-fg-muted">
                          {c.email}
                        </span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="hidden text-fg-muted md:table-cell">{groupName(c.groupCode)}</TD>
                  <TD>
                    <CustomerStatus status={c.status} lockedUntil={c.lockedUntil} />
                  </TD>
                  <TD className="hidden lg:table-cell" data-align="center">
                    {c.acceptsMarketing ? (
                      <Check aria-label={t('common.yes')} className="mx-auto size-4 text-success" />
                    ) : (
                      <span className="text-fg-subtle" aria-label={t('common.no')}>
                        —
                      </span>
                    )}
                  </TD>
                  {websites.length > 1 && (
                    <TD className="hidden text-fg-muted xl:table-cell">
                      {websiteName(c.websiteId)}
                    </TD>
                  )}
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {c.lastLoginAt ? formatDate(c.lastLoginAt, intl, true) : t('cust.never')}
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted lg:table-cell"
                  >
                    {formatDate(c.createdAt, intl)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Users />}
            title={filtered ? t('list.noMatch') : t('cust.empty')}
            description={filtered ? undefined : t('cust.emptyBody')}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ search: null, status: null, group: null, websiteId: null })}
                >
                  {t('list.clearFilters')}
                </Button>
              ) : (
                canWrite && (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus />
                    {t('cust.new')}
                  </Button>
                )
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      {creating && (
        <CustomerSheet
          groups={groups}
          websites={websites}
          locales={locales}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
