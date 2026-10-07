'use client';

import { BadgePercent, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { PublishBadge, PublishPanel } from '../publishing/publishing';
import { deleteCampaign, publishCampaign } from './actions';
import { CampaignSheet } from './campaign-sheet';
import { RuleSummary } from './rule-summary';
import { MARKETING_TABS } from './tabs';

export function CampaignDetail({
  campaign: c,
  promotions,
  currencies,
  canWrite,
}: {
  campaign: Schemas['CampaignDto'];
  promotions: Schemas['PromotionDto'][];
  currencies: string[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const publish = async (unpublish: boolean, at?: string) => {
    const ok = await runAction(publishCampaign(c.id, at ? { at } : {}, unpublish), {
      success: unpublish
        ? at
          ? t('pub.endScheduled')
          : t('pub.unpublished')
        : at
          ? t('pub.startScheduled')
          : t('pub.published'),
    });
    if (ok) router.refresh();
    return !!ok;
  };
  const unpublishedPromotions = promotions.filter((p) => !p.visible).length;

  return (
    <>
      <PageHeader
        title={c.name}
        description={c.description ?? undefined}
        breadcrumbs={[
          { label: t('nav.customers') },
          { label: t('nav.promotions'), href: '/promotions' },
          { label: t('camp.title'), href: '/promotions/campaigns' },
          { label: c.name },
        ]}
        actions={
          canWrite && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                {t('common.edit')}
              </Button>
              <Button asChild>
                <Link href={`/promotions/new?campaignId=${c.id}`}>
                  <Plus />
                  {t('promo.new')}
                </Link>
              </Button>
            </>
          )
        }
      />
      <SubNav items={MARKETING_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardHeader
            title={t('promo.title')}
            description={
              promotions.length && unpublishedPromotions
                ? t('camp.unpublishedPromotions', { n: unpublishedPromotions })
                : t('camp.promotionsHint')
            }
          />
          <div className="mt-4">
            {promotions.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>{t('common.name')}</TH>
                    <TH>{t('common.status')}</TH>
                    <TH className="hidden md:table-cell">{t('promo.does')}</TH>
                    <TH className="hidden sm:table-cell" data-align="right">
                      {t('promo.used')}
                    </TH>
                  </tr>
                </THead>
                <TBody>
                  {promotions.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <Link
                          href={`/promotions/${p.id}`}
                          className="focus-ring rounded-xs font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.requiresCoupon && (
                          <span className="ml-2 text-caption text-fg-muted">
                            {t('promo.couponOnly')}
                          </span>
                        )}
                      </TD>
                      <TD>
                        <PublishBadge item={p} heldBack={p.visible && !p.active} />
                      </TD>
                      <TD className="hidden max-w-[320px] md:table-cell">
                        <RuleSummary rules={p.actions} />
                      </TD>
                      <TD className="tabular hidden sm:table-cell" data-align="right">
                        {p.timesUsed}
                        {p.usageLimit ? (
                          <span className="text-fg-muted"> / {p.usageLimit}</span>
                        ) : null}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyState
                icon={<BadgePercent />}
                title={t('camp.noPromotions')}
                description={t('camp.noPromotionsBody')}
                action={
                  canWrite && (
                    <Button asChild size="sm">
                      <Link href={`/promotions/new?campaignId=${c.id}`}>
                        <Plus />
                        {t('promo.new')}
                      </Link>
                    </Button>
                  )
                }
              />
            )}
          </div>
        </Card>
        <div className="grid gap-6">
          <PublishPanel
            item={c}
            canWrite={canWrite}
            onPublish={(at) => publish(false, at)}
            onUnpublish={(at) => publish(true, at)}
          />
          <Card>
            <CardHeader title={t('common.details')} />
            <CardBody className="pt-4">
              <dl className="grid gap-3 text-small">
                {[
                  [
                    t('common.code'),
                    <span key="c" className="font-mono">
                      {c.code}
                    </span>,
                  ],
                  [
                    t('camp.budget'),
                    c.budgetAmount != null && c.budgetCurrencyCode
                      ? formatMoney(Number(c.budgetAmount), c.budgetCurrencyCode, intl)
                      : '—',
                  ],
                  [t('common.created'), formatDate(c.createdAt, intl)],
                  [t('common.updated'), formatDate(c.updatedAt, intl, true)],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <dt className="text-fg-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          {canWrite && (
            <Confirm
              trigger={
                <Button
                  variant="ghost"
                  className="justify-self-start text-danger-fg"
                  disabled={promotions.length > 0}
                >
                  <Trash2 />
                  {t('camp.delete')}
                </Button>
              }
              title={t('camp.deleteTitle')}
              description={t('camp.deleteBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const ok = await runAction(deleteCampaign(c.id), { success: t('camp.deleted') });
                if (ok !== undefined) router.push('/promotions/campaigns');
                return ok !== undefined;
              }}
            />
          )}
          {canWrite && promotions.length > 0 && (
            <p className="-mt-4 text-caption text-fg-muted">{t('camp.deleteBlocked')}</p>
          )}
        </div>
      </div>
      {editing && (
        <CampaignSheet campaign={c} currencies={currencies} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
