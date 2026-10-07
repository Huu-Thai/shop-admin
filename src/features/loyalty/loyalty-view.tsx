'use client';

import { Gift, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { ProgramSheet } from './program-sheet';
import { LOYALTY_TABS, multiplier } from './shared';
import { TierSheet } from './tier-sheet';

type Program = Schemas['ProgramDto'];
type Website = Schemas['WebsiteDto'];

/** One points program per website, with its tiers. */
export function LoyaltyView({
  websites,
  programs,
  currencies,
  canWrite,
}: {
  websites: Website[];
  programs: Program[];
  /** Currencies each website sells in. */
  currencies: Record<string, string[]>;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [editing, setEditing] = useState<Website | null>(null);
  const [tier, setTier] = useState<{
    websiteId: string;
    tier: Program['tiers'][number] | null;
  } | null>(null);
  const programOf = (w: Website) => programs.find((p) => p.websiteId === w.id) ?? null;

  return (
    <>
      <PageHeader
        title={t('nav.loyalty')}
        description={t('loy.description')}
        breadcrumbs={[{ label: t('nav.customers') }, { label: t('nav.loyalty') }]}
      />
      <SubNav items={LOYALTY_TABS} />
      <div className="grid gap-6">
        {websites.map((w) => {
          const p = programOf(w);
          if (!p)
            return (
              <Card key={w.id}>
                <CardHeader
                  title={w.name}
                  actions={<Badge tone="neutral">{t('loy.notSetUp')}</Badge>}
                />
                <EmptyState
                  icon={<Gift />}
                  title={t('loy.noProgram')}
                  description={t('loy.noProgramBody')}
                  action={
                    canWrite && (
                      <Button size="sm" onClick={() => setEditing(w)}>
                        <Plus />
                        {t('loy.setUpShort')}
                      </Button>
                    )
                  }
                />
              </Card>
            );
          const tiers = [...p.tiers].sort((a, b) => a.thresholdPoints - b.thresholdPoints);
          return (
            <Card key={w.id} className="overflow-hidden">
              <CardHeader
                title={`${w.name} · ${p.name}`}
                actions={
                  <>
                    {p.isActive ? (
                      <Badge tone="success" dot>
                        {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">{t('loy.paused')}</Badge>
                    )}
                    {canWrite && (
                      <Button size="sm" variant="secondary" onClick={() => setEditing(w)}>
                        <Pencil />
                        {t('common.edit')}
                      </Button>
                    )}
                  </>
                }
              />
              <CardBody className="pt-4">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    [
                      t('loy.earnRate'),
                      t('loy.earnRateValue', {
                        amount: formatMoney(Number(p.spendPerPoint), p.currencyCode, intl),
                      }),
                    ],
                    [t('loy.pointValue'), formatMoney(Number(p.pointValue), p.currencyCode, intl)],
                    [
                      t('loy.redemption'),
                      t('loy.redemptionValue', {
                        min: formatNumber(p.minRedeemPoints, intl),
                        percent: p.maxRedeemPercent,
                      }),
                    ],
                    [
                      t('loy.expiry'),
                      p.expiryDays ? t('loy.afterDays', { n: p.expiryDays }) : t('loy.never'),
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md bg-surface-muted/60 px-4 py-3">
                      <dt className="text-caption text-fg-muted">{k}</dt>
                      <dd className="mt-1 text-body font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                <div>
                  <h3 className="text-h4">{t('loy.tiers')}</h3>
                  <p className="text-small text-fg-muted">
                    {t('loy.tiersHint', { n: p.tierWindowDays })}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setTier({ websiteId: w.id, tier: null })}
                  >
                    <Plus />
                    {t('loy.addTier')}
                  </Button>
                )}
              </div>
              {tiers.length ? (
                <Table>
                  <THead>
                    <tr>
                      <TH>{t('common.name')}</TH>
                      <TH className="hidden sm:table-cell">{t('common.code')}</TH>
                      <TH data-align="right">{t('loy.threshold')}</TH>
                      <TH data-align="right">{t('loy.multiplier')}</TH>
                      <TH data-align="right">
                        <span className="sr-only">{t('list.actions')}</span>
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {tiers.map((x) => (
                      <TR key={x.id}>
                        <TD className="font-medium">{x.name}</TD>
                        <TD className="hidden font-mono text-small sm:table-cell">{x.code}</TD>
                        <TD className="tabular" data-align="right">
                          {formatNumber(x.thresholdPoints, intl)} {t('loy.pts')}
                        </TD>
                        <TD data-align="right">
                          <Badge tone="accent">{multiplier(x.multiplierBp)}</Badge>
                        </TD>
                        <TD data-align="right">
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setTier({ websiteId: w.id, tier: x })}
                            >
                              {t('common.edit')}
                            </Button>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <p className="px-5 pb-5 text-small text-fg-muted">{t('loy.noTiers')}</p>
              )}
            </Card>
          );
        })}
      </div>
      {editing && (
        <ProgramSheet
          website={editing}
          program={programOf(editing)}
          currencies={currencies[editing.id] ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      {tier && (
        <TierSheet websiteId={tier.websiteId} tier={tier.tier} onClose={() => setTier(null)} />
      )}
    </>
  );
}
