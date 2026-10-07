import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-muted', className)}
      {...props}
    />
  );
}

/** What is missing and what to do about it (docs/STYLE-GUIDE.md §9). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-fg-muted [&_svg]:size-6">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-h4 text-fg">{title}</p>
        {description && <p className="mt-1 text-body text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface px-1 font-mono text-[11px] text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, ...props }: ComponentProps<'hr'>) {
  return <hr className={cn('border-0 border-t border-border', className)} {...props} />;
}

/** Initials avatar (photos come with the media library in Phase 1). */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-small font-semibold text-accent-fg',
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}
