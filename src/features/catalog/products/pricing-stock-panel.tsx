'use client';

import { Calculator, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { AdjustSheet, type StockTarget } from '../../inventory/adjust-sheet';
import { MovementsTable } from '../../inventory/movements-view';
import { EntrySheet } from '../../pricing/entry-sheet';
import { BOOK_STATUS_TONE, bookStatus } from '../../pricing/shared';

type Book = Schemas['PriceBookDto'];
type Entry = Schemas['PriceEntryDto'];

const STOCKED = new Set(['SIMPLE', 'CONFIGURABLE']);

/** Prices of every variant in every book, and stock per source — one place to manage both. */
export function PricingStockPanel({
  product,
  books,
  entries,
  stock,
  sources,
  movements,
  nameLocale,
  canWritePricing,
  canWriteStock,
}: {
  product: Schemas['ProductDto'];
  books: Book[];
  /** Entries per price book id. */
  entries: Record<string, Entry[]>;
  stock: Schemas['StockDto'][];
  sources: Schemas['InventorySourceDto'][];
  movements: Schemas['MovementDto'][];
  nameLocale?: string;
  canWritePricing: boolean;
  canWriteStock: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [editing, setEditing] = useState<{
    book: Book;
    variant: { id: string; sku: string };
  } | null>(null);
  const [adjusting, setAdjusting] = useState<StockTarget | null>(null);
  const variants = [...product.variants].sort((a, b) => a.position - b.position);
  const typeOptions = product.typeOptions as Record<string, unknown>;
  const pricedByBooks =
    product.type !== 'GIFT_CARD' &&
    !(product.type === 'BUNDLE' && typeOptions.priceType !== 'FIXED');
  const stocked = STOCKED.has(product.type);
  const activeSources = sources.filter((s) => s.isActive || stock.some((r) => r.sourceId === s.id));
  const sortedBooks = [...books].sort(
    (a, b) => a.currencyCode.localeCompare(b.currencyCode) || a.priority - b.priority,
  );

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden">
        <CardHeader
          title={t('ps.prices')}
          description={
            pricedByBooks
              ? t('ps.pricesHint')
              : product.type === 'GIFT_CARD'
                ? t('ps.giftCardPrices')
                : t('ps.dynamicBundle')
          }
          actions={
            pricedByBooks &&
            variants[0] && (
              <Button variant="secondary" size="sm" asChild>
                <Link
                  href={`/pricing/preview?variant=${variants[0].id}&sku=${encodeURIComponent(variants[0].sku)}`}
                >
                  <Calculator />
                  {t('price.preview')}
                </Link>
              </Button>
            )
          }
        />
        {pricedByBooks && (
          <div className="mt-4">
            {sortedBooks.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH className="sticky left-0 z-10 bg-surface-muted">SKU</TH>
                    {sortedBooks.map((b) => {
                      const st = bookStatus(b);
                      return (
                        <TH
                          key={b.id}
                          data-align="right"
                          className="min-w-40 tracking-normal normal-case"
                        >
                          <Link
                            href={`/pricing/books/${b.id}`}
                            className="focus-ring block rounded-xs text-small font-semibold text-fg hover:underline"
                          >
                            {b.name}
                          </Link>
                          <span className="flex items-center justify-end gap-1.5 font-normal">
                            <span className="font-mono text-caption">{b.currencyCode}</span>
                            {st !== 'active' && (
                              <Badge tone={BOOK_STATUS_TONE[st]}>
                                {t(`price.status.${st}` as MessageKey)}
                              </Badge>
                            )}
                          </span>
                        </TH>
                      );
                    })}
                  </tr>
                </THead>
                <TBody>
                  {variants.map((v) => (
                    <TR key={v.id}>
                      <TD className="sticky left-0 z-10 bg-surface font-mono text-small font-medium">
                        {v.sku}
                      </TD>
                      {sortedBooks.map((b) => {
                        const tiers = (entries[b.id] ?? [])
                          .filter((e) => e.variantId === v.id)
                          .sort((x, y) => x.minQty - y.minQty);
                        const base = tiers[0];
                        return (
                          <TD key={b.id} data-align="right">
                            <button
                              type="button"
                              disabled={!canWritePricing}
                              onClick={() =>
                                setEditing({ book: b, variant: { id: v.id, sku: v.sku } })
                              }
                              className={cn(
                                'focus-ring -my-1 inline-flex min-h-9 min-w-24 flex-col items-end justify-center rounded-md px-2 py-1 transition-colors enabled:hover:bg-surface-muted',
                                !base && 'text-fg-subtle',
                              )}
                              aria-label={`${v.sku} · ${b.name}`}
                            >
                              {base ? (
                                <>
                                  <span className="tabular font-semibold text-fg">
                                    {formatMoney(base.amount, b.currencyCode, intl)}
                                  </span>
                                  {(tiers.length > 1 || base.compareAtAmount != null) && (
                                    <span className="text-caption text-fg-muted">
                                      {base.compareAtAmount != null && (
                                        <span className="mr-1.5 line-through">
                                          {formatMoney(base.compareAtAmount, b.currencyCode, intl)}
                                        </span>
                                      )}
                                      {tiers.length > 1 &&
                                        t('ps.moreTiers', { n: tiers.length - 1 })}
                                    </span>
                                  )}
                                </>
                              ) : canWritePricing ? (
                                <span className="inline-flex items-center gap-1 text-small">
                                  <Plus className="size-3.5" />
                                  {t('ps.setPrice')}
                                </span>
                              ) : (
                                '—'
                              )}
                            </button>
                          </TD>
                        );
                      })}
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyState title={t('price.empty')} description={t('price.emptyBody')} />
            )}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title={t('inv.title')}
          description={stocked ? t('ps.stockHint') : t('ps.noStock')}
        />
        {stocked &&
          (activeSources.length ? (
            <div className="mt-4">
              <Table>
                <THead>
                  <tr>
                    <TH className="sticky left-0 z-10 bg-surface-muted">SKU</TH>
                    {activeSources.map((s) => (
                      <TH
                        key={s.id}
                        data-align="right"
                        className="min-w-36 tracking-normal normal-case"
                      >
                        <span className="block text-small font-semibold text-fg">{s.name}</span>
                        <span className="block font-mono text-caption font-normal">{s.code}</span>
                      </TH>
                    ))}
                    <TH data-align="right">{t('ps.totalSalable')}</TH>
                  </tr>
                </THead>
                <TBody>
                  {variants.map((v) => {
                    const rows = stock.filter((r) => r.variantId === v.id);
                    const salable = rows.reduce((sum, r) => sum + r.salable, 0);
                    return (
                      <TR key={v.id}>
                        <TD className="sticky left-0 z-10 bg-surface font-mono text-small font-medium">
                          {v.sku}
                        </TD>
                        {activeSources.map((s) => {
                          const r = rows.find((x) => x.sourceId === s.id);
                          return (
                            <TD key={s.id} data-align="right">
                              <button
                                type="button"
                                disabled={!canWriteStock}
                                onClick={() =>
                                  setAdjusting({
                                    sourceId: s.id,
                                    variantId: v.id,
                                    sku: v.sku,
                                    stock: r
                                      ? {
                                          quantity: r.quantity,
                                          reserved: r.reserved,
                                          safetyStock: r.safetyStock,
                                          version: r.version,
                                        }
                                      : null,
                                  })
                                }
                                className="focus-ring -my-1 inline-flex min-h-9 min-w-20 flex-col items-end justify-center rounded-md px-2 py-1 transition-colors enabled:hover:bg-surface-muted"
                                aria-label={`${v.sku} · ${s.name}`}
                              >
                                <span
                                  className={cn(
                                    'tabular font-semibold',
                                    r ? 'text-fg' : 'text-fg-subtle',
                                  )}
                                >
                                  {formatNumber(r?.quantity ?? 0, intl)}
                                </span>
                                {r && r.reserved > 0 && (
                                  <span className="text-caption text-fg-muted">
                                    {t('ps.reservedN', { n: r.reserved })}
                                  </span>
                                )}
                              </button>
                            </TD>
                          );
                        })}
                        <TD data-align="right">
                          {salable > 0 ? (
                            <span className="font-semibold">{formatNumber(salable, intl)}</span>
                          ) : (
                            <Badge tone="danger" dot>
                              {t('inv.out')}
                            </Badge>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState title={t('inv.noSources')} description={t('inv.noSourcesBody')} />
          ))}
        {stocked && movements.length > 0 && (
          <CardBody className="border-t border-border">
            <h3 className="mb-3 text-h4 text-fg">{t('ps.recentMovements')}</h3>
            <div className="-mx-5 md:-mx-6">
              <MovementsTable rows={movements} sources={sources} compact />
            </div>
          </CardBody>
        )}
      </Card>

      {editing && (
        <EntrySheet
          bookId={editing.book.id}
          currency={editing.book.currencyCode}
          variant={editing.variant}
          existing={(entries[editing.book.id] ?? []).filter(
            (e) => e.variantId === editing.variant.id,
          )}
          nameLocale={nameLocale}
          onClose={() => setEditing(null)}
        />
      )}
      {adjusting && (
        <AdjustSheet
          target={adjusting}
          sources={sources}
          nameLocale={nameLocale}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}
