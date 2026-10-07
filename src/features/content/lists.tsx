'use client';

import { Boxes, Newspaper, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FilterSelect } from '@/components/ui/list-toolbar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import type { ShopLocale } from '../catalog/locale-switcher';
import { pickLocalized } from '../catalog/shared';
import { createTag, deleteTag, updateTag } from './actions';
import { ContentList, type ContentRow } from './content-list';
import { CONTENT_TABS, IDENTIFIER } from './tabs';

interface ListProps {
  rows: ContentRow[];
  total: number;
  page: number;
  limit: number;
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
}

export function PagesList(props: ListProps) {
  const { t } = useI18n();
  return (
    <ContentList
      {...props}
      title={t('cms.pages')}
      description={t('cms.pagesDescription')}
      crumbs={[{ label: t('nav.content') }, { label: t('cms.pages') }]}
      tabs={CONTENT_TABS}
      newHref="/content/pages/new"
      newLabel={t('cms.newPage')}
      searchPlaceholder={t('cms.searchPages')}
      empty={t('cms.noPages')}
      emptyBody={t('cms.noPagesBody')}
    />
  );
}

export function PostsList({
  tags,
  locales,
  ...props
}: ListProps & { tags: Schemas['TagDto'][]; locales: ShopLocale[] }) {
  const { t, locale } = useI18n();
  const [managing, setManaging] = useState(false);
  return (
    <>
      <ContentList
        {...props}
        title={t('cms.posts')}
        description={t('cms.postsDescription')}
        crumbs={[{ label: t('nav.content') }, { label: t('cms.posts') }]}
        tabs={CONTENT_TABS}
        newHref="/content/posts/new"
        newLabel={t('cms.newPost')}
        searchPlaceholder={t('cms.searchPosts')}
        empty={t('cms.noPosts')}
        emptyBody={t('cms.noPostsBody')}
        icon={<Newspaper />}
        extraFilters={
          <>
            {tags.length > 0 && (
              <FilterSelect
                param="tagId"
                label={t('cms.tag')}
                allLabel={t('cms.anyTag')}
                options={tags.map((x) => ({
                  value: x.id,
                  label: pickLocalized(x.translations, locale)?.name ?? x.code,
                }))}
              />
            )}
            {props.canWrite && (
              <Button variant="ghost" className="h-10" onClick={() => setManaging(true)}>
                <Tags />
                {t('cms.manageTags')}
              </Button>
            )}
          </>
        }
      />
      {managing && <TagsSheet tags={tags} locales={locales} onClose={() => setManaging(false)} />}
    </>
  );
}

export function BlocksList(props: ListProps) {
  const { t } = useI18n();
  return (
    <ContentList
      {...props}
      title={t('cms.blocks')}
      description={t('cms.blocksDescription')}
      crumbs={[{ label: t('nav.content') }, { label: t('cms.blocks') }]}
      tabs={CONTENT_TABS}
      newHref="/content/blocks/new"
      newLabel={t('cms.newBlock')}
      searchPlaceholder={t('cms.searchBlocks')}
      empty={t('cms.noBlocks')}
      emptyBody={t('cms.noBlocksBody')}
      icon={<Boxes />}
    />
  );
}

type Tag = Schemas['TagDto'];

/** Blog tags: a code and a name per language. */
function TagsSheet({
  tags,
  locales,
  onClose,
}: {
  tags: Tag[];
  locales: ShopLocale[];
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<Tag | 'new' | null>(null);
  const [code, setCode] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const defaultLocale = locales[0]?.code ?? 'en-US';
  const open = (tag: Tag | 'new') => {
    setEditing(tag);
    setTouched(false);
    setCode(tag === 'new' ? '' : tag.code);
    setNames(
      tag === 'new' ? {} : Object.fromEntries(tag.translations.map((x) => [x.localeCode, x.name])),
    );
  };
  const errors = {
    code: !IDENTIFIER.test(code) ? t('cms.err.identifier') : undefined,
    name: !names[defaultLocale]?.trim() ? t('cms.err.tagName') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (errors.code || errors.name) return;
    setSaving(true);
    const translations = Object.entries(names)
      .filter(([, v]) => v.trim())
      .map(([localeCode, name]) => ({ localeCode, name: name.trim() }));
    const ok =
      editing === 'new'
        ? await runAction(createTag({ code, translations }), { success: t('cms.tagCreated') })
        : editing
          ? await runAction(updateTag(editing.id, { translations }), { success: t('common.saved') })
          : undefined;
    setSaving(false);
    if (ok) {
      setEditing(null);
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent title={t('cms.manageTags')} description={t('cms.tagsHint')}>
        <div className="grid gap-4">
          {editing ? (
            <div className="grid gap-4 rounded-lg border border-border p-4">
              <Field
                id="tag-code"
                label={t('common.code')}
                required
                error={touched ? errors.code : undefined}
              >
                <Input
                  id="tag-code"
                  className="font-mono"
                  autoFocus={editing === 'new'}
                  disabled={editing !== 'new'}
                  value={code}
                  placeholder="lookbook"
                  onChange={(e) => setCode(e.target.value.toLowerCase())}
                />
              </Field>
              {locales.map((l) => (
                <Field
                  key={l.code}
                  id={`tag-${l.code}`}
                  label={`${t('common.name')} · ${l.code}`}
                  required={l.code === defaultLocale}
                  error={touched && l.code === defaultLocale ? errors.name : undefined}
                >
                  <Input
                    id={`tag-${l.code}`}
                    lang={l.code}
                    value={names[l.code] ?? ''}
                    onChange={(e) => setNames((n) => ({ ...n, [l.code]: e.target.value }))}
                  />
                </Field>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={save} loading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" className="justify-self-start" onClick={() => open('new')}>
              <Plus />
              {t('cms.newTag')}
            </Button>
          )}
          <ul className="grid divide-y divide-border rounded-lg border border-border">
            {tags.length === 0 && (
              <li className="px-4 py-3 text-small text-fg-muted">{t('cms.noTags')}</li>
            )}
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {pickLocalized(tag.translations, locale)?.name ?? tag.code}
                  </span>
                  <span className="font-mono text-caption text-fg-muted">{tag.code}</span>
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t('common.edit')}
                  onClick={() => open(tag)}
                >
                  <Pencil />
                </Button>
                <Confirm
                  trigger={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-fg-muted hover:text-danger-fg"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 />
                    </Button>
                  }
                  title={t('cms.deleteTag', {
                    name: pickLocalized(tag.translations, locale)?.name ?? tag.code,
                  })}
                  description={t('cms.deleteTagBody')}
                  confirmLabel={t('common.delete')}
                  cancelLabel={t('common.cancel')}
                  onConfirm={async () => {
                    const ok = await runAction(deleteTag(tag.id), { success: t('cms.tagDeleted') });
                    if (ok !== undefined) router.refresh();
                    return ok !== undefined;
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
