'use client';

import { History } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { INVENTORY_TABS } from '../pricing/tabs';

const REASON_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  RECEIPT: 'success',
  SALE: 'info',
  RETURN: 'accent',
  ADJUSTMENT: 'warning',
  CORRECTION: 'neutral',
};

/** The stock ledger: every change, who made it and why. */
export function MovementsTable({
  rows,
  sources,
  compact,
}: {
  rows: Schemas['MovementDto'][];
  sources: Schemas['InventorySourceDto'][];
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('inv.when')}</TH>
          <TH>SKU</TH>
          {!compact && <TH className="hidden md:table-cell">{t('inv.source')}</TH>}
          <TH data-align="right">{t('inv.change')}</TH>
          <TH data-align="right" className="hidden sm:table-cell">
            {t('inv.after.short')}
          </TH>
          <TH>{t('inv.reason')}</TH>
          <TH className="hidden lg:table-cell">{t('inv.details')}</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((m) => (
          <TR key={m.id}>
            <TD className="text-small whitespace-nowrap text-fg-muted">
              {formatDate(m.createdAt, intl, true)}
            </TD>
            <TD className="font-mono text-small">{m.sku}</TD>
            {!compact && (
              <TD className="hidden text-fg-muted md:table-cell">
                {sources.find((s) => s.id === m.sourceId)?.name ?? '—'}
              </TD>
            )}
            <TD
              data-align="right"
              className={cn('font-semibold', m.delta > 0 ? 'text-success-fg' : 'text-danger-fg')}
            >
              {m.delta > 0 ? '+' : '−'}
              {formatNumber(Math.abs(m.delta), intl)}
            </TD>
            <TD data-align="right" className="hidden sm:table-cell">
              {formatNumber(m.quantityAfter, intl)}
            </TD>
            <TD>
              <Badge tone={REASON_TONE[m.reason] ?? 'neutral'}>
                {t(`inv.reason.${m.reason}` as MessageKey)}
              </Badge>
            </TD>
            <TD className="hidden max-w-[320px] lg:table-cell">
              <span className="block truncate text-small text-fg">
                {[m.reference, m.note].filter(Boolean).join(' · ') || '—'}
              </span>
              <span className="block truncate text-caption text-fg-muted">{m.actorLabel}</span>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function MovementsView({
  rows,
  total,
  page,
  limit,
  sources,
}: {
  rows: Schemas['MovementDto'][];
  total: number;
  page: number;
  limit: number;
  sources: Schemas['InventorySourceDto'][];
}) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        title={t('inv.title')}
        description={t('inv.movementsDescription')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('inv.movements') }]}
      />
      <SubNav items={INVENTORY_TABS} />
      <Card className="overflow-hidden">
        {sources.length > 1 && (
          <ListToolbar>
            <FilterSelect
              param="sourceId"
              label={t('inv.source')}
              allLabel={t('inv.allSources')}
              options={sources.map((s) => ({ value: s.id, label: s.name }))}
            />
          </ListToolbar>
        )}
        {rows.length ? (
          <MovementsTable rows={rows} sources={sources} />
        ) : (
          <EmptyState icon={<History />} title={t('inv.noMovements')} />
        )}
        {total > limit && <Pagination page={page} limit={limit} total={total} />}
      </Card>
    </>
  );
}
