'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { codify } from '../catalog/shared';
import { createTier, deleteTier, updateTier } from './actions';

type Tier = Schemas['TierDto'];
const TIER_CODE = /^[a-z][a-z0-9_-]{0,63}$/;

/** A tier: reached by points earned within the program's window, it multiplies earning. */
export function TierSheet({
  websiteId,
  tier,
  onClose,
}: {
  websiteId: string;
  tier: Tier | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(tier?.name ?? '');
  const [code, setCode] = useState(tier?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!tier);
  const [threshold, setThreshold] = useState(tier ? String(tier.thresholdPoints) : '');
  const [multiplier, setMultiplier] = useState(tier ? String(tier.multiplierBp / 10_000) : '1');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const mult = /^\d{1,2}(\.\d{1,4})?$/.test(multiplier.trim())
    ? Math.round(Number(multiplier) * 10_000)
    : NaN;
  const errors = {
    name: !name.trim() ? t('loy.err.name') : undefined,
    code: !TIER_CODE.test(code) ? t('cgroup.err.code') : undefined,
    threshold: !/^\d{1,9}$/.test(threshold) ? t('loy.err.threshold') : undefined,
    multiplier: !(mult >= 0 && mult <= 100_000) ? t('loy.err.multiplier') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const body = { name: name.trim(), thresholdPoints: Number(threshold), multiplierBp: mult };
    const ok = tier
      ? await runAction(updateTier(tier.id, body), { success: t('common.saved') })
      : await runAction(createTier(websiteId, { ...body, code }), {
          success: t('loy.tierCreated'),
        });
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={tier ? tier.name : t('loy.newTier')}
        description={t('loy.tierHint')}
        footer={
          <>
            {tier && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('loy.deleteTier', { name: tier.name })}
                description={t('loy.deleteTierBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteTier(tier.id), {
                    success: t('loy.tierDeleted'),
                  });
                  if (ok !== undefined) {
                    onClose();
                    router.refresh();
                  }
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="lt-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="lt-name"
              autoFocus
              value={name}
              placeholder="Gold"
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(codify(e.target.value));
              }}
            />
          </Field>
          <Field
            id="lt-code"
            label={t('common.code')}
            required
            hint={tier ? t('attr.codeLocked') : undefined}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="lt-code"
              className="font-mono"
              disabled={!!tier}
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toLowerCase());
              }}
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="lt-threshold"
              label={t('loy.threshold')}
              required
              hint={t('loy.thresholdHint')}
              error={touched ? errors.threshold : undefined}
            >
              <Input
                id="lt-threshold"
                inputMode="numeric"
                className="tabular"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field
              id="lt-mult"
              label={t('loy.multiplier')}
              required
              hint={t('loy.multiplierHint')}
              error={touched ? errors.multiplier : undefined}
            >
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-small text-fg-muted">
                  ×
                </span>
                <Input
                  id="lt-mult"
                  inputMode="decimal"
                  className="tabular pl-7"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value.replace(',', '.'))}
                />
              </div>
            </Field>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
