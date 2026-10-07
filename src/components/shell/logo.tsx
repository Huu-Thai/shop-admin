import { cn } from '@/lib/cn';
import { themeConfig } from '@/theme/config';

/** The brand lock-up: a lime monogram tile and the product name (docs/THEMING.md → Branding). */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-caption font-bold tracking-tight text-accent-fg"
      >
        {themeConfig.monogram}
      </span>
      {!compact && (
        <span className="text-h4 font-semibold tracking-[-0.01em]">{themeConfig.name}</span>
      )}
    </span>
  );
}
