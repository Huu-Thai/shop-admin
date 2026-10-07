import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from './badge';
import { Card } from './card';

/** A key figure with an optional change versus the previous period (docs/STYLE-GUIDE.md §7). */
export function Stat({
  label,
  value,
  change,
  hint,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Relative change, e.g. 0.124 = +12.4 %. */
  change?: number | null;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <Card className={cn('flex flex-col gap-3 p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-medium text-fg-muted">{label}</p>
        {icon && (
          <span className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-fg [&_svg]:size-[18px]">
            {icon}
          </span>
        )}
      </div>
      <p className="tabular text-h1 font-semibold tracking-tight text-fg">{value}</p>
      {(change != null || hint) && (
        <div className="flex items-center gap-2 text-small text-fg-muted">
          {change != null && Number.isFinite(change) && (
            <Badge tone={up ? 'success' : 'danger'}>
              {up ? <ArrowUpRight aria-hidden /> : <ArrowDownRight aria-hidden />}
              <span className="sr-only">{up ? 'Up' : 'Down'}</span>
              {Math.abs(change * 100).toFixed(1)}%
            </Badge>
          )}
          {hint}
        </div>
      )}
    </Card>
  );
}
