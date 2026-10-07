'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Checkbox as C, Select as S, Switch as W, Tabs as Tb } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { controlClass } from './input';

export function Checkbox({ className, ...props }: ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        'focus-ring peer inline-flex size-[18px] shrink-0 items-center justify-center rounded-xs border border-border-strong bg-surface shadow-xs transition-colors disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg',
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof W.Root>) {
  return (
    <W.Root
      className={cn(
        'focus-ring inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <W.Thumb className="block size-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 dark:data-[state=checked]:bg-ink-900" />
    </W.Root>
  );
}

/* ── Select ───────────────────────────────────────────── */

export const Select = S.Root;

export function SelectTrigger({
  className,
  placeholder,
  ...props
}: ComponentProps<typeof S.Trigger> & { placeholder?: string }) {
  return (
    <S.Trigger
      className={cn(
        controlClass,
        'flex h-10 items-center justify-between gap-2 text-left data-[placeholder]:text-fg-subtle',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 truncate">
        <S.Value placeholder={placeholder} />
      </span>
      <S.Icon className="shrink-0">
        <ChevronDown className="size-4 text-fg-muted" />
      </S.Icon>
    </S.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: ComponentProps<typeof S.Content>) {
  return (
    <S.Portal>
      <S.Content
        position="popper"
        sideOffset={6}
        className={cn(
          'animate-pop z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface shadow-lg',
          className,
        )}
        {...props}
      >
        <S.Viewport className="p-1">{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof S.Item>) {
  return (
    <S.Item
      className={cn(
        'relative flex h-9 cursor-pointer items-center rounded-md pr-8 pl-2.5 text-body outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted',
        className,
      )}
      {...props}
    >
      <S.ItemText>{children}</S.ItemText>
      <S.ItemIndicator className="absolute right-2.5">
        <Check className="size-4" />
      </S.ItemIndicator>
    </S.Item>
  );
}

/* ── Tabs ─────────────────────────────────────────────── */

export const Tabs = Tb.Root;
export const TabsContent = Tb.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof Tb.List>) {
  return <Tb.List className={cn('flex gap-1 border-b border-border', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof Tb.Trigger>) {
  return (
    <Tb.Trigger
      className={cn(
        'focus-ring -mb-px inline-flex h-10 cursor-pointer items-center gap-2 border-b-2 border-transparent px-3 text-body font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:border-fg data-[state=active]:text-fg',
        className,
      )}
      {...props}
    />
  );
}
