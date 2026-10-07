'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../catalog/locale-switcher';
import { ImageField, useImage } from '../content/image-field';
import { LINK, PLACEMENTS, REGION } from '../content/tabs';
import { PublishPanel } from '../publishing/publishing';
import { createBanner, deleteBanner, publishBanner, updateBanner } from './actions';

type Banner = Schemas['BannerDto'];
const ALL_STORES = '__all';

interface Tr {
  title: string;
  subtitle: string;
  ctaLabel: string;
  imageId: string | null;
}
const blank = (): Tr => ({ title: '', subtitle: '', ctaLabel: '', imageId: null });

/** A promotional banner for a storefront slot, with per-language copy and artwork. */
export function BannerEditor({
  banner,
  locales,
  stores,
  canWrite,
  canPublish,
}: {
  banner: Banner | null;
  locales: ShopLocale[];
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
  canPublish: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const defaultLocale = locales[0]?.code ?? 'en-US';
  const initial = useMemo(
    () => ({
      name: banner?.name ?? '',
      placement: banner?.placement ?? 'home.hero',
      storeId: banner?.storeId ?? ALL_STORES,
      position: String(banner?.position ?? 0),
      linkUrl: banner?.linkUrl ?? '',
      imageId: banner?.imageId ?? null,
      tr: Object.fromEntries(
        (banner?.translations ?? []).map((x) => [
          x.localeCode,
          {
            title: x.title ?? '',
            subtitle: x.subtitle ?? '',
            ctaLabel: x.ctaLabel ?? '',
            imageId: x.imageId,
          },
        ]),
      ) as Record<string, Tr>,
    }),
    [banner],
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
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const cur = draft.tr[locale] ?? blank();
  const setTr = (patch: Partial<Tr>) =>
    setDraft((d) => ({ ...d, tr: { ...d.tr, [locale]: { ...cur, ...patch } } }));
  const errors = {
    name: !draft.name.trim() ? t('ban.err.name') : undefined,
    placement: !REGION.test(draft.placement) ? t('ban.err.placement') : undefined,
    position: !/^\d{1,4}$/.test(draft.position) ? t('price.err.priority') : undefined,
    linkUrl:
      draft.linkUrl.trim() && !LINK.test(draft.linkUrl.trim()) ? t('html.err.link') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const translations = Object.entries(draft.tr)
      .filter(([, x]) => x.title.trim() || x.subtitle.trim() || x.ctaLabel.trim() || x.imageId)
      .map(([localeCode, x]) => ({
        localeCode,
        title: x.title.trim(),
        subtitle: x.subtitle.trim(),
        ctaLabel: x.ctaLabel.trim(),
        imageId: x.imageId,
      }));
    const kept = new Set(translations.map((x) => x.localeCode));
    const removeLocales = (banner?.translations ?? [])
      .map((x) => x.localeCode)
      .filter((c) => !kept.has(c));
    const common = {
      name: draft.name.trim(),
      placement: draft.placement,
      position: Number(draft.position),
      linkUrl: draft.linkUrl.trim() || null,
      imageId: draft.imageId,
      translations,
    };
    const result = banner
      ? await runAction(
          updateBanner(banner.id, {
            ...common,
            ...(removeLocales.length ? { removeLocales } : {}),
          }),
          {
            success: t('common.saved'),
          },
        )
      : await runAction(
          createBanner({ ...common, storeId: draft.storeId === ALL_STORES ? null : draft.storeId }),
          {
            success: t('ban.created'),
          },
        );
    setSaving(false);
    if (!result) return;
    setTouched(false);
    if (banner) router.refresh();
    else router.push(`/merchandising/${result.id}`);
  };

  const publish = async (unpublish: boolean, at?: string) => {
    if (!banner) return false;
    const ok = await runAction(publishBanner(banner.id, at ? { at } : {}, unpublish), {
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

  const heading = banner ? banner.name : t('ban.new');

  return (
    <>
      <PageHeader
        title={heading}
        breadcrumbs={[
          { label: t('nav.content') },
          { label: t('ban.title'), href: '/merchandising' },
          { label: heading },
        ]}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <BannerPreview
            imageId={cur.imageId ?? draft.imageId}
            title={cur.title || draft.tr[defaultLocale]?.title || ''}
            subtitle={cur.subtitle || draft.tr[defaultLocale]?.subtitle || ''}
            cta={cur.ctaLabel || draft.tr[defaultLocale]?.ctaLabel || ''}
          />
          <Card>
            <CardHeader title={t('ban.copy')} description={t('ban.copyHint')} />
            <CardBody className="grid gap-5 pt-4">
              <LocaleSwitcher
                locales={locales}
                value={locale}
                onChange={setLocale}
                missing={locales.map((l) => l.code).filter((c) => !draft.tr[c]?.title.trim())}
              />
              <Field id="bn-title" label={`${t('ban.headline')} · ${locale}`}>
                <Input
                  id="bn-title"
                  disabled={!canWrite}
                  value={cur.title}
                  onChange={(e) => setTr({ title: e.target.value })}
                />
              </Field>
              <Field id="bn-subtitle" label={`${t('ban.subtitle')} · ${locale}`}>
                <Input
                  id="bn-subtitle"
                  disabled={!canWrite}
                  value={cur.subtitle}
                  onChange={(e) => setTr({ subtitle: e.target.value })}
                />
              </Field>
              <Field id="bn-cta" label={`${t('ban.cta')} · ${locale}`} hint={t('ban.ctaHint')}>
                <Input
                  id="bn-cta"
                  disabled={!canWrite}
                  className="max-w-72"
                  value={cur.ctaLabel}
                  placeholder={t('ban.ctaPlaceholder')}
                  onChange={(e) => setTr({ ctaLabel: e.target.value })}
                />
              </Field>
              <div className="grid gap-1.5">
                <Label htmlFor="bn-locale-image">
                  {t('ban.localeImage')} · {locale}
                </Label>
                <div className="max-w-sm">
                  <ImageField
                    id="bn-locale-image"
                    value={cur.imageId}
                    disabled={!canWrite}
                    onChange={(imageId) => setTr({ imageId })}
                    emptyLabel={t('ban.useDefaultImage')}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        <div className="grid gap-6">
          {banner && (
            <PublishPanel
              item={banner}
              canWrite={canPublish}
              onPublish={(at) => publish(false, at)}
              onUnpublish={(at) => publish(true, at)}
            />
          )}
          <Card>
            <CardHeader title={t('cms.settings')} />
            <CardBody className="grid gap-5 pt-4">
              <Field
                id="bn-name"
                label={t('common.name')}
                required
                hint={t('ban.nameHint')}
                error={touched ? errors.name : undefined}
              >
                <Input
                  id="bn-name"
                  autoFocus={!banner}
                  disabled={!canWrite}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
                <Field
                  id="bn-placement"
                  label={t('ban.placement')}
                  required
                  error={touched ? errors.placement : undefined}
                >
                  <Input
                    id="bn-placement"
                    list="bn-placements"
                    className="font-mono"
                    disabled={!canWrite}
                    value={draft.placement}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, placement: e.target.value.toLowerCase() }))
                    }
                  />
                </Field>
                <Field
                  id="bn-position"
                  label={t('common.position')}
                  error={touched ? errors.position : undefined}
                >
                  <Input
                    id="bn-position"
                    inputMode="numeric"
                    className="tabular"
                    disabled={!canWrite}
                    value={draft.position}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, position: e.target.value.replace(/\D/g, '') }))
                    }
                  />
                </Field>
              </div>
              <p className="-mt-3 text-small text-fg-muted">{t('ban.placementHint')}</p>
              <Field
                id="bn-link"
                label={t('ban.link')}
                hint={t('html.urlHint')}
                error={touched ? errors.linkUrl : undefined}
              >
                <Input
                  id="bn-link"
                  className="font-mono"
                  disabled={!canWrite}
                  placeholder="/sale"
                  value={draft.linkUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
                />
              </Field>
              <div className="grid gap-1.5">
                <Label htmlFor="bn-image">{t('ban.image')}</Label>
                <ImageField
                  id="bn-image"
                  value={draft.imageId}
                  disabled={!canWrite}
                  onChange={(imageId) => setDraft((d) => ({ ...d, imageId }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bn-store">{t('stores.store')}</Label>
                <Select
                  value={draft.storeId}
                  disabled={!!banner || !canWrite}
                  onValueChange={(storeId) => setDraft((d) => ({ ...d, storeId }))}
                >
                  <SelectTrigger id="bn-store" />
                  <SelectContent>
                    <SelectItem value={ALL_STORES}>{t('cms.allStores')}</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {banner && <p className="text-small text-fg-muted">{t('cms.storeLocked')}</p>}
              </div>
            </CardBody>
          </Card>
          {banner && canWrite && (
            <Confirm
              trigger={
                <Button variant="ghost" className="justify-self-start text-danger-fg">
                  <Trash2 />
                  {t('ban.delete')}
                </Button>
              }
              title={t('cms.deleteTitle', { title: banner.name })}
              description={t('ban.deleteBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const ok = await runAction(deleteBanner(banner.id), { success: t('cms.deleted') });
                if (ok !== undefined) router.push('/merchandising');
                return ok !== undefined;
              }}
            />
          )}
        </div>
      </div>
      <datalist id="bn-placements">
        {PLACEMENTS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => (banner ? setDraft(initial) : router.push('/merchandising'))}
          message={banner ? t('common.unsaved') : t('cms.unsavedNew')}
          saveLabel={banner ? t('common.save') : t('cms.create')}
          discardLabel={banner ? t('common.discard') : t('common.cancel')}
        />
      )}
    </>
  );
}

/** Approximate storefront rendering: artwork with the copy over a dark scrim. */
function BannerPreview({
  imageId,
  title,
  subtitle,
  cta,
}: {
  imageId: string | null;
  title: string;
  subtitle: string;
  cta: string;
}) {
  const { t } = useI18n();
  const src = useImage(imageId).image?.url ?? null;
  return (
    <figure
      aria-label={t('ban.preview')}
      className="relative aspect-[21/8] overflow-hidden rounded-xl bg-surface-inverse"
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- media URLs come from the shop's CDN
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
      <figcaption className="relative flex h-full max-w-[60%] flex-col justify-center gap-2 p-6 text-white md:p-10">
        <span className="text-caption font-semibold tracking-[0.08em] text-white/60 uppercase">
          {t('ban.preview')}
        </span>
        <span className="text-h2 leading-tight font-semibold md:text-display">
          {title || t('ban.headline')}
        </span>
        {subtitle && <span className="text-body text-white/80">{subtitle}</span>}
        {cta && (
          <span className="mt-2 inline-flex h-10 w-fit items-center rounded-md bg-accent px-4 text-small font-semibold text-accent-fg">
            {cta}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
