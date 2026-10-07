'use client';

import { Pencil, Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { BookSheet, type PricingRefs } from './book-sheet';
import { useScopeLabel } from './books-view';
import { EntrySheet } from './entry-sheet';
import { BOOK_STATUS_TONE, bookStatus } from './shared';

type Entry = Schemas['PriceEntryDto'];

export function BookDetail({
  book,
  entries,
  total,
  page,
  limit,
  refs,
  nameLocale,
  canWrite,
}: {
  book: Schemas['PriceBookDto'];
  entries: Entry[];
  total: number;
  page: number;
  limit: number;
  refs: PricingRefs;
  nameLocale?: string;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const scope = useScopeLabel(refs);
  const [editingBook, setEditingBook] = useState(false);
  const [editing, setEditing] = useState<{ id: string; sku: string } | 'new' | null>(null);
  const st = bookStatus(book);
  const money = (n: number) => formatMoney(n, book.currencyCode, intl);

  // One row per variant, its tiers side by side.
  const groups = new Map<string, Entry[]>();
  for (const e of entries) groups.set(e.variantId, [...(groups.get(e.variantId) ?? []), e]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('nav.catalog') },
          { label: t('price.books'), href: '/pricing' },
          { label: book.code },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {book.name}
            <Badge tone={BOOK_STATUS_TONE[st]} dot>
              {t(`price.status.${st}` as MessageKey)}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-mono">{book.currencyCode}</span>
            <span>{book.includesTax ? t('price.gross') : t('price.net')}</span>
            <span>{scope(book)}</span>
            <span>
              {t('price.priority')} {book.priority}
            </span>
          </span>
        }
        actions={
          canWrite && (
            <>
              <Button variant="secondary" onClick={() => setEditingBook(true)}>
                <Pencil />
                {t('price.editBook')}
              </Button>
              <Button onClick={() => setEditing('new')}>
                <Plus />
                {t('price.addPrices')}
              </Button>
            </>
          )
        }
      />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('price.searchSku')} />
        </ListToolbar>
        {groups.size ? (
          <Table>
            <THead>
              <tr>
                <TH>SKU</TH>
                <TH>{t('price.tiers')}</TH>
                <TH className="w-24">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {[...groups].map(([variantId, tiers]) => (
                <TR key={variantId}>
                  <TD className="font-mono text-small font-medium">{tiers[0].sku}</TD>
                  <TD>
                    <span className="flex flex-wrap gap-2">
                      {[...tiers]
                        .sort((a, b) => a.minQty - b.minQty)
                        .map((e) => (
                          <span
                            key={e.id}
                            className="inline-flex items-baseline gap-1.5 rounded-sm bg-surface-muted px-2 py-1 text-small"
                          >
                            <span className="tabular text-caption text-fg-muted">{e.minQty}+</span>
                            <span className="tabular font-semibold text-fg">{money(e.amount)}</span>
                            {e.compareAtAmount != null && (
                              <span className="tabular text-caption text-fg-subtle line-through">
                                {money(e.compareAtAmount)}
                              </span>
                            )}
                          </span>
                        ))}
                    </span>
                  </TD>
                  <TD data-align="right">
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing({ id: variantId, sku: tiers[0].sku })}
                      >
                        <Pencil />
                        {t('common.edit')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Tags />}
            title={total ? t('list.noMatch') : t('price.noEntries')}
            description={total ? undefined : t('price.noEntriesBody')}
            action={
              canWrite && !total ? (
                <Button size="sm" onClick={() => setEditing('new')}>
                  <Plus />
                  {t('price.addPrices')}
                </Button>
              ) : undefined
            }
          />
        )}
        {total > limit && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      {editingBook && <BookSheet book={book} refs={refs} onClose={() => setEditingBook(false)} />}
      {editing && (
        <EntrySheet
          bookId={book.id}
          currency={book.currencyCode}
          variant={editing === 'new' ? null : editing}
          existing={editing === 'new' ? [] : (groups.get(editing.id) ?? [])}
          nameLocale={nameLocale}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
