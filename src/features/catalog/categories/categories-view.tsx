'use client';

import { ChevronsDownUp, ChevronsUpDown, FolderTree, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import type { ShopLocale } from '../locale-switcher';
import type { LinkedImage } from '../media/links';
import { moveCategory } from './actions';
import { CategoryEditor } from './category-editor';
import { CategoryTree } from './category-tree';
import { ancestry, flatten } from './tree';

type Node = Schemas['CategoryNodeDto'];

export function CategoriesView({
  tree,
  selected,
  newParentId,
  creating,
  locales,
  websites,
  images,
  canWrite,
}: {
  tree: Node[];
  selected: Node | null;
  newParentId: string | null;
  creating: boolean;
  locales: ShopLocale[];
  websites: Schemas['WebsiteDto'][];
  images: LinkedImage[];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [moving, startMove] = useTransition();
  const [query, setQuery] = useState('');
  // Expanded by default down to the selected category; everything deeper starts collapsed.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const open = new Set(selected ? ancestry(tree, selected.id) : []);
    return new Set(
      flatten(tree)
        .filter((f) => f.childCount && f.depth >= 1 && !open.has(f.id))
        .map((f) => f.id),
    );
  });
  const all = flatten(tree);

  const go = (href: string) => router.push(href, { scroll: false });
  const onMove = (id: string, parentId: string | null, index: number) =>
    startMove(async () => {
      if (parentId) setCollapsed((c) => new Set([...c].filter((x) => x !== parentId)));
      await runAction(moveCategory(id, parentId, index), { success: t('cat.moved') });
      router.refresh();
    });

  return (
    <>
      <PageHeader
        title={t('cat.title')}
        description={t('cat.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('cat.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => go('/categories?new=root')}>
              <Plus />
              {t('cat.new')}
            </Button>
          )
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Card className="overflow-hidden lg:sticky lg:top-[calc(var(--header-height)+24px)]">
          <div className="flex items-center gap-1.5 border-b border-border p-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('cat.search')}
              aria-label={t('cat.search')}
              className="focus-ring h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-body text-fg placeholder:text-fg-subtle"
            />
            <Tooltip content={t('cat.expandAll')}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('cat.expandAll')}
                onClick={() => setCollapsed(new Set())}
              >
                <ChevronsUpDown />
              </Button>
            </Tooltip>
            <Tooltip content={t('cat.collapseAll')}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('cat.collapseAll')}
                onClick={() =>
                  setCollapsed(new Set(all.filter((f) => f.childCount).map((f) => f.id)))
                }
              >
                <ChevronsDownUp />
              </Button>
            </Tooltip>
          </div>
          <div
            className="relative max-h-[calc(100dvh-260px)] overflow-y-auto p-2"
            aria-busy={moving}
          >
            {moving && (
              <div className="absolute inset-0 z-10 flex items-start justify-center bg-surface/60 pt-10">
                <Spinner />
              </div>
            )}
            {tree.length ? (
              <CategoryTree
                tree={tree}
                selectedId={selected?.id ?? null}
                collapsed={collapsed}
                onToggle={(id) =>
                  setCollapsed((c) => {
                    const next = new Set(c);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onMove={onMove}
                onAddChild={(id) => go(`/categories?new=${id}`)}
                canWrite={canWrite}
                query={query}
              />
            ) : (
              <EmptyState
                icon={<FolderTree />}
                title={t('cat.empty')}
                description={t('cat.emptyBody')}
              />
            )}
          </div>
          {canWrite && tree.length > 1 && (
            <p className="border-t border-border px-4 py-2.5 text-caption text-fg-muted">
              {t('cat.dragHint')}
            </p>
          )}
        </Card>

        <div className="min-w-0">
          {selected || creating ? (
            <CategoryEditor
              key={selected?.id ?? `new-${newParentId}`}
              category={selected}
              parentId={newParentId}
              tree={tree}
              locales={locales}
              websites={websites}
              images={images}
              canWrite={canWrite}
            />
          ) : (
            <Card>
              <EmptyState
                icon={<FolderTree />}
                title={t('cat.pick')}
                description={t('cat.pickBody')}
                action={
                  canWrite && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => go('/categories?new=root')}
                    >
                      <Plus />
                      {t('cat.new')}
                    </Button>
                  )
                }
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
