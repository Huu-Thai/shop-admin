'use client';

import { Search, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useQueryParams } from '@/lib/use-query-params';
import { cn } from '@/lib/cn';
import { Select, SelectContent, SelectItem, SelectTrigger } from './controls';
import { Spinner } from './spinner';

/** Filter bar of a list page (docs/STYLE-GUIDE.md §8 List). Filters are URL parameters. */
export function ListToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 md:px-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Search box bound to `?search=` (debounced). */
export function SearchField({
  param = 'search',
  placeholder,
  className,
}: {
  param?: string;
  placeholder: string;
  className?: string;
}) {
  const { params, set, pending } = useQueryParams();
  const current = params.get(param) ?? '';
  const [value, setValue] = useState(current);
  useEffect(() => {
    if (value === current) return;
    const t = setTimeout(() => set({ [param]: value.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [value, current, param, set]);
  return (
    <div
      className={cn(
        'relative min-w-[200px] flex-1 basis-full sm:max-w-[320px] sm:basis-0',
        className,
      )}
    >
      <Search
        aria-hidden
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="focus-ring h-9 w-full rounded-md border border-border-strong bg-surface pr-8 pl-9 text-body text-fg placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
      />
      {pending ? (
        <Spinner className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
      ) : (
        value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setValue('')}
            className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-fg-subtle hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        )
      )}
    </div>
  );
}

/** A select bound to a URL parameter; the first option ("All …") clears it. */
export function FilterSelect({
  param,
  label,
  allLabel,
  options,
  className,
}: {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const { params, set } = useQueryParams();
  const value = params.get(param) ?? '__all';
  return (
    <Select value={value} onValueChange={(v) => set({ [param]: v === '__all' ? null : v })}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          // Phones: two equal columns. Wider: as wide as the label.
          'h-9 min-w-0 flex-1 basis-[calc(50%-4px)] gap-3 sm:w-auto sm:min-w-[140px] sm:flex-none sm:basis-auto',
          value !== '__all' && 'border-primary',
          className,
        )}
      />
      <SelectContent>
        <SelectItem value="__all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
