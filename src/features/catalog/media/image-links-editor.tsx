'use client';

import { ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SortableList } from '@/components/ui/sortable';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { addImages, EXCLUSIVE_ROLES, IMAGE_ROLES, type LinkedImage, toggleRole } from './links';
import { MediaPicker } from './media-picker';

/**
 * Images of a product, variant or category: add from the library, drag to order, assign roles
 * (base = main image, small = listings, thumbnail = cart, gallery, swatch).
 */
export function ImageLinksEditor({
  value,
  onChange,
  disabled,
}: {
  value: LinkedImage[];
  onChange: (value: LinkedImage[]) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);
  return (
    <div className="grid gap-3">
      {value.length ? (
        <SortableList
          items={value}
          getId={(li) => li.image.id}
          onReorder={onChange}
          handleLabel={t('sets.dragHandle')}
          renderItem={(li, i, handle) => (
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-2">
              {!disabled && handle}
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from the shop's storage */}
              <img
                src={li.image.thumbnailUrl}
                alt=""
                className="size-14 shrink-0 rounded-sm border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-fg">
                  {li.image.originalFilename ?? li.image.id.slice(0, 8)}
                  {i === 0 && (
                    <span className="ml-2 text-caption font-normal text-fg-muted">
                      {t('img.first')}
                    </span>
                  )}
                </p>
                <div
                  role="group"
                  aria-label={t('img.roles')}
                  className="mt-1.5 flex flex-wrap gap-1"
                >
                  {IMAGE_ROLES.map((role) => {
                    const on = li.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={disabled}
                        aria-pressed={on}
                        title={t(`img.role.${role}.hint` as MessageKey)}
                        onClick={() => onChange(toggleRole(value, li.image.id, role))}
                        className={cn(
                          'focus-ring h-6 rounded-sm border px-2 text-caption font-medium transition-colors',
                          on
                            ? EXCLUSIVE_ROLES.includes(role)
                              ? 'border-transparent bg-primary text-primary-fg'
                              : 'border-transparent bg-info-soft text-info-fg'
                            : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
                        )}
                      >
                        {t(`img.role.${role}` as MessageKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('common.remove')}
                  onClick={() => onChange(value.filter((x) => x.image.id !== li.image.id))}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
        />
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-small text-fg-muted">
          {t('img.none')}
        </p>
      )}
      {!disabled && (
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          onClick={() => setPicking(true)}
        >
          <ImagePlus />
          {t('img.add')}
        </Button>
      )}
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        exclude={value.map((v) => v.image.id)}
        onPick={(imgs) => onChange(addImages(value, imgs))}
      />
    </div>
  );
}
