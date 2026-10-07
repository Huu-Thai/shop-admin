'use client';

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  IndentDecrease,
  IndentIncrease,
  ListTree,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox, type ComboOption } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
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
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { flatten } from '../catalog/categories/tree';
import { SubNav } from '../catalog/catalog-tabs';
import type { ShopLocale } from '../catalog/locale-switcher';
import { pickLocalized } from '../catalog/shared';
import type { BlockContext } from '../content/block-editor';
import { CONTENT_TABS, LINK } from '../content/tabs';
import { productSearch } from '../marketing/rule-builder';
import {
  createMenuItem,
  deleteMenu,
  deleteMenuItem,
  moveMenuItems,
  updateMenuItem,
} from './actions';
import { canMove, descendants, type Direction, MAX_DEPTH, move, rows } from './menu-tree';
import { MenuSheet } from './menus-view';

type MenuDetail = Schemas['MenuDetailDto'];
type Item = Schemas['MenuItemDto'];
type LinkType = Schemas['MenuLinkType'];
const LINK_TYPES: LinkType[] = ['CATEGORY', 'PAGE', 'POST', 'PRODUCT', 'URL'];
const ROOT = '__root';

/** A menu's links as an indented tree: reorder, nest, edit, add. */
export function MenuEditor({
  menu,
  targetLabels,
  ctx,
  canWrite,
}: {
  menu: MenuDetail;
  targetLabels: Record<string, string>;
  ctx: Pick<BlockContext, 'stores' | 'tree' | 'nameLocale'> & { locales: ShopLocale[] };
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const list = rows(menu.items);
  // Like the storefront: the item's own label, else its target's name.
  const label = (i: Item) =>
    pickLocalized(i.labels, locale)?.label ??
    (i.targetId ? targetLabels[i.targetId] : undefined) ??
    t('menu.untitled');

  const shift = async (id: string, dir: Direction) => {
    const moves = move(menu.items, id, dir);
    if (!moves.length) return;
    setBusy(true);
    const ok = await runAction(moveMenuItems(menu.id, moves), { success: t('menu.moved') });
    setBusy(false);
    if (ok !== undefined) router.refresh();
  };

  return (
    <>
      <PageHeader
        title={menu.name}
        description={
          <span>
            <code className="font-mono">{menu.code}</code> ·{' '}
            {menu.storeId
              ? (ctx.stores.find((s) => s.id === menu.storeId)?.name ?? '—')
              : t('cms.allStores')}
          </span>
        }
        breadcrumbs={[
          { label: t('nav.content') },
          { label: t('menu.title'), href: '/content/menus' },
          { label: menu.name },
        ]}
        actions={
          canWrite && (
            <>
              <Button variant="secondary" onClick={() => setRenaming(true)}>
                <Pencil />
                {t('menu.rename')}
              </Button>
              <Button onClick={() => setEditing('new')}>
                <Plus />
                {t('menu.addLink')}
              </Button>
            </>
          )
        }
      />
      <SubNav items={CONTENT_TABS} />
      <Card>
        <CardHeader title={t('menu.links')} description={t('menu.linksHint', { n: MAX_DEPTH })} />
        <CardBody className="pt-4">
          {list.length ? (
            <ul className="grid gap-1.5" aria-busy={busy}>
              {list.map(({ item: i, depth }) => (
                <li
                  key={i.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2',
                    !i.isActive && 'opacity-60',
                  )}
                  style={{ marginLeft: depth * 28 }}
                >
                  {depth > 0 && (
                    <span aria-hidden className="-ml-1 text-fg-subtle">
                      ↳
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{label(i)}</span>
                      {i.openInNewTab && (
                        <ExternalLink
                          aria-label={t('html.newTab')}
                          className="size-3.5 text-fg-muted"
                        />
                      )}
                      {!i.isActive && <Badge tone="neutral">{t('menu.hidden')}</Badge>}
                    </span>
                    <span className="block truncate text-caption text-fg-muted">
                      {t(`menu.type.${i.linkType}` as MessageKey)}
                      {' · '}
                      {i.linkType === 'URL' ? (
                        <code className="font-mono">{i.url}</code>
                      ) : i.targetId ? (
                        (targetLabels[i.targetId] ?? t('menu.missingTarget'))
                      ) : (
                        '—'
                      )}
                    </span>
                  </span>
                  {canWrite && (
                    <span className="flex items-center gap-0.5">
                      {(
                        [
                          ['up', ArrowUp, 'menu.moveUp'],
                          ['down', ArrowDown, 'menu.moveDown'],
                          ['outdent', IndentDecrease, 'menu.outdent'],
                          ['indent', IndentIncrease, 'menu.indent'],
                        ] as const
                      ).map(([dir, Icon, key]) => (
                        <Button
                          key={dir}
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t(key)}
                          disabled={busy || !canMove(menu.items, i.id, dir)}
                          onClick={() => shift(i.id, dir)}
                        >
                          <Icon />
                        </Button>
                      ))}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('common.edit')}
                        onClick={() => setEditing(i)}
                      >
                        <Pencil />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<ListTree />}
              title={t('menu.noLinks')}
              description={t('menu.noLinksBody')}
              action={
                canWrite && (
                  <Button size="sm" onClick={() => setEditing('new')}>
                    <Plus />
                    {t('menu.addLink')}
                  </Button>
                )
              }
            />
          )}
        </CardBody>
      </Card>
      {canWrite && (
        <div className="mt-6">
          <Confirm
            trigger={
              <Button variant="ghost" className="text-danger-fg">
                <Trash2 />
                {t('menu.delete')}
              </Button>
            }
            title={t('cms.deleteTitle', { title: menu.name })}
            description={t('menu.deleteBody')}
            confirmLabel={t('common.delete')}
            cancelLabel={t('common.cancel')}
            onConfirm={async () => {
              const ok = await runAction(deleteMenu(menu.id), { success: t('cms.deleted') });
              if (ok !== undefined) router.push('/content/menus');
              return ok !== undefined;
            }}
          />
        </div>
      )}
      {renaming && <MenuSheet menu={menu} stores={ctx.stores} onClose={() => setRenaming(false)} />}
      {editing && (
        <ItemSheet
          menu={menu}
          item={editing === 'new' ? null : editing}
          targetLabels={targetLabels}
          ctx={ctx}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function contentSearch(kind: 'pages' | 'posts', adminLocale: string) {
  return async (query: string): Promise<ComboOption[]> => {
    const q = new URLSearchParams({ limit: '20' });
    if (query) q.set('search', query);
    const list = await gw<{ data: Schemas['PageDto'][] }>(`cms/${kind}?${q}`);
    return list.data.map((x) => ({
      value: x.id,
      label: pickLocalized(x.translations, adminLocale)?.title || x.id,
      hint: `/${kind === 'posts' ? 'blog/' : ''}${pickLocalized(x.translations, adminLocale)?.slug ?? ''}`,
    }));
  };
}

function ItemSheet({
  menu,
  item,
  targetLabels,
  ctx,
  onClose,
}: {
  menu: MenuDetail;
  item: Item | null;
  targetLabels: Record<string, string>;
  ctx: Pick<BlockContext, 'tree' | 'nameLocale'> & { locales: ShopLocale[] };
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [linkType, setLinkType] = useState<LinkType>(item?.linkType ?? 'CATEGORY');
  const [targetId, setTargetId] = useState(item?.targetId ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [parentId, setParentId] = useState(item?.parentId ?? ROOT);
  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries((item?.labels ?? []).map((l) => [l.localeCode, l.label])),
  );
  const [openInNewTab, setOpenInNewTab] = useState(item?.openInNewTab ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const defaultLocale = ctx.locales[0]?.code ?? 'en-US';
  const loaders = useMemo(
    () => ({
      PAGE: contentSearch('pages', locale),
      POST: contentSearch('posts', locale),
      PRODUCT: productSearch(ctx.nameLocale),
    }),
    [locale, ctx.nameLocale],
  );
  const categories = useMemo(
    () =>
      flatten(ctx.tree).map((f) => ({
        value: f.id,
        label: `${'— '.repeat(f.depth)}${pickLocalized(f.node.translations, locale)?.name ?? '—'}`,
      })),
    [ctx.tree, locale],
  );
  // Parents: any item but this one and its subtree.
  const blocked = item ? descendants(menu.items, item.id) : new Set<string>();
  const parents = rows(menu.items).filter(
    (r) => !blocked.has(r.item.id) && r.depth < MAX_DEPTH - 1,
  );
  const errors = {
    target: linkType !== 'URL' && !targetId ? t('cms.err.target') : undefined,
    url: linkType === 'URL' && !LINK.test(url.trim()) ? t('html.err.link') : undefined,
    label:
      linkType === 'URL' && !labels[defaultLocale]?.trim()
        ? t('menu.err.label', { locale: defaultLocale })
        : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const kept = Object.entries(labels)
      .filter(([, v]) => v.trim())
      .map(([localeCode, label]) => ({ localeCode, label: label.trim() }));
    const keptSet = new Set(kept.map((l) => l.localeCode));
    const removeLocales = (item?.labels ?? [])
      .map((l) => l.localeCode)
      .filter((c) => !keptSet.has(c));
    const parent = parentId === ROOT ? null : parentId;
    const link = linkType === 'URL' ? { url: url.trim() } : { targetId };
    const ok = item
      ? await runAction(
          updateMenuItem(menu.id, item.id, {
            linkType,
            ...link,
            parentId: parent,
            openInNewTab,
            isActive,
            labels: kept,
            ...(removeLocales.length ? { removeLocales } : {}),
          }),
          { success: t('common.saved') },
        )
      : await runAction(
          createMenuItem(menu.id, {
            linkType,
            ...link,
            parentId: parent,
            position: menu.items.filter((i) => i.parentId === parent).length,
            openInNewTab,
            isActive,
            labels: kept,
          }),
          { success: t('menu.linkAdded') },
        );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={
          item
            ? (pickLocalized(item.labels, locale)?.label ?? t('menu.editLink'))
            : t('menu.addLink')
        }
        description={t('menu.linkHint')}
        footer={
          <>
            {item && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('menu.deleteLink')}
                description={t('menu.deleteLinkBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteMenuItem(menu.id, item.id), {
                    success: t('menu.linkDeleted'),
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="mi-type">{t('menu.linksTo')}</Label>
              <Select
                value={linkType}
                onValueChange={(v) => {
                  setLinkType(v as LinkType);
                  setTargetId('');
                }}
              >
                <SelectTrigger id="mi-type" />
                <SelectContent>
                  {LINK_TYPES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {t(`menu.type.${x}` as MessageKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {linkType === 'URL' ? (
              <Field
                id="mi-url"
                label={t('html.url')}
                required
                hint={t('html.urlHint')}
                error={touched ? errors.url : undefined}
              >
                <Input
                  id="mi-url"
                  className="font-mono"
                  placeholder="/sale"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Field>
            ) : (
              <div className="grid content-start gap-1.5">
                <Label htmlFor="mi-target">{t(`menu.type.${linkType}` as MessageKey)}</Label>
                <Combobox
                  key={linkType}
                  id="mi-target"
                  value={targetId ? [targetId] : []}
                  onChange={([v]) => setTargetId(v ?? '')}
                  {...(linkType === 'CATEGORY'
                    ? { options: categories }
                    : { load: loaders[linkType] })}
                  labels={
                    targetId && targetLabels[targetId]
                      ? { [targetId]: targetLabels[targetId] }
                      : undefined
                  }
                  placeholder={t('common.select')}
                  searchPlaceholder={t('common.search')}
                  emptyText={t('common.noResults')}
                  invalid={touched && !!errors.target}
                />
                {touched && errors.target && (
                  <p className="text-small text-danger-fg">{errors.target}</p>
                )}
              </div>
            )}
          </div>
          <fieldset className="grid gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('menu.label')}</legend>
            <p className="text-small text-fg-muted">
              {linkType === 'URL' ? t('menu.labelRequired') : t('menu.labelOptional')}
            </p>
            {ctx.locales.map((l) => (
              <Field
                key={l.code}
                id={`mi-label-${l.code}`}
                label={l.name}
                error={touched && l.code === defaultLocale ? errors.label : undefined}
              >
                <Input
                  id={`mi-label-${l.code}`}
                  lang={l.code}
                  value={labels[l.code] ?? ''}
                  onChange={(e) => setLabels((x) => ({ ...x, [l.code]: e.target.value }))}
                />
              </Field>
            ))}
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="mi-parent">{t('menu.parent')}</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="mi-parent" />
              <SelectContent>
                <SelectItem value={ROOT}>{t('menu.topLevel')}</SelectItem>
                {parents.map((r) => (
                  <SelectItem key={r.item.id} value={r.item.id}>
                    {`${'— '.repeat(r.depth + 1)}${pickLocalized(r.item.labels, locale)?.label ?? targetLabels[r.item.targetId ?? ''] ?? t('menu.untitled')}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-body">
            <Checkbox checked={openInNewTab} onCheckedChange={(c) => setOpenInNewTab(c === true)} />
            {t('html.newTab')}
          </label>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('menu.show')}</span>
              <span className="block text-small text-fg-muted">{t('menu.showHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
