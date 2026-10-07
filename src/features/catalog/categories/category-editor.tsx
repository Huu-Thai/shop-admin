'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
import { Checkbox, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { FormSection, SaveBar } from '@/components/ui/form-layout';
import { Input, Textarea } from '@/components/ui/input';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../locale-switcher';
import { ImageLinksEditor } from '../media/image-links-editor';
import { type LinkedImage, toLinks } from '../media/links';
import { pickLocalized, SLUG_PATTERN, slugify, stableJson } from '../shared';
import {
  createCategory,
  deleteCategory,
  moveCategory,
  setCategoryImages,
  updateCategory,
} from './actions';
import { flatten } from './tree';

type Node = Schemas['CategoryNodeDto'];
interface Tr {
  name: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}
interface Draft {
  parentId: string | null;
  isActive: boolean;
  includeInMenu: boolean;
  websiteIds: string[];
  translations: Record<string, Tr>;
}

const emptyTr: Tr = { name: '', slug: '', description: '', metaTitle: '', metaDescription: '' };

function draftOf(c: Node | null, parentId: string | null, websites: string[]): Draft {
  return {
    parentId: c ? c.parentId : parentId,
    isActive: c?.isActive ?? true,
    includeInMenu: c?.includeInMenu ?? true,
    websiteIds: c?.websiteIds ?? websites,
    translations: Object.fromEntries(
      (c?.translations ?? []).map((tr) => [
        tr.localeCode,
        {
          name: tr.name,
          slug: tr.slug,
          description: tr.description ?? '',
          metaTitle: tr.metaTitle ?? '',
          metaDescription: tr.metaDescription ?? '',
        },
      ]),
    ),
  };
}

export function CategoryEditor({
  category,
  parentId,
  tree,
  locales,
  websites,
  images: initialImages,
  canWrite,
}: {
  category: Node | null;
  parentId: string | null;
  tree: Node[];
  locales: ShopLocale[];
  websites: Schemas['WebsiteDto'][];
  images: LinkedImage[];
  canWrite: boolean;
}) {
  const { t, locale: adminLocale } = useI18n();
  const router = useRouter();
  const defaultLocale = locales[0]?.code ?? 'en-US';
  const initial = useMemo(
    () =>
      draftOf(
        category,
        parentId,
        websites.map((w) => w.id),
      ),
    [category, parentId, websites],
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [images, setImages] = useState(initialImages);
  const [locale, setLocale] = useState(defaultLocale);
  const [slugEdited, setSlugEdited] = useState<Record<string, boolean>>(
    Object.fromEntries((category?.translations ?? []).map((tr) => [tr.localeCode, true])),
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const tr = draft.translations[locale] ?? emptyTr;
  const dirtyDetails = stableJson(draft) !== stableJson(initial);
  const dirtyImages = stableJson(toLinks(images)) !== stableJson(toLinks(initialImages));
  const dirty = !category || dirtyDetails || dirtyImages;

  const errors: Record<string, string> = {};
  if (!draft.translations[defaultLocale]?.name.trim()) errors.name = t('cat.err.name');
  for (const [code, x] of Object.entries(draft.translations))
    if (x.slug && !SLUG_PATTERN.test(x.slug)) errors[`slug.${code}`] = t('cat.err.slug');
  const missing = locales.map((l) => l.code).filter((c) => !draft.translations[c]?.name.trim());

  const setTr = (p: Partial<Tr>) =>
    setDraft((d) => ({
      ...d,
      translations: {
        ...d.translations,
        [locale]: { ...(d.translations[locale] ?? emptyTr), ...p },
      },
    }));

  // Parents: anything but the category itself and its descendants.
  const parentOptions = useMemo(() => {
    const own = category ? new Set(flatten([category]).map((f) => f.id)) : new Set<string>();
    return flatten(tree)
      .filter((f) => !own.has(f.id))
      .map((f) => ({
        value: f.id,
        label: `${'— '.repeat(f.depth)}${pickLocalized(f.node.translations, adminLocale)?.name ?? '—'}`,
      }));
  }, [tree, category, adminLocale]);

  /** Siblings under a parent (null = root): a new or moved category goes last. */
  const childCount = (pid: string | null) =>
    pid ? (flatten(tree).find((f) => f.id === pid)?.childCount ?? 0) : tree.length;

  const payloadTranslations = () =>
    Object.entries(draft.translations)
      .filter(([, x]) => x.name.trim())
      .map(([localeCode, x]) => ({
        localeCode,
        name: x.name.trim(),
        ...(x.slug ? { slug: x.slug } : {}),
        ...(x.description.trim() ? { description: x.description.trim() } : {}),
        ...(x.metaTitle.trim() ? { metaTitle: x.metaTitle.trim() } : {}),
        ...(x.metaDescription.trim() ? { metaDescription: x.metaDescription.trim() } : {}),
      }));

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) {
      if (errors.name) setLocale(defaultLocale);
      return;
    }
    setSaving(true);
    try {
      if (!category) {
        const created = await runAction(
          createCategory({
            parentId: draft.parentId,
            position: childCount(draft.parentId),
            isActive: draft.isActive,
            includeInMenu: draft.includeInMenu,
            websiteIds: draft.websiteIds,
            translations: payloadTranslations(),
          }),
          { success: t('cat.created') },
        );
        if (created) router.replace(`/categories?id=${created.id}`, { scroll: false });
        return;
      }
      if (dirtyDetails) {
        if (draft.parentId !== initial.parentId) {
          const moved = await runAction(
            moveCategory(category.id, draft.parentId, childCount(draft.parentId)),
          );
          if (!moved) return;
        }
        const removeLocales = category.translations
          .map((x) => x.localeCode)
          .filter((c) => !draft.translations[c]?.name.trim());
        const ok = await runAction(
          updateCategory(category.id, {
            isActive: draft.isActive,
            includeInMenu: draft.includeInMenu,
            websiteIds: draft.websiteIds,
            translations: payloadTranslations(),
            ...(removeLocales.length ? { removeLocales } : {}),
          }),
        );
        if (!ok) return;
      }
      if (dirtyImages) {
        const ok = await runAction(setCategoryImages(category.id, toLinks(images)));
        if (!ok) return;
      }
      toast.success(t('common.saved'));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!category) router.replace('/categories', { scroll: false });
    setDraft(initial);
    setImages(initialImages);
    setTouched(false);
  };

  const title = category
    ? (pickLocalized(category.translations, adminLocale)?.name ?? '—')
    : t('cat.new');

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-h2 text-fg">{title}</h2>
          {category && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-small text-fg-muted">
              <Badge tone={category.isActive ? 'success' : 'neutral'} dot>
                {category.isActive ? t('common.active') : t('common.inactive')}
              </Badge>
              {!category.includeInMenu && <Badge tone="outline">{t('cat.hiddenInMenu')}</Badge>}
              <span className="font-mono text-caption">
                /{pickLocalized(category.translations, adminLocale)?.slug}
              </span>
            </div>
          )}
        </div>
        {category && canWrite && (
          <Confirm
            trigger={
              <Button variant="ghost" className="text-danger-fg">
                <Trash2 />
                {t('common.delete')}
              </Button>
            }
            title={t('cat.deleteTitle', { name: title })}
            description={
              category.children.length
                ? t('cat.deleteHasChildren', { n: category.children.length })
                : t('cat.deleteBody')
            }
            confirmLabel={t('common.delete')}
            cancelLabel={t('common.cancel')}
            onConfirm={async () => {
              const ok = await runAction(deleteCategory(category.id), {
                success: t('cat.deleted'),
              });
              if (ok !== undefined) router.replace('/categories', { scroll: false });
              return ok !== undefined;
            }}
          />
        )}
      </div>

      <FormSection title={t('cat.content')} description={t('cat.contentHint')}>
        <LocaleSwitcher locales={locales} value={locale} onChange={setLocale} missing={missing} />
        <Field
          id="cat-name"
          label={`${t('common.name')} · ${locale}`}
          required={locale === defaultLocale}
          error={touched && locale === defaultLocale ? errors.name : undefined}
        >
          <Input
            id="cat-name"
            value={tr.name}
            disabled={!canWrite}
            onChange={(e) =>
              setTr(
                slugEdited[locale]
                  ? { name: e.target.value }
                  : { name: e.target.value, slug: slugify(e.target.value) },
              )
            }
            aria-invalid={(touched && locale === defaultLocale && !!errors.name) || undefined}
          />
        </Field>
        <Field
          id="cat-slug"
          label={t('cat.slug')}
          hint={t('cat.slugHint')}
          error={touched ? errors[`slug.${locale}`] : undefined}
        >
          <div className="flex items-center rounded-md border border-border-strong bg-surface-muted shadow-xs focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <span className="pl-3 font-mono text-small text-fg-subtle">/</span>
            <input
              id="cat-slug"
              value={tr.slug}
              disabled={!canWrite}
              onChange={(e) => {
                setSlugEdited((s) => ({ ...s, [locale]: true }));
                setTr({ slug: e.target.value.toLowerCase() });
              }}
              className="h-10 min-w-0 flex-1 rounded-r-md bg-surface px-2 font-mono text-body text-fg outline-none"
            />
          </div>
        </Field>
        <Field id="cat-desc" label={t('cat.descriptionField')}>
          <Textarea
            id="cat-desc"
            rows={4}
            value={tr.description}
            disabled={!canWrite}
            onChange={(e) => setTr({ description: e.target.value })}
          />
        </Field>
        <details className="group rounded-md border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-body font-medium text-fg">
            {t('seo.title')}
            <span className="text-small font-normal text-fg-muted">{t('seo.hint')}</span>
          </summary>
          <div className="grid gap-4 border-t border-border p-4">
            <Field
              id="cat-meta-title"
              label={t('seo.metaTitle')}
              hint={`${tr.metaTitle.length}/60`}
            >
              <Input
                id="cat-meta-title"
                value={tr.metaTitle}
                disabled={!canWrite}
                placeholder={tr.name}
                onChange={(e) => setTr({ metaTitle: e.target.value })}
              />
            </Field>
            <Field
              id="cat-meta-desc"
              label={t('seo.metaDescription')}
              hint={`${tr.metaDescription.length}/160`}
            >
              <Textarea
                id="cat-meta-desc"
                rows={3}
                value={tr.metaDescription}
                disabled={!canWrite}
                onChange={(e) => setTr({ metaDescription: e.target.value })}
              />
            </Field>
          </div>
        </details>
      </FormSection>

      <FormSection title={t('cat.placement')} description={t('cat.placementHint')}>
        <div className="grid gap-1.5">
          <Label htmlFor="cat-parent">{t('cat.parent')}</Label>
          <Combobox
            id="cat-parent"
            value={draft.parentId ? [draft.parentId] : ['__root']}
            onChange={([v]) => setDraft((d) => ({ ...d, parentId: v === '__root' ? null : v }))}
            options={[{ value: '__root', label: t('cat.root') }, ...parentOptions]}
            disabled={!canWrite}
            searchPlaceholder={t('cat.search')}
            emptyText={t('common.noResults')}
          />
        </div>
        <label className="flex items-center justify-between gap-4">
          <span className="grid gap-0.5">
            <span className="text-body font-medium text-fg">{t('cat.active')}</span>
            <span className="text-small text-fg-muted">{t('cat.activeHint')}</span>
          </span>
          <Switch
            checked={draft.isActive}
            disabled={!canWrite}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="grid gap-0.5">
            <span className="text-body font-medium text-fg">{t('cat.inMenu')}</span>
            <span className="text-small text-fg-muted">{t('cat.inMenuHint')}</span>
          </span>
          <Switch
            checked={draft.includeInMenu}
            disabled={!canWrite}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, includeInMenu: v }))}
          />
        </label>
        {websites.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-small font-medium text-fg">{t('common.websites')}</legend>
            {websites.map((w) => (
              <label key={w.id} className="flex items-center gap-2.5 text-body text-fg">
                <Checkbox
                  checked={draft.websiteIds.includes(w.id)}
                  disabled={!canWrite}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      websiteIds: v
                        ? [...d.websiteIds, w.id]
                        : d.websiteIds.filter((x) => x !== w.id),
                    }))
                  }
                />
                {w.name}
                <span className="font-mono text-caption text-fg-muted">{w.code}</span>
              </label>
            ))}
          </fieldset>
        )}
      </FormSection>

      {category && (
        <FormSection title={t('cat.images')} description={t('cat.imagesHint')}>
          <ImageLinksEditor value={images} onChange={setImages} disabled={!canWrite} />
        </FormSection>
      )}

      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={discard}
          message={category ? t('common.unsaved') : t('cat.newUnsaved')}
          saveLabel={category ? t('common.save') : t('cat.create')}
          discardLabel={category ? t('common.discard') : t('common.cancel')}
        />
      )}
    </div>
  );
}
