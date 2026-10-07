'use client';

import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { ShopLocale } from '../locale-switcher';
import { deleteImage, updateImageAlts } from './actions';
import { formatBytes, type Image } from './upload';

/** Details of one image: preview, facts, alt text per language, delete. */
export function ImageSheet({
  image,
  locales,
  canWrite,
  open,
  onOpenChange,
}: {
  image: Image;
  locales: ShopLocale[];
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [alts, setAlts] = useState<Record<string, string>>(
    Object.fromEntries(image.alts.map((a) => [a.localeCode, a.alt])),
  );
  const [saving, setSaving] = useState(false);
  const dirty =
    JSON.stringify(
      Object.entries(alts)
        .filter(([, v]) => v.trim())
        .sort(),
    ) !== JSON.stringify(image.alts.map((a) => [a.localeCode, a.alt]).sort());

  const save = async () => {
    setSaving(true);
    await runAction(
      updateImageAlts(
        image.id,
        Object.entries(alts)
          .filter(([, v]) => v.trim())
          .map(([localeCode, alt]) => ({ localeCode, alt: alt.trim() })),
      ),
      { success: t('common.saved') },
    );
    setSaving(false);
  };

  const facts: [string, string][] = [
    [t('media.dimensions'), `${image.width} × ${image.height}`],
    [t('media.size'), formatBytes(image.bytes, intl)],
    [t('common.type'), image.mime.replace('image/', '').toUpperCase()],
    [t('media.uploadedAt'), formatDate(image.createdAt, intl, true)],
    [t('media.renditions'), image.renditions.map((r) => `${r.width}w`).join(' · ') || '—'],
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        width="lg"
        title={image.originalFilename ?? t('media.untitled')}
        description={
          image.linkCount ? t('media.usedBy', { n: image.linkCount }) : t('media.unused')
        }
        footer={
          canWrite && (
            <>
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('media.deleteTitle')}
                description={
                  image.linkCount
                    ? t('media.deleteLinked', { n: image.linkCount })
                    : t('common.deleteConfirm')
                }
                confirmLabel={image.linkCount ? t('media.deleteAnyway') : t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteImage(image.id, image.linkCount > 0), {
                    success: t('media.deleted'),
                  });
                  if (ok !== undefined) onOpenChange(false);
                  return ok !== undefined;
                }}
              />
              <Button onClick={save} loading={saving} disabled={!dirty}>
                {t('common.save')}
              </Button>
            </>
          )
        }
      >
        <div className="grid gap-6">
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-[repeating-conic-gradient(var(--surface-muted)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from the shop's storage */}
            <img
              src={image.url}
              alt={alts[locales[0]?.code] ?? ''}
              className="max-h-[360px] w-auto object-contain"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(image.id);
                toast.success(t('media.idCopied'));
              }}
            >
              <Copy />
              {t('media.copyId')}
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <a href={image.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink />
                {t('media.openOriginal')}
              </a>
            </Button>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-caption text-fg-muted">{k}</dt>
                <dd className="tabular truncate text-small font-medium text-fg">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="text-caption text-fg-muted">{t('media.usage')}</dt>
              <dd>
                <Badge tone={image.linkCount ? 'success' : 'neutral'}>
                  {image.linkCount ? t('media.usedBy', { n: image.linkCount }) : t('media.unused')}
                </Badge>
              </dd>
            </div>
          </dl>
          <div className="grid gap-4">
            <div>
              <h3 className="text-h4 text-fg">{t('media.alt')}</h3>
              <p className="text-small text-fg-muted">{t('media.altHint')}</p>
            </div>
            {locales.map((l) => (
              <Field key={l.code} id={`alt-${l.code}`} label={`${l.name} · ${l.code}`}>
                <Input
                  id={`alt-${l.code}`}
                  value={alts[l.code] ?? ''}
                  disabled={!canWrite}
                  maxLength={255}
                  onChange={(e) => setAlts((a) => ({ ...a, [l.code]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
