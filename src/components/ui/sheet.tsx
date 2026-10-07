'use client';

import { X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReturnFocus } from './use-return-focus';

export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

/** Side panel for create/edit without leaving a list (docs/STYLE-GUIDE.md §7 Drawer). */
export function SheetContent({
  title,
  description,
  children,
  footer,
  className,
  width = 'md',
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  width?: 'md' | 'lg';
}) {
  const onCloseAutoFocus = useReturnFocus();
  return (
    <D.Portal>
      <D.Overlay className="animate-fade fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[1px]" />
      <D.Content
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn(
          'sa-sheet fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface shadow-lg',
          width === 'md' ? 'max-w-[480px]' : 'max-w-[720px]',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <D.Title className="text-h3 text-fg">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-small text-fg-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            aria-label="Close"
            className="focus-ring -mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            <X className="size-4" />
          </D.Close>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </footer>
        )}
      </D.Content>
    </D.Portal>
  );
}
