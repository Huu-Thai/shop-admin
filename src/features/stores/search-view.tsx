'use client';

import { RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { RadioCard, RadioGroup } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate, formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { reindexSearch, saveSearchSettings } from './actions';
import { formatSynonyms, parseStopwords, parseSynonyms } from './search-text';
import { STORE_TABS } from './tabs';

type Status = Schemas['SearchStatusDto'];
type Provider = Schemas['SearchProviderKind'];
const PROVIDERS: Provider[] = ['POSTGRES', 'MEILISEARCH', 'ELASTICSEARCH', 'OPENSEARCH'];
const BUILD_TONE = { READY: 'success', BUILDING: 'info', FAILED: 'danger' } as const;

/** The search engine of each website: engine choice, tuning and index health. */
export function SearchView({
  items,
  canConfigure,
  canReindex,
}: {
  items: { website: Schemas['WebsiteDto']; status: Status }[];
  canConfigure: boolean;
  canReindex: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        title={t('srch.title')}
        description={t('srch.description')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('nav.stores'), href: '/stores' },
          { label: t('srch.title') },
        ]}
      />
      <SubNav items={STORE_TABS} />
      <div className="grid gap-8">
        {items.length ? (
          items.map((x) => (
            <WebsiteSearch
              key={x.website.id}
              website={x.website}
              status={x.status}
              canConfigure={canConfigure}
              canReindex={canReindex}
            />
          ))
        ) : (
          <Card>
            <EmptyState icon={<Search />} title={t('site.empty')} />
          </Card>
        )}
      </div>
    </>
  );
}

