'use client';

import { Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import type { Schemas } from '@/server/api';
import { ATTRIBUTE_TABS, SubNav } from '../catalog-tabs';
import { labelOf } from '../shared';
import { SetSheet } from './set-sheet';

type AttributeSet = Schemas['AttributeSetDto'];

export function SetsView({
  sets,
  attributes,
  canWrite,
}: {
  sets: AttributeSet[];
  attributes: Schemas['AttributeDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeSet | null>(null);
  const [key, setKey] = useState(0);
  const byCode = new Map(attributes.map((a) => [a.code, a]));
  const openSheet = (s: AttributeSet | null) => {
    setEditing(s);
    setKey((k) => k + 1);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t('sets.title')}
        description={t('sets.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('sets.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => openSheet(null)}>
              <Plus />
              {t('sets.new')}
            </Button>
          )
        }
      />
      <SubNav items={ATTRIBUTE_TABS} />
      {sets.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((s) => {
            const groups = new Map<string, string[]>();
            for (const m of [...s.attributes].sort(
              (a, b) => (a.position ?? 0) - (b.position ?? 0),
            )) {
              const g = !m.groupName || m.groupName === 'General' ? t('sets.general') : m.groupName;
              groups.set(g, [...(groups.get(g) ?? []), m.code]);
            }
            return (
              <Card key={s.id} className="flex flex-col">
                <button
                  type="button"
                  disabled={!canWrite}
                  onClick={() => openSheet(s)}
                  className="focus-ring flex flex-1 flex-col gap-4 rounded-lg p-5 text-left transition-colors enabled:hover:bg-surface-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-h4 text-fg">{s.name}</h2>
                      <p className="font-mono text-caption text-fg-muted">{s.code}</p>
                    </div>
                    <Badge tone="outline">{t('sets.count', { n: s.attributes.length })}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {[...groups].map(([g, codes]) => (
                      <div key={g}>
                        <p className="mb-1.5 text-overline font-semibold tracking-[0.08em] text-fg-subtle uppercase">
                          {g}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {codes.map((c) => (
                            <span
                              key={c}
                              className="rounded-sm bg-surface-muted px-2 py-0.5 text-small text-fg"
                            >
                              {labelOf(byCode.get(c)?.labels ?? [], locale, c)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!s.attributes.length && (
                      <p className="text-small text-fg-muted">{t('sets.noMembers')}</p>
                    )}
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Layers />}
            title={t('sets.empty')}
            description={t('sets.emptyBody')}
            action={
              canWrite && (
                <Button size="sm" onClick={() => openSheet(null)}>
                  <Plus />
                  {t('sets.new')}
                </Button>
              )
            }
          />
        </Card>
      )}
      {open && (
        <SetSheet
          key={key}
          set={editing}
          attributes={attributes}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
