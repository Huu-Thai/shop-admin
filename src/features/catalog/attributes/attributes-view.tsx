'use client';

import { Check, Plus, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import type { Schemas } from '@/server/api';
import { ATTRIBUTE_TABS, SubNav } from '../catalog-tabs';
import type { ShopLocale } from '../locale-switcher';
import { hasOptions, labelOf } from '../shared';
import { AttributeSheet } from './attribute-sheet';

type Attribute = Schemas['AttributeDto'];

const FLAG_COLS = ['isRequired', 'isFilterable', 'isSearchable', 'isLocalizable'] as const;

export function AttributesView({
  attributes,
  locales,
  canWrite,
}: {
  attributes: Attribute[];
  locales: ShopLocale[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attributes
      .filter((a) => !type || a.type === type)
      .filter(
        (a) => !q || a.code.includes(q) || a.labels.some((l) => l.label.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
  }, [attributes, query, type]);

  const openSheet = (a: Attribute | null) => {
    setEditing(a);
    setKey((k) => k + 1);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t('attr.title')}
        description={t('attr.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('attr.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => openSheet(null)}>
              <Plus />
              {t('attr.new')}
            </Button>
          )
        }
      />
      <SubNav items={ATTRIBUTE_TABS} />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 md:px-5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('attr.search')}
            aria-label={t('attr.search')}
            className="focus-ring h-9 min-w-[200px] flex-1 rounded-md border border-border-strong bg-surface px-3 text-body text-fg placeholder:text-fg-subtle sm:max-w-[320px]"
          />
          <Select value={type || '__all'} onValueChange={(v) => setType(v === '__all' ? '' : v)}>
            <SelectTrigger
              aria-label={t('common.type')}
              className="h-9 w-auto min-w-[140px] gap-3"
            />
            <SelectContent>
              <SelectItem value="__all">{t('attr.allTypes')}</SelectItem>
              {[...new Set(attributes.map((a) => a.type))].sort().map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {t(`attr.type.${ty}` as MessageKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular ml-auto text-small text-fg-muted">
            {shown.length} / {attributes.length}
          </span>
        </div>
        {shown.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('attr.label')}</TH>
                <TH>{t('common.code')}</TH>
                <TH>{t('common.type')}</TH>
                {FLAG_COLS.map((f) => (
                  <TH key={f} className="hidden text-center lg:table-cell">
                    {t(`attr.flag.${f}.short` as MessageKey)}
                  </TH>
                ))}
                <TH data-align="right">{t('attr.options')}</TH>
              </tr>
            </THead>
            <TBody>
              {shown.map((a) => (
                <TR
                  key={a.id}
                  className={canWrite ? 'cursor-pointer' : undefined}
                  onClick={canWrite ? () => openSheet(a) : undefined}
                >
                  <TD className="font-medium">
                    {canWrite ? (
                      <button
                        type="button"
                        className="focus-ring rounded-xs text-left hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSheet(a);
                        }}
                      >
                        {labelOf(a.labels, locale, a.code)}
                      </button>
                    ) : (
                      labelOf(a.labels, locale, a.code)
                    )}
                  </TD>
                  <TD className="font-mono text-small text-fg-muted">{a.code}</TD>
                  <TD>
                    <Badge tone={hasOptions(a.type) ? 'info' : 'neutral'}>
                      {t(`attr.type.${a.type}` as MessageKey)}
                    </Badge>
                  </TD>
                  {FLAG_COLS.map((f) => (
                    <TD key={f} className="hidden text-center lg:table-cell">
                      {a[f] ? (
                        <Check aria-label={t('common.yes')} className="mx-auto size-4 text-fg" />
                      ) : (
                        <span aria-label={t('common.no')} className="text-fg-subtle">
                          —
                        </span>
                      )}
                    </TD>
                  ))}
                  <TD data-align="right">{hasOptions(a.type) ? a.options.length : '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<SlidersHorizontal />}
            title={attributes.length ? t('list.noMatch') : t('attr.empty')}
            description={attributes.length ? undefined : t('attr.emptyBody')}
            action={
              canWrite && !attributes.length ? (
                <Button size="sm" onClick={() => openSheet(null)}>
                  <Plus />
                  {t('attr.new')}
                </Button>
              ) : undefined
            }
          />
        )}
      </Card>
      {open && (
        <AttributeSheet
          key={key}
          attribute={editing}
          locales={locales}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
