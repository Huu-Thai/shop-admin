'use client';

import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog as D } from 'radix-ui';
import { useEffect, useMemo, useState } from 'react';
import { Kbd } from '@/components/ui/feedback';
import { navIcon, type VisibleNavSection } from '@/features/registry';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';

/** ⌘K / Ctrl+K: jump to any screen the admin can open. Later phases add records (orders, products). */
export function CommandPalette({ sections }: { sections: VisibleNavSection[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections
      .flatMap((s) =>
        s.items
          .filter((i) => i.ready)
          .map((i) => ({
            ...i,
            text: t(i.label as MessageKey),
            group: t(s.label as MessageKey),
          })),
      )
      .filter((i) => !q || i.text.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [sections, query, t]);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger className="focus-ring flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-md border border-border bg-surface-muted px-3 text-body text-fg-subtle hover:border-border-strong">
        <Search aria-hidden className="size-4" />
        <span className="flex-1 text-left">{t('header.search')}</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="animate-fade fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px]" />
        <D.Content
          className="animate-fade fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
          aria-describedby={undefined}
        >
          <D.Title className="sr-only">{t('header.search')}</D.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search aria-hidden className="size-4 text-fg-muted" />
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
                  setCursor((c) => Math.min(c + 1, items.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === 'Enter' && items[cursor]) {
                  go(items[cursor].href);
                }
              }}
              placeholder={t('header.search')}
              role="combobox"
              aria-expanded
              aria-controls="command-results"
              aria-activedescendant={items[cursor] ? `cmd-${items[cursor].id}` : undefined}
              className="h-14 flex-1 bg-transparent text-body-lg text-fg outline-none placeholder:text-fg-subtle"
            />
            <Kbd>Esc</Kbd>
          </div>
          <ul id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {items.map((item, i) => {
              const Icon = navIcon(item.id);
              return (
                <li
                  key={item.id}
                  id={`cmd-${item.id}`}
                  role="option"
                  aria-selected={i === cursor}
                  onMouseMove={() => setCursor(i)}
                  onClick={() => go(item.href)}
                  className={cn(
                    'flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-body',
                    i === cursor ? 'bg-surface-muted text-fg' : 'text-fg-muted',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  <span className="flex-1 text-fg">{item.text}</span>
                  <span className="text-caption text-fg-subtle">{item.group}</span>
                  {i === cursor && (
                    <CornerDownLeft aria-hidden className="size-3.5 text-fg-subtle" />
                  )}
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="px-3 py-8 text-center text-body text-fg-muted">—</li>
            )}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
