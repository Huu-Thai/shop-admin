'use client';

import { ArrowDown, ArrowUp, GalleryHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../catalog/locale-switcher';
import { SubNav } from '../catalog/catalog-tabs';
import { ImageField, useImage } from '../content/image-field';
import { LINK, MERCH_TABS } from '../content/tabs';
import { PublishPanel } from '../publishing/publishing';
import {
  createSlide,
  deleteSlide,
  deleteSlider,
  publishSlider,
  reorderSlides,
  updateSlide,
} from './actions';
import { SliderSheet } from './slider-sheet';

type Slider = Schemas['SliderDto'];
type Slide = Schemas['SlideDto'];

/** A slider's slides (image, copy per language, link) in order, plus its publishing. */
export function SliderDetail({
  slider,
  locales,
  stores,
  canWrite,
  canPublish,
}: {
  slider: Slider;
  locales: ShopLocale[];
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
  canPublish: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [slide, setSlide] = useState<Slide | 'new' | null>(null);
  const slides = [...slider.slides].sort((a, b) => a.position - b.position);
  const [busy, setBusy] = useState(false);

  const move = async (index: number, dir: -1 | 1) => {
    const order = slides.map((s) => s.id);
    [order[index], order[index + dir]] = [order[index + dir], order[index]];
    setBusy(true);
    const ok = await runAction(reorderSlides(slider.id, order), { success: t('sld.reordered') });
    setBusy(false);
    if (ok !== undefined) router.refresh();
  };
  const publish = async (unpublish: boolean, at?: string) => {
    const ok = await runAction(publishSlider(slider.id, at ? { at } : {}, unpublish), {
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
  const label = (s: Slide) =>
    s.translations.find((x) => x.localeCode === locales[0]?.code)?.title ??
    s.translations.find((x) => x.title)?.title ??
    null;

  return (
    <>
      <PageHeader
        title={slider.name}
        description={
          slider.autoplayMs
            ? t('sld.autoplayEvery', { n: slider.autoplayMs / 1000 })
            : t('sld.manual')
        }
        breadcrumbs={[
          { label: t('nav.content') },
          { label: t('sld.title'), href: '/merchandising/sliders' },
          { label: slider.name },
        ]}
        actions={
          canWrite && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                {t('common.edit')}
              </Button>
              <Button onClick={() => setSlide('new')}>
                <Plus />
                {t('sld.addSlide')}
              </Button>
            </>
          )
        }
      />
      <SubNav items={MERCH_TABS} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title={t('sld.slides')}
            description={t('sld.slidesHint', { n: slides.length })}
          />
          <CardBody className="pt-4">
            {slides.length ? (
              <ol className="grid grid-cols-1 gap-3">
                {slides.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 sm:flex-nowrap sm:gap-4"
                  >
                    <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-caption font-semibold text-fg-muted">
                      {i + 1}
                    </span>
                    <SlideThumb imageId={s.imageId} />
                    <span className="min-w-0 flex-1 basis-32">
                      <span className="block truncate font-medium">
                        {label(s) ?? t('sld.untitled')}
                      </span>
                      <span className="block truncate font-mono text-caption text-fg-muted">
                        {s.linkUrl ?? t('sld.noLink')}
                      </span>
                    </span>
                    {!s.isActive && <Badge tone="neutral">{t('sld.hidden')}</Badge>}
                    {canWrite && (
                      <span className="ml-auto flex items-center gap-0.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('sld.moveUp')}
                          disabled={busy || i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('sld.moveDown')}
                          disabled={busy || i === slides.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t('common.edit')}
                          onClick={() => setSlide(s)}
                        >
                          <Pencil />
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon={<GalleryHorizontal />}
                title={t('sld.noSlides')}
                description={t('sld.noSlidesBody')}
                action={
                  canWrite && (
                    <Button size="sm" onClick={() => setSlide('new')}>
                      <Plus />
                      {t('sld.addSlide')}
                    </Button>
                  )
                }
              />
            )}
          </CardBody>
        </Card>
        <div className="grid gap-6">
          <PublishPanel
            item={slider}
            canWrite={canPublish}
            onPublish={(at) => publish(false, at)}
            onUnpublish={(at) => publish(true, at)}
          />
          <Card>
            <CardHeader title={t('common.details')} />
            <CardBody className="pt-4">
              <dl className="grid gap-2 text-small">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">{t('common.code')}</dt>
                  <dd className="font-mono">{slider.code}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">{t('stores.store')}</dt>
                  <dd className="font-medium">
                    {slider.storeId
                      ? (stores.find((s) => s.id === slider.storeId)?.name ?? '—')
                      : t('cms.allStores')}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          {canWrite && (
            <Confirm
              trigger={
                <Button variant="ghost" className="justify-self-start text-danger-fg">
                  <Trash2 />
                  {t('sld.delete')}
                </Button>
              }
              title={t('cms.deleteTitle', { title: slider.name })}
              description={t('sld.deleteBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const ok = await runAction(deleteSlider(slider.id), { success: t('cms.deleted') });
                if (ok !== undefined) router.push('/merchandising/sliders');
                return ok !== undefined;
              }}
            />
          )}
        </div>
      </div>
      {editing && <SliderSheet slider={slider} stores={stores} onClose={() => setEditing(false)} />}
      {slide && (
        <SlideSheet
          sliderId={slider.id}
          slide={slide === 'new' ? null : slide}
          position={slides.length}
          locales={locales}
          onClose={() => setSlide(null)}
        />
      )}
    </>
  );
}

function SlideThumb({ imageId }: { imageId: string | null }) {
  const src = useImage(imageId).image?.thumbnailUrl ?? null;
  return (
    <span className="relative block aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-surface-muted">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- media URLs come from the shop's CDN
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}

function SlideSheet({
  sliderId,
  slide,
  position,
  locales,
  onClose,
}: {
  sliderId: string;
  slide: Slide | null;
  position: number;
  locales: ShopLocale[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [imageId, setImageId] = useState(slide?.imageId ?? null);
  const [linkUrl, setLinkUrl] = useState(slide?.linkUrl ?? '');
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);
  const [tr, setTr] = useState<
    Record<string, { title: string; caption: string; ctaLabel: string }>
  >(
    Object.fromEntries(
      (slide?.translations ?? []).map((x) => [
        x.localeCode,
        { title: x.title ?? '', caption: x.caption ?? '', ctaLabel: x.ctaLabel ?? '' },
      ]),
    ),
  );
  const [locale, setLocale] = useState(locales[0]?.code ?? 'en-US');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const cur = tr[locale] ?? { title: '', caption: '', ctaLabel: '' };
  const setCur = (patch: Partial<typeof cur>) =>
    setTr((x) => ({ ...x, [locale]: { ...cur, ...patch } }));
  const errors = {
    image: !imageId ? t('sld.err.image') : undefined,
    link: linkUrl.trim() && !LINK.test(linkUrl.trim()) ? t('html.err.link') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (errors.image || errors.link) return;
    setSaving(true);
    const translations = Object.entries(tr)
      .filter(([, x]) => x.title.trim() || x.caption.trim() || x.ctaLabel.trim())
      .map(([localeCode, x]) => ({
        localeCode,
        title: x.title.trim(),
        caption: x.caption.trim(),
        ctaLabel: x.ctaLabel.trim(),
      }));
    const kept = new Set(translations.map((x) => x.localeCode));
    const removeLocales = (slide?.translations ?? [])
      .map((x) => x.localeCode)
      .filter((c) => !kept.has(c));
    const body = { imageId, linkUrl: linkUrl.trim() || null, isActive, translations };
    const ok = slide
      ? await runAction(
          updateSlide(sliderId, slide.id, {
            ...body,
            ...(removeLocales.length ? { removeLocales } : {}),
          }),
          {
            success: t('common.saved'),
          },
        )
      : await runAction(createSlide(sliderId, { ...body, position }), {
          success: t('sld.slideAdded'),
        });
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={slide ? t('sld.editSlide') : t('sld.addSlide')}
        footer={
          <>
            {slide && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('sld.deleteSlide')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteSlide(sliderId, slide.id), {
                    success: t('sld.slideDeleted'),
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
          <div className="grid gap-1.5">
            <Label htmlFor="sd-image">
              {t('ban.image')} <span className="text-danger-fg">*</span>
            </Label>
            <ImageField
              id="sd-image"
              value={imageId}
              onChange={setImageId}
              aspect="aspect-[21/9]"
            />
            {touched && errors.image && <p className="text-small text-danger-fg">{errors.image}</p>}
          </div>
          <Field
            id="sd-link"
            label={t('ban.link')}
            hint={t('html.urlHint')}
            error={touched ? errors.link : undefined}
          >
            <Input
              id="sd-link"
              className="font-mono"
              placeholder="/new-in"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 rounded-lg border border-border p-4">
            <LocaleSwitcher locales={locales} value={locale} onChange={setLocale} />
            <Field id="sd-title" label={`${t('ban.headline')} · ${locale}`}>
              <Input
                id="sd-title"
                value={cur.title}
                onChange={(e) => setCur({ title: e.target.value })}
              />
            </Field>
            <Field id="sd-caption" label={`${t('sld.caption')} · ${locale}`}>
              <Input
                id="sd-caption"
                value={cur.caption}
                onChange={(e) => setCur({ caption: e.target.value })}
              />
            </Field>
            <Field id="sd-cta" label={`${t('ban.cta')} · ${locale}`}>
              <Input
                id="sd-cta"
                className="max-w-72"
                value={cur.ctaLabel}
                onChange={(e) => setCur({ ctaLabel: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('sld.showSlide')}</span>
              <span className="block text-small text-fg-muted">{t('sld.showSlideHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
