'use client';

import { Megaphone, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import { formatMoney } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { PublishBadge, windowLabel } from '../publishing/publishing';
import { CampaignSheet } from './campaign-sheet';
import { CONTENT_STATUSES, MARKETING_TABS } from './tabs';

export function CampaignsList({
  campaigns,
  total,
  page,
  limit,
  currencies,
  canWrite,
}: {
  campaigns: Schemas['CampaignDto'][];
  total: number;
  page: number;
  limit: number;
  currencies: string[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const [creating, setCreating] = useState(false);
  const filtered = ['search', 'status'].some((k) => params.get(k));

  return (
    <>
      <PageHeader
        title={t('camp.title')}
        description={t('camp.description')}
        breadcrumbs={[
          { label: t('nav.customers') },
          { label: t('nav.promotions') },
          { label: t('camp.title') },
        ]}
        actions={
          canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('camp.new')}
            </Button>
          )
        }
      />
      <SubNav items={MARKETING_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('camp.search')} />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={CONTENT_STATUSES.map((s) => ({
              value: s,
              label: t(`pub.status.${s}` as MessageKey),
            }))}
          />
        </ListToolbar>
        {campaigns.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden md:table-cell">{t('pub.window')}</TH>
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('promo.title')}
                </TH>
                <TH className="hidden lg:table-cell" data-align="right">
                  {t('camp.budget')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {campaigns.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/promotions/campaigns/${c.id}`}
                      className="focus-ring block rounded-xs font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="font-mono text-caption text-fg-muted">{c.code}</span>
                  </TD>
                  <TD>
                    <PublishBadge item={c} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-fg-muted md:table-cell">
                    {windowLabel(c, intl, t)}
                  </TD>
                  <TD className="tabular hidden sm:table-cell" data-align="right">
                    {c.promotionCount}
                  </TD>
                  <TD className="hidden text-fg-muted lg:table-cell" data-align="right">
                    {c.budgetAmount != null && c.budgetCurrencyCode
                      ? formatMoney(Number(c.budgetAmount), c.budgetCurrencyCode, intl)
                      : '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Megaphone />}
            title={filtered ? t('list.noMatch') : t('camp.empty')}
            description={filtered ? undefined : t('camp.emptyBody')}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ search: null, status: null })}
                >
                  {t('list.clearFilters')}
                </Button>
              ) : (
                canWrite && (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus />
                    {t('camp.new')}
                  </Button>
                )
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      {creating && (
        <CampaignSheet campaign={null} currencies={currencies} onClose={() => setCreating(false)} />
      )}
    </>
  );
}
