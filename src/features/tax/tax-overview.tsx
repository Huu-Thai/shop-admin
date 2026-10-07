'use client';

import { Calculator, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { CODE_PATTERN, codify } from '../catalog/shared';
import { PRICING_TABS } from '../pricing/tabs';
import { createTaxClass, deleteTaxClass, updateTaxClass } from './actions';
import { regionLabel } from './regions';
import { ZoneSheet } from './zone-sheet';

type TaxClass = Schemas['TaxClassDto'];

export function TaxOverview({
  classes,
  zones,
  rateCounts,
  canWrite,
}: {
  classes: TaxClass[];
  zones: Schemas['TaxZoneDto'][];
  rateCounts: Record<string, number>;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [classDialog, setClassDialog] = useState<TaxClass | 'PRODUCT' | 'CUSTOMER' | null>(null);
  const [zoneSheet, setZoneSheet] = useState(false);

  return (
    <>
      <PageHeader
        title={t('price.title')}
        description={t('tax.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('tax.title') }]}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/tax/calculate">
              <Calculator />
              {t('tax.calculator')}
            </Link>
          </Button>
        }
      />
      <SubNav items={PRICING_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid gap-6">
          {(['PRODUCT', 'CUSTOMER'] as const).map((type) => (
            <Card key={type} className="overflow-hidden">
              <CardHeader
                title={type === 'PRODUCT' ? t('tax.productClasses') : t('tax.customerClasses')}
                description={
                  type === 'PRODUCT' ? t('tax.productClassesHint') : t('tax.customerClassesHint')
                }
                actions={
                  canWrite && (
                    <Button size="sm" variant="secondary" onClick={() => setClassDialog(type)}>
                      <Plus />
                      {t('common.add')}
                    </Button>
                  )
                }
              />
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {classes
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-fg">{c.name}</p>
                        <p className="font-mono text-caption text-fg-muted">{c.code}</p>
                      </div>
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t('common.edit')} · ${c.name}`}
                            onClick={() => setClassDialog(c)}
                          >
                            <Pencil />
                          </Button>
                          <Confirm
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`${t('common.delete')} · ${c.name}`}
                              >
                                <Trash2 />
                              </Button>
                            }
                            title={t('tax.deleteClass', { name: c.name })}
                            description={t('tax.deleteClassBody')}
                            confirmLabel={t('common.delete')}
                            cancelLabel={t('common.cancel')}
                            onConfirm={async () => {
                              const ok = await runAction(deleteTaxClass(c.id), {
                                success: t('tax.classDeleted'),
                              });
                              if (ok !== undefined) router.refresh();
                              return ok !== undefined;
                            }}
                          />
                        </>
                      )}
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader
            title={t('tax.zones')}
            description={t('tax.zonesHint')}
            actions={
              canWrite && (
                <Button size="sm" onClick={() => setZoneSheet(true)}>
                  <Plus />
                  {t('tax.newZone')}
                </Button>
              )
            }
          />
          {zones.length ? (
            <ul className="mt-4 divide-y divide-border border-t border-border">
              {zones.map((z) => (
                <li key={z.id}>
                  <Link
                    href={`/tax/zones/${z.id}`}
                    className="focus-ring flex items-start gap-4 px-5 py-4 hover:bg-surface-muted/50"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
                      <MapPin className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-body font-medium text-fg">{z.name}</span>
                        <span className="font-mono text-caption text-fg-muted">{z.code}</span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {z.regions.slice(0, 6).map((r, i) => (
                          <span
                            key={i}
                            className="rounded-xs bg-surface-muted px-1.5 py-0.5 font-mono text-caption text-fg"
                          >
                            {regionLabel(r)}
                          </span>
                        ))}
                        {z.regions.length > 6 && (
                          <span className="text-caption text-fg-muted">
                            +{z.regions.length - 6}
                          </span>
                        )}
                      </span>
                    </span>
                    <Badge tone="outline">
                      {t('tax.ratesCount', { n: rateCounts[z.id] ?? 0 })}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<MapPin />}
              title={t('tax.noZones')}
              description={t('tax.noZonesBody')}
            />
          )}
        </Card>
      </div>
      {classDialog && (
        <ClassDialog
          value={classDialog}
          onClose={() => setClassDialog(null)}
          onSaved={() => {
            setClassDialog(null);
            router.refresh();
          }}
        />
      )}
      {zoneSheet && <ZoneSheet zone={null} onClose={() => setZoneSheet(false)} />}
    </>
  );
}

function ClassDialog({
  value,
  onClose,
  onSaved,
}: {
  value: TaxClass | 'PRODUCT' | 'CUSTOMER';
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const editing = typeof value === 'object';
  const [type, setType] = useState(editing ? value.type : value);
  const [name, setName] = useState(editing ? value.name : '');
  const [code, setCode] = useState(editing ? value.code : '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={editing ? t('tax.renameClass') : t('tax.newClass')}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              loading={saving}
              onClick={async () => {
                setTouched(true);
                if (errors.name || errors.code) return;
                setSaving(true);
                const ok = editing
                  ? await runAction(updateTaxClass(value.id, { name: name.trim() }), {
                      success: t('common.saved'),
                    })
                  : await runAction(createTaxClass({ code, name: name.trim(), type }), {
                      success: t('common.saved'),
                    });
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
            id="tc-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="tc-name"
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
              id="tc-code"
              label={t('common.code')}
              required
              error={touched ? errors.code : undefined}
            >
              <Input
                id="tc-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="tc-type">{t('common.type')}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'PRODUCT' | 'CUSTOMER')}
                disabled={editing}
              >
                <SelectTrigger id="tc-type" />
                <SelectContent>
                  <SelectItem value="PRODUCT">{t('tax.productClass')}</SelectItem>
                  <SelectItem value="CUSTOMER">{t('tax.customerClass')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
