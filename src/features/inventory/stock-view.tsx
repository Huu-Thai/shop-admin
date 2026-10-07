'use client';

import { Boxes, PackagePlus, SlidersVertical } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { INVENTORY_TABS } from '../pricing/tabs';
import { AdjustSheet, type StockTarget } from './adjust-sheet';

export function StockView({
  rows,
  total,
  page,
  limit,
  sources,
  nameLocale,
  canWrite,
}: {
  rows: Schemas['StockDto'][];
  total: number;
  page: number;
  limit: number;
  sources: Schemas['InventorySourceDto'][];
  nameLocale?: string;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [target, setTarget] = useState<StockTarget | null | 'new'>(null);
  const n = (x: number) => formatNumber(x, intl);

  return (
    <>
      <PageHeader
        title={t('inv.title')}
        description={t('inv.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('inv.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setTarget('new')}>
              <PackagePlus />
              {t('inv.receive')}
            </Button>
          )
        }
      />
      <SubNav items={INVENTORY_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('price.searchSku')} />
          {sources.length > 1 && (
            <FilterSelect
              param="sourceId"
              label={t('inv.source')}
              allLabel={t('inv.allSources')}
              options={sources.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
        </ListToolbar>
        {rows.length ? (
          <Table>
            <THead>
              <tr>
                <TH>SKU</TH>
                <TH>{t('inv.source')}</TH>
                <TH data-align="right">{t('inv.onHand')}</TH>
                <TH data-align="right">{t('inv.reserved')}</TH>
                <TH data-align="right" className="hidden sm:table-cell">
                  {t('inv.safety')}
                </TH>
                <TH data-align="right">{t('inv.salable')}</TH>
                <TH className="w-28">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={`${r.sourceId}-${r.variantId}`}>
                  <TD className="font-mono text-small font-medium">{r.sku}</TD>
                  <TD className="text-fg-muted">
                    {sources.find((s) => s.id === r.sourceId)?.name ?? r.sourceCode}
                  </TD>
                  <TD data-align="right">{n(r.quantity)}</TD>
                  <TD data-align="right" className="text-fg-muted">
                    {n(r.reserved)}
                  </TD>
                  <TD data-align="right" className="hidden text-fg-muted sm:table-cell">
                    {n(r.safetyStock)}
                  </TD>
                  <TD data-align="right">
                    {r.salable > 0 ? (
                      <span className="font-semibold">{n(r.salable)}</span>
                    ) : (
                      <Badge tone="danger" dot>
                        {t('inv.out')}
                      </Badge>
                    )}
                  </TD>
                  <TD data-align="right">
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTarget({
                            sourceId: r.sourceId,
                            variantId: r.variantId,
                            sku: r.sku,
                            stock: {
                              quantity: r.quantity,
                              reserved: r.reserved,
                              safetyStock: r.safetyStock,
                              version: r.version,
                            },
                          })
                        }
                      >
                        <SlidersVertical />
                        {t('inv.adjust')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Boxes />}
            title={total ? t('list.noMatch') : t('inv.empty')}
            description={t('inv.emptyBody')}
          />
        )}
        {total > limit && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      {target && (
        <AdjustSheet
          target={target === 'new' ? null : target}
          sources={sources}
          nameLocale={nameLocale}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
