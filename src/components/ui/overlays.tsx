'use client';

import { X } from 'lucide-react';
import { Dialog as D, DropdownMenu as M, Tooltip as T } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReturnFocus } from './use-return-focus';

const popover = 'animate-pop z-50 rounded-lg border border-border bg-surface text-fg shadow-lg';

/* ── Dialog ───────────────────────────────────────────── */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
  onCloseAutoFocus,
  ...props
}: Omit<ComponentProps<typeof D.Content>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
}) {
  const returnFocus = useReturnFocus();
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          'animate-pop fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg',
          className,
        )}
        onCloseAutoFocus={onCloseAutoFocus ?? returnFocus}
        {...props}
      >
        <div className="pr-8">
          <D.Title className="text-h4 text-fg">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-body text-fg-muted">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
        </div>
        {children}
        {footer && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        )}
        <D.Close
          className="focus-ring absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg"
          aria-label="Close"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/* ── Dropdown menu ────────────────────────────────────── */

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export const MenuGroup = M.Group;

export function MenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(popover, 'min-w-52 p-1', className)}
        {...props}
      />
    </M.Portal>
  );
}

export function MenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn(
        'flex h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 text-body outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted [&_svg]:size-4 [&_svg]:text-fg-muted',
        destructive && 'text-danger-fg [&_svg]:text-danger-fg',
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cn('px-2.5 py-2 text-caption text-fg-muted', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}

/* ── Tooltip ──────────────────────────────────────────── */

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="animate-fade z-50 rounded-md bg-surface-inverse px-2.5 py-1.5 text-caption text-fg-inverse shadow-md"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
