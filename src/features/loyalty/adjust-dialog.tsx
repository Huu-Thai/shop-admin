'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { adjustPoints } from './actions';

/** Manual credit or debit of points with a reason the ledger keeps. */
export function AdjustDialog({
  customerId,
  balance,
  onClose,
}: {
  customerId: string;
  balance: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const n = /^\d{1,7}$/.test(points) ? Number(points) : 0;
  const errors = {
    points:
      !n || n > 1_000_000
        ? t('loy.err.points')
        : direction === 'remove' && n > balance
          ? t('loy.err.overBalance', { n: balance })
          : undefined,
    note: note.trim().length < 3 ? t('loy.err.note') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.points || errors.note) return;
    setSaving(true);
    const ok = await runAction(
      adjustPoints(customerId, { points: direction === 'add' ? n : -n, note: note.trim() }),
      { success: t('loy.adjusted') },
    );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('loy.adjust')}
        description={t('loy.adjustHint', { n: balance })}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {direction === 'add' ? t('loy.addPoints') : t('loy.removePoints')}
            </Button>
          </>
        }
      >
        <RadioGroup
          value={direction}
          onValueChange={(v) => setDirection(v as 'add' | 'remove')}
          className="flex gap-6"
        >
          <Radio id="adj-add" value="add" label={t('loy.addPoints')} />
          <Radio id="adj-remove" value="remove" label={t('loy.removePoints')} />
        </RadioGroup>
        <Field
          id="adj-points"
          label={t('loy.points')}
          required
          error={touched ? errors.points : undefined}
        >
          <Input
            id="adj-points"
            inputMode="numeric"
            autoFocus
            className="tabular"
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field
          id="adj-note"
          label={t('loy.reason')}
          required
          hint={t('loy.reasonHint')}
          error={touched ? errors.note : undefined}
        >
          <Textarea id="adj-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </DialogContent>
    </Dialog>
  );
}
