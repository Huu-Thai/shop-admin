'use client';

import { Layers3, MoreHorizontal, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/overlays';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { ImageLinksEditor } from '../media/image-links-editor';
import { fromLinks, type LinkedImage, toLinks } from '../media/links';
import { labelOf, SKU_PATTERN, stableJson } from '../shared';
import { createVariant, deleteVariant, setVariantImages, updateVariant } from './actions';
import { combinations, missing, type Options, suggestSku } from './variants';

type Product = Schemas['ProductDto'];
type Variant = Schemas['VariantDto'];
type Attribute = Schemas['AttributeDto'];

interface Axis {
  code: string;
  label: string;
  options: { code: string; label: string; swatch: string | null }[];
}

function useAxes(product: Product, attributes: Attribute[]): Axis[] {
  const { locale } = useI18n();
  return useMemo(
    () =>
      product.configurableAttributes.flatMap((code) => {
        const a = attributes.find((x) => x.code === code);
        if (!a) return [];
        return [
          {
            code,
            label: labelOf(a.labels, locale, code),
            options: [...a.options]
              .sort((x, y) => x.position - y.position)
              .map((o) => ({
                code: o.code,
                label: labelOf(o.labels, locale, o.code),
                swatch: o.swatch,
              })),
          },
        ];
      }),
    [product.configurableAttributes, attributes, locale],
  );
}

function OptionChips({ values, axes }: { values: Options; axes: Axis[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {axes.map((ax) => {
        const o = ax.options.find((x) => x.code === values[ax.code]);
        return (
          <span
            key={ax.code}
            className="inline-flex h-6 items-center gap-1.5 rounded-sm bg-surface-muted px-2 text-small text-fg"
          >
            {o?.swatch && (
              <span
                aria-hidden
                className="size-3 rounded-full border border-border-strong"
                style={{ background: o.swatch }}
              />
            )}
            <span className="text-fg-muted">{ax.label}:</span>
            {o?.label ?? values[ax.code] ?? '—'}
          </span>
        );
      })}
    </span>
  );
}

export function VariantsPanel({
  product,
  attributes,
  canWrite,
}: {
  product: Product;
  attributes: Attribute[];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const axes = useAxes(product, attributes);
  const [editing, setEditing] = useState<Variant | 'new' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [removing, setRemoving] = useState<Variant | null>(null);
  const variants = [...product.variants].sort((a, b) => a.position - b.position);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('var.title')}
        description={t('var.hint', { axes: axes.map((a) => a.label).join(' × ') })}
        actions={
          canWrite && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setGenerating(true)}>
                <Wand2 />
                {t('var.generate')}
              </Button>
              <Button size="sm" onClick={() => setEditing('new')}>
                <Plus />
                {t('var.add')}
              </Button>
            </>
          )
        }
      />
      <div className="mt-4">
        {variants.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('var.options')}</TH>
                <TH>SKU</TH>
                <TH>{t('common.status')}</TH>
                <TH data-align="right" className="hidden sm:table-cell">
                  {t('prod.weight')}
                </TH>
                <TH className="w-12">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {variants.map((v) => (
                <TR key={v.id}>
                  <TD>
                    <OptionChips values={v.optionValues} axes={axes} />
                  </TD>
                  <TD className="font-mono text-small">{v.sku}</TD>
                  <TD>
                    <Badge tone={v.status === 'ENABLED' ? 'success' : 'neutral'} dot>
                      {v.status === 'ENABLED' ? t('common.enabled') : t('common.disabled')}
                    </Badge>
                  </TD>
                  <TD data-align="right" className="hidden text-fg-muted sm:table-cell">
                    {v.weightGrams != null ? `${v.weightGrams} g` : '—'}
                  </TD>
                  <TD>
                    {canWrite && (
                      <Menu>
                        <MenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t('list.actions')} · ${v.sku}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem onSelect={() => setEditing(v)}>
                            <Pencil />
                            {t('common.edit')}
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem destructive onSelect={() => setRemoving(v)}>
                            <Trash2 />
                            {t('common.delete')}
                          </MenuItem>
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
            icon={<Layers3 />}
            title={t('var.empty')}
            description={t('var.emptyBody')}
            action={
              canWrite && (
                <Button size="sm" onClick={() => setGenerating(true)}>
                  <Wand2 />
                  {t('var.generate')}
                </Button>
              )
            }
          />
        )}
      </div>

      {editing && (
        <VariantSheet
          key={editing === 'new' ? 'new' : editing.id}
          product={product}
          variant={editing === 'new' ? null : editing}
          axes={axes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {generating && (
        <GenerateDialog
          product={product}
          axes={axes}
          onClose={() => setGenerating(false)}
          onDone={() => {
            setGenerating(false);
            router.refresh();
          }}
        />
      )}
      <Confirm
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('var.deleteTitle', { sku: removing?.sku ?? '' })}
        description={t('var.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={async () => {
          if (!removing) return;
          const ok = await runAction(deleteVariant(product.id, removing.id), {
            success: t('var.deleted'),
          });
          if (ok !== undefined) router.refresh();
          return ok !== undefined;
        }}
      />
    </Card>
  );
}

function VariantSheet({
  product,
  variant,
  axes,
  onClose,
  onSaved,
}: {
  product: Product;
  variant: Variant | null;
  axes: Axis[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [options, setOptions] = useState<Options>(variant?.optionValues ?? {});
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [skuEdited, setSkuEdited] = useState(!!variant);
  const [enabled, setEnabled] = useState(variant ? variant.status === 'ENABLED' : true);
  const [weight, setWeight] = useState(
    variant?.weightGrams != null ? String(variant.weightGrams) : '',
  );
  const [images, setImages] = useState<LinkedImage[]>([]);
  const [initialImages, setInitialImages] = useState<LinkedImage[]>([]);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!variant) return;
    void gw<Schemas['ImageLinkViewDto'][]>(
      `products/${product.id}/variants/${variant.id}/images`,
    ).then((links) => {
      setImages(fromLinks(links));
      setInitialImages(fromLinks(links));
    });
  }, [product.id, variant]);

  const order = axes.map((a) => a.code);
  const errors = {
    options: axes.some((a) => !options[a.code]) ? t('var.err.options') : undefined,
    sku: !SKU_PATTERN.test(sku) ? t('prod.err.sku') : undefined,
    weight: weight.trim() && !/^\d+$/.test(weight.trim()) ? t('prod.err.weight') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.options || errors.sku || errors.weight) return;
    setSaving(true);
    try {
      const body = {
        sku: sku.trim(),
        options,
        status: (enabled ? 'ENABLED' : 'DISABLED') as Schemas['ProductStatus'],
        ...(weight.trim() ? { weightGrams: Number(weight) } : {}),
      };
      const saved = variant
        ? await runAction(
            updateVariant(product.id, variant.id, {
              ...body,
              weightGrams: weight.trim() ? Number(weight) : null,
            }),
          )
        : await runAction(createVariant(product.id, body));
      if (!saved) return;
      if (variant && stableJson(toLinks(images)) !== stableJson(toLinks(initialImages))) {
        const ok = await runAction(setVariantImages(product.id, variant.id, toLinks(images)));
        if (!ok) return;
      }
      toast.success(variant ? t('common.saved') : t('var.created'));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={variant ? variant.sku : t('var.add')}
        description={t('var.sheetHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {variant ? t('common.save') : t('var.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {axes.map((ax) => (
              <div key={ax.code} className="grid gap-1.5">
                <Label htmlFor={`v-${ax.code}`}>
                  {ax.label}
                  <span aria-hidden className="ml-0.5 text-danger">
                    *
                  </span>
                </Label>
                <Select
                  value={options[ax.code] ?? ''}
                  onValueChange={(v) => {
                    const next = { ...options, [ax.code]: v };
                    setOptions(next);
                    if (!skuEdited) setSku(suggestSku(product.sku, next, order));
                  }}
                >
                  <SelectTrigger
                    id={`v-${ax.code}`}
                    placeholder={t('common.select')}
                    aria-invalid={(touched && !options[ax.code]) || undefined}
                  />
                  <SelectContent>
                    {ax.options.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        <span className="flex items-center gap-2">
                          {o.swatch && (
                            <span
                              aria-hidden
                              className="size-3.5 rounded-full border border-border-strong"
                              style={{ background: o.swatch }}
                            />
                          )}
                          {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {touched && errors.options && (
            <p role="alert" className="-mt-3 text-small text-danger-fg">
              {errors.options}
            </p>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="v-sku" label="SKU" required error={touched ? errors.sku : undefined}>
              <Input
                id="v-sku"
                value={sku}
                className="font-mono"
                onChange={(e) => {
                  setSkuEdited(true);
                  setSku(e.target.value);
                }}
              />
            </Field>
            <Field
              id="v-weight"
              label={t('prod.weight')}
              hint={t('var.weightHint')}
              error={touched ? errors.weight : undefined}
            >
              <div className="relative">
                <Input
                  id="v-weight"
                  inputMode="numeric"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="tabular pr-10"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-small text-fg-muted">
                  g
                </span>
              </div>
            </Field>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
            <span className="grid gap-0.5">
              <span className="text-body font-medium text-fg">{t('prod.enabled')}</span>
              <span className="text-small text-fg-muted">{t('var.enabledHint')}</span>
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
          {variant && (
            <div className="grid gap-3">
              <div>
                <h3 className="text-h4 text-fg">{t('cat.images')}</h3>
                <p className="text-small text-fg-muted">{t('var.imagesHint')}</p>
              </div>
              <ImageLinksEditor value={images} onChange={setImages} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GenerateDialog({
  product,
  axes,
  onClose,
  onDone,
}: {
  product: Product;
  axes: Axis[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [chosen, setChosen] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(axes.map((a) => [a.code, a.options.map((o) => o.code)])),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const wanted = combinations(axes.map((a) => ({ code: a.code, options: chosen[a.code] ?? [] })));
  const toCreate = missing(
    product.variants.map((v) => v.optionValues),
    wanted,
  );
  const order = axes.map((a) => a.code);

  const run = async () => {
    setRunning(true);
    let ok = 0;
    const failed: string[] = [];
    for (const options of toCreate) {
      const sku = suggestSku(product.sku, options, order);
      const r = await createVariant(product.id, { sku, options, status: 'ENABLED' });
      if (r.ok) ok++;
      else failed.push(`${sku}: ${r.error}`);
      setDone((d) => d + 1);
    }
    setRunning(false);
    if (ok) toast.success(t('var.generated', { n: ok }));
    if (failed.length)
      toast.error(t('var.generateFailed', { n: failed.length }), {
        description: failed.slice(0, 3).join(' · '),
      });
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent
        title={t('var.generateTitle')}
        description={t('var.generateHint')}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" disabled={running}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button onClick={run} loading={running} disabled={!toCreate.length}>
              {running
                ? t('var.progress', { done, total: toCreate.length })
                : t('var.createN', { n: toCreate.length })}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {axes.map((ax) => (
            <div key={ax.code} className="grid gap-1.5">
              <Label htmlFor={`g-${ax.code}`}>{ax.label}</Label>
              <Combobox
                id={`g-${ax.code}`}
                multiple
                value={chosen[ax.code] ?? []}
                onChange={(v) => setChosen((c) => ({ ...c, [ax.code]: v }))}
                options={ax.options.map((o) => ({ value: o.code, label: o.label }))}
                disabled={running}
              />
            </div>
          ))}
          <p className="rounded-md bg-surface-muted px-3 py-2.5 text-small text-fg-muted">
            {t('var.preview', { total: wanted.length, n: toCreate.length })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
