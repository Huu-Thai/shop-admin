'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/overlays';
import { I18nProvider } from '@/i18n/client';
import type { Locale } from '@/i18n';
import { themeConfig } from '@/theme/config';

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={themeConfig.defaultMode}
      enableSystem
      disableTransitionOnChange
    >
      <I18nProvider locale={locale}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster
            position="top-center"
            // Below the 64 px header and between the page title and its actions; never over the
            // sticky save bar at the bottom.
            offset={{ top: 76 }}
            mobileOffset={{ top: 72 }}
            toastOptions={{
              classNames: {
                toast:
                  '!rounded-lg !border !border-border !bg-surface !text-fg !shadow-lg !font-sans',
                description: '!text-fg-muted',
              },
            }}
          />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
