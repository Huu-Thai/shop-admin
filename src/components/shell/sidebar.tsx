'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/components/ui/overlays';
import { isActive, navIcon, type VisibleNavSection } from '@/features/registry';
import { useI18n } from '@/i18n/client';
import { themeConfig } from '@/theme/config';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { Logo } from './logo';

/** Sidebar navigation on the inverse surface (docs/STYLE-GUIDE.md §6 Layout → Sidebar). */
export function SidebarNav({
  sections,
  collapsed = false,
  onNavigate,
}: {
  sections: VisibleNavSection[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const label = (l: string) => t(l as MessageKey);

  return (
    <nav aria-label="Main" className="flex-1 [scrollbar-width:thin] overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.id} className="mb-5 last:mb-0">
          {collapsed ? (
            <div aria-hidden className="mx-3 mb-2 h-px bg-white/10 first:hidden" />
          ) : (
            <p className="mb-1.5 px-3 text-overline font-semibold tracking-[0.08em] text-ink-400 uppercase">
              {label(section.label)}
            </p>
          )}
          <ul className="grid gap-0.5">
            {section.items.map((item) => {
              const Icon = navIcon(item.id);
              const active = isActive(pathname, item);
              const text = label(item.label);
              const inner = (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-accent transition-opacity',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon aria-hidden className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{text}</span>}
                  {!collapsed && !item.ready && (
                    <span className="ml-auto shrink-0 rounded-xs bg-white/10 px-1.5 py-px text-[10px] font-semibold tracking-wide whitespace-nowrap text-ink-300 uppercase">
                      {t('nav.soon')}
                    </span>
                  )}
                </>
              );
              const cls = cn(
                'focus-ring transition-standard relative flex h-10 items-center gap-3 rounded-md px-3 text-body font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-surface-inverse-active text-white'
                  : 'text-fg-inverse-muted hover:bg-surface-inverse-hover hover:text-white',
                !item.ready &&
                  'cursor-default opacity-60 hover:bg-transparent hover:text-fg-inverse-muted',
              );
              const el = item.ready ? (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cls}
                  onClick={onNavigate}
                >
                  {inner}
                </Link>
              ) : (
                <span className={cls} aria-disabled="true">
                  {inner}
                  {collapsed && <span className="sr-only">{text}</span>}
                </span>
              );
              return (
                <li key={item.id}>
                  {collapsed ? (
                    <Tooltip
                      side="right"
                      content={item.ready ? text : `${text} · ${t('nav.soon')}`}
                    >
                      {el}
                    </Tooltip>
                  ) : (
                    el
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  sections,
  collapsed,
  onToggle,
}: {
  sections: VisibleNavSection[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col bg-surface-inverse text-fg-inverse lg:flex',
        'transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-standard)]',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      <div
        className={cn(
          'flex h-[var(--header-height)] shrink-0 items-center border-b border-white/10 text-white',
          collapsed ? 'justify-center' : 'px-6',
        )}
      >
        <Link
          href="/"
          className="focus-ring rounded-md"
          // Starts with the visible name so voice control ("click Ink Admin") still works.
          aria-label={`${themeConfig.name} · ${t('nav.dashboard')}`}
        >
          <Logo compact={collapsed} />
        </Link>
      </div>
      <SidebarNav sections={sections} collapsed={collapsed} />
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          className={cn(
            'focus-ring flex h-9 w-full items-center gap-3 rounded-md px-3 text-small text-fg-inverse-muted hover:bg-surface-inverse-hover hover:text-white',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronsRight aria-hidden className="size-4" />
          ) : (
            <>
              <ChevronsLeft aria-hidden className="size-4" />
              {t('nav.collapse')}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
