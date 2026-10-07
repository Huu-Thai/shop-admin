'use client';

import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { BookSheet, type PricingRefs } from './book-sheet';
import { BOOK_STATUS_TONE, bookStatus } from './shared';
import { PRICING_TABS } from './tabs';

export function useScopeLabel(refs: PricingRefs) {
  const { t } = useI18n();
  return (b: Schemas['PriceBookDto']) => {
    const parts = [
      b.storeId
        ? refs.stores.find((s) => s.id === b.storeId)?.name
        : b.websiteId
          ? refs.websites.find((w) => w.id === b.websiteId)?.name
          : t('common.allWebsites'),
      b.customerGroupId ? refs.groups.find((g) => g.id === b.customerGroupId)?.name : null,
    ];
    return parts.filter(Boolean).join(' · ');
  };
}

export function BooksView({
  books,
  refs,
  canWrite,
}: {
  books: Schemas['PriceBookDto'][];
  refs: PricingRefs;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [creating, setCreating] = useState(false);
  const scope = useScopeLabel(refs);
  const sorted = [...books].sort(
    (a, b) =>
      a.currencyCode.localeCompare(b.currencyCode) ||
      a.priority - b.priority ||
      a.name.localeCompare(b.name),
  );

  return (
    <>
      <PageHeader
        title={t('price.title')}
        description={t('price.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('price.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('price.newBook')}
            </Button>
          )
        }
      />
      <SubNav items={PRICING_TABS} />
      <Card className="overflow-hidden">
        {sorted.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('price.book')}</TH>
                <TH>{t('gc.currency')}</TH>
                <TH>{t('price.scope')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell">{t('price.validity')}</TH>
                <TH data-align="right">{t('price.priority')}</TH>
                <TH data-align="right">{t('price.entries')}</TH>
              </tr>
            </THead>
            <TBody>
              {sorted.map((b) => {
                const st = bookStatus(b);
                return (
                  <TR key={b.id}>
                    <TD>
                      <Link href={`/pricing/books/${b.id}`} className="focus-ring block rounded-xs">
                        <span className="block font-medium text-fg hover:underline">{b.name}</span>
                        <span className="block font-mono text-caption text-fg-muted">{b.code}</span>
                      </Link>
                    </TD>
                    <TD>
                      <span className="font-mono text-small">{b.currencyCode}</span>
                      <span className="ml-2 text-caption text-fg-muted">
                        {b.includesTax ? t('price.gross') : t('price.net')}
                      </span>
                    </TD>
                    <TD className="text-fg-muted">{scope(b)}</TD>
                    <TD>
                      <Badge tone={BOOK_STATUS_TONE[st]} dot>
                        {t(`price.status.${st}` as MessageKey)}
                      </Badge>
                    </TD>
                    <TD className="hidden text-small whitespace-nowrap text-fg-muted lg:table-cell">
                      {b.validFrom || b.validTo
                        ? `${b.validFrom ? formatDate(b.validFrom, intl) : '…'} – ${b.validTo ? formatDate(b.validTo, intl) : '…'}`
                        : t('price.always')}
                    </TD>
                    <TD data-align="right">{b.priority}</TD>
                    <TD data-align="right">{formatNumber(b.entryCount, intl)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<BookOpen />}
            title={t('price.empty')}
            description={t('price.emptyBody')}
            action={
              canWrite && (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus />
                  {t('price.newBook')}
                </Button>
              )
            }
          />
        )}
      </Card>
      {creating && <BookSheet book={null} refs={refs} onClose={() => setCreating(false)} />}
    </>
  );
}