function WebsiteSearch({
  website,
  status: s,
  canConfigure,
  canReindex,
}: {
  website: Schemas['WebsiteDto'];
  status: Status;
  canConfigure: boolean;
  canReindex: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const initial = {
    provider: s.active.provider,
    indexPrefix: s.indexPrefix,
    synonyms: formatSynonyms(s.synonyms),
    stopwords: s.stopwords.join(', '),
  };
  const [form, setForm] = useState(initial);
  const [base, setBase] = useState(s);
  if (base !== s) {
    setBase(s);
    setForm(initial);
  }
  const [conn, setConn] = useState({ url: '', apiKey: '', username: '', password: '' });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const switching = form.provider !== s.active.provider;
  const external = form.provider !== 'POSTGRES';
  // A new engine needs its connection; the same engine keeps it unless a new URL is typed.
  const sendConnection = external && (switching || !!conn.url.trim());
  const syn = parseSynonyms(form.synonyms);
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) || Object.values(conn).some((v) => v.trim());
  const errors = {
    url:
      sendConnection && !/^https?:\/\/\S+$/.test(conn.url.trim()) ? t('srch.err.url') : undefined,
    indexPrefix: !/^[a-z][a-z0-9_]{0,31}$/.test(form.indexPrefix)
      ? t('srch.err.prefix')
      : undefined,
    synonyms: syn.invalid.length
      ? t('srch.err.synonyms', { lines: syn.invalid.join(', ') })
      : undefined,
  };
  const provider = (p: Provider) => t(`srch.provider.${p}` as MessageKey);

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const c = conn;
    const ok = await runAction(
      saveSearchSettings(website.id, {
        provider: form.provider,
        indexPrefix: form.indexPrefix,
        synonyms: syn.groups,
        stopwords: parseStopwords(form.stopwords),
        ...(sendConnection
          ? {
              connection: {
                url: c.url.trim(),
                ...(c.apiKey.trim() ? { apiKey: c.apiKey.trim() } : {}),
                ...(c.username.trim() ? { username: c.username.trim(), password: c.password } : {}),
              },
            }
          : {}),
      }),
      {
        success: switching
          ? t('srch.switching', { engine: provider(form.provider) })
          : t('common.saved'),
      },
    );
    setSaving(false);
    if (ok) {
      setConn({ url: '', apiKey: '', username: '', password: '' });
      setTouched(false);
      router.refresh();
    }
  };

  return (
    <section className="grid gap-4" aria-labelledby={`srch-${website.id}`}>
      <h2 id={`srch-${website.id}`} className="text-h3">
        {website.name}
      </h2>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title={t('srch.engine')} description={t('srch.engineHint')} />
          <CardBody className="grid gap-5 pt-4">
            <RadioGroup
              value={form.provider}
              onValueChange={(v) => setForm((f) => ({ ...f, provider: v as Provider }))}
              disabled={!canConfigure}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {PROVIDERS.map((p) => (
                <RadioCard
                  key={p}
                  id={`srch-${website.id}-${p}`}
                  value={p}
                  title={provider(p)}
                  description={t(`srch.providerHint.${p}` as MessageKey)}
                />
              ))}
            </RadioGroup>
            {external && canConfigure && (
              <fieldset className="grid gap-4 rounded-lg border border-border p-4">
                <legend className="px-1 text-small font-semibold">{t('srch.connection')}</legend>
                <p className="text-small text-fg-muted">
                  {switching
                    ? t('srch.connectionNew')
                    : s.active.url
                      ? t('srch.connectionKept', { url: s.active.url })
                      : t('srch.connectionNew')}
                </p>
                <Field
                  id={`srch-url-${website.id}`}
                  label={t('srch.url')}
                  required={switching}
                  error={touched ? errors.url : undefined}
                >
                  <Input
                    id={`srch-url-${website.id}`}
                    type="url"
                    className="font-mono"
                    autoComplete="off"
                    placeholder="https://search.internal:7700"
                    value={conn.url}
                    onChange={(e) => setConn((c) => ({ ...c, url: e.target.value }))}
                  />
                </Field>
                {form.provider === 'MEILISEARCH' ? (
                  <Field
                    id={`srch-key-${website.id}`}
                    label={t('srch.apiKey')}
                    hint={t('srch.secretHint')}
                  >
                    <Input
                      id={`srch-key-${website.id}`}
                      type="password"
                      autoComplete="new-password"
                      value={conn.apiKey}
                      onChange={(e) => setConn((c) => ({ ...c, apiKey: e.target.value }))}
                    />
                  </Field>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field
                      id={`srch-key-${website.id}`}
                      label={t('srch.apiKey')}
                      hint={t('srch.orBasic')}
                    >
                      <Input
                        id={`srch-key-${website.id}`}
                        type="password"
                        autoComplete="new-password"
                        value={conn.apiKey}
                        onChange={(e) => setConn((c) => ({ ...c, apiKey: e.target.value }))}
                      />
                    </Field>
                    <Field id={`srch-user-${website.id}`} label={t('srch.username')}>
                      <Input
                        id={`srch-user-${website.id}`}
                        autoComplete="off"
                        value={conn.username}
                        onChange={(e) => setConn((c) => ({ ...c, username: e.target.value }))}
                      />
                    </Field>
                    <Field id={`srch-pass-${website.id}`} label={t('srch.password')}>
                      <Input
                        id={`srch-pass-${website.id}`}
                        type="password"
                        autoComplete="new-password"
                        value={conn.password}
                        onChange={(e) => setConn((c) => ({ ...c, password: e.target.value }))}
                      />
                    </Field>
                  </div>
                )}
              </fieldset>
            )}
            {switching && (
              <p className="rounded-md bg-info-soft px-4 py-3 text-small text-info-fg">
                {t('srch.switchHint')}
              </p>
            )}
            <Field
              id={`srch-prefix-${website.id}`}
              label={t('srch.prefix')}
              hint={t('srch.prefixHint')}
              error={touched ? errors.indexPrefix : undefined}
            >
              <Input
                id={`srch-prefix-${website.id}`}
                className="max-w-60 font-mono"
                disabled={!canConfigure}
                value={form.indexPrefix}
                onChange={(e) =>
                  setForm((f) => ({ ...f, indexPrefix: e.target.value.toLowerCase() }))
                }
              />
            </Field>
            <Field
              id={`srch-syn-${website.id}`}
              label={t('srch.synonyms')}
              hint={t('srch.synonymsHint')}
              error={touched ? errors.synonyms : undefined}
            >
              <Textarea
                id={`srch-syn-${website.id}`}
                rows={4}
                className="font-mono"
                disabled={!canConfigure}
                placeholder={'tee, t-shirt, tshirt\nsneaker, trainer'}
                value={form.synonyms}
                onChange={(e) => setForm((f) => ({ ...f, synonyms: e.target.value }))}
              />
            </Field>
            <Field
              id={`srch-stop-${website.id}`}
              label={t('srch.stopwords')}
              hint={t('srch.stopwordsHint')}
            >
              <Textarea
                id={`srch-stop-${website.id}`}
                rows={2}
                className="font-mono"
                disabled={!canConfigure}
                placeholder="the, a, an"
                value={form.stopwords}
                onChange={(e) => setForm((f) => ({ ...f, stopwords: e.target.value }))}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('srch.index')}
            actions={
              <Badge tone={BUILD_TONE[s.status]}>
                {t(`srch.status.${s.status}` as MessageKey)}
              </Badge>
            }
          />
          <CardBody className="grid gap-4 pt-4">
            <dl className="grid gap-2 text-small">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">{t('srch.activeEngine')}</dt>
                <dd className="text-right font-medium">
                  {provider(s.active.provider)} · {t('srch.generation', { n: s.active.generation })}
                </dd>
              </div>
              {s.pending && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">{t('srch.building')}</dt>
                  <dd className="text-right font-medium">{provider(s.pending.provider)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">{t('srch.lastBuilt')}</dt>
                <dd className="text-right font-medium">
                  {s.lastBuiltAt ? formatDate(s.lastBuiltAt, intl, true) : t('cust.never')}
                </dd>
              </div>
            </dl>
            {s.lastError && (
              <p
                role="alert"
                className="rounded-md bg-danger-soft px-3 py-2 text-small break-words text-danger-fg"
              >
                {s.lastError}
              </p>
            )}
            {s.documents.length > 0 && (
              <div className="grid gap-1.5">
                <Label>{t('srch.documents')}</Label>
                <ul className="grid gap-1 text-small">
                  {s.documents.map((d) => (
                    <li
                      key={`${d.storeCode}-${d.localeCode}`}
                      className="flex justify-between gap-3 rounded-md bg-surface-muted/60 px-3 py-1.5"
                    >
                      <span className="font-mono">
                        {d.storeCode} · {d.localeCode}
                      </span>
                      <span className="tabular font-medium">
                        {formatNumber(d.documents ?? 0, intl)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canReindex && (
              <Confirm
                trigger={
                  <Button variant="secondary" disabled={s.status === 'BUILDING'}>
                    <RefreshCw />
                    {t('srch.reindex')}
                  </Button>
                }
                destructive={false}
                title={t('srch.reindexTitle')}
                description={t('srch.reindexBody')}
                confirmLabel={t('srch.reindex')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(reindexSearch(website.id), {
                    success: t('srch.reindexQueued'),
                  });
                  if (ok !== undefined) router.refresh();
                  return ok !== undefined;
                }}
              />
            )}
          </CardBody>
        </Card>
      </div>
      {canConfigure && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => {
            setForm(initial);
            setConn({ url: '', apiKey: '', username: '', password: '' });
          }}
          message={t('srch.unsaved', { website: website.name })}
          saveLabel={switching ? t('srch.switch') : t('common.save')}
          discardLabel={t('common.discard')}
        />
      )}
    </section>
  );
}
