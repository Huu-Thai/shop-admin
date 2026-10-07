'use client';

import { FlaskConical, Menu as MenuIcon, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Dialog as D } from 'radix-ui';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/overlays';
import type { VisibleNavSection } from '@/features/registry';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/cn';
import { setPreference, SIDEBAR_COOKIE } from '@/lib/preferences';
import { CommandPalette } from './command-palette';
import { Logo } from './logo';
import { Sidebar, SidebarNav } from './sidebar';
import { type ShellUser, UserMenu } from './user-menu';

/**
 * Page frame (docs/STYLE-GUIDE.md §6): inverse sidebar 264/76 px, 64 px header, content up to
 * 1440 px. Below `lg` the sidebar becomes an off-canvas drawer.
 */
export function AppShell({
  user,
  sections,
  initialCollapsed,
  demo = false,
  children,
}: {
  user: ShellUser;
  sections: VisibleNavSection[];
  initialCollapsed: boolean;
  /** Read-only demo: a banner says changes are switched off. */
  demo?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawer, setDrawer] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setCollapsed((c) => {
      setPreference(SIDEBAR_COOKIE, c ? 'expanded' : 'collapsed');
      return !c;
    });
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#content"
        className="focus-ring sr-only z-50 rounded-md bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('app.skip')}
      </a>
      <Sidebar sections={sections} collapsed={collapsed} onToggle={toggle} />

      <D.Root open={drawer} onOpenChange={setDrawer}>
        <D.Portal>
          <D.Overlay className="animate-fade fixed inset-0 z-40 bg-ink-950/50 lg:hidden" />
          <D.Content
            aria-describedby={undefined}
            className="sa-drawer fixed inset-y-0 left-0 z-50 flex w-[min(var(--sidebar-width),86vw)] flex-col bg-surface-inverse text-fg-inverse shadow-lg lg:hidden"
          >
            <D.Title className="sr-only">{t('nav.open')}</D.Title>
            <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-white/10 pr-3 pl-5 text-white">
              <Logo />
              <D.Close
                aria-label={t('nav.close')}
                className="focus-ring flex size-9 items-center justify-center rounded-md text-fg-inverse-muted hover:bg-surface-inverse-hover hover:text-white"
              >
                <X className="size-5" />
              </D.Close>
            </div>
            <SidebarNav sections={sections} onNavigate={() => setDrawer(false)} />
          </D.Content>
        </D.Portal>
      </D.Root>

      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-[var(--duration-slow)] ease-[var(--ease-standard)]',
          collapsed ? 'lg:pl-[var(--sidebar-collapsed-width)]' : 'lg:pl-[var(--sidebar-width)]',
        )}
      >
        {demo && (
          <div
            role="note"
            className="flex items-center justify-center gap-2 bg-accent px-4 py-1.5 text-center text-small font-medium text-accent-fg"
          >
            <FlaskConical aria-hidden className="size-4 shrink-0" />
            {t('demo.banner')}
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md md:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label={t('nav.open')}
            onClick={() => setDrawer(true)}
          >
            <MenuIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <CommandPalette sections={sections} />
          </div>
          <Tooltip content={t('header.theme')} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('header.theme')}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
            </Button>
          </Tooltip>
          <UserMenu user={user} />
        </header>
        <main id="content" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-6 md:px-6 md:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
