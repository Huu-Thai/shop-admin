'use client';

import { Plus, Pencil, Warehouse, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { SortableList } from '@/components/ui/sortable';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { CODE_PATTERN, codify, stableJson } from '../catalog/shared';
import { INVENTORY_TABS } from '../pricing/tabs';
import { COUNTRY } from '../tax/regions';
import { createSource, setWebsiteSources, updateSource } from './actions';

type Source = Schemas['InventorySourceDto'];

export function SourcesView({
  sources,
  websites,
  assignments,
  canWrite,
}: {
  sources: Source[];
  websites: Schemas['WebsiteDto'][];
  /** Sources per website, in priority order. */
  assignments: Record<string, string[]>;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [dialog, setDialog] = useState<Source | 'new' | null>(null);
  const [value, setValue] = useState(assignments);
  const [saving, setSaving] = useState(false);
  const dirty = stableJson(value) !== stableJson(assignments);
  const byId = new Map(sources.map((s) => [s.id, s]));

  const save = async () => {
    setSaving(true);
    try {
      for (const w of websites) {
        if (stableJson(value[w.id] ?? []) === stableJson(assignments[w.id] ?? [])) continue;
        const ok = await runAction(
          setWebsiteSources(
            w.id,
            (value[w.id] ?? []).map((sourceId, i) => ({ sourceId, priority: i })),
          ),
        );
        if (!ok) return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('inv.title')}
        description={t('inv.sourcesDescription')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('inv.sources') }]}
        actions={
          canWrite && (
            <Button onClick={() => setDialog('new')}>
              <Plus />
              {t('inv.newSource')}
            </Button>
          )
        }
      />
      <SubNav items={INVENTORY_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader title={t('inv.sources')} description={t('inv.sourcesHint')} />
          <div className="mt-4">
            {sources.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>{t('common.name')}</TH>
                    <TH>{t('tax.country')}</TH>
                    <TH data-align="right">{t('common.active')}</TH>
                    <TH className="w-12">
                      <span className="sr-only">{t('list.actions')}</span>
                    </TH>
                  </tr>
                </THead>
                <TBody>
                  {sources.map((s) => (
                    <TR key={s.id}>
                      <TD>
                        <span className="block font-medium">{s.name}</span>
                        <span className="block font-mono text-caption text-fg-muted">{s.code}</span>
                      </TD>
                      <TD className="font-mono">{s.countryCode}</TD>
                      <TD data-align="right">
                        <Switch
                          aria-label={`${t('common.active')} · ${s.name}`}
                          checked={s.isActive}
                          disabled={!canWrite}
                          onCheckedChange={async (isActive) => {
                            if (
                              await runAction(updateSource(s.id, { isActive }), {
                                success: t('common.saved'),
                              })
                            )
                              router.refresh();
                          }}
                        />
                      </TD>
                      <TD>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t('common.edit')} · ${s.name}`}
                            onClick={() => setDialog(s)}
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
                icon={<Warehouse />}
                title={t('inv.noSources')}
                description={t('inv.noSourcesBody')}
              />
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          {websites.map((w) => {
            const ids = value[w.id] ?? [];
            return (
              <Card key={w.id}>
                <CardHeader title={w.name} description={t('inv.websiteSourcesHint')} />
                <CardBody className="grid grid-cols-1 gap-3 pt-4">
                  {ids.length ? (
                    <SortableList
                      items={ids}
                      getId={(id) => id}
                      onReorder={(next) => setValue((v) => ({ ...v, [w.id]: next }))}
                      handleLabel={t('sets.dragHandle')}
                      renderItem={(id, i, handle) => (
                        <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
                          {canWrite && handle}
                          <span className="tabular flex size-6 items-center justify-center rounded-full bg-surface-muted text-caption font-semibold">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body font-medium">
                              {byId.get(id)?.name ?? id}
                            </span>
                            <span className="block font-mono text-caption text-fg-muted">
                              {byId.get(id)?.code}
                            </span>
                          </span>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('common.remove')}
                              onClick={() =>
                                setValue((v) => ({ ...v, [w.id]: ids.filter((x) => x !== id) }))
                              }
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                      )}
                    />
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-4 py-5 text-center text-small text-warning-fg">
                      {t('inv.noWebsiteSources')}
                    </p>
                  )}
                  {canWrite && (
                    <Combobox
                      value={[]}
                      onChange={([id]) => id && setValue((v) => ({ ...v, [w.id]: [...ids, id] }))}
                      options={sources
                        .filter((s) => !ids.includes(s.id))
                        .map((s) => ({
                          value: s.id,
                          label: s.name,
                          hint: `${s.code} · ${s.countryCode}`,
                        }))}
                      placeholder={t('inv.addSource')}
                      emptyText={t('common.noResults')}
                    />
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          message={t('common.unsaved')}
          saveLabel={t('common.save')}
          discardLabel={t('common.discard')}
          onDiscard={() => setValue(assignments)}
          onSave={save}
        />
      )}
      {dialog && (
        <SourceDialog
          source={dialog === 'new' ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SourceDialog({
  source,
  onClose,
  onSaved,
}: {
  source: Source | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const editing = !!source;
  const [name, setName] = useState(source?.name ?? '');
  const [code, setCode] = useState(source?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [country, setCountry] = useState(source?.countryCode ?? '');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
    country: !COUNTRY.test(country) ? t('tax.err.country') : undefined,
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={editing ? source.name : t('inv.newSource')}
        description={t('inv.sourceHint')}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              loading={saving}
              onClick={async () => {
                setTouched(true);
                if (Object.values(errors).some(Boolean)) return;
                setSaving(true);
                const ok = editing
                  ? await runAction(updateSource(source.id, { name: name.trim() }), {
                      success: t('common.saved'),
                    })
                  : await runAction(
                      createSource({
                        code,
                        name: name.trim(),
                        countryCode: country,
                        isActive: true,
                      }),
                      { success: t('common.saved') },
                    );
                setSaving(false);
                if (ok) onSaved();
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field
            id="src-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="src-name"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(codify(e.target.value));
              }}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="src-code"
              label={t('common.code')}
              required
              error={touched ? errors.code : undefined}
            >
              <Input
                id="src-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
            <Field
              id="src-country"
              label={t('tax.country')}
              required
              error={touched ? errors.country : undefined}
            >
              <Input
                id="src-country"
                maxLength={2}
                value={country}
                disabled={editing}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
