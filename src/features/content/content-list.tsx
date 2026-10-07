'use client';

import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
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
import { SubNav } from '../catalog/catalog-tabs';
import { CONTENT_STATUSES } from '../marketing/tabs';
import { type Publishing, PublishBadge, windowLabel } from '../publishing/publishing';

export interface ContentRow {
  id: string;
  href: string;
  title: string;
  /** Slug, identifier or placement, in mono under the title. */
  sub?: string;
  storeId: string | null;
  item: Publishing & { publishedAt: string | null; unpublishedAt: string | null };
  updatedAt: string;
  /** Locales that still miss a translation. */
  missing?: string[];
}

/** List of publishable content (pages, posts, blocks, banners, sliders) with the same filters. */
export function ContentList({
  title,
  description,
  crumbs,
  tabs,
  rows,
  total,
  page,
  limit,
  stores,
  newHref,
  newLabel,
  onNew,
  canWrite,
  searchPlaceholder,
  empty,
  emptyBody,
  icon = <FileText />,
  extraFilters,
}: {
  title: string;
  description: string;
  crumbs: { label: string; href?: string }[];
  tabs: { href: string; label: MessageKey }[];
  rows: ContentRow[];
  total: number;
  page: number;
  limit: number;
  stores: Schemas['StoreDto'][];
  newHref?: string;
  newLabel: string;
  onNew?: () => void;
  canWrite: boolean;
  searchPlaceholder: string;
  empty: string;
  emptyBody: string;
  icon?: ReactNode;
  extraFilters?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const filtered = ['search', 'status', 'storeId', 'placement', 'tagId'].some((k) => params.get(k));
  const storeName = (id: string | null) =>
    id ? (stores.find((s) => s.id === id)?.name ?? '—') : t('cms.allStores');
  const newButton = (size?: 'sm') =>
    canWrite &&
    (newHref ? (
      <Button asChild size={size}>
        <Link href={newHref}>
          <Plus />
          {newLabel}
        </Link>
      </Button>
    ) : (
      <Button size={size} onClick={onNew}>
        <Plus />
        {newLabel}
      </Button>
    ));

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={crumbs}
        actions={newButton()}
      />
      <SubNav items={tabs} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={searchPlaceholder} />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={CONTENT_STATUSES.map((s) => ({
              value: s,
              label: t(`pub.status.${s}` as MessageKey),
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
          {extraFilters}
        </ListToolbar>
        {rows.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('cms.titleCol')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell">{t('pub.window')}</TH>
                {stores.length > 1 && <TH className="hidden md:table-cell">{t('stores.store')}</TH>}
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('common.updated')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[420px]">
                    <Link
                      href={r.href}
                      className="focus-ring block truncate rounded-xs font-medium hover:underline"
                    >
                      {r.title || t('cms.untitled')}
                    </Link>
                    {(r.sub || r.missing?.length) && (
                      <span className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
                        {r.sub && <span className="truncate font-mono">{r.sub}</span>}
                        {!!r.missing?.length && (
                          <span className="text-warning-fg">
                            {t('cms.missing', { locales: r.missing.join(', ') })}
                          </span>
                        )}
                      </span>
                    )}
                  </TD>
                  <TD>
                    <PublishBadge item={r.item} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                    {windowLabel(r.item, intl, t)}
                  </TD>
                  {stores.length > 1 && (
                    <TD className="hidden text-fg-muted md:table-cell">{storeName(r.storeId)}</TD>
                  )}
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {formatDate(r.updatedAt, intl, true)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={icon}
            title={filtered ? t('list.noMatch') : empty}
            description={filtered ? undefined : emptyBody}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({ search: null, status: null, storeId: null, placement: null, tagId: null })
                  }
                >
                  {t('list.clearFilters')}
                </Button>
              ) : (
                newButton('sm')
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
    </>
  );
}
