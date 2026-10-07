'use client';

import { Boxes, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../locale-switcher';
import { CODE_PATTERN, codify, pickLocalized, stableJson } from '../shared';
import { describeOptions, useOptionLabels } from './option-labels';
import { setBundleOptions } from './actions';
import { typeKey } from './product-meta';
import { getProduct, productSearch } from './product-search';

const INPUT_TYPES = ['RADIO', 'SELECT', 'CHECKBOX', 'MULTI'] as const;
const SINGLE = ['RADIO', 'SELECT'];

interface SelDraft {
  key: number;
  variantId: string;
  label: string;
  qty: string;
  canChangeQty: boolean;
  isDefault: boolean;
}
interface OptDraft {
  key: number;
  code: string;
  inputType: string;
  isRequired: boolean;
  titles: Record<string, string>;
  selections: SelDraft[];
}

let seq = 0;
const fromApi = (options: Schemas['BundleOptionDto'][]): OptDraft[] =>
  [...options]
    .sort((a, b) => a.position - b.position)
    .map((o) => ({
      key: ++seq,
      code: o.code,
      inputType: o.inputType,
      isRequired: o.isRequired,
      titles: Object.fromEntries(o.titles.map((x) => [x.localeCode, x.title])),
      selections: [...o.selections]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          key: ++seq,
          variantId: s.variantId,
          label: s.variantSku,
          qty: String(s.qty),
          canChangeQty: s.canChangeQty,
          isDefault: s.isDefault,
        })),
    }));

const comparable = (opts: OptDraft[]) =>
  opts.map((o) => ({
    code: o.code,
    inputType: o.inputType,
    isRequired: o.isRequired,
    titles: o.titles,
    selections: o.selections.map((s) => [s.variantId, s.qty, s.canChangeQty, s.isDefault]),
  }));

