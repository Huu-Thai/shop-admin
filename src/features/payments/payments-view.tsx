'use client';

import { Copy, CreditCard, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { formatMoney } from '@/lib/format';
import { intlLocale } from '@/i18n';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import type { ShopLocale } from '../catalog/locale-switcher';
import { pickLocalized } from '../catalog/shared';
import { reconcilePayments } from './actions';
import { MethodSheet } from './method-sheet';
import { ProviderSheet } from './provider-sheet';

export const PAYMENT_TABS = [
  { href: '/payments', label: 'pay.setup' as const },
  { href: '/payments/webhooks', label: 'pay.webhooks' as const },
];

export function PaymentsView({
  providers,
  methods,
  stores,
  locales,
  canWrite,
  canReconcile,
}: {
  providers: Schemas['ProviderDto'][];
  methods: Schemas['StoreMethodDto'][];
  stores: Schemas['StoreDto'][];
  locales: ShopLocale[];
  /** settings:write — providers and methods */
  canWrite: boolean;
  /** orders:write — reconcile */
  canReconcile: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [providerSheet, setProviderSheet] = useState<Schemas['ProviderDto'] | 'new' | null>(null);
  const [methodSheet, setMethodSheet] = useState<Schemas['StoreMethodDto'] | 'new' | null>(null);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [reconciling, setReconciling] = useState(false);
  const store = stores.find((s) => s.id === storeId);
  const storeMethods = methods
    .filter((m) => m.storeId === storeId)
    .sort((a, b) => a.position - b.position);
  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? '—';
  const limits = (m: Schemas['StoreMethodDto']) =>
    [...new Set([...Object.keys(m.minAmounts ?? {}), ...Object.keys(m.maxAmounts ?? {})])]
      .map(
        (c) =>
          `${m.minAmounts?.[c] != null ? formatMoney(m.minAmounts[c], c, intl) : '…'} – ${m.maxAmounts?.[c] != null ? formatMoney(m.maxAmounts[c], c, intl) : '…'}`,
      )
      .join(' · ');

  return (
    <>
      <PageHeader
        title={t('pay.title')}
        description={t('pay.description')}
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('pay.title') }]}
        actions={
          canReconcile && (
            <Button
              variant="secondary"
              loading={reconciling}
              onClick={async () => {
                setReconciling(true);
                const r = await runAction(reconcilePayments());
                setReconciling(false);
                if (r) {
                  toast.success(t('pay.reconciled', { checked: r.checked, changed: r.changed }));
                  router.refresh();
                }
              }}
            >
              <RefreshCw />
              {t('pay.reconcile')}
            </Button>
          )
        }
      />
      <SubNav items={PAYMENT_TABS} />
      <div className="grid gap-6">
        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-h3 text-fg">{t('pay.providers')}</h2>
              <p className="text-small text-fg-muted">{t('pay.providersHint')}</p>
            </div>
            {canWrite && (
              <Button size="sm" onClick={() => setProviderSheet('new')}>
                <Plus />
                {t('pay.newProvider')}
              </Button>
            )}
          </div>
          {providers.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((p) => (
                <Card key={p.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg">
                      <CreditCard className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-fg">{p.name}</p>
                      <p className="font-mono text-caption text-fg-muted">{p.code}</p>
                    </div>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t('common.edit')} · ${p.name}`}
                        onClick={() => setProviderSheet(p)}
                      >
                        <Pencil />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={p.isActive ? 'success' : 'neutral'} dot>
                      {p.isActive ? t('common.active') : t('common.inactive')}
                    </Badge>
                    <Badge tone={p.mode === 'LIVE' ? 'accent' : 'warning'}>
                      {p.mode === 'LIVE' ? t('pay.live') : t('pay.test')}
                    </Badge>
                    {!p.configured && <Badge tone="danger">{t('pay.notConfigured')}</Badge>}
                  </div>
                  {p.code !== 'COD' && (
                    <div className="mt-auto flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-caption text-fg-muted"
                        title={p.webhookUrl}
                      >
                        {p.webhookUrl}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('pay.copyWebhook')}
                        onClick={async () => {
                          await navigator.clipboard.writeText(p.webhookUrl);
                          toast.success(t('pay.webhookCopied'));
                        }}
                      >
                        <Copy />
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<CreditCard />}
                title={t('pay.noProviders')}
                description={t('pay.noProvidersBody')}
              />
            </Card>
          )}
        </section>

        <Card className="overflow-hidden">
          <CardHeader
            title={t('pay.methods')}
            description={t('pay.methodsHint')}
            actions={
              <>
                {stores.length > 1 && (
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger aria-label={t('stores.store')} className="h-9 w-56" />
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {canWrite && providers.length > 0 && store && (
                  <Button size="sm" onClick={() => setMethodSheet('new')}>
                    <Plus />
                    {t('pay.newMethod')}
                  </Button>
                )}
              </>
            }
          />
          <div className="mt-4">
            {storeMethods.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>{t('pay.checkoutTitle')}</TH>
                    <TH>{t('pay.provider')}</TH>
                    <TH className="hidden md:table-cell">{t('pay.currencies')}</TH>
                    <TH className="hidden lg:table-cell">{t('pay.countries')}</TH>
                    <TH className="hidden xl:table-cell">{t('pay.limits')}</TH>
                    <TH>{t('common.status')}</TH>
                    <TH className="w-12">
                      <span className="sr-only">{t('list.actions')}</span>
                    </TH>
                  </tr>
                </THead>
                <TBody>
                  {storeMethods.map((m) => (
                    <TR key={m.id}>
                      <TD>
                        <span className="block font-medium">
                          {pickLocalized(m.titles, locale)?.title ?? m.code}
                        </span>
                        <span className="block font-mono text-caption text-fg-muted">{m.code}</span>
                      </TD>
                      <TD className="text-fg-muted">{providerName(m.providerId)}</TD>
                      <TD className="hidden font-mono text-small md:table-cell">
                        {m.currencyCodes.join(', ') || t('pay.allCurrencies')}
                      </TD>
                      <TD className="hidden font-mono text-small lg:table-cell">
                        {m.countryCodes.join(', ') || t('pay.allCountries')}
                      </TD>
                      <TD className="hidden text-small text-fg-muted xl:table-cell">
                        {limits(m) || '—'}
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
                            onClick={() => setMethodSheet(m)}
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
                icon={<CreditCard />}
                title={t('pay.noMethods')}
                description={t('pay.noMethodsBody')}
              />
            )}
          </div>
        </Card>
      </div>
      {providerSheet && (
        <ProviderSheet
          provider={providerSheet === 'new' ? null : providerSheet}
          onClose={() => setProviderSheet(null)}
        />
      )}
      {methodSheet && store && (
        <MethodSheet
          method={methodSheet === 'new' ? null : methodSheet}
          store={store}
          providers={providers}
          locales={locales}
          onClose={() => setMethodSheet(null)}
        />
      )}
    </>
  );
}
