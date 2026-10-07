'use client';

import { ArrowRight, Lock, Plus, RefreshCw, Route, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { CONTENT_TABS, LINK, TARGET_TYPES } from '../content/tabs';
import { createRedirect, deleteRewrite, rebuildRewrites } from './actions';

type Rewrite = Schemas['UrlRewriteDto'];
const ALL = '__all';

/** Storefront URLs: the ones the shop keeps in sync with slugs, and custom redirects. */
export function RedirectsView({
  rewrites,
  total,
  page,
  limit,
  stores,
  canWrite,
}: {
  rewrites: Rewrite[];
  total: number;
  page: number;
  limit: number;
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const { params, set } = useQueryParams();
  const [creating, setCreating] = useState(false);
  const [rebuildStore, setRebuildStore] = useState(ALL);
  const filtered = ['search', 'storeId', 'localeCode', 'targetType'].some((k) => params.get(k));
  const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? '—';
  const locales = [...new Set(stores.flatMap((s) => s.localeCodes))].sort();

  return (
    <>
      <PageHeader
        title={t('rw.title')}
        description={t('rw.description')}
        breadcrumbs={[{ label: t('nav.content') }, { label: t('rw.title') }]}
        actions={
          canWrite && (
            <>
              <Confirm
                trigger={
                  <Button variant="secondary">
                    <RefreshCw />
                    {t('rw.rebuild')}
                  </Button>
                }
                destructive={false}
                title={t('rw.rebuildTitle')}
                description={
                  <span className="grid gap-3">
                    <span>{t('rw.rebuildBody')}</span>
                    {stores.length > 1 && (
                      <Select value={rebuildStore} onValueChange={setRebuildStore}>
                        <SelectTrigger aria-label={t('stores.store')} />
                        <SelectContent>
                          <SelectItem value={ALL}>{t('price.allStores')}</SelectItem>
                          {stores.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </span>
                }
                confirmLabel={t('rw.rebuild')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () =>
                  (await runAction(
                    rebuildRewrites(rebuildStore === ALL ? undefined : rebuildStore),
                    {
                      success: t('rw.rebuildQueued'),
                    },
                  )) !== undefined
                }
              />
              <Button onClick={() => setCreating(true)}>
                <Plus />
                {t('rw.new')}
              </Button>
            </>
          )
        }
      />
      <SubNav items={CONTENT_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('rw.search')} />
          {stores.length > 1 && (
            <FilterSelect
              param="storeId"
              label={t('stores.store')}
              allLabel={t('price.allStores')}
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          {locales.length > 1 && (
            <FilterSelect
              param="localeCode"
              label={t('common.language')}
              allLabel={t('rw.anyLanguage')}
              options={locales.map((l) => ({ value: l, label: l }))}
            />
          )}
          <FilterSelect
            param="targetType"
            label={t('common.type')}
            allLabel={t('sched.anyType')}
            options={TARGET_TYPES.map((x) => ({
              value: x,
              label: t(`rw.type.${x}` as MessageKey),
            }))}
          />
        </ListToolbar>
        {rewrites.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('rw.path')}</TH>
                <TH>{t('rw.goesTo')}</TH>
                <TH className="hidden md:table-cell">{t('stores.store')}</TH>
                <TH className="hidden lg:table-cell" data-align="right">
                  {t('common.updated')}
                </TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {rewrites.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[320px]">
                    <code className="block truncate font-mono text-small">
                      /{r.requestPath.replace(/^\//, '')}
                    </code>
                  </TD>
                  <TD className="max-w-[340px]">
                    <span className="flex min-w-0 items-center gap-2">
                      {r.redirectType ? (
                        <Badge tone="warning">{r.redirectType}</Badge>
                      ) : (
                        <Badge tone="neutral">{t(`rw.type.${r.targetType}` as MessageKey)}</Badge>
                      )}
                      {r.targetPath && (
                        <>
                          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
                          <code className="truncate font-mono text-small text-fg-muted">
                            {r.targetPath}
                          </code>
                        </>
                      )}
                      {r.isSystem && (
                        <Lock
                          aria-label={t('rw.system')}
                          className="size-3.5 shrink-0 text-fg-subtle"
                        />
                      )}
                    </span>
                  </TD>
                  <TD className="hidden text-fg-muted md:table-cell">
                    {storeName(r.storeId)} ·{' '}
                    <span className="font-mono text-small">{r.localeCode}</span>
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted lg:table-cell"
                  >
                    {formatDate(r.updatedAt, intl, true)}
                  </TD>
                  <TD data-align="right">
                    {canWrite && !r.isSystem && (
                      <Confirm
                        trigger={
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-fg-muted hover:text-danger-fg"
                            aria-label={t('rw.delete')}
                          >
                            <Trash2 />
                          </Button>
                        }
                        title={t('rw.deleteTitle', { path: r.requestPath })}
                        description={t('rw.deleteBody')}
                        confirmLabel={t('common.delete')}
                        cancelLabel={t('common.cancel')}
                        onConfirm={async () => {
                          const ok = await runAction(deleteRewrite(r.id), {
                            success: t('rw.deleted'),
                          });
                          if (ok !== undefined) router.refresh();
                          return ok !== undefined;
                        }}
                      />
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Route />}
            title={filtered ? t('list.noMatch') : t('rw.empty')}
            description={filtered ? undefined : t('rw.emptyBody')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({ search: null, storeId: null, localeCode: null, targetType: null })
                  }
                >
                  {t('list.clearFilters')}
                </Button>
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-small text-fg-muted">
        <Lock aria-hidden className="size-3.5" />
        {t('rw.footnote')}
      </p>
      {creating && <RedirectSheet stores={stores} onClose={() => setCreating(false)} />}
    </>
  );
}

function RedirectSheet({
  stores,
  onClose,
}: {
  stores: Schemas['StoreDto'][];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const store = stores.find((s) => s.id === storeId);
  const [localeCode, setLocaleCode] = useState(store?.defaultLocaleCode ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<'301' | '302'>('301');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const fromPath = from.trim().replace(/^\/+/, '');
  const errors = {
    from:
      !fromPath || /\s/.test(fromPath) || fromPath.includes('//') ? t('rw.err.from') : undefined,
    to: !LINK.test(to.trim())
      ? t('html.err.link')
      : to.trim().replace(/^\/+/, '') === fromPath
        ? t('rw.err.loop')
        : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (errors.from || errors.to) return;
    setSaving(true);
    const ok = await runAction(
      createRedirect({
        storeId,
        localeCode,
        requestPath: `/${fromPath}`,
        targetPath: to.trim(),
        redirectType: type === '301' ? 301 : 302,
      }),
      { success: t('rw.created') },
    );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={t('rw.new')}
        description={t('rw.newHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('rw.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="rd-store">{t('stores.store')}</Label>
              <Select
                value={storeId}
                onValueChange={(v) => {
                  setStoreId(v);
                  setLocaleCode(stores.find((s) => s.id === v)?.defaultLocaleCode ?? '');
                }}
              >
                <SelectTrigger id="rd-store" />
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="rd-locale">{t('common.language')}</Label>
              <Select value={localeCode} onValueChange={setLocaleCode}>
                <SelectTrigger id="rd-locale" />
                <SelectContent>
                  {(store?.localeCodes ?? []).map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Field
            id="rd-from"
            label={t('rw.from')}
            required
            hint={t('rw.fromHint')}
            error={touched ? errors.from : undefined}
          >
            <Input
              id="rd-from"
              autoFocus
              className="font-mono"
              placeholder="/summer-sale"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field
            id="rd-to"
            label={t('rw.to')}
            required
            hint={t('rw.toHint')}
            error={touched ? errors.to : undefined}
          >
            <Input
              id="rd-to"
              className="font-mono"
              placeholder="/women/dresses"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <div className="grid gap-2">
            <Label>{t('rw.kind')}</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as '301' | '302')}
              className="grid gap-3"
            >
              <Radio
                id="rd-301"
                value="301"
                label={t('rw.permanent')}
                hint={t('rw.permanentHint')}
              />
              <Radio
                id="rd-302"
                value="302"
                label={t('rw.temporary')}
                hint={t('rw.temporaryHint')}
              />
            </RadioGroup>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
