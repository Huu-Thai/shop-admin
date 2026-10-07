'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
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
import { RadioCard, RadioGroup } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { flatten } from '../categories/tree';
import { LocaleSwitcher, type ShopLocale } from '../locale-switcher';
import { labelOf, pickLocalized, slugify, stableJson } from '../shared';
import { createProduct, updateProduct } from './actions';
import { AttributeField } from './attribute-field';
import type { AttrDef, FormValue } from './attribute-values';
import {
  draftFromProduct,
  emptyTranslation,
  globalDefs,
  newDraft,
  type ProductDraft,
  toCreatePayload,
  toUpdatePayload,
  validateDraft,
} from './product-draft';
import {
  isShippable,
  PRODUCT_TYPES,
  TYPE_ICON,
  typeKey,
  VISIBILITIES,
  visibilityKey,
} from './product-meta';
import { BundleOptionsFields, GiftCardFields } from './type-options';

type Attribute = Schemas['AttributeDto'];

export interface ProductFormContext {
  sets: Schemas['AttributeSetDto'][];
  attributes: Attribute[];
  locales: ShopLocale[];
  websites: Schemas['WebsiteDto'][];
  taxClasses: Schemas['TaxClassDto'][];
  tree: Schemas['CategoryNodeDto'][];
  currencies: string[];
  defaultCurrency: string;
}

