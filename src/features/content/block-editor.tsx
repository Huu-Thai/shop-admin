'use client';

import { Copy, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox, type ComboOption } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { flatten } from '../catalog/categories/tree';
import { LocaleSwitcher, type ShopLocale } from '../catalog/locale-switcher';
import { pickLocalized } from '../catalog/shared';
import { productSearch } from '../marketing/rule-builder';
import { PublishPanel } from '../publishing/publishing';
import {
  addPlacement,
  createBlock,
  deleteBlock,
  publishBlock,
  removePlacement,
  updateBlock,
} from './actions';
import { blockToken } from './html-edit';
import { HtmlEditor } from './html-editor';
import { IDENTIFIER, REGION } from './tabs';

type Block = Schemas['BlockDto'];
type Placement = Schemas['PlacementDto'];
type TargetType = Schemas['BlockTargetType'];
const ALL_STORES = '__all';
const TARGETS: TargetType[] = ['PAGE', 'POST', 'CATEGORY', 'PRODUCT'];
const REGIONS = ['sidebar', 'top', 'bottom', 'content.before', 'content.after'];

export interface BlockContext {
  locales: ShopLocale[];
  stores: Schemas['StoreDto'][];
  blocks: string[];
  tree: Schemas['CategoryNodeDto'][];
  nameLocale?: string;
}

