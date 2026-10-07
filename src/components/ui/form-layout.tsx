'use client';

import { type ReactNode, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

/**
 * A form section (docs/STYLE-GUIDE.md §8 Form): title and description beside the fields from
 * 1280 px, above them below that.
 */
export function FormSection({
  title,
  description,
  children,
  className,
  aside,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section
      className={cn('grid gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:gap-8', className)}
    >
      <div className="min-w-0">
        <h2 className="text-h4 text-fg">{title}</h2>
        {description && <p className="mt-1 text-small text-fg-muted">{description}</p>}
        {aside}
      </div>
      <div className="grid min-w-0 gap-5 rounded-lg border border-border bg-surface p-5 shadow-xs md:p-6">
        {children}
      </div>
    </section>
  );
}

/** Warns before leaving the page with unsaved changes (reload, close, external links). */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

/** Sticky bottom bar with Discard / Save, shown while a form has unsaved changes. */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  message = 'You have unsaved changes',
  saveLabel = 'Save',
  discardLabel = 'Discard',
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
}) {
  useUnsavedChanges(dirty);
  if (!dirty && !saving) return null;
  return (
    <div
      role="region"
      aria-label={message}
      className="animate-pop sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-surface-inverse px-4 py-3 text-fg-inverse shadow-lg md:px-5 dark:border-white/15"
      data-state="open"
    >
      <p className="text-small font-medium">{message}</p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-fg-inverse-muted hover:bg-surface-inverse-hover hover:text-white"
          onClick={onDiscard}
          disabled={saving}
        >
          {discardLabel}
        </Button>
        <Button variant="accent" size="sm" onClick={onSave} loading={saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
