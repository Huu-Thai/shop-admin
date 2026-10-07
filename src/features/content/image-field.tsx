'use client';

import { ImageIcon, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/cn';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { MediaPicker } from '../catalog/media/media-picker';

type Image = Schemas['ImageDto'];

/** One image from the media library: preview, choose / replace, remove. */
export function ImageField({
  id,
  value,
  onChange,
  disabled,
  aspect = 'aspect-video',
  emptyLabel,
}: {
  id: string;
  value: string | null;
  onChange: (imageId: string | null) => void;
  disabled?: boolean;
  /** Tailwind aspect class of the preview. */
  aspect?: string;
  emptyLabel?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { image, failed, remember } = useImage(value);

  return (
    <div className="grid gap-2">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={value ? t('img.replace') : t('img.choose')}
        className={cn(
          'focus-ring group relative grid w-full place-items-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface-muted/50 text-fg-muted transition-colors hover:border-fg-subtle disabled:cursor-not-allowed',
          aspect,
        )}
      >
        {value && image ? (
          // eslint-disable-next-line @next/next/no-img-element -- media URLs come from the shop's CDN
          <img
            src={image.thumbnailUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-small">
            <ImageIcon aria-hidden className="size-6" />
            {value && failed
              ? t('img.missing')
              : value
                ? t('common.loading')
                : (emptyLabel ?? t('img.choose'))}
          </span>
        )}
      </button>
      {value && !disabled && (
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            <RefreshCw />
            {t('img.replace')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-danger-fg"
            onClick={() => onChange(null)}
          >
            <X />
            {t('common.remove')}
          </Button>
        </div>
      )}
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        multiple={false}
        onPick={([img]) => {
          if (img) {
            remember(img);
            onChange(img.id);
          }
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Loads a library image by id (cached per id); `remember` seeds it after picking. */
export function useImage(id: string | null) {
  const [loaded, setLoaded] = useState<{ id: string; image: Image | null } | null>(null);
  useEffect(() => {
    if (!id || loaded?.id === id) return;
    let live = true;
    gw<Image>(`images/${id}`)
      .then((image) => live && setLoaded({ id, image }))
      .catch(() => live && setLoaded({ id, image: null }));
    return () => {
      live = false;
    };
  }, [id, loaded?.id]);
  const current = id && loaded?.id === id ? loaded : null;
  return {
    image: current?.image ?? null,
    failed: !!current && !current.image,
    remember: (image: Image) => setLoaded({ id: image.id, image }),
  };
}
