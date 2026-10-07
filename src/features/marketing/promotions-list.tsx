'use client';

import { BadgePercent, Plus, Ticket, Zap } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { PublishBadge } from '../publishing/publishing';
import { RuleSummary } from './rule-summary';
import { CONTENT_STATUSES, MARKETING_TABS } from './tabs';

export function PromotionsList({
  promotions,
  total,
  page,
  limit,
  campaigns,
  websites,
  canWrite,
}: {
  promotions: Schemas['PromotionDto'][];
  total: number;
  page: number;
  limit: number;
  campaigns: Schemas['CampaignDto'][];
  websites: Schemas['WebsiteDto'][];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const { params, set } = useQueryParams();
  const filtered = ['search', 'status', 'campaignId', 'websiteId'].some((k) => params.get(k));
  const campaign = (id: string | null) => campaigns.find((c) => c.id === id);

  return (
    <>
      <PageHeader
        title={t('promo.title')}
        description={t('promo.description')}
        breadcrumbs={[{ label: t('nav.customers') }, { label: t('nav.promotions') }]}
        actions={
          canWrite && (
            <Button asChild>
              <Link href="/promotions/new">
                <Plus />
                {t('promo.new')}
              </Link>
            </Button>
          )
        }
      />
      <SubNav items={MARKETING_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('promo.search')} />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={CONTENT_STATUSES.map((s) => ({
              value: s,
              label: t(`pub.status.${s}` as MessageKey),
            }))}
          />
          {campaigns.length > 0 && (
            <FilterSelect
              param="campaignId"
              label={t('promo.campaign')}
              allLabel={t('promo.anyCampaign')}
              options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          {websites.length > 1 && (
            <FilterSelect
              param="websiteId"
              label={t('cust.website')}
              allLabel={t('common.allWebsites')}
              options={websites.map((w) => ({ value: w.id, label: w.name }))}
            />
          )}
        </ListToolbar>
        {promotions.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell">{t('promo.does')}</TH>
                <TH className="hidden md:table-cell">{t('promo.trigger')}</TH>
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('promo.used')}
                </TH>
                <TH className="hidden xl:table-cell" data-align="right">
                  {t('price.priority')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {promotions.map((p) => {
                const camp = campaign(p.campaignId);
                return (
                  <TR key={p.id}>
                    <TD>
                      <Link
                        href={`/promotions/${p.id}`}
                        className="focus-ring block rounded-xs font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      {camp && <span className="text-caption text-fg-muted">{camp.name}</span>}
                    </TD>
                    <TD>
                      <PublishBadge item={p} heldBack={p.visible && !p.active} />
                    </TD>
                    <TD className="hidden max-w-[340px] lg:table-cell">
                      <RuleSummary rules={p.actions} />
                    </TD>
                    <TD className="hidden md:table-cell">
                      {p.requiresCoupon ? (
                        <Badge tone="info">
                          <Ticket aria-hidden className="size-3" />
                          {t('promo.couponOnly')}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">
                          <Zap aria-hidden className="size-3" />
                          {t('promo.automatic')}
                        </Badge>
                      )}
                    </TD>
                    <TD className="tabular hidden sm:table-cell" data-align="right">
                      {p.timesUsed}
                      {p.usageLimit ? (
                        <span className="text-fg-muted"> / {p.usageLimit}</span>
                      ) : null}
                    </TD>
                    <TD className="tabular hidden text-fg-muted xl:table-cell" data-align="right">
                      {p.priority}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<BadgePercent />}
            title={filtered ? t('list.noMatch') : t('promo.empty')}
            description={filtered ? undefined : t('promo.emptyBody')}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({ search: null, status: null, campaignId: null, websiteId: null })
                  }
                >
                  {t('list.clearFilters')}
                </Button>
              ) : (
                canWrite && (
                  <Button asChild size="sm">
                    <Link href="/promotions/new">
                      <Plus />
                      {t('promo.new')}
                    </Link>
                  </Button>
                )
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
    </>
  );
}
