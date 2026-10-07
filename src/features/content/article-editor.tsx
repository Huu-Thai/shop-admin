'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { ActionResult } from '@/server/action';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../catalog/locale-switcher';
import { pickLocalized, slugify } from '../catalog/shared';
import { PublishPanel } from '../publishing/publishing';
import {
  createPage,
  createPost,
  deletePage,
  deletePost,
  publishPage,
  publishPost,
  updatePage,
  updatePost,
} from './actions';
import { HtmlEditor } from './html-editor';
import { ImageField } from './image-field';
import { SeoPreview } from './seo-preview';
import { LAYOUT, PAGE_SLUG, POST_SLUG } from './tabs';

type Page = Schemas['PageDto'];
type Post = Schemas['PostDto'];
const ALL_STORES = '__all';
export const LAYOUTS = ['default', 'full-width', 'landing', 'sidebar'];

interface Tr {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  /** The slug follows the title until edited. */
  slugEdited: boolean;
}
const blank = (): Tr => ({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  slugEdited: false,
});

export interface ArticleContext {
  locales: ShopLocale[];
  stores: Schemas['StoreDto'][];
  blocks: string[];
  tags: Schemas['TagDto'][];
}

/** Create and edit a CMS page or blog post: translations, HTML content, SEO and publishing. */
export function ArticleEditor({
  kind,
  item,
  ctx,
  canWrite,
  canPublish,
}: {
  kind: 'page' | 'post';
  item: Page | Post | null;
  ctx: ArticleContext;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const { t, locale: adminLocale } = useI18n();
  const intl = intlLocale(adminLocale);
  const router = useRouter();
  const defaultLocale = ctx.locales[0]?.code ?? 'en-US';
  const initial = useMemo(() => {
    const tr: Record<string, Tr> = {};
    for (const x of item?.translations ?? [])
      tr[x.localeCode] = {
        ...blank(),
        title: x.title,
        slug: x.slug,
        content: x.content,
        excerpt: (x as { excerpt?: string | null }).excerpt ?? '',
        metaTitle: x.metaTitle ?? '',
        metaDescription: x.metaDescription ?? '',
        slugEdited: true,
      };
    return {
      tr,
      storeId: item?.storeId ?? ALL_STORES,
      layout: item && 'layout' in item ? item.layout : 'default',
      featuredImageId: item && 'featuredImageId' in item ? item.featuredImageId : null,
      tagIds: item && 'tagIds' in item ? item.tagIds : [],
    };
  }, [item]);
  const [draft, setDraft] = useState(initial);
  const [base, setBase] = useState(initial);
  if (base !== initial) {
    setBase(initial);
    setDraft(initial);
  }
  const [locale, setLocale] = useState(defaultLocale);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const cur = draft.tr[locale] ?? blank();
  const setTr = (patch: Partial<Tr>) =>
    setDraft((d) => ({
      ...d,
      tr: { ...d.tr, [locale]: { ...(d.tr[locale] ?? blank()), ...patch } },
    }));
  const slugPattern = kind === 'page' ? PAGE_SLUG : POST_SLUG;
  const toSlug = (title: string) =>
    kind === 'page' ? slugify(title) : slugify(title).replace(/\//g, '-');

  // Problems per locale: a translation needs a title; slugs and SEO lengths must fit.
  const problems = (code: string) => {
    const x = draft.tr[code];
    const p: Partial<Record<'title' | 'slug' | 'metaTitle' | 'metaDescription', string>> = {};
    const used = x && (x.title || x.content || x.slug);
    if (code === defaultLocale && !x?.title.trim()) p.title = t('cms.err.title');
    else if (used && !x.title.trim()) p.title = t('cms.err.title');
    if (x?.slug && !slugPattern.test(x.slug))
      p.slug = kind === 'page' ? t('cms.err.pageSlug') : t('cms.err.slug');
    if (x && x.metaTitle.length > 255) p.metaTitle = t('cms.err.tooLong', { n: 255 });
    if (x && x.metaDescription.length > 500) p.metaDescription = t('cms.err.tooLong', { n: 500 });
    return p;
  };
  const errorsHere = problems(locale);
  const badLocales = ctx.locales.map((l) => l.code).filter((c) => Object.keys(problems(c)).length);
  const layoutError =
    kind === 'page' && !LAYOUT.test(draft.layout) ? t('cms.err.layout') : undefined;

  const save = async () => {
    setTouched(true);
    if (badLocales.length || layoutError) {
      if (!badLocales.includes(locale)) setLocale(badLocales[0]);
      return;
    }
    setSaving(true);
    const translations = Object.entries(draft.tr)
      .filter(([, x]) => x.title.trim())
      .map(([localeCode, x]) => ({
        localeCode,
        title: x.title.trim(),
        ...(x.slug.trim() ? { slug: x.slug.trim() } : {}),
        content: x.content,
        ...(kind === 'post' ? { excerpt: x.excerpt.trim() } : {}),
        metaTitle: x.metaTitle.trim(),
        metaDescription: x.metaDescription.trim(),
      }));
    const kept = new Set(translations.map((x) => x.localeCode));
    const removeLocales = (item?.translations ?? [])
      .map((x) => x.localeCode)
      .filter((c) => !kept.has(c));
    const storeId = draft.storeId === ALL_STORES ? null : draft.storeId;
    let result: { id: string } | undefined;
    if (kind === 'page') {
      result = item
        ? await runAction(
            updatePage(item.id, {
              layout: draft.layout,
              translations,
              ...(removeLocales.length ? { removeLocales } : {}),
            }),
            { success: t('common.saved') },
          )
        : await runAction(createPage({ storeId, layout: draft.layout, translations }), {
            success: t('cms.pageCreated'),
          });
    } else {
      const common = { featuredImageId: draft.featuredImageId, tagIds: draft.tagIds, translations };
      result = item
        ? await runAction(
            updatePost(item.id, { ...common, ...(removeLocales.length ? { removeLocales } : {}) }),
            { success: t('common.saved') },
          )
        : await runAction(createPost({ ...common, storeId }), { success: t('cms.postCreated') });
    }
    setSaving(false);
    if (!result) return;
    setTouched(false);
    if (item) router.refresh();
    else
      router.push(kind === 'page' ? `/content/pages/${result.id}` : `/content/posts/${result.id}`);
  };

  const publish = async (unpublish: boolean, at?: string) => {
    if (!item) return false;
    const body = at ? { at } : {};
    const run: Promise<ActionResult<unknown>> =
      kind === 'page'
        ? publishPage(item.id, body, unpublish)
        : publishPost(item.id, body, unpublish);
    const ok = await runAction(run, {
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

  const listHref = kind === 'page' ? '/content' : '/content/posts';
  const listLabel = kind === 'page' ? t('cms.pages') : t('cms.posts');
  const heading = item
    ? pickLocalized(item.translations, adminLocale)?.title || t('cms.untitled')
    : kind === 'page'
      ? t('cms.newPage')
      : t('cms.newPost');
  const store = ctx.stores.find(
    (s) => s.id === (draft.storeId === ALL_STORES ? undefined : draft.storeId),
  );
  const plainText = cur.content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <>
      <PageHeader
        title={heading}
        breadcrumbs={[
          { label: t('nav.content') },
          { label: listLabel, href: listHref },
          { label: heading },
        ]}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardBody className="grid gap-5">
              <LocaleSwitcher
                locales={ctx.locales}
                value={locale}
                onChange={setLocale}
                missing={
                  touched
                    ? badLocales
                    : ctx.locales.map((l) => l.code).filter((c) => !draft.tr[c]?.title.trim())
                }
              />
              <Field
                id="ar-title"
                label={`${t('cms.titleField')} · ${locale}`}
                required={locale === defaultLocale}
                error={touched ? errorsHere.title : undefined}
              >
                <Input
                  id="ar-title"
                  autoFocus={!item}
                  disabled={!canWrite}
                  value={cur.title}
                  className="text-body-lg"
                  onChange={(e) =>
                    setTr({
                      title: e.target.value,
                      ...(cur.slugEdited ? {} : { slug: toSlug(e.target.value) }),
                    })
                  }
                />
              </Field>
              <Field
                id="ar-slug"
                label={t('cms.slug')}
                hint={kind === 'page' ? t('cms.pageSlugHint') : t('cms.slugHint')}
                error={touched ? errorsHere.slug : undefined}
              >
                <div className="flex items-stretch">
                  <span className="flex items-center rounded-l-md border border-r-0 border-border-strong bg-surface-muted px-3 font-mono text-small text-fg-muted">
                    /{kind === 'post' ? 'blog/' : ''}
                  </span>
                  <Input
                    id="ar-slug"
                    disabled={!canWrite}
                    className="rounded-l-none font-mono"
                    value={cur.slug}
                    onChange={(e) =>
                      setTr({ slug: e.target.value.toLowerCase(), slugEdited: true })
                    }
                  />
                </div>
              </Field>
              {kind === 'post' && (
                <Field id="ar-excerpt" label={t('cms.excerpt')} hint={t('cms.excerptHint')}>
                  <Textarea
                    id="ar-excerpt"
                    rows={2}
                    disabled={!canWrite}
                    value={cur.excerpt}
                    onChange={(e) => setTr({ excerpt: e.target.value })}
                  />
                </Field>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="ar-content">{t('cms.content')}</Label>
                <HtmlEditor
                  id="ar-content"
                  value={cur.content}
                  onChange={(content) => setTr({ content })}
                  blocks={ctx.blocks}
                  disabled={!canWrite}
                />
                <p className="text-small text-fg-muted">{t('cms.contentHint')}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('cms.seo')} description={t('cms.seoHint')} />
            <CardBody className="grid gap-5 pt-4">
              <SeoPreview
                title={cur.metaTitle || cur.title}
                url={`${(store?.baseUrl ?? ctx.stores[0]?.baseUrl ?? 'https://shop.example.com').replace(/\/$/, '')}/${kind === 'post' ? 'blog/' : ''}${cur.slug}`}
                description={cur.metaDescription || cur.excerpt || plainText}
              />
              <Field
                id="ar-meta-title"
                label={t('cms.metaTitle')}
                hint={t('cms.counter', { n: (cur.metaTitle || cur.title).length, max: 60 })}
                error={touched ? errorsHere.metaTitle : undefined}
              >
                <Input
                  id="ar-meta-title"
                  disabled={!canWrite}
                  placeholder={cur.title}
                  value={cur.metaTitle}
                  onChange={(e) => setTr({ metaTitle: e.target.value })}
                />
              </Field>
              <Field
                id="ar-meta-desc"
                label={t('cms.metaDescription')}
                hint={t('cms.counter', { n: cur.metaDescription.length, max: 160 })}
                error={touched ? errorsHere.metaDescription : undefined}
              >
                <Textarea
                  id="ar-meta-desc"
                  rows={2}
                  disabled={!canWrite}
                  value={cur.metaDescription}
                  onChange={(e) => setTr({ metaDescription: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6">
          {item && (
            <PublishPanel
              item={item}
              canWrite={canPublish}
              onPublish={(at) => publish(false, at)}
              onUnpublish={(at) => publish(true, at)}
            />
          )}
          <Card>
            <CardHeader title={t('cms.settings')} />
            <CardBody className="grid gap-5 pt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="ar-store">{t('stores.store')}</Label>
                <Select
                  value={draft.storeId}
                  disabled={!!item || !canWrite}
                  onValueChange={(storeId) => setDraft((d) => ({ ...d, storeId }))}
                >
                  <SelectTrigger id="ar-store" />
                  <SelectContent>
                    <SelectItem value={ALL_STORES}>{t('cms.allStores')}</SelectItem>
                    {ctx.stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-small text-fg-muted">
                  {item ? t('cms.storeLocked') : t('cms.storeHint')}
                </p>
              </div>
              {kind === 'page' && (
                <Field
                  id="ar-layout"
                  label={t('cms.layout')}
                  hint={t('cms.layoutHint')}
                  error={touched ? layoutError : undefined}
                >
                  <Input
                    id="ar-layout"
                    list="ar-layouts"
                    className="font-mono"
                    disabled={!canWrite}
                    value={draft.layout}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, layout: e.target.value.toLowerCase() }))
                    }
                  />
                </Field>
              )}
              {kind === 'post' && (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ar-image">{t('cms.featuredImage')}</Label>
                    <ImageField
                      id="ar-image"
                      value={draft.featuredImageId}
                      disabled={!canWrite}
                      onChange={(featuredImageId) => setDraft((d) => ({ ...d, featuredImageId }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ar-tags">{t('cms.tags')}</Label>
                    <Combobox
                      id="ar-tags"
                      multiple
                      disabled={!canWrite}
                      value={draft.tagIds}
                      onChange={(tagIds) => setDraft((d) => ({ ...d, tagIds }))}
                      options={ctx.tags.map((x) => ({
                        value: x.id,
                        label: pickLocalized(x.translations, adminLocale)?.name ?? x.code,
                        hint: x.code,
                      }))}
                      placeholder={t('cms.chooseTags')}
                      searchPlaceholder={t('common.search')}
                      emptyText={t('cms.noTags')}
                    />
                  </div>
                </>
              )}
              {item && (
                <dl className="grid gap-2 border-t border-border pt-4 text-small">
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">{t('common.created')}</dt>
                    <dd className="font-medium">{formatDate(item.createdAt, intl, true)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">{t('common.updated')}</dt>
                    <dd className="font-medium">{formatDate(item.updatedAt, intl, true)}</dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>
          {item && canWrite && (
            <Confirm
              trigger={
                <Button variant="ghost" className="justify-self-start text-danger-fg">
                  <Trash2 />
                  {kind === 'page' ? t('cms.deletePage') : t('cms.deletePost')}
                </Button>
              }
              title={t('cms.deleteTitle', { title: heading })}
              description={t('cms.deleteBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const del: Promise<ActionResult<null>> =
                  kind === 'page' ? deletePage(item.id) : deletePost(item.id);
                const ok = await runAction(del, {
                  success: t('cms.deleted'),
                });
                if (ok !== undefined) router.push(listHref);
                return ok !== undefined;
              }}
            />
          )}
        </div>
      </div>
      <datalist id="ar-layouts">
        {LAYOUTS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => (item ? setDraft(initial) : router.push(listHref))}
          message={item ? t('common.unsaved') : t('cms.unsavedNew')}
          saveLabel={item ? t('common.save') : t('cms.create')}
          discardLabel={item ? t('common.discard') : t('common.cancel')}
        />
      )}
    </>
  );
}
