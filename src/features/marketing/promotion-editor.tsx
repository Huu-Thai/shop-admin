'use client';

import { FlaskConical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
} from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher } from '../catalog/locale-switcher';
import { PublishPanel } from '../publishing/publishing';
import { createPromotion, deletePromotion, publishPromotion, updatePromotion } from './actions';
import { CouponsPanel } from './coupons-panel';
import { type RuleContext, RuleList } from './rule-builder';
import { type Action, type Condition, fromRule, type RuleForm, toRules } from './rules';

type Promotion = Schemas['PromotionDto'];
const NO_CAMPAIGN = '__none';

export interface PromotionEditorContext extends Omit<RuleContext, 'currencies'> {
  websites: Schemas['WebsiteDto'][];
  stores: Schemas['StoreDto'][];
  locales: { code: string; name: string }[];
  campaigns: Schemas['CampaignDto'][];
}

interface Draft {
  name: string;
  description: string;
  campaignId: string;
  websiteIds: string[];
  priority: string;
  stopFurther: boolean;
  requiresCoupon: boolean;
  usageLimit: string;
  usesPerCustomer: string;
  labels: Record<string, string>;
  conditions: RuleForm[];
  actions: RuleForm[];
}

function draftOf(p: Promotion | null, ctx: PromotionEditorContext, campaignId?: string): Draft {
  return {
    name: p?.name ?? '',
    description: p?.description ?? '',
    campaignId: p ? (p.campaignId ?? NO_CAMPAIGN) : (campaignId ?? NO_CAMPAIGN),
    websiteIds: p?.websiteIds ?? (ctx.websites.length === 1 ? [ctx.websites[0].id] : []),
    priority: String(p?.priority ?? 0),
    stopFurther: p?.stopFurther ?? false,
    requiresCoupon: p?.requiresCoupon ?? false,
    usageLimit: p?.usageLimit != null ? String(p.usageLimit) : '',
    usesPerCustomer: p?.usesPerCustomer != null ? String(p.usesPerCustomer) : '',
    labels: Object.fromEntries((p?.labels ?? []).map((l) => [l.localeCode, l.label])),
    conditions: (p?.conditions ?? []).map(fromRule),
    actions: (p?.actions ?? []).map(fromRule),
  };
}

const optionalInt = (v: string) =>
  v.trim() ? (/^\d{1,9}$/.test(v) && Number(v) >= 1 ? Number(v) : NaN) : null;

