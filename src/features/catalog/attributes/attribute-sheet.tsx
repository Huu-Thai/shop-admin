'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../locale-switcher';
import { ATTRIBUTE_TYPES, type AttributeType, CODE_PATTERN, codify, hasOptions } from '../shared';
import { createAttribute, deleteAttribute, updateAttribute } from './actions';

type Attribute = Schemas['AttributeDto'];
type Labels = Record<string, string>;

interface OptionDraft {
  key: number;
  code: string;
  swatch: string;
  labels: Labels;
}

interface Draft {
  code: string;
  type: AttributeType;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isLocalizable: boolean;
  isVisible: boolean;
  position: number;
  labels: Labels;
  options: OptionDraft[];
}

const FLAGS = ['isRequired', 'isFilterable', 'isSearchable', 'isVisible', 'isLocalizable'] as const;

let seq = 0;
const toLabels = (l: { localeCode: string; label: string }[]) =>
  Object.fromEntries(l.map((x) => [x.localeCode, x.label]));
const fromLabels = (l: Labels) =>
  Object.entries(l)
    .filter(([, v]) => v.trim())
    .map(([localeCode, label]) => ({ localeCode, label: label.trim() }));

function draftOf(a: Attribute | null): Draft {
  return a
    ? {
        code: a.code,
        type: a.type,
        isRequired: a.isRequired,
        isFilterable: a.isFilterable,
        isSearchable: a.isSearchable,
        isLocalizable: a.isLocalizable,
        isVisible: a.isVisible,
        position: a.position,
        labels: toLabels(a.labels),
        options: a.options.map((o) => ({
          key: ++seq,
          code: o.code,
          swatch: o.swatch ?? '',
          labels: toLabels(o.labels),
        })),
      }
    : {
        code: '',
        type: 'TEXT',
        isRequired: false,
        isFilterable: false,
        isSearchable: false,
        isLocalizable: false,
        isVisible: true,
        position: 0,
        labels: {},
        options: [],
      };
}

/** Validates a draft like the API does; returns field errors keyed by path. */
export function validateAttribute(d: Draft, defaultLocale: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (!CODE_PATTERN.test(d.code)) e.code = 'attr.err.code';
  if (!d.labels[defaultLocale]?.trim()) e.label = 'attr.err.label';
  if (hasOptions(d.type)) {
    if (!d.options.length) e.options = 'attr.err.noOptions';
    const seen = new Set<string>();
    d.options.forEach((o, i) => {
      if (!CODE_PATTERN.test(o.code)) e[`options.${i}.code`] = 'attr.err.code';
      else if (seen.has(o.code)) e[`options.${i}.code`] = 'attr.err.duplicate';
      seen.add(o.code);
      if (!o.labels[defaultLocale]?.trim()) e[`options.${i}.label`] = 'attr.err.label';
    });
  }
  return e;
}