/** The set's attributes in order, with their groups. */
function setMembers(ctx: ProductFormContext, setId: string) {
  const set = ctx.sets.find((s) => s.id === setId);
  const byCode = new Map(ctx.attributes.map((a) => [a.code, a]));
  return [...(set?.attributes ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .flatMap((m) => {
      const a = byCode.get(m.code);
      return a
        ? [{ attribute: a, group: m.groupName && m.groupName !== 'General' ? m.groupName : '' }]
        : [];
    });
}

const toDef = (a: Attribute): AttrDef => ({
  code: a.code,
  type: a.type,
  isRequired: a.isRequired,
  isLocalizable: a.isLocalizable,
  options: a.options,
});

export function ProductForm({
  product,
  initialType = 'SIMPLE',
  ctx,
  canWrite,
}: {
  product: Schemas['ProductDto'] | null;
  initialType?: string;
  ctx: ProductFormContext;
  canWrite: boolean;
}) {
  const { t, locale: adminLocale } = useI18n();
  const router = useRouter();
  const creating = !product;
  const defaultLocale = ctx.locales[0]?.code ?? 'en-US';
  const defaultSet = ctx.sets.find((s) => s.code === 'default') ?? ctx.sets[0];

  const [draft, setDraft] = useState<ProductDraft>(() => {
    if (product)
      return draftFromProduct(
        product,
        setMembers(ctx, product.attributeSetId).map((m) => toDef(m.attribute)),
        ctx.defaultCurrency,
      );
    const setId = defaultSet?.id ?? '';
    return newDraft({
      type: initialType,
      attributeSetId: setId,
      websiteIds: ctx.websites.map((w) => w.id),
      defs: setMembers(ctx, setId).map((m) => toDef(m.attribute)),
    });
  });
  const [initial] = useState(draft);
  const [locale, setLocale] = useState(defaultLocale);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState<Record<string, boolean>>(
    Object.fromEntries((product?.translations ?? []).map((tr) => [tr.localeCode, true])),
  );

  const members = useMemo(() => setMembers(ctx, draft.attributeSetId), [ctx, draft.attributeSetId]);
  const defs = useMemo(() => members.map((m) => toDef(m.attribute)), [members]);
  const errors = useMemo(
    () => validateDraft(draft, { defs, defaultLocale, creating, currency: ctx.defaultCurrency }),
    [draft, defs, defaultLocale, creating, ctx.defaultCurrency],
  );
  const err = (k: string) => (touched && errors[k] ? t(errors[k] as MessageKey) : undefined);
  const dirty = creating || stableJson(draft) !== stableJson(initial);

  const tr = draft.translations[locale] ?? emptyTranslation(defs);
  const patch = (p: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchTr = (p: Partial<typeof tr>) =>
    setDraft((d) => ({
      ...d,
      translations: {
        ...d.translations,
        [locale]: { ...(d.translations[locale] ?? emptyTranslation(defs)), ...p },
      },
    }));
  const missing = ctx.locales.map((l) => l.code).filter((c) => !draft.translations[c]?.name.trim());

  const axisCandidates = defs.filter((d) => d.type === 'SELECT' && !d.isLocalizable);
  const globalMembers = members.filter(
    (m) => !m.attribute.isLocalizable && !draft.configurableAttributes.includes(m.attribute.code),
  );
  const localMembers = members.filter((m) => m.attribute.isLocalizable);
  const groups = [...new Set(globalMembers.map((m) => m.group))];
  const shippable = isShippable(draft.type, { cardType: draft.giftCard.cardType });

  const categoryOptions = useMemo(
    () =>
      flatten(ctx.tree).map((f) => ({
        value: f.id,
        label: `${'— '.repeat(f.depth)}${pickLocalized(f.node.translations, adminLocale)?.name ?? '—'}`,
      })),
    [ctx.tree, adminLocale],
  );

  const save = async () => {
    setTouched(true);
    const keys = Object.keys(errors);
    if (keys.length) {
      // Jump to the language that has a problem, then let the field show it.
      const trKey = keys.find((k) => k.startsWith('tr.') || k.startsWith('slug.'));
      if (errors.name) setLocale(defaultLocale);
      else if (trKey) setLocale(trKey.split('.')[1]);
      toast.error(t('prod.fixErrors', { n: keys.length }));
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        const created = await runAction(
          createProduct(toCreatePayload(draft, defs, ctx.defaultCurrency)),
          {
            success: t('prod.created'),
          },
        );
        if (created)
          router.replace(
            `/products/${created.id}?tab=${draft.type === 'CONFIGURABLE' ? 'variants' : draft.type === 'BUNDLE' ? 'bundle' : 'images'}`,
          );
      } else {
        const saved = await runAction(
          updateProduct(product.id, toUpdatePayload(draft, product, defs, ctx.defaultCurrency)),
          {
            success: t('common.saved'),
          },
        );
        if (saved) router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const setAttr = (code: string, v: FormValue) =>
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [code]: v } }));
  const setLocalAttr = (code: string, v: FormValue) =>
    patchTr({ attributes: { ...tr.attributes, [code]: v } });

  return (
    <div className="grid gap-6">
      {creating && (
        <Card>
          <CardHeader title={t('prod.chooseType')} description={t('prod.chooseTypeHint')} />
          <CardBody className="pt-4">
            <RadioGroup
              value={draft.type}
              onValueChange={(type) => patch({ type, configurableAttributes: [] })}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
              aria-label={t('common.type')}
            >
              {PRODUCT_TYPES.map((ty) => (
                <RadioCard
                  key={ty}
                  value={ty}
                  icon={TYPE_ICON[ty]}
                  title={t(typeKey(ty))}
                  description={t(`prod.type.${ty}.hint` as MessageKey)}
                  className="xl:flex-col"
                />
              ))}
            </RadioGroup>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-fg-muted">{t('prod.editingLanguage')}</p>
        <LocaleSwitcher
          locales={ctx.locales}
          value={locale}
          onChange={setLocale}
          missing={missing}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader title={t('prod.basics')} />
            <CardBody className="grid gap-5 pt-4">
              <Field
                id="p-name"
                label={`${t('common.name')} · ${locale}`}
                required={locale === defaultLocale}
                error={locale === defaultLocale ? err('name') : undefined}
              >
                <Input
                  id="p-name"
                  value={tr.name}
                  disabled={!canWrite}
                  autoFocus={creating}
                  onChange={(e) =>
                    patchTr(
                      slugEdited[locale]
                        ? { name: e.target.value }
                        : { name: e.target.value, slug: slugify(e.target.value) },
                    )
                  }
                  aria-invalid={!!(locale === defaultLocale && err('name')) || undefined}
                />
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="p-sku" label="SKU" required hint={t('prod.skuHint')} error={err('sku')}>
                  <Input
                    id="p-sku"
                    value={draft.sku}
                    disabled={!canWrite}
                    className="font-mono"
                    onChange={(e) => patch({ sku: e.target.value })}
                    aria-invalid={!!err('sku') || undefined}
                  />
                </Field>
                <Field
                  id="p-slug"
                  label={t('cat.slug')}
                  hint={t('prod.slugHint')}
                  error={err(`slug.${locale}`)}
                >
                  <Input
                    id="p-slug"
                    value={tr.slug}
                    disabled={!canWrite}
                    className="font-mono"
                    placeholder={slugify(tr.name)}
                    onChange={(e) => {
                      setSlugEdited((s) => ({ ...s, [locale]: true }));
                      patchTr({ slug: e.target.value.toLowerCase() });
                    }}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="p-set">{t('prod.attributeSet')}</Label>
                  <Select
                    value={draft.attributeSetId}
                    disabled={!canWrite || !creating}
                    onValueChange={(attributeSetId) => {
                      const next = setMembers(ctx, attributeSetId).map((m) => toDef(m.attribute));
                      patch({
                        attributeSetId,
                        configurableAttributes: [],
                        attributes: Object.fromEntries(
                          globalDefs(next, []).map((d) => [
                            d.code,
                            draft.attributes[d.code] ??
                              (d.type === 'MULTISELECT' ? [] : d.type === 'BOOLEAN' ? null : ''),
                          ]),
                        ),
                      });
                    }}
                  >
                    <SelectTrigger id="p-set" />
                    <SelectContent>
                      {ctx.sets.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!creating && <p className="text-small text-fg-muted">{t('prod.setLocked')}</p>}
                </div>
                {draft.type === 'CONFIGURABLE' && (
                  <div className="grid content-start gap-1.5">
                    <Label htmlFor="p-axes">
                      {t('prod.axes')}
                      <span aria-hidden className="ml-0.5 text-danger">
                        *
                      </span>
                    </Label>
                    <Combobox
                      id="p-axes"
                      multiple
                      value={draft.configurableAttributes}
                      disabled={!canWrite || !creating}
                      invalid={!!err('axes')}
                      onChange={(configurableAttributes) =>
                        patch({ configurableAttributes: configurableAttributes.slice(0, 5) })
                      }
                      options={axisCandidates.map((d) => {
                        const a = ctx.attributes.find((x) => x.code === d.code)!;
                        return {
                          value: d.code,
                          label: labelOf(a.labels, adminLocale, d.code),
                          hint: t('prod.axisOptions', { n: d.options.length }),
                        };
                      })}
                      placeholder={t('prod.axesPlaceholder')}
                      emptyText={t('prod.noAxes')}
                    />
                    <p
                      className={
                        err('axes') ? 'text-small text-danger-fg' : 'text-small text-fg-muted'
                      }
                    >
                      {err('axes') ?? (creating ? t('prod.axesHint') : t('prod.axesLocked'))}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('prod.content')} description={t('prod.contentHint', { locale })} />
            <CardBody className="grid gap-5 pt-4">
              <Field
                id="p-short"
                label={t('prod.shortDescription')}
                hint={t('prod.shortDescriptionHint')}
              >
                <Textarea
                  id="p-short"
                  rows={2}
                  value={tr.shortDescription}
                  disabled={!canWrite}
                  onChange={(e) => patchTr({ shortDescription: e.target.value })}
                />
              </Field>
              <Field id="p-desc" label={t('cat.descriptionField')}>
                <Textarea
                  id="p-desc"
                  rows={8}
                  value={tr.description}
                  disabled={!canWrite}
                  onChange={(e) => patchTr({ description: e.target.value })}
                />
              </Field>
              {localMembers.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {localMembers.map((m) => (
                    <AttributeField
                      key={m.attribute.code}
                      idPrefix={`tr-${locale}`}
                      attribute={m.attribute}
                      value={tr.attributes[m.attribute.code] ?? null}
                      onChange={(v) => setLocalAttr(m.attribute.code, v)}
                      error={touched ? errors[`tr.${locale}.${m.attribute.code}`] : undefined}
                      disabled={!canWrite}
                    />
                  ))}
                </div>
              )}
              <details className="rounded-md border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-body font-medium text-fg">
                  {t('seo.title')}
                  <span className="text-small font-normal text-fg-muted">{t('seo.hint')}</span>
                </summary>
                <div className="grid gap-4 border-t border-border p-4">
                  <div className="rounded-md bg-surface-muted p-3">
                    <p className="truncate text-body-lg text-info-fg">
                      {tr.metaTitle || tr.name || t('prod.untitled')}
                    </p>
                    <p className="truncate font-mono text-caption text-success-fg">
                      /{tr.slug || slugify(tr.name)}
                    </p>
                    <p className="line-clamp-2 text-small text-fg-muted">
                      {tr.metaDescription || tr.shortDescription}
                    </p>
                  </div>
                  <Field
                    id="p-meta-title"
                    label={t('seo.metaTitle')}
                    hint={`${tr.metaTitle.length}/60`}
                  >
                    <Input
                      id="p-meta-title"
                      value={tr.metaTitle}
                      disabled={!canWrite}
                      placeholder={tr.name}
                      onChange={(e) => patchTr({ metaTitle: e.target.value })}
                    />
                  </Field>
                  <Field
                    id="p-meta-desc"
                    label={t('seo.metaDescription')}
                    hint={`${tr.metaDescription.length}/160`}
                  >
                    <Textarea
                      id="p-meta-desc"
                      rows={3}
                      value={tr.metaDescription}
                      disabled={!canWrite}
                      onChange={(e) => patchTr({ metaDescription: e.target.value })}
                    />
                  </Field>
                </div>
              </details>
            </CardBody>
          </Card>

          {globalMembers.length > 0 && (
            <Card>
              <CardHeader title={t('attr.title')} description={t('prod.attributesHint')} />
              <CardBody className="grid gap-6 pt-4">
                {groups.map((g) => (
                  <fieldset key={g || '_'} className="grid gap-4">
                    {groups.length > 1 && (
                      <legend className="mb-1 text-overline font-semibold tracking-[0.08em] text-fg-subtle uppercase">
                        {g || t('sets.general')}
                      </legend>
                    )}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {globalMembers
                        .filter((m) => m.group === g)
                        .map((m) => (
                          <AttributeField
                            key={m.attribute.code}
                            attribute={m.attribute}
                            value={draft.attributes[m.attribute.code] ?? null}
                            onChange={(v) => setAttr(m.attribute.code, v)}
                            error={touched ? errors[`attr.${m.attribute.code}`] : undefined}
                            disabled={!canWrite}
                          />
                        ))}
                    </div>
                  </fieldset>
                ))}
              </CardBody>
            </Card>
          )}

          {draft.type === 'BUNDLE' && (
            <Card>
              <CardHeader title={t('bundle.settings')} />
              <CardBody className="pt-4">
                <BundleOptionsFields
                  value={draft.bundle}
                  onChange={(bundle) => patch({ bundle })}
                  disabled={!canWrite}
                />
              </CardBody>
            </Card>
          )}
          {draft.type === 'GIFT_CARD' && (
            <Card>
              <CardHeader title={t('gc.settings')} />
              <CardBody className="pt-4">
                <GiftCardFields
                  value={draft.giftCard}
                  onChange={(giftCard) => patch({ giftCard })}
                  currencies={ctx.currencies}
                  defaultCurrency={ctx.defaultCurrency}
                  errors={touched ? errors : {}}
                  disabled={!canWrite}
                />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="grid gap-6 xl:sticky xl:top-[calc(var(--header-height)+24px)]">
          <Card>
            <CardHeader title={t('common.status')} />
            <CardBody className="grid gap-5 pt-4">
              <label className="flex items-center justify-between gap-4">
                <span className="grid gap-0.5">
                  <span className="text-body font-medium text-fg">{t('prod.enabled')}</span>
                  <span className="text-small text-fg-muted">{t('prod.enabledHint')}</span>
                </span>
                <Switch
                  checked={draft.status === 'ENABLED'}
                  disabled={!canWrite}
                  onCheckedChange={(v) => patch({ status: v ? 'ENABLED' : 'DISABLED' })}
                />
              </label>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="p-vis">{t('prod.visibility')}</Label>
                <Select
                  value={draft.visibility}
                  disabled={!canWrite}
                  onValueChange={(visibility) => patch({ visibility })}
                >
                  <SelectTrigger id="p-vis" />
                  <SelectContent>
                    {VISIBILITIES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(visibilityKey(v))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('prod.organisation')} />
            <CardBody className="grid gap-5 pt-4">
              {ctx.websites.length > 0 && (
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-small font-medium text-fg">
                    {t('common.websites')}
                  </legend>
                  {ctx.websites.map((w) => (
                    <label key={w.id} className="flex items-center gap-2.5 text-body text-fg">
                      <Checkbox
                        checked={draft.websiteIds.includes(w.id)}
                        disabled={!canWrite}
                        onCheckedChange={(v) =>
                          patch({
                            websiteIds: v
                              ? [...draft.websiteIds, w.id]
                              : draft.websiteIds.filter((x) => x !== w.id),
                          })
                        }
                      />
                      {w.name}
                    </label>
                  ))}
                  {draft.websiteIds.length === 0 && (
                    <p className="text-small text-warning-fg">{t('prod.noWebsites')}</p>
                  )}
                </fieldset>
              )}
              <div className="grid content-start gap-1.5">
                <Label htmlFor="p-cats">{t('nav.categories')}</Label>
                <Combobox
                  id="p-cats"
                  multiple
                  value={draft.categoryIds}
                  disabled={!canWrite}
                  onChange={(categoryIds) => patch({ categoryIds })}
                  options={categoryOptions}
                  placeholder={t('prod.chooseCategories')}
                  searchPlaceholder={t('cat.search')}
                  emptyText={t('common.noResults')}
                  labels={Object.fromEntries(
                    categoryOptions.map((o) => [o.value, o.label.replace(/^(— )+/, '')]),
                  )}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('prod.shippingTax')} />
            <CardBody className="grid gap-5 pt-4">
              {shippable ? (
                <Field id="p-weight" label={t('prod.weight')} error={err('weight')}>
                  <div className="relative">
                    <Input
                      id="p-weight"
                      inputMode="numeric"
                      value={draft.weight}
                      disabled={!canWrite}
                      onChange={(e) => patch({ weight: e.target.value })}
                      className="tabular pr-10"
                      aria-invalid={!!err('weight') || undefined}
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-small text-fg-muted">
                      g
                    </span>
                  </div>
                </Field>
              ) : (
                <p className="text-small text-fg-muted">{t('prod.noShipping')}</p>
              )}
              <div className="grid content-start gap-1.5">
                <Label htmlFor="p-tax">{t('prod.taxClass')}</Label>
                <Select
                  value={draft.taxClassId ?? '__standard'}
                  disabled={!canWrite}
                  onValueChange={(v) => patch({ taxClassId: v === '__standard' ? null : v })}
                >
                  <SelectTrigger id="p-tax" />
                  <SelectContent>
                    <SelectItem value="__standard">{t('prod.taxStandard')}</SelectItem>
                    {ctx.taxClasses
                      .filter((c) => c.type === 'PRODUCT' && c.code !== 'standard')
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => (creating ? router.push('/products') : setDraft(initial))}
          message={creating ? t('prod.newUnsaved') : t('common.unsaved')}
          saveLabel={creating ? t('prod.create') : t('common.save')}
          discardLabel={creating ? t('common.cancel') : t('common.discard')}
        />
      )}
    </div>
  );
}
