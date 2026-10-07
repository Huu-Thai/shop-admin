import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { Input } from './input';

/** An amount in major units with its currency code as a suffix (tabular, right-aligned). */
export function MoneyInput({
  currency,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { currency: string }) {
  return (
    <div className={cn('relative', className)}>
      <Input inputMode="decimal" className="tabular pr-14 text-right" {...props} />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-caption text-fg-muted">
        {currency}
      </span>
    </div>
  );
}
