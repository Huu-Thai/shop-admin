'use client';

import { Gift, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { AdjustDialog } from './adjust-dialog';
import { multiplier, TX_TONE, TX_TYPES } from './shared';

type Account = Schemas['AccountDto'];
type Program = Schemas['ProgramDto'];
type Tx = Schemas['TransactionDto'];
type TxPage = Schemas['TransactionListDto'];

/** Balance, tier and worth of a customer's points, with a manual adjustment. */
export function LoyaltySummary({
  customerId,
  account,
  program,
  canWrite,
}: {
  customerId: string;
  account: Account | null;
  program: Program;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [adjusting, setAdjusting] = useState(false);
  const balance = account?.balance ?? 0;
  const worth = balance * Number(program.pointValue);
  return (
    <Card>
      <CardHeader
        title={t('nav.loyalty')}
        description={program.name}
        actions={
          canWrite && (
            <Button size="sm" variant="secondary" onClick={() => setAdjusting(true)}>
              <SlidersHorizontal />
              {t('loy.adjust')}
            </Button>
          )
        }
      />
      <CardBody className="grid gap-4 pt-4">
        <div>
          <p className="tabular text-h1 font-semibold text-fg">
            {formatNumber(balance, intl)}
            <span className="ml-1.5 text-body font-normal text-fg-muted">{t('loy.pts')}</span>
          </p>
          <p className="text-small text-fg-muted">
            {t('loy.worth', { amount: formatMoney(worth, program.currencyCode, intl) })}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-small">
          <div>
            <dt className="text-fg-muted">{t('loy.tier')}</dt>
            <dd className="mt-0.5">
              {account?.tier ? (
                <Badge tone="accent">
                  {account.tier.name} · {multiplier(account.tier.multiplierBp)}
                </Badge>
              ) : (
                <span className="text-fg-subtle">{t('loy.noTier')}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t('loy.lifetime')}</dt>
            <dd className="tabular mt-0.5 font-medium">
              {formatNumber(account?.lifetimePoints ?? 0, intl)}
            </dd>
          </div>
        </dl>
      </CardBody>
      {adjusting && (
        <AdjustDialog
          customerId={customerId}
          balance={balance}
          onClose={() => setAdjusting(false)}
        />
      )}
    </Card>
  );
}

const PAGE = 10;

/** The points ledger, newest first, paged and filtered in place through the gateway. */
export function PointsLedger({ customerId, initial }: { customerId: string; initial: TxPage }) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [data, setData] = useState(initial);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(data.total / PAGE));

  const load = async (page: number, nextType = type) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE), order: 'desc' });
      if (nextType) q.set('type', nextType);
      setData(await gw<TxPage>(`loyalty/customers/${customerId}/transactions?${q}`));
    } finally {
      setLoading(false);
    }
  };
  // Initial data is server-rendered; re-sync after a refresh (e.g. an adjustment).
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setData(initial);
    setType('');
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('loy.ledger')}
        description={t('loy.ledgerHint')}
        actions={
          <Select
            value={type || '__all'}
            onValueChange={(v) => {
              const next = v === '__all' ? '' : v;
              setType(next);
              void load(1, next);
            }}
          >
            <SelectTrigger aria-label={t('common.type')} className="h-8 w-40" />
            <SelectContent>
              <SelectItem value="__all">{t('loy.allTypes')}</SelectItem>
              {TX_TYPES.map((x) => (
                <SelectItem key={x} value={x}>
                  {t(`loy.tx.${x}` as MessageKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className={cn('mt-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
        {data.data.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.type')}</TH>
                <TH data-align="right">{t('loy.points')}</TH>
                <TH className="hidden md:table-cell" data-align="right">
                  {t('loy.remaining')}
                </TH>
                <TH className="hidden md:table-cell">{t('loy.reference')}</TH>
                <TH className="hidden lg:table-cell">{t('loy.expires')}</TH>
                <TH data-align="right">{t('common.created')}</TH>
              </tr>
            </THead>
            <TBody>
              {data.data.map((x: Tx) => (
                <TR key={x.id}>
                  <TD>
                    <Badge tone={TX_TONE[x.type]}>{t(`loy.tx.${x.type}` as MessageKey)}</Badge>
                  </TD>
                  <TD
                    data-align="right"
                    className={cn(
                      'tabular font-medium',
                      x.points > 0 ? 'text-success-fg' : 'text-fg',
                    )}
                  >
                    {x.points > 0 ? '+' : ''}
                    {formatNumber(x.points, intl)}
                  </TD>
                  <TD className="tabular hidden text-fg-muted md:table-cell" data-align="right">
                    {x.points > 0 ? formatNumber(x.remaining, intl) : '—'}
                  </TD>
                  <TD className="hidden max-w-[260px] md:table-cell">
                    {x.orderRef && <span className="block font-mono text-small">{x.orderRef}</span>}
                    {x.note && (
                      <span className="block truncate text-small text-fg-muted">{x.note}</span>
                    )}
                    {!x.orderRef && !x.note && <span className="text-fg-subtle">—</span>}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                    {x.expiresAt ? formatDate(x.expiresAt, intl) : '—'}
                  </TD>
                  <TD data-align="right" className="whitespace-nowrap text-fg-muted">
                    {formatDate(x.createdAt, intl, true)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Gift />}
            title={t('loy.noActivity')}
            description={t('loy.noActivityBody')}
          />
        )}
      </div>
      {data.total > PAGE && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-small text-fg-muted">
          <span>{t('list.page', { page: data.page, pages })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={data.page <= 1 || loading}
              onClick={() => load(data.page - 1)}
            >
              {t('list.previous')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={data.page >= pages || loading}
              onClick={() => load(data.page + 1)}
            >
              {t('list.next')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
