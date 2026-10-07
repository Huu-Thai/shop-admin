'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { slugify } from '../catalog/shared';
import { IDENTIFIER } from '../content/tabs';
import { createSlider, updateSlider } from './actions';

type Slider = Schemas['SliderDto'];
const ALL_STORES = '__all';

/** Creates a slider, or edits its name and autoplay. */
export function SliderSheet({
  slider,
  stores,
  onClose,
}: {
  slider: Slider | null;
  stores: Schemas['StoreDto'][];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(slider?.name ?? '');
  const [code, setCode] = useState(slider?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!slider);
  const [storeId, setStoreId] = useState(slider?.storeId ?? ALL_STORES);
  const [autoplay, setAutoplay] = useState(slider ? slider.autoplayMs !== null : true);
  const [seconds, setSeconds] = useState(String((slider?.autoplayMs ?? 5000) / 1000));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const ms = Math.round(Number(seconds.replace(',', '.')) * 1000);
  const errors = {
    name: !name.trim() ? t('ban.err.name') : undefined,
    code: !IDENTIFIER.test(code) ? t('cms.err.identifier') : undefined,
    seconds: autoplay && !(ms >= 1000 && ms <= 60_000) ? t('sld.err.seconds') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const autoplayMs = autoplay ? ms : null;
    const result = slider
      ? await runAction(updateSlider(slider.id, { name: name.trim(), autoplayMs }), {
          success: t('common.saved'),
        })
      : await runAction(
          createSlider({
            code,
            name: name.trim(),
            autoplayMs,
            storeId: storeId === ALL_STORES ? null : storeId,
          }),
          { success: t('sld.created') },
        );
    setSaving(false);
    if (!result) return;
    onClose();
    if (slider) router.refresh();
    else router.push(`/merchandising/sliders/${result.id}`);
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={slider ? slider.name : t('sld.new')}
        description={t('sld.sheetHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {slider ? t('common.save') : t('sld.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="sl-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="sl-name"
              autoFocus
              value={name}
              placeholder={t('sld.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(slugify(e.target.value).slice(0, 64).replace(/-+$/, ''));
              }}
            />
          </Field>
          <Field
            id="sl-code"
            label={t('common.code')}
            required
            hint={slider ? t('attr.codeLocked') : t('sld.codeHint')}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="sl-code"
              className="font-mono"
              disabled={!!slider}
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toLowerCase());
              }}
            />
          </Field>
          <div className="grid gap-1.5">
            <Label htmlFor="sl-store">{t('stores.store')}</Label>
            <Select value={storeId} disabled={!!slider} onValueChange={setStoreId}>
              <SelectTrigger id="sl-store" />
              <SelectContent>
                <SelectItem value={ALL_STORES}>{t('cms.allStores')}</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 rounded-lg border border-border p-4">
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-body font-medium">{t('sld.autoplay')}</span>
                <span className="block text-small text-fg-muted">{t('sld.autoplayHint')}</span>
              </span>
              <Switch checked={autoplay} onCheckedChange={setAutoplay} />
            </label>
            {autoplay && (
              <Field
                id="sl-seconds"
                label={t('sld.seconds')}
                error={touched ? errors.seconds : undefined}
              >
                <Input
                  id="sl-seconds"
                  inputMode="decimal"
                  className="tabular max-w-32"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                />
              </Field>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
