'use client';

import { Pencil, Plus, Truck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import type { Schemas } from '@/server/api';
import type { ShopLocale } from '../catalog/locale-switcher';
import { pickLocalized } from '../catalog/shared';
import { ShippingMethodSheet } from './method-sheet';

export function ShippingView({
  methods,
  websites,
  stores,
  locales,
  taxClasses,
  canWrite,
}: {
  methods: Schemas['ShippingMethodDto'][];
  websites: Schemas['WebsiteDto'][];
  stores: Schemas['StoreDto'][];
  locales: ShopLocale[];
  taxClasses: Schemas['TaxClassDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? '');
  const [sheet, setSheet] = useState<Schemas['ShippingMethodDto'] | 'new' | null>(null);
  const websiteStores = stores.filter((s) => s.websiteId === websiteId);
  const currencies = [...new Set(websiteStores.flatMap((s) => s.currencyCodes))].sort();
  const localeCodes = new Set(websiteStores.flatMap((s) => s.localeCodes));
  const websiteLocales = locales.filter((l) => localeCodes.has(l.code));
  const list = methods
    .filter((m) => m.websiteId === websiteId)
    .sort((a, b) => a.position - b.position);
  const money = (m: Record<string, number> | null) =>
    m
      ? Object.entries(m)
          .map(([c, v]) => formatMoney(v, c, intl))
          .join(' · ')
      : '—';

  return (
    <>
      <PageHeader
        title={t('shipm.title')}
        description={t('shipm.description')}
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('shipm.title') }]}
        actions={
          canWrite &&
          websiteId && (
            <Button onClick={() => setSheet('new')}>
              <Plus />
              {t('shipm.new')}
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <CardHeader
          title={websites.find((w) => w.id === websiteId)?.name ?? ''}
          description={t('shipm.websiteHint', { currencies: currencies.join(', ') })}
          actions={
            websites.length > 1 && (
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger aria-label={t('common.websites')} className="h-9 w-56" />
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
        <div className="mt-4">
          {list.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>{t('common.name')}</TH>
                  <TH>{t('ship.carrier')}</TH>
                  <TH data-align="right">{t('shipm.price')}</TH>
                  <TH data-align="right" className="hidden md:table-cell">
                    {t('shipm.freeOver')}
                  </TH>
                  <TH className="hidden lg:table-cell">{t('shipm.countries')}</TH>
                  <TH>{t('common.status')}</TH>
                  <TH className="w-12">
                    <span className="sr-only">{t('list.actions')}</span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {list.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <span className="block font-medium">
                        {pickLocalized(m.translations, locale)?.name ?? m.code}
                      </span>
                      <span className="block font-mono text-caption text-fg-muted">{m.code}</span>
                    </TD>
                    <TD>{m.carrier}</TD>
                    <TD data-align="right">
                      {money(m.amounts)}
                      {m.rateType === 'PER_ITEM' && (
                        <span className="block text-caption text-fg-muted">
                          {t('shipm.perItemShort')}
                        </span>
                      )}
                    </TD>
                    <TD data-align="right" className="hidden text-fg-muted md:table-cell">
                      {money(m.freeOver)}
                    </TD>
                    <TD className="hidden font-mono text-small lg:table-cell">
                      {m.countryCodes.join(', ') || t('pay.allCountries')}
                    </TD>
                    <TD>
                      <Badge tone={m.isActive ? 'success' : 'neutral'} dot>
                        {m.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TD>
                    <TD>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${t('common.edit')} · ${m.code}`}
                          onClick={() => setSheet(m)}
                        >
                          <Pencil />
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Truck />}
              title={t('shipm.empty')}
              description={t('shipm.emptyBody')}
            />
          )}
        </div>
      </Card>
      {sheet && (
        <ShippingMethodSheet
          method={sheet === 'new' ? null : sheet}
          websiteId={websiteId}
          currencies={currencies}
          locales={websiteLocales}
          taxClasses={taxClasses}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
