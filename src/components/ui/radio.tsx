'use client';

import { RadioGroup as R } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function RadioGroup({ className, ...props }: ComponentProps<typeof R.Root>) {
  return <R.Root className={cn('grid gap-2.5', className)} {...props} />;
}

/** A classic radio with its label (40 px row). */
export function Radio({
  label,
  hint,
  className,
  ...props
}: ComponentProps<typeof R.Item> & { label: ReactNode; hint?: ReactNode }) {
  const id = props.id ?? `radio-${props.value}`;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <R.Item
        id={id}
        className="focus-ring mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface data-[state=checked]:border-primary"
        {...props}
      >
        <R.Indicator className="size-2 rounded-full bg-primary" />
      </R.Item>
      <label htmlFor={id} className="grid cursor-pointer gap-0.5">
        <span className="text-body text-fg">{label}</span>
        {hint && <span className="text-small text-fg-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** A selectable card (choosing a product type, a layout …). */
export function RadioCard({
  title,
  description,
  icon,
  className,
  ...props
}: ComponentProps<typeof R.Item> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <R.Item
      className={cn(
        'focus-ring group flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong',
        'data-[state=checked]:border-primary data-[state=checked]:bg-accent-soft data-[state=checked]:ring-1 data-[state=checked]:ring-primary',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg group-data-[state=checked]:bg-accent group-data-[state=checked]:text-accent-fg [&_svg]:size-5">
          {icon}
        </span>
      )}
      <span className="grid gap-0.5">
        <span className="text-body font-semibold text-fg">{title}</span>
        {description && <span className="text-small text-fg-muted">{description}</span>}
      </span>
    </R.Item>
  );
}
