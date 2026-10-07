'use client';

import { Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Image } from './upload';

/** A square thumbnail with name and size; `selected` shows a check (pickers). */
export function ImageTile({
  image,
  selected,
  onClick,
  label,
}: {
  image: Image;
  selected?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        'focus-ring group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface text-left transition-shadow hover:shadow-md',
        selected && 'border-primary ring-2 ring-primary',
      )}
    >
      <span className="relative block aspect-square overflow-hidden bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from the shop's storage */}
        <img
          src={image.thumbnailUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
        />
        {selected && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-fg shadow-sm">
            <Check className="size-3.5" />
          </span>
        )}
        {image.linkCount > 0 && !selected && (
          <span className="absolute top-2 right-2 flex h-6 items-center gap-1 rounded-full bg-surface/90 px-2 text-caption font-medium text-fg shadow-xs backdrop-blur">
            <Link2 aria-hidden className="size-3" />
            {image.linkCount}
          </span>
        )}
      </span>
      <span className="grid gap-0.5 px-3 py-2">
        <span className="truncate text-small font-medium text-fg">
          {image.originalFilename ?? image.id.slice(0, 8)}
        </span>
        <span className="tabular text-caption text-fg-muted">
          {image.width} × {image.height}
        </span>
      </span>
    </button>
  );
}
