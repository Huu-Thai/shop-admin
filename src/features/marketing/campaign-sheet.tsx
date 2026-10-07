'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { toMajor, toMinor } from '@/lib/money';
import { slugify } from '../catalog/shared';
import type { Schemas } from '@/server/api';
import { createCampaign, updateCampaign } from './actions';
import { CAMPAIGN_CODE } from './tabs';

type Campaign = Schemas['CampaignDto'];

/** Creates a campaign, or edits its name, description and budget. */
export function CampaignSheet({
  campaign,
  currencies,
  onClose,
}: {
  campaign: Campaign | null;
  currencies: string[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!campaign;
  const [name, setName] = useState(campaign?.name ?? '');
  const [code, setCode] = useState(campaign?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [currency, setCurrency] = useState(campaign?.budgetCurrencyCode ?? currencies[0] ?? 'USD');
  const [budget, setBudget] = useState(
    campaign?.budgetAmount != null && campaign.budgetCurrencyCode
      ? toMajor(Number(campaign.budgetAmount), campaign.budgetCurrencyCode)
      : '',
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const minor = budget.trim() ? toMinor(budget, currency) : null;
  const errors = {
    name: !name.trim() ? t('camp.err.name') : undefined,
    code: !CAMPAIGN_CODE.test(code) || code.length > 64 ? t('camp.err.code') : undefined,
    budget:
      minor !== null && !(Number.isSafeInteger(minor) && minor >= 0)
        ? t('price.err.amount')
        : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const result = editing
      ? await runAction(
          updateCampaign(campaign.id, {
            name: name.trim(),
            description: description.trim() || null,
            budgetAmount: minor,
            budgetCurrencyCode: minor === null ? null : currency,
          }),
          { success: t('common.saved') },
        )
      : await runAction(
          createCampaign({
            code,
            name: name.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(minor !== null ? { budgetAmount: minor, budgetCurrencyCode: currency } : {}),
          }),
          { success: t('camp.created') },
        );
    setSaving(false);
    if (result) {
      onClose();
      if (editing) router.refresh();
      else router.push(`/promotions/campaigns/${result.id}`);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={editing ? campaign.name : t('camp.new')}
        description={t('camp.sheetHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? t('common.save') : t('camp.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="cp-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="cp-name"
              autoFocus
              value={name}
              placeholder={t('camp.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(slugify(e.target.value).slice(0, 64).replace(/-+$/, ''));
              }}
            />
          </Field>
          <Field
            id="cp-code"
            label={t('common.code')}
            required
            hint={editing ? t('attr.codeLocked') : t('camp.codeHint')}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="cp-code"
              className="font-mono"
              disabled={editing}
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toLowerCase());
              }}
            />
          </Field>
          <Field id="cp-desc" label={t('cat.descriptionField')} hint={t('camp.descHint')}>
            <Textarea
              id="cp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-budget">{t('camp.budget')}</Label>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger aria-label={t('gc.currency')} />
                <SelectContent>
                  {[...new Set([...currencies, currency])].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MoneyInput
                id="cp-budget"
                currency={currency}
                placeholder={t('common.optional')}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-invalid={touched && !!errors.budget}
              />
            </div>
            {touched && errors.budget ? (
              <p className="text-small text-danger-fg">{errors.budget}</p>
            ) : (
              <p className="text-small text-fg-muted">{t('camp.budgetHint')}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