/** Reusable HTML snippets: embedded in content with a token, or placed on pages, posts, categories and products. */
export function BlockEditor({
  block,
  placements,
  targetLabels,
  ctx,
  canWrite,
  canPublish,
}: {
  block: Block | null;
  placements: Placement[];
  /** targetId → readable name. */
  targetLabels: Record<string, string>;
  ctx: BlockContext;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const defaultLocale = ctx.locales[0]?.code ?? 'en-US';
  const initial = useMemo(
    () => ({
      identifier: block?.identifier ?? '',
      storeId: block?.storeId ?? ALL_STORES,
      tr: Object.fromEntries(
        (block?.translations ?? []).map((x) => [
          x.localeCode,
          { title: x.title ?? '', content: x.content },
        ]),
      ) as Record<string, { title: string; content: string }>,
    }),
    [block],
  );
  const [draft, setDraft] = useState(initial);
  const [base, setBase] = useState(initial);
  if (base !== initial) {
    setBase(initial);
    setDraft(initial);
  }
  const [locale, setLocale] = useState(defaultLocale);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const cur = draft.tr[locale] ?? { title: '', content: '' };
  const setTr = (patch: Partial<typeof cur>) =>
    setDraft((d) => ({ ...d, tr: { ...d.tr, [locale]: { ...cur, ...patch } } }));
  const errors = {
    identifier: !IDENTIFIER.test(draft.identifier) ? t('cms.err.identifier') : undefined,
    content: !draft.tr[defaultLocale]?.content.trim()
      ? t('cms.err.blockContent', { locale: defaultLocale })
      : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.identifier || errors.content) {
      if (errors.content) setLocale(defaultLocale);
      return;
    }
    setSaving(true);
    const translations = Object.entries(draft.tr)
      .filter(([, x]) => x.content.trim())
      .map(([localeCode, x]) => ({
        localeCode,
        content: x.content,
        ...(x.title.trim() ? { title: x.title.trim() } : {}),
      }));
    const kept = new Set(translations.map((x) => x.localeCode));
    const removeLocales = (block?.translations ?? [])
      .map((x) => x.localeCode)
      .filter((c) => !kept.has(c));
    const result = block
      ? await runAction(
          updateBlock(block.id, {
            translations,
            ...(removeLocales.length ? { removeLocales } : {}),
          }),
          {
            success: t('common.saved'),
          },
        )
      : await runAction(
          createBlock({
            identifier: draft.identifier,
            storeId: draft.storeId === ALL_STORES ? null : draft.storeId,
            translations,
          }),
          { success: t('cms.blockCreated') },
        );
    setSaving(false);
    if (!result) return;
    setTouched(false);
    if (block) router.refresh();
    else router.push(`/content/blocks/${result.id}`);
  };

  const publish = async (unpublish: boolean, at?: string) => {
    if (!block) return false;
    const ok = await runAction(publishBlock(block.id, at ? { at } : {}, unpublish), {
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

  const token = blockToken(draft.identifier || 'identifier');
  const heading = block ? block.identifier : t('cms.newBlock');

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{heading}</span>}
        description={block ? undefined : t('cms.blockHint')}
        breadcrumbs={[
          { label: t('nav.content') },
          { label: t('cms.blocks'), href: '/content/blocks' },
          { label: heading },
        ]}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardBody className="grid gap-5">
              {!block && (
                <Field
                  id="bl-identifier"
                  label={t('cms.identifier')}
                  required
                  hint={t('cms.identifierHint')}
                  error={touched ? errors.identifier : undefined}
                >
                  <Input
                    id="bl-identifier"
                    autoFocus
                    className="font-mono"
                    placeholder="free-shipping-note"
                    value={draft.identifier}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, identifier: e.target.value.toLowerCase() }))
                    }
                  />
                </Field>
              )}
              <LocaleSwitcher
                locales={ctx.locales}
                value={locale}
                onChange={setLocale}
                missing={ctx.locales.map((l) => l.code).filter((c) => !draft.tr[c]?.content.trim())}
              />
              <Field
                id="bl-title"
                label={`${t('cms.blockTitle')} · ${locale}`}
                hint={t('cms.blockTitleHint')}
              >
                <Input
                  id="bl-title"
                  disabled={!canWrite}
                  value={cur.title}
                  onChange={(e) => setTr({ title: e.target.value })}
                />
              </Field>
              <div className="grid gap-1.5">
                <Label htmlFor="bl-content">
                  {t('cms.content')} · {locale}
                  {locale === defaultLocale && <span className="text-danger-fg"> *</span>}
                </Label>
                <HtmlEditor
                  id="bl-content"
                  rows={10}
                  value={cur.content}
                  onChange={(content) => setTr({ content })}
                  blocks={ctx.blocks.filter((b) => b !== draft.identifier)}
                  disabled={!canWrite}
                  invalid={touched && locale === defaultLocale && !!errors.content}
                />
                {touched && locale === defaultLocale && errors.content && (
                  <p className="text-small text-danger-fg">{errors.content}</p>
                )}
              </div>
            </CardBody>
          </Card>
          {block && (
            <PlacementsCard
              blockId={block.id}
              placements={placements}
              targetLabels={targetLabels}
              ctx={ctx}
              canWrite={canWrite}
              onAdd={() => setAdding(true)}
            />
          )}
        </div>
        <div className="grid gap-6">
          {block && (
            <PublishPanel
              item={block}
              canWrite={canPublish}
              onPublish={(at) => publish(false, at)}
              onUnpublish={(at) => publish(true, at)}
            />
          )}
          <Card>
            <CardHeader title={t('cms.embed')} description={t('cms.embedHint')} />
            <CardBody className="grid gap-3 pt-4">
              <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-small">{token}</code>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t('cms.copyToken')}
                  onClick={async () => {
                    await navigator.clipboard?.writeText(token).catch(() => undefined);
                    toast.success(t('coupon.copied'));
                  }}
                >
                  <Copy />
                </Button>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('cms.settings')} />
            <CardBody className="grid gap-1.5 pt-4">
              <Label htmlFor="bl-store">{t('stores.store')}</Label>
              <Select
                value={draft.storeId}
                disabled={!!block || !canWrite}
                onValueChange={(storeId) => setDraft((d) => ({ ...d, storeId }))}
              >
                <SelectTrigger id="bl-store" />
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
                {block ? t('cms.storeLocked') : t('cms.blockStoreHint')}
              </p>
            </CardBody>
          </Card>
          {block && canWrite && (
            <Confirm
              trigger={
                <Button variant="ghost" className="justify-self-start text-danger-fg">
                  <Trash2 />
                  {t('cms.deleteBlock')}
                </Button>
              }
              title={t('cms.deleteTitle', { title: block.identifier })}
              description={t('cms.deleteBlockBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const ok = await runAction(deleteBlock(block.id), { success: t('cms.deleted') });
                if (ok !== undefined) router.push('/content/blocks');
                return ok !== undefined;
              }}
            />
          )}
        </div>
      </div>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => (block ? setDraft(initial) : router.push('/content/blocks'))}
          message={block ? t('common.unsaved') : t('cms.unsavedNew')}
          saveLabel={block ? t('common.save') : t('cms.create')}
          discardLabel={block ? t('common.discard') : t('common.cancel')}
        />
      )}
      {adding && block && (
        <PlacementDialog blockId={block.id} ctx={ctx} onClose={() => setAdding(false)} />
      )}
    </>
  );
}

