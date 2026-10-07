'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Label, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { CODE_PATTERN, codify } from '../catalog/shared';
import { createTaxZone, deleteTaxZone, updateTaxZone } from './actions';
import { RegionEditor } from './region-editor';
import { fromRows, type RegionRow, toRows, validateRegions } from './regions';

export function ZoneSheet({
  zone,
  onClose,
}: {
  zone: Schemas['TaxZoneDto'] | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!zone;
  const [name, setName] = useState(zone?.name ?? '');
  const [code, setCode] = useState(zone?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [rounding, setRounding] = useState<'LINE' | 'TOTAL'>(zone?.rounding ?? 'LINE');
  const [rows, setRows] = useState<RegionRow[]>(
    zone ? toRows(zone.regions) : [{ countryCode: '', regionCode: '', postcodePattern: '' }],
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const regionErrors = validateRegions(rows);
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.name || errors.code || Object.keys(regionErrors).length) return;
    setSaving(true);
    const body = { name: name.trim(), rounding, regions: fromRows(rows) };
    const ok = editing
      ? await runAction(updateTaxZone(zone.id, body), { success: t('common.saved') })
      : await runAction(createTaxZone({ ...body, code }), { success: t('tax.zoneCreated') });
    setSaving(false);
    if (ok) {
      onClose();
      if (!editing) router.push(`/tax/zones/${ok.id}`);
      else router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={editing ? zone.name : t('tax.newZone')}
        description={t('tax.zoneHint')}
        footer={
          <>
            {editing && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('tax.deleteZone', { name: zone.name })}
                description={t('tax.deleteZoneBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteTaxZone(zone.id), {
                    success: t('tax.zoneDeleted'),
                  });
                  if (ok !== undefined) {
                    onClose();
                    router.push('/tax');
                  }
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? t('common.save') : t('tax.createZone')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="tz-name"
              label={t('common.name')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="tz-name"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeEdited) setCode(codify(e.target.value));
                }}
              />
            </Field>
            <Field
              id="tz-code"
              label={t('common.code')}
              required
              hint={editing ? t('attr.codeLocked') : undefined}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="tz-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
          </div>
          <div className="grid gap-2">
            <Label>{t('tax.rounding')}</Label>
            <RadioGroup
              value={rounding}
              onValueChange={(v) => setRounding(v as 'LINE' | 'TOTAL')}
              className="flex flex-wrap gap-6"
            >
              <Radio
                id="tz-line"
                value="LINE"
                label={t('tax.roundLine')}
                hint={t('tax.roundLineHint')}
              />
              <Radio
                id="tz-total"
                value="TOTAL"
                label={t('tax.roundTotal')}
                hint={t('tax.roundTotalHint')}
              />
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label>{t('tax.regions')}</Label>
            <RegionEditor rows={rows} onChange={setRows} errors={touched ? regionErrors : {}} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