export function AttributeSheet({
  attribute,
  locales,
  open,
  onOpenChange,
}: {
  attribute: Attribute | null;
  locales: ShopLocale[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const defaultLocale = locales[0]?.code ?? 'en-US';
  const [draft, setDraft] = useState<Draft>(() => draftOf(attribute));
  const [locale, setLocale] = useState(defaultLocale);
  const [touched, setTouched] = useState(false);
  const [codeEdited, setCodeEdited] = useState(!!attribute);
  const [saving, setSaving] = useState(false);
  const editing = !!attribute;

  const errors = useMemo(() => validateAttribute(draft, defaultLocale), [draft, defaultLocale]);
  const err = (k: string) => (touched && errors[k] ? t(errors[k] as MessageKey) : undefined);
  const missing = locales
    .map((l) => l.code)
    .filter(
      (c) =>
        !draft.labels[c]?.trim() ||
        (hasOptions(draft.type) && draft.options.some((o) => !o.labels[c]?.trim())),
    );

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchOption = (i: number, p: Partial<OptionDraft>) =>
    setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? { ...o, ...p } : o)) }));
  const moveOption = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const options = [...d.options];
      const [o] = options.splice(i, 1);
      options.splice(i + dir, 0, o);
      return { ...d, options };
    });

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    const options = hasOptions(draft.type)
      ? draft.options.map((o, position) => ({
          code: o.code,
          position,
          labels: fromLabels(o.labels),
          ...(o.swatch ? { swatch: o.swatch } : {}),
        }))
      : undefined;
    const flags = Object.fromEntries(FLAGS.map((f) => [f, draft[f]])) as Record<
      (typeof FLAGS)[number],
      boolean
    >;
    const { isLocalizable, ...updatable } = flags;
    const result = editing
      ? await runAction(
          updateAttribute(attribute.id, {
            ...updatable,
            position: draft.position,
            labels: fromLabels(draft.labels),
            options,
          }),
          { success: t('common.saved') },
        )
      : await runAction(
          createAttribute({
            ...updatable,
            isLocalizable,
            code: draft.code,
            type: draft.type,
            position: draft.position,
            labels: fromLabels(draft.labels),
            options,
          }),
          { success: t('attr.created') },
        );
    setSaving(false);
    if (result) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        width="lg"
        title={editing ? attribute.code : t('attr.new')}
        description={editing ? t(`attr.type.${attribute.type}` as MessageKey) : t('attr.newHint')}
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
                title={t('attr.deleteTitle', { code: attribute.code })}
                description={t('attr.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteAttribute(attribute.id), {
                    success: t('attr.deleted'),
                  });
                  if (ok !== undefined) onOpenChange(false);
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? t('common.save') : t('attr.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <LocaleSwitcher locales={locales} value={locale} onChange={setLocale} missing={missing} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="attr-label"
              label={`${t('attr.label')} · ${locale}`}
              required={locale === defaultLocale}
              error={locale === defaultLocale ? err('label') : undefined}
              className="sm:col-span-2"
            >
              <Input
                id="attr-label"
                autoFocus
                value={draft.labels[locale] ?? ''}
                onChange={(e) => {
                  const labels = { ...draft.labels, [locale]: e.target.value };
                  patch(
                    !codeEdited && locale === defaultLocale
                      ? { labels, code: codify(e.target.value) }
                      : { labels },
                  );
                }}
                aria-invalid={!!(locale === defaultLocale && err('label')) || undefined}
              />
            </Field>
            <Field
              id="attr-code"
              label={t('common.code')}
              required
              hint={editing ? t('attr.codeLocked') : t('attr.codeHint')}
              error={err('code')}
            >
              <Input
                id="attr-code"
                value={draft.code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  patch({ code: e.target.value.toLowerCase() });
                }}
                aria-invalid={!!err('code') || undefined}
              />
            </Field>
            <div className="grid gap-1.5">
              <Label htmlFor="attr-type">{t('common.type')}</Label>
              <Select
                value={draft.type}
                disabled={editing}
                onValueChange={(v) => patch({ type: v as AttributeType })}
              >
                <SelectTrigger id="attr-type" />
                <SelectContent>
                  {ATTRIBUTE_TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {t(`attr.type.${ty}` as MessageKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing && <p className="text-small text-fg-muted">{t('attr.typeLocked')}</p>}
            </div>
          </div>

          <fieldset className="grid gap-1 rounded-lg border border-border p-1">
            <legend className="sr-only">{t('attr.behaviour')}</legend>
            {FLAGS.map((f) => (
              <label
                key={f}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-surface-muted"
              >
                <span className="grid gap-0.5">
                  <span className="text-body font-medium text-fg">
                    {t(`attr.flag.${f}` as MessageKey)}
                  </span>
                  <span className="text-small text-fg-muted">
                    {t(`attr.flag.${f}.hint` as MessageKey)}
                  </span>
                </span>
                <Switch
                  checked={draft[f]}
                  disabled={f === 'isLocalizable' && editing}
                  onCheckedChange={(v) => patch({ [f]: v })}
                />
              </label>
            ))}
          </fieldset>

          {hasOptions(draft.type) && (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-h4 text-fg">{t('attr.options')}</h3>
                  <p className="text-small text-fg-muted">{t('attr.optionsHint')}</p>
                </div>
                <Badge tone="outline">{draft.options.length}</Badge>
              </div>
              {touched && errors.options && (
                <p role="alert" className="text-small text-danger-fg">
                  {t(errors.options as MessageKey)}
                </p>
              )}
              <ul className="grid gap-2">
                {draft.options.map((o, i) => (
                  <li
                    key={o.key}
                    className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 rounded-md border border-border bg-surface p-2"
                  >
                    <label className="relative mt-1 size-8 cursor-pointer overflow-hidden rounded-sm border border-border-strong">
                      <span className="sr-only">{t('attr.swatch')}</span>
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          background:
                            o.swatch ||
                            'repeating-conic-gradient(var(--surface-muted) 0 25%, var(--surface) 0 50%) 0 0 / 8px 8px',
                        }}
                      />
                      <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(o.swatch) ? o.swatch : '#ffffff'}
                        onChange={(e) => patchOption(i, { swatch: e.target.value })}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                    <div className="grid gap-1">
                      <Input
                        aria-label={`${t('attr.option')} ${i + 1} · ${t('attr.label')} ${locale}`}
                        placeholder={t('attr.label')}
                        value={o.labels[locale] ?? ''}
                        onChange={(e) => {
                          const labels = { ...o.labels, [locale]: e.target.value };
                          patchOption(
                            i,
                            locale === defaultLocale &&
                              (!o.code || o.code === codify(o.labels[locale] ?? ''))
                              ? { labels, code: codify(e.target.value) }
                              : { labels },
                          );
                        }}
                        aria-invalid={!!err(`options.${i}.label`) || undefined}
                        className="h-9"
                      />
                      {err(`options.${i}.label`) && (
                        <span className="text-caption text-danger-fg">
                          {err(`options.${i}.label`)}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <Input
                        aria-label={`${t('attr.option')} ${i + 1} · ${t('common.code')}`}
                        placeholder={t('common.code')}
                        value={o.code}
                        onChange={(e) => patchOption(i, { code: e.target.value.toLowerCase() })}
                        aria-invalid={!!err(`options.${i}.code`) || undefined}
                        className="h-9 font-mono"
                      />
                      {err(`options.${i}.code`) && (
                        <span className="text-caption text-danger-fg">
                          {err(`options.${i}.code`)}
                        </span>
                      )}
                    </div>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('attr.moveUp')}
                        disabled={i === 0}
                        onClick={() => moveOption(i, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('attr.moveDown')}
                        disabled={i === draft.options.length - 1}
                        onClick={() => moveOption(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('common.remove')}
                        onClick={() =>
                          setDraft((d) => ({ ...d, options: d.options.filter((_, j) => j !== i) }))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                size="sm"
                className="justify-self-start"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    options: [...d.options, { key: ++seq, code: '', swatch: '', labels: {} }],
                  }))
                }
              >
                <Plus />
                {t('attr.addOption')}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