export function BundlePanel({
  product,
  locales,
  nameLocale,
  canWrite,
}: {
  product: Schemas['ProductDto'];
  locales: ShopLocale[];
  nameLocale?: string;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const defaultLocale = locales[0]?.code ?? 'en-US';
  const [initial, setInitial] = useState(() => fromApi(product.bundleOptions));
  const [options, setOptions] = useState<OptDraft[]>(initial);
  const [locale, setLocale] = useState(defaultLocale);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = stableJson(comparable(options)) !== stableJson(comparable(initial));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const codes = new Set<string>();
    options.forEach((o, i) => {
      if (!CODE_PATTERN.test(o.code)) e[`${i}.code`] = 'attr.err.code';
      else if (codes.has(o.code)) e[`${i}.code`] = 'attr.err.duplicate';
      codes.add(o.code);
      if (!o.titles[defaultLocale]?.trim()) e[`${i}.title`] = 'bundle.err.title';
      if (!o.selections.length) e[`${i}.selections`] = 'bundle.err.selections';
      if (SINGLE.includes(o.inputType) && o.selections.filter((s) => s.isDefault).length > 1)
        e[`${i}.selections`] = 'bundle.err.oneDefault';
      o.selections.forEach((s, j) => {
        if (!/^\d+$/.test(s.qty) || Number(s.qty) < 1) e[`${i}.${j}.qty`] = 'bundle.err.qty';
      });
    });
    return e;
  }, [options, defaultLocale]);
  const err = (k: string) => (touched && errors[k] ? t(errors[k] as MessageKey) : undefined);

  const patch = (i: number, p: Partial<OptDraft>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...p } : o)));
  const patchSel = (i: number, j: number, p: Partial<SelDraft>) =>
    setOptions((os) =>
      os.map((o, k) =>
        k === i
          ? { ...o, selections: o.selections.map((s, l) => (l === j ? { ...s, ...p } : s)) }
          : o,
      ),
    );

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) {
      toast.error(t('prod.fixErrors', { n: Object.keys(errors).length }));
      return;
    }
    setSaving(true);
    const ok = await runAction(
      setBundleOptions(
        product.id,
        options.map((o, position) => ({
          code: o.code,
          inputType: o.inputType as Schemas['BundleInputType'],
          isRequired: o.isRequired,
          position,
          titles: Object.entries(o.titles)
            .filter(([, v]) => v.trim())
            .map(([localeCode, title]) => ({ localeCode, title: title.trim() })),
          selections: o.selections.map((s, p) => ({
            variantId: s.variantId,
            qty: Number(s.qty),
            canChangeQty: s.canChangeQty,
            isDefault: s.isDefault,
            position: p,
          })),
        })),
      ),
      { success: t('common.saved') },
    );
    setSaving(false);
    if (ok) {
      setInitial(options);
      router.refresh();
    }
  };

  return (
    <>
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3 text-fg">{t('bundle.options')}</h2>
            <p className="text-small text-fg-muted">{t('bundle.optionsHint')}</p>
          </div>
          <LocaleSwitcher locales={locales} value={locale} onChange={setLocale} />
        </div>
        {options.map((o, i) => (
          <Card key={o.key}>
            <CardHeader
              title={o.titles[locale] || o.titles[defaultLocale] || t('bundle.untitled')}
              description={t(`bundle.input.${o.inputType}` as MessageKey)}
              actions={
                canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-fg"
                    onClick={() => setOptions((os) => os.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                    {t('common.remove')}
                  </Button>
                )
              }
            />
            <CardBody className="grid gap-5 pt-4">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field
                  id={`b-${o.key}-title`}
                  label={`${t('bundle.optionTitle')} · ${locale}`}
                  required={locale === defaultLocale}
                  error={locale === defaultLocale ? err(`${i}.title`) : undefined}
                >
                  <Input
                    id={`b-${o.key}-title`}
                    value={o.titles[locale] ?? ''}
                    disabled={!canWrite}
                    onChange={(e) => {
                      const titles = { ...o.titles, [locale]: e.target.value };
                      patch(
                        i,
                        locale === defaultLocale &&
                          (!o.code || o.code === codify(o.titles[locale] ?? ''))
                          ? { titles, code: codify(e.target.value) }
                          : { titles },
                      );
                    }}
                  />
                </Field>
                <Field
                  id={`b-${o.key}-code`}
                  label={t('common.code')}
                  required
                  error={err(`${i}.code`)}
                >
                  <Input
                    id={`b-${o.key}-code`}
                    value={o.code}
                    disabled={!canWrite}
                    className="font-mono"
                    onChange={(e) => patch(i, { code: e.target.value.toLowerCase() })}
                  />
                </Field>
                <div className="grid gap-1.5">
                  <Label htmlFor={`b-${o.key}-type`}>{t('bundle.inputType')}</Label>
                  <Select
                    value={o.inputType}
                    disabled={!canWrite}
                    onValueChange={(inputType) => patch(i, { inputType })}
                  >
                    <SelectTrigger id={`b-${o.key}-type`} />
                    <SelectContent>
                      {INPUT_TYPES.map((ty) => (
                        <SelectItem key={ty} value={ty}>
                          {t(`bundle.input.${ty}` as MessageKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-body text-fg">
                <Switch
                  checked={o.isRequired}
                  disabled={!canWrite}
                  onCheckedChange={(isRequired) => patch(i, { isRequired })}
                />
                {t('bundle.required')}
              </label>

              <div className="grid gap-2">
                <p className="text-small font-medium text-fg">{t('bundle.selections')}</p>
                {o.selections.length > 0 && (
                  <ul className="grid gap-2">
                    {o.selections.map((s, j) => (
                      <li
                        key={s.key}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <span className="truncate font-mono text-small text-fg">{s.label}</span>
                        <label className="flex items-center gap-1.5 text-small text-fg-muted">
                          {t('bundle.qty')}
                          <Input
                            aria-label={`${t('bundle.qty')} · ${s.label}`}
                            inputMode="numeric"
                            value={s.qty}
                            disabled={!canWrite}
                            onChange={(e) => patchSel(i, j, { qty: e.target.value })}
                            aria-invalid={!!err(`${i}.${j}.qty`) || undefined}
                            className="tabular h-8 w-16"
                          />
                        </label>
                        <label
                          className="flex items-center gap-1.5 text-small text-fg-muted"
                          title={t('bundle.canChangeQtyHint')}
                        >
                          <Checkbox
                            checked={s.canChangeQty}
                            disabled={!canWrite}
                            onCheckedChange={(v) => patchSel(i, j, { canChangeQty: v === true })}
                          />
                          {t('bundle.canChangeQty')}
                        </label>
                        <label className="flex items-center gap-1.5 text-small text-fg-muted">
                          <Checkbox
                            checked={s.isDefault}
                            disabled={!canWrite}
                            onCheckedChange={(v) =>
                              setOptions((os) =>
                                os.map((x, k) =>
                                  k !== i
                                    ? x
                                    : {
                                        ...x,
                                        selections: x.selections.map((y, l) =>
                                          l === j
                                            ? { ...y, isDefault: v === true }
                                            : SINGLE.includes(x.inputType) && v === true
                                              ? { ...y, isDefault: false }
                                              : y,
                                        ),
                                      },
                                ),
                              )
                            }
                          />
                          {t('bundle.default')}
                        </label>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('common.remove')}
                          disabled={!canWrite}
                          onClick={() =>
                            patch(i, { selections: o.selections.filter((_, l) => l !== j) })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {err(`${i}.selections`) && (
                  <p role="alert" className="text-small text-danger-fg">
                    {err(`${i}.selections`)}
                  </p>
                )}
                {canWrite && (
                  <SelectionAdder
                    bundleId={product.id}
                    nameLocale={nameLocale}
                    taken={o.selections.map((s) => s.variantId)}
                    onAdd={(added) =>
                      patch(i, {
                        selections: [
                          ...o.selections,
                          ...added.map((a) => ({
                            key: ++seq,
                            variantId: a.variantId,
                            label: a.label,
                            qty: '1',
                            canChangeQty: false,
                            isDefault: false,
                          })),
                        ],
                      })
                    }
                  />
                )}
              </div>
            </CardBody>
          </Card>
        ))}
        {options.length === 0 && (
          <Card>
            <EmptyState
              icon={<Boxes />}
              title={t('bundle.empty')}
              description={t('bundle.emptyBody')}
            />
          </Card>
        )}
        {canWrite && (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() =>
              setOptions((os) => [
                ...os,
                {
                  key: ++seq,
                  code: '',
                  inputType: 'RADIO',
                  isRequired: true,
                  titles: {},
                  selections: [],
                },
              ])
            }
          >
            <Plus />
            {t('bundle.addOption')}
          </Button>
        )}
      </div>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          message={t('common.unsaved')}
          saveLabel={t('common.save')}
          discardLabel={t('common.discard')}
          onDiscard={() => setOptions(initial)}
          onSave={save}
        />
      )}
    </>
  );
}

/** Search a product; simple/virtual add their only variant, configurable ones let you tick variants. */
function SelectionAdder({
  bundleId,
  nameLocale,
  taken,
  onAdd,
}: {
  bundleId: string;
  nameLocale?: string;
  taken: string[];
  onAdd: (items: { variantId: string; label: string }[]) => void;
}) {
  const { t, locale } = useI18n();
  const labels = useOptionLabels(locale);
  const [picked, setPicked] = useState<Schemas['ProductDto'] | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const load = useMemo(
    () =>
      productSearch({
        nameLocale,
        exclude: [bundleId],
        types: ['SIMPLE', 'VIRTUAL', 'CONFIGURABLE'],
        typeLabel: (ty) => t(typeKey(ty)),
      }),
    [bundleId, nameLocale, t],
  );
  const label = (p: Schemas['ProductDto'], sku: string) =>
    `${sku} · ${pickLocalized(p.translations, nameLocale ?? '')?.name ?? p.sku}`;

  return (
    <div className="grid gap-2 rounded-md border border-dashed border-border p-3">
      <Combobox
        value={[]}
        onChange={async ([id]) => {
          if (!id) return;
          const p = await getProduct(id);
          if (p.type !== 'CONFIGURABLE') {
            const v = p.variants[0];
            if (v && !taken.includes(v.id)) onAdd([{ variantId: v.id, label: label(p, v.sku) }]);
            return;
          }
          setPicked(p);
          setChecked([]);
        }}
        load={load}
        placeholder={t('bundle.addProduct')}
        searchPlaceholder={t('prod.search')}
        emptyText={t('common.noResults')}
      />
      {picked && (
        <div className="grid gap-2">
          <p className="text-small text-fg-muted">{t('bundle.pickVariants')}</p>
          <ul className="grid max-h-56 gap-1 overflow-y-auto">
            {picked.variants.map((v) => (
              <li key={v.id}>
                <label className="flex items-center gap-2.5 rounded-sm px-2 py-1 text-small hover:bg-surface-muted">
                  <Checkbox
                    checked={checked.includes(v.id) || taken.includes(v.id)}
                    disabled={taken.includes(v.id)}
                    onCheckedChange={(c) =>
                      setChecked((x) => (c ? [...x, v.id] : x.filter((y) => y !== v.id)))
                    }
                  />
                  <span className="font-mono">{v.sku}</span>
                  <span className="text-fg-muted">{describeOptions(v.optionValues, labels)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!checked.length}
              onClick={() => {
                onAdd(
                  picked.variants
                    .filter((v) => checked.includes(v.id))
                    .map((v) => ({ variantId: v.id, label: label(picked, v.sku) })),
                );
                setPicked(null);
              }}
            >
              {t('bundle.addN', { n: checked.length })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
