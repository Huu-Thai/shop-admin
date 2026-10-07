import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** Data table primitives (docs/STYLE-GUIDE.md §7): sticky header, 52 px rows, numbers right. */
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn('w-full caption-bottom border-collapse text-small', className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-surface-muted', className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TR({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-surface-muted/60 data-[state=selected]:bg-accent-soft',
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 px-4 text-left align-middle text-caption font-semibold tracking-[0.04em] whitespace-nowrap text-fg-muted uppercase first:pl-5 last:pr-5 data-[align=right]:text-right',
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'data-[align=right]:tabular h-[52px] px-4 align-middle text-fg first:pl-5 last:pr-5 data-[align=right]:text-right',
        className,
      )}
      {...props}
    />
  );
}
