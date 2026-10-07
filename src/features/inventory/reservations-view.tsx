'use client';

import { Search, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { INVENTORY_TABS } from '../pricing/tabs';
import { convertReservation, releaseReservation } from './actions';

const TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  ACTIVE: 'warning',
  CONVERTED: 'success',
  RELEASED: 'neutral',
  EXPIRED: 'neutral',
};

/** Looks up a reservation group (from an order or cart) and releases or converts it by hand. */
export function ReservationsView({
  groupId,
  reservation,
  notFound,
  sources,
  canWrite,
}: {
  groupId: string;
  reservation: Schemas['ReservationDto'] | null;
  notFound: boolean;
  sources: Schemas['InventorySourceDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [query, setQuery] = useState(groupId);
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    query.trim(),
  );

  return (
    <>
      <PageHeader
        title={t('inv.title')}
        description={t('inv.reservationsDescription')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('inv.reservations') }]}
      />
      <SubNav items={INVENTORY_TABS} />
      <div className="grid max-w-[var(--form-max)] gap-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) router.push(`/inventory/reservations?group=${query.trim()}`);
          }}
        >
          <Input
            aria-label={t('inv.groupId')}
            placeholder={t('inv.groupIdPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono"
          />
          <Button type="submit" disabled={!valid}>
            <Search />
            {t('inv.lookUp')}
          </Button>
        </form>
        {reservation ? (
          <Card className="overflow-hidden">
            <CardHeader
              title={<span className="font-mono text-body">{reservation.groupId}</span>}
              description={
                reservation.expiresAt
                  ? t('inv.expires', { at: formatDate(reservation.expiresAt, intl, true) })
                  : undefined
              }
              actions={
                <Badge tone={TONE[reservation.status]} dot>
                  {t(`inv.res.${reservation.status}` as MessageKey)}
                </Badge>
              }
            />
            <CardBody className="grid gap-4 pt-4">
              <p className="text-body text-fg">
                {t('inv.reservedQty', { n: reservation.quantity })}
                {!reservation.managed && (
                  <span className="ml-2 text-small text-fg-muted">({t('inv.unmanaged')})</span>
                )}
              </p>
              {reservation.lines.length > 0 && (
                <Table>
                  <THead>
                    <tr>
                      <TH>{t('inv.source')}</TH>
                      <TH data-align="right">{t('inv.quantity')}</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {reservation.lines.map((l) => (
                      <TR key={l.sourceId}>
                        <TD>{sources.find((s) => s.id === l.sourceId)?.name ?? l.sourceId}</TD>
                        <TD data-align="right">{l.quantity}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
              {canWrite && reservation.status === 'ACTIVE' && (
                <div className="flex flex-wrap gap-2">
                  <Confirm
                    trigger={<Button variant="secondary">{t('inv.release')}</Button>}
                    title={t('inv.releaseTitle')}
                    description={t('inv.releaseBody')}
                    confirmLabel={t('inv.release')}
                    cancelLabel={t('common.cancel')}
                    onConfirm={async () => {
                      const ok = await runAction(releaseReservation(reservation.groupId), {
                        success: t('inv.released'),
                      });
                      if (ok) router.refresh();
                      return !!ok;
                    }}
                  />
                  <Confirm
                    destructive={false}
                    trigger={<Button>{t('inv.convert')}</Button>}
                    title={t('inv.convertTitle')}
                    description={t('inv.convertBody')}
                    confirmLabel={t('inv.convert')}
                    cancelLabel={t('common.cancel')}
                    onConfirm={async () => {
                      const ok = await runAction(convertReservation(reservation.groupId), {
                        success: t('inv.converted'),
                      });
                      if (ok) router.refresh();
                      return !!ok;
                    }}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<Ticket />}
              title={notFound ? t('inv.resNotFound') : t('inv.resLookupTitle')}
              description={notFound ? undefined : t('inv.resLookupBody')}
            />
          </Card>
        )}
      </div>
    </>
  );
}