function PlacementsCard({
  blockId,
  placements,
  targetLabels,
  canWrite,
  onAdd,
}: {
  blockId: string;
  placements: Placement[];
  targetLabels: Record<string, string>;
  ctx: BlockContext;
  canWrite: boolean;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const sorted = [...placements].sort(
    (a, b) =>
      a.targetType.localeCompare(b.targetType) ||
      a.region.localeCompare(b.region) ||
      a.position - b.position,
  );
  return (
    <Card>
      <CardHeader
        title={t('cms.placements')}
        description={t('cms.placementsHint')}
        actions={
          canWrite && (
            <Button size="sm" variant="secondary" onClick={onAdd}>
              <Plus />
              {t('cms.addPlacement')}
            </Button>
          )
        }
      />
      <CardBody className="pt-4">
        {sorted.length ? (
          <ul className="grid gap-2">
            {sorted.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <Badge tone="neutral">{t(`cms.target.${p.targetType}` as MessageKey)}</Badge>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {targetLabels[p.targetId] ?? p.targetId}
                </span>
                <code className="font-mono text-small text-fg-muted">
                  {p.region} · {p.position}
                </code>
                {canWrite && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-fg-muted hover:text-danger-fg"
                    aria-label={t('cms.removePlacement')}
                    onClick={async () => {
                      const ok = await runAction(removePlacement(blockId, p.id), {
                        success: t('cms.placementRemoved'),
                      });
                      if (ok !== undefined) router.refresh();
                    }}
                  >
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-fg-muted">{t('cms.noPlacements')}</p>
        )}
      </CardBody>
    </Card>
  );
}

/** Search CMS pages or posts by title for the placement target. */
function contentSearch(kind: 'pages' | 'posts', adminLocale: string) {
  return async (query: string): Promise<ComboOption[]> => {
    const q = new URLSearchParams({ limit: '20' });
    if (query) q.set('search', query);
    const list = await gw<{ data: Schemas['PageDto'][] }>(`cms/${kind}?${q}`);
    return list.data.map((x) => ({
      value: x.id,
      label: pickLocalized(x.translations, adminLocale)?.title || x.id,
      hint: `/${pickLocalized(x.translations, adminLocale)?.slug ?? ''}`,
    }));
  };
}

function PlacementDialog({
  blockId,
  ctx,
  onClose,
}: {
  blockId: string;
  ctx: BlockContext;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [targetType, setTargetType] = useState<TargetType>('PAGE');
  const [targetId, setTargetId] = useState('');
  const [region, setRegion] = useState('sidebar');
  const [position, setPosition] = useState('0');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const errors = {
    target: !targetId ? t('cms.err.target') : undefined,
    region: !REGION.test(region) ? t('cms.err.region') : undefined,
    position: !/^\d{1,4}$/.test(position) ? t('price.err.priority') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const ok = await runAction(
      addPlacement(blockId, { targetType, targetId, region, position: Number(position) }),
      {
        success: t('cms.placementAdded'),
      },
    );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('cms.addPlacement')}
        description={t('cms.placementDialogHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('cms.addPlacement')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div className="grid content-start gap-1.5">
            <Label htmlFor="pl-type">{t('cms.showOn')}</Label>
            <Select
              value={targetType}
              onValueChange={(v) => {
                setTargetType(v as TargetType);
                setTargetId('');
              }}
            >
              <SelectTrigger id="pl-type" />
              <SelectContent>
                {TARGETS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {t(`cms.target.${x}` as MessageKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor="pl-target">{t(`cms.target.${targetType}` as MessageKey)}</Label>
            <Combobox
              key={targetType}
              id="pl-target"
              value={targetId ? [targetId] : []}
              onChange={([v]) => setTargetId(v ?? '')}
              {...(targetType === 'CATEGORY'
                ? { options: categories }
                : { load: loaders[targetType] })}
              placeholder={t('common.select')}
              searchPlaceholder={t('common.search')}
              emptyText={t('common.noResults')}
              invalid={touched && !!errors.target}
            />
            {touched && errors.target && (
              <p className="text-small text-danger-fg">{errors.target}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field
            id="pl-region"
            label={t('cms.region')}
            hint={t('cms.regionHint')}
            error={touched ? errors.region : undefined}
          >
            <Input
              id="pl-region"
              list="pl-regions"
              className="font-mono"
              value={region}
              onChange={(e) => setRegion(e.target.value.toLowerCase())}
            />
          </Field>
          <Field
            id="pl-position"
            label={t('common.position')}
            error={touched ? errors.position : undefined}
          >
            <Input
              id="pl-position"
              inputMode="numeric"
              className="tabular"
              value={position}
              onChange={(e) => setPosition(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
        <datalist id="pl-regions">
          {REGIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </DialogContent>
    </Dialog>
  );
}
