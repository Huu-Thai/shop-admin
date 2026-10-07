'use client';

import { Gift } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { fullName } from '../customers/shared';
import { LOYALTY_TABS, multiplier } from './shared';

/** Members by balance, highest first; each links to the customer's ledger. */
export function AccountsList({
  accounts,
  total,
  page,
  limit,
  programs,
  websites,
}: {
  accounts: Schemas['AccountListItemDto'][];
  total: number;
  page: number;
  limit: number;
  programs: Schemas['ProgramDto'][];
  websites: Schemas['WebsiteDto'][];
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const filtered = ['search', 'websiteId', 'tier'].some((k) => params.get(k));
  const program = (id: string) => programs.find((p) => p.id === id);
  const websiteName = (id: string) =>
    websites.find((w) => w.id === program(id)?.websiteId)?.name ?? '—';
  const tiers = [...new Map(programs.flatMap((p) => p.tiers).map((x) => [x.code, x])).values()];

  return (
    <>
      <PageHeader
        title={t('loy.accounts')}
        description={t('loy.accountsDescription')}
        breadcrumbs={[
          { label: t('nav.customers') },
          { label: t('nav.loyalty'), href: '/loyalty' },
          { label: t('loy.accounts') },
        ]}
      />
      <SubNav items={LOYALTY_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('cust.search')} />
          {programs.length > 1 && (
            <FilterSelect
              param="websiteId"
              label={t('cust.website')}
              allLabel={t('common.allWebsites')}
              options={programs.map((p) => ({
                value: p.websiteId,
                label: websites.find((w) => w.id === p.websiteId)?.name ?? p.name,
              }))}
            />
          )}
          {tiers.length > 0 && (
            <FilterSelect
              param="tier"
              label={t('loy.tier')}
              allLabel={t('loy.anyTier')}
              options={tiers.map((x) => ({ value: x.code, label: x.name }))}
            />
          )}
        </ListToolbar>
        {accounts.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('order.customer')}</TH>
                <TH>{t('loy.tier')}</TH>
                <TH data-align="right">{t('loy.balance')}</TH>
                <TH className="hidden md:table-cell" data-align="right">
                  {t('loy.worthShort')}
                </TH>
                <TH className="hidden lg:table-cell" data-align="right">
                  {t('loy.lifetime')}
                </TH>
                {programs.length > 1 && (
                  <TH className="hidden xl:table-cell">{t('cust.website')}</TH>
                )}
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('loy.memberSince')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {accounts.map((a) => {
                const p = program(a.programId);
                const name = fullName(a.customer) || a.customer.email;
                return (
                  <TR key={a.id}>
                    <TD>
                      <Link
                        href={`/customers/${a.customerId}`}
                        className="focus-ring group flex min-w-0 items-center gap-3 rounded-sm"
                      >
                        <Avatar name={name} className="size-8 text-caption" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:underline">
                            {name}
                          </span>
                          <span className="block max-w-[240px] truncate text-small text-fg-muted">
                            {a.customer.email}
                          </span>
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      {a.tier ? (
                        <Badge tone="accent">
                          {a.tier.name} · {multiplier(a.tier.multiplierBp)}
                        </Badge>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </TD>
                    <TD className="tabular font-medium" data-align="right">
                      {formatNumber(a.balance, intl)}
                    </TD>
                    <TD className="tabular hidden text-fg-muted md:table-cell" data-align="right">
                      {p
                        ? formatMoney(a.balance * Number(p.pointValue), p.currencyCode, intl)
                        : '—'}
                    </TD>
                    <TD className="tabular hidden text-fg-muted lg:table-cell" data-align="right">
                      {formatNumber(a.lifetimePoints, intl)}
                    </TD>
                    {programs.length > 1 && (
                      <TD className="hidden text-fg-muted xl:table-cell">
                        {websiteName(a.programId)}
                      </TD>
                    )}
                    <TD
                      className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                      data-align="right"
                    >
                      {formatDate(a.createdAt, intl)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Gift />}
            title={filtered ? t('list.noMatch') : t('loy.noAccounts')}
            description={filtered ? undefined : t('loy.noAccountsBody')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ search: null, websiteId: null, tier: null })}
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
