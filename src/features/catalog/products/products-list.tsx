'use client';

import { MoreHorizontal, Package, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { flatten } from '../categories/tree';
import { pickLocalized } from '../shared';
import { deleteProduct, restoreProduct } from './actions';
import { PRODUCT_TYPES, TypeBadge, typeKey, visibilityKey } from './product-meta';

type Item = Schemas['ProductListItemDto'];

export function ProductsList({
  items,
  total,
  page,
  limit,
  sets,
  tree,
  websites,
  canWrite,
}: {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  sets: Schemas['AttributeSetDto'][];
  tree: Schemas['CategoryNodeDto'][];
  websites: Schemas['WebsiteDto'][];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const { params, set } = useQueryParams();
  const [deleting, setDeleting] = useState<Item | null>(null);
  const filtered = ['search', 'type', 'status', 'attributeSetId', 'categoryId', 'websiteId'].some(
    (k) => params.get(k),
  );
  const showDeleted = params.get('includeDeleted') === 'true';

  return (
    <>
      <PageHeader
        title={t('prod.title')}
        description={t('prod.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('prod.title') }]}
        actions={
          canWrite && (
            <Button asChild>
              <Link href="/products/new">
                <Plus />
                {t('prod.new')}
              </Link>
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('prod.search')} />
          <FilterSelect
            param="type"
            label={t('common.type')}
            allLabel={t('prod.allTypes')}
            options={PRODUCT_TYPES.map((ty) => ({ value: ty, label: t(typeKey(ty)) }))}
          />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('prod.allStatuses')}
            options={[
              { value: 'ENABLED', label: t('common.enabled') },
              { value: 'DISABLED', label: t('common.disabled') },
            ]}
          />
          {tree.length > 0 && (
            <FilterSelect
              param="categoryId"
              label={t('nav.categories')}
              allLabel={t('prod.allCategories')}
              options={flatten(tree).map((f) => ({
                value: f.id,
                label: `${'— '.repeat(f.depth)}${pickLocalized(f.node.translations, locale)?.name ?? '—'}`,
              }))}
            />
          )}
          {sets.length > 1 && (
            <FilterSelect
              param="attributeSetId"
              label={t('sets.title')}
              allLabel={t('prod.allSets')}
              options={sets.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          {websites.length > 1 && (
            <FilterSelect
              param="websiteId"
              label={t('common.websites')}
              allLabel={t('common.allWebsites')}
              options={websites.map((w) => ({ value: w.id, label: w.name }))}
            />
          )}
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-small text-fg-muted">
              <Switch
                checked={showDeleted}
                onCheckedChange={(v) => set({ includeDeleted: v ? 'true' : null })}
              />
              {t('prod.showDeleted')}
            </label>
            <FilterSelect
              param="sort"
              label={t('prod.sort')}
              allLabel={t('prod.sort.updatedAt')}
              options={[
                { value: 'sku', label: t('prod.sort.sku') },
                { value: 'createdAt', label: t('prod.sort.createdAt') },
              ]}
            />
          </div>
        </ListToolbar>
        {items.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('prod.product')}</TH>
                <TH>{t('common.type')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell">{t('prod.visibility')}</TH>
                <TH data-align="right" className="hidden md:table-cell">
                  {t('prod.variants')}
                </TH>
                <TH data-align="right" className="hidden sm:table-cell">
                  {t('common.updated')}
                </TH>
                <TH className="w-12">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {items.map((p) => (
                <TR key={p.id} className={p.deletedAt ? 'opacity-60' : undefined}>
                  <TD>
                    <Link
                      href={`/products/${p.id}`}
                      className="focus-ring block max-w-[360px] rounded-xs"
                    >
                      <span className="block truncate font-medium text-fg hover:underline">
                        {p.name ?? t('prod.untitled')}
                      </span>
                      <span className="block truncate font-mono text-caption text-fg-muted">
                        {p.sku}
                      </span>
                    </Link>
                  </TD>
                  <TD>
                    <TypeBadge type={p.type} label={t(typeKey(p.type))} />
                  </TD>
                  <TD>
                    {p.deletedAt ? (
                      <Badge tone="danger" dot>
                        {t('prod.deleted')}
                      </Badge>
                    ) : (
                      <Badge tone={p.status === 'ENABLED' ? 'success' : 'neutral'} dot>
                        {p.status === 'ENABLED' ? t('common.enabled') : t('common.disabled')}
                      </Badge>
                    )}
                  </TD>
                  <TD className="hidden text-fg-muted lg:table-cell">
                    {t(visibilityKey(p.visibility))}
                  </TD>
                  <TD data-align="right" className="hidden md:table-cell">
                    {p.type === 'CONFIGURABLE' ? p.variantCount : '—'}
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {formatDate(p.updatedAt, intl)}
                  </TD>
                  <TD>
                    {canWrite && (
                      <Menu>
                        <MenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t('list.actions')} · ${p.sku}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem onSelect={() => router.push(`/products/${p.id}`)}>
                            <Pencil />
                            {t('common.edit')}
                          </MenuItem>
                          <MenuSeparator />
                          {p.deletedAt ? (
                            <MenuItem
                              onSelect={async () => {
                                await runAction(restoreProduct(p.id), {
                                  success: t('prod.restored'),
                                });
                                router.refresh();
                              }}
                            >
                              <RotateCcw />
                              {t('common.restore')}
                            </MenuItem>
                          ) : (
                            <MenuItem destructive onSelect={() => setDeleting(p)}>
                              <Trash2 />
                              {t('common.delete')}
                            </MenuItem>
                          )}
                        </MenuContent>
                      </Menu>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Package />}
            title={filtered ? t('list.noMatch') : t('prod.empty')}
            description={filtered ? undefined : t('prod.emptyBody')}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({
                      search: null,
                      type: null,
                      status: null,
                      attributeSetId: null,
                      categoryId: null,
                      websiteId: null,
                    })
                  }
                >
                  {t('list.clearFilters')}
                </Button>
              ) : (
                canWrite && (
                  <Button asChild size="sm">
                    <Link href="/products/new">
                      <Plus />
                      {t('prod.new')}
                    </Link>
                  </Button>
                )
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      <Confirm
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('prod.deleteTitle', { sku: deleting?.sku ?? '' })}
        description={t('prod.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await runAction(deleteProduct(deleting.id), {
            success: t('prod.deletedToast'),
          });
          if (ok !== undefined) router.refresh();
          return ok !== undefined;
        }}
      />
    </>
  );
}
