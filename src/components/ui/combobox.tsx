'use client';

import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Popover as P } from 'radix-ui';
import { type ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { controlClass } from './input';
import { Spinner } from './spinner';

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Searchable single or multiple choice. Pass `options` for a static list (filtered locally) or
 * `load` for a remote search (debounced). Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  load,
  multiple = false,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  labels,
  disabled,
  invalid,
  className,
  renderValue,
  'aria-label': ariaLabel,
}: {
  id?: string;
  /** Needed when no `<label htmlFor={id}>` names the field; defaults to the placeholder without an id. */
  'aria-label'?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options?: ComboOption[];
  load?: (query: string) => Promise<ComboOption[]>;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Labels of selected values that aren't in the current options (remote search). */
  labels?: Record<string, string>;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  renderValue?: (selected: ComboOption[]) => ReactNode;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<ComboOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [remoteLabels, setRemoteLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!load || !open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await load(query.trim());
        if (!cancelled) {
          setRemote(r);
          setRemoteLabels((m) => ({
            ...m,
            ...Object.fromEntries(r.map((o) => [o.value, o.label])),
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load, open, query]);

  const shown = useMemo(() => {
    if (load) return remote;
    const q = query.trim().toLowerCase();
    return (options ?? []).filter(
      (o) => !q || o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
    );
  }, [load, remote, options, query]);

  const staticLabels = useMemo(
    () => Object.fromEntries((options ?? []).map((o) => [o.value, o.label])),
    [options],
  );
  const selected = value.map((v) => ({
    value: v,
    label: labels?.[v] ?? staticLabels[v] ?? remoteLabels[v] ?? v,
  }));

  const toggle = (v: string) => {
    if (!multiple) {
      onChange([v]);
      setOpen(false);
      setQuery('');
      return;
    }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <P.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
        setCursor(0);
      }}
    >
      <P.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-label={ariaLabel ?? (id ? undefined : placeholder)}
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          className={cn(
            controlClass,
            'flex min-h-10 items-center justify-between gap-2 py-1.5 text-left',
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-fg-subtle">{placeholder}</span>
            ) : renderValue ? (
              renderValue(selected)
            ) : multiple ? (
              selected.map((s) => (
                <span
                  key={s.value}
                  className="inline-flex h-6 max-w-full items-center gap-1 rounded-sm bg-surface-muted pr-1 pl-2 text-small text-fg"
                >
                  <span className="truncate">{s.label}</span>
                  {!disabled && (
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Remove ${s.label}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(value.filter((x) => x !== s.value));
                      }}
                      className="flex size-4 items-center justify-center rounded-xs text-fg-muted hover:bg-border hover:text-fg"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </span>
              ))
            ) : (
              <span className="truncate text-fg">{selected[0].label}</span>
            )}
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-fg-subtle" />
        </button>
      </P.Trigger>
      <P.Portal>
        <P.Content
          align="start"
          sideOffset={6}
          className="animate-pop z-50 w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search aria-hidden className="size-4 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, shown.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const o = shown[cursor];
                  if (o && !o.disabled) toggle(o.value);
                }
              }}
              placeholder={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={shown[cursor] ? `${listId}-${cursor}` : undefined}
              className="h-10 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle"
            />
            {loading && <Spinner className="size-4" />}
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="max-h-72 overflow-y-auto p-1"
          >
            {shown.map((o, i) => {
              const on = value.includes(o.value);
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={on}
                  aria-disabled={o.disabled || undefined}
                  onMouseMove={() => setCursor(i)}
                  onClick={() => !o.disabled && toggle(o.value)}
                  className={cn(
                    'flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-body',
                    i === cursor && 'bg-surface-muted',
                    o.disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Check
                    aria-hidden
                    className={cn('size-4 shrink-0', on ? 'text-fg' : 'text-transparent')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fg">{o.label}</span>
                    {o.hint && (
                      <span className="block truncate text-caption text-fg-muted">{o.hint}</span>
                    )}
                  </span>
                </li>
              );
            })}
            {!loading && shown.length === 0 && (
              <li className="px-3 py-6 text-center text-small text-fg-muted">{emptyText}</li>
            )}
          </ul>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
