import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { Providers } from '@/components/providers/providers';
import { getLocale } from '@/i18n/server';
import { isPreset, PRESET_COOKIE, themeConfig } from '@/theme/config';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});
const mono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: themeConfig.name, template: `%s · ${themeConfig.name}` },
  description: themeConfig.tagline,
  robots: { index: false, follow: false },
  applicationName: themeConfig.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const preset = (await cookies()).get(PRESET_COOKIE)?.value;
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      data-theme={isPreset(preset) ? preset : themeConfig.defaultPreset}
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