/** Create and edit a promotion: scope, rules (conditions → actions), coupons, limits, labels. */
export function PromotionEditor({
  promotion: p,
  ctx,
  campaignId,
  canWrite,
}: {
  promotion: Promotion | null;
  ctx: PromotionEditorContext;
  campaignId?: string;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const initial = useMemo(() => draftOf(p, ctx, campaignId), [p, ctx, campaignId]);
  const [draft, setDraft] = useState(initial);
  const [base, setBase] = useState(initial);
  if (base !== initial) {
    setBase(initial);
    setDraft(initial);
  }
  const [labelLocale, setLabelLocale] = useState(ctx.locales[0]?.code ?? 'en-US');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  // Amount rules need the currencies the chosen websites sell in.
  const currencies = useMemo(() => {
    const stores = ctx.stores.filter(
      (s) => !draft.websiteIds.length || draft.websiteIds.includes(s.websiteId),
    );
    return [...new Set(stores.flatMap((s) => [s.defaultCurrencyCode, ...s.currencyCodes]))];
  }, [ctx.stores, draft.websiteIds]);
  const ruleCtx: RuleContext = { ...ctx, currencies };
  const conds = toRules<Condition>(draft.conditions, currencies);
  const acts = toRules<Action>(draft.actions, currencies);
  const usageLimit = optionalInt(draft.usageLimit);
  const usesPerCustomer = optionalInt(draft.usesPerCustomer);
  const errors = {
    name: !draft.name.trim() ? t('promo.err.name') : undefined,
    websites: !draft.websiteIds.length ? t('promo.err.websites') : undefined,
    priority:
      !/^-?\d{1,4}$/.test(draft.priority.trim()) || Math.abs(Number(draft.priority)) > 1000
        ? t('promo.err.priority')
        : undefined,
    actions: !draft.actions.length ? t('promo.err.noActions') : undefined,
    usageLimit: Number.isNaN(usageLimit) ? t('rule.err.quantity') : undefined,
    usesPerCustomer: Number.isNaN(usesPerCustomer) ? t('rule.err.quantity') : undefined,
  };
  const ruleErrors = Object.keys(conds.errors).length + Object.keys(acts.errors).length;

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || ruleErrors) {
      document
        .querySelector('[aria-invalid="true"], .text-danger-fg')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setSaving(true);
    const labels = Object.entries(draft.labels)
      .filter(([, v]) => v.trim())
      .map(([localeCode, label]) => ({ localeCode, label: label.trim() }));
    const common = {
      name: draft.name.trim(),
      campaignId: draft.campaignId === NO_CAMPAIGN ? null : draft.campaignId,
      websiteIds: draft.websiteIds,
      priority: Number(draft.priority),
      stopFurther: draft.stopFurther,
      requiresCoupon: draft.requiresCoupon,
      conditions: conds.rules,
      actions: acts.rules,
      labels,
    };
    const result = p
      ? await runAction(
          updatePromotion(p.id, {
            ...common,
            description: draft.description.trim() || null,
            usageLimit,
            usesPerCustomer,
          } as Schemas['UpdatePromotionDto']),
          { success: t('common.saved') },
        )
      : await runAction(
          createPromotion({
            ...common,
            ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
            ...(usageLimit ? { usageLimit } : {}),
            ...(usesPerCustomer ? { usesPerCustomer } : {}),
          } as Schemas['CreatePromotionDto']),
          { success: t('promo.created') },
        );
    setSaving(false);
    if (!result) return;
    setTouched(false);
    if (p) router.refresh();
    else router.push(`/promotions/${result.id}`);
  };

  const publish = async (unpublish: boolean, at?: string) => {
    if (!p) return false;
    const ok = await runAction(publishPromotion(p.id, at ? { at } : {}, unpublish), {
      success: unpublish
        ? at
          ? t('pub.endScheduled')
          : t('pub.unpublished')
        : at
          ? t('pub.startScheduled')
          : t('pub.published'),
    });
    if (ok) router.refresh();
    return !!ok;
  };

  const campaign = ctx.campaigns.find((c) => c.id === p?.campaignId);
  const title = p ? p.name : t('promo.new');

  return (
    <>
      <PageHeader
        title={title}
        description={p ? undefined : t('promo.newHint')}
        breadcrumbs={[
          { label: t('nav.customers') },
          { label: t('nav.promotions'), href: '/promotions' },
          ...(campaign
            ? [{ label: campaign.name, href: `/promotions/campaigns/${campaign.id}` }]
            : []),
          { label: title },
        ]}
        actions={
          p && (
            <Button asChild variant="secondary">
              <Link href={`/promotions/simulate?websiteId=${p.websiteIds[0] ?? ''}`}>
                <FlaskConical />
                {t('promo.test')}
              </Link>
            </Button>
          )
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader title={t('promo.general')} />
            <CardBody className="grid gap-5 pt-4">
              <Field
                id="pr-name"
                label={t('common.name')}
                required
                hint={t('promo.nameHint')}
                error={touched ? errors.name : undefined}
              >
                <Input
                  id="pr-name"
                  autoFocus={!p}
                  disabled={!canWrite}
                  value={draft.name}
                  placeholder={t('promo.namePlaceholder')}
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
              <Field id="pr-desc" label={t('cat.descriptionField')} hint={t('promo.descHint')}>
                <Textarea
                  id="pr-desc"
                  rows={2}
                  disabled={!canWrite}
                  value={draft.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="pr-campaign">{t('promo.campaign')}</Label>
                  <Select
                    value={draft.campaignId}
                    disabled={!canWrite}
                    onValueChange={(v) => set('campaignId', v)}
                  >
                    <SelectTrigger id="pr-campaign" />
                    <SelectContent>
                      <SelectItem value={NO_CAMPAIGN}>{t('promo.noCampaign')}</SelectItem>
                      {ctx.campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-small text-fg-muted">{t('promo.campaignHint')}</p>
                </div>
                <Field
                  id="pr-priority"
                  label={t('price.priority')}
                  hint={t('promo.priorityHint')}
                  error={touched ? errors.priority : undefined}
                >
                  <Input
                    id="pr-priority"
                    inputMode="numeric"
                    className="tabular"
                    disabled={!canWrite}
                    value={draft.priority}
                    onChange={(e) => set('priority', e.target.value.replace(/[^\d-]/g, ''))}
                  />
                </Field>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1.5 text-small font-medium text-fg">
                  {t('common.websites')} <span className="text-danger-fg">*</span>
                </legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {ctx.websites.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-body">
                      <Checkbox
                        disabled={!canWrite}
                        checked={draft.websiteIds.includes(w.id)}
                        onCheckedChange={(c) =>
                          set(
                            'websiteIds',
                            c === true
                              ? [...draft.websiteIds, w.id]
                              : draft.websiteIds.filter((x) => x !== w.id),
                          )
                        }
                      />
                      {w.name}
                    </label>
                  ))}
                </div>
                {touched && errors.websites && (
                  <p className="text-small text-danger-fg">{errors.websites}</p>
                )}
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('promo.conditions')} description={t('promo.conditionsHint')} />
            <CardBody className="pt-4">
              <RuleList
                kind="condition"
                rules={draft.conditions}
                onChange={(r) => set('conditions', r)}
                errors={touched ? conds.errors : {}}
                ctx={ruleCtx}
                disabled={!canWrite}
              />
              {!draft.conditions.length && (
                <p className="mt-3 text-small text-fg-muted">{t('promo.noConditions')}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('promo.actions')} description={t('promo.actionsHint')} />
            <CardBody className="grid gap-3 pt-4">
              <RuleList
                kind="action"
                rules={draft.actions}
                onChange={(r) => set('actions', r)}
                errors={touched ? acts.errors : {}}
                ctx={ruleCtx}
                disabled={!canWrite}
              />
              {touched && errors.actions && (
                <p className="text-small text-danger-fg">{errors.actions}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('promo.couponsLimits')} />
            <CardBody className="grid gap-5 pt-4">
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                <span>
                  <span className="block text-body font-medium">{t('promo.requiresCoupon')}</span>
                  <span className="block text-small text-fg-muted">
                    {t('promo.requiresCouponHint')}
                  </span>
                </span>
                <Switch
                  disabled={!canWrite}
                  checked={draft.requiresCoupon}
                  onCheckedChange={(v) => set('requiresCoupon', v)}
                />
              </label>
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                <span>
                  <span className="block text-body font-medium">{t('promo.stopFurther')}</span>
                  <span className="block text-small text-fg-muted">
                    {t('promo.stopFurtherHint')}
                  </span>
                </span>
                <Switch
                  disabled={!canWrite}
                  checked={draft.stopFurther}
                  onCheckedChange={(v) => set('stopFurther', v)}
                />
              </label>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  id="pr-usage"
                  label={t('promo.usageLimit')}
                  hint={t('promo.usageHint')}
                  error={touched ? errors.usageLimit : undefined}
                >
                  <Input
                    id="pr-usage"
                    inputMode="numeric"
                    className="tabular"
                    disabled={!canWrite}
                    placeholder={t('rule.noLimit')}
                    value={draft.usageLimit}
                    onChange={(e) => set('usageLimit', e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
                <Field
                  id="pr-per"
                  label={t('promo.perCustomer')}
                  hint={t('promo.perCustomerHint')}
                  error={touched ? errors.usesPerCustomer : undefined}
                >
                  <Input
                    id="pr-per"
                    inputMode="numeric"
                    className="tabular"
                    disabled={!canWrite}
                    placeholder={t('rule.noLimit')}
                    value={draft.usesPerCustomer}
                    onChange={(e) => set('usesPerCustomer', e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('promo.labels')} description={t('promo.labelsHint')} />
            <CardBody className="grid gap-4 pt-4">
              <LocaleSwitcher locales={ctx.locales} value={labelLocale} onChange={setLabelLocale} />
              <Field
                id="pr-label"
                label={`${t('promo.label')} · ${labelLocale}`}
                hint={t('promo.labelFallback')}
              >
                <Input
                  id="pr-label"
                  disabled={!canWrite}
                  value={draft.labels[labelLocale] ?? ''}
                  placeholder={draft.name || t('promo.namePlaceholder')}
                  onChange={(e) =>
                    set('labels', { ...draft.labels, [labelLocale]: e.target.value })
                  }
                />
              </Field>
            </CardBody>
          </Card>

          {p && draft.requiresCoupon && initial.requiresCoupon && (
            <CouponsPanel promotionId={p.id} canWrite={canWrite} />
          )}
        </div>

        <div className="grid gap-6">
          {p ? (
            <>
              <PublishPanel
                item={p}
                heldBack={p.visible && !p.active}
                heldBackHint={t('promo.heldBack')}
                canWrite={canWrite}
                onPublish={(at) => publish(false, at)}
                onUnpublish={(at) => publish(true, at)}
              />
              <Card>
                <CardHeader title={t('promo.usage')} />
                <CardBody className="pt-4">
                  <p className="tabular text-h1 font-semibold">
                    {p.timesUsed}
                    {p.usageLimit && (
                      <span className="text-body font-normal text-fg-muted"> / {p.usageLimit}</span>
                    )}
                  </p>
                  <p className="text-small text-fg-muted">{t('promo.usedHint')}</p>
                  <dl className="mt-4 grid gap-2 text-small">
                    <div className="flex justify-between gap-4">
                      <dt className="text-fg-muted">{t('common.created')}</dt>
                      <dd className="font-medium">{formatDate(p.createdAt, intl)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-fg-muted">{t('common.updated')}</dt>
                      <dd className="font-medium">{formatDate(p.updatedAt, intl, true)}</dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>
              {canWrite && (
                <Confirm
                  trigger={
                    <Button variant="ghost" className="justify-self-start text-danger-fg">
                      <Trash2 />
                      {t('promo.delete')}
                    </Button>
                  }
                  title={t('promo.deleteTitle')}
                  description={t('promo.deleteBody')}
                  confirmLabel={t('common.delete')}
                  cancelLabel={t('common.cancel')}
                  onConfirm={async () => {
                    const ok = await runAction(deletePromotion(p.id), {
                      success: t('promo.deleted'),
                    });
                    if (ok !== undefined) router.push('/promotions');
                    return ok !== undefined;
                  }}
                />
              )}
            </>
          ) : (
            <Card>
              <CardHeader title={t('promo.howTitle')} />
              <CardBody className="pt-4">
                <ol className="grid list-decimal gap-2 pl-5 text-small text-fg-muted">
                  <li>{t('promo.how1')}</li>
                  <li>{t('promo.how2')}</li>
                  <li>{t('promo.how3')}</li>
                  <li>{t('promo.how4')}</li>
                </ol>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => (p ? setDraft(initial) : router.push('/promotions'))}
          message={p ? t('common.unsaved') : t('promo.unsavedNew')}
          saveLabel={p ? t('common.save') : t('promo.create')}
          discardLabel={p ? t('common.discard') : t('common.cancel')}
        />
      )}
    </>
  );
}
