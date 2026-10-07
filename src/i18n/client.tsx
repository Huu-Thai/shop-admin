'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, type Locale, type Translate, translator } from '.';

const I18n = createContext<{ locale: Locale; t: Translate }>({
  locale: DEFAULT_LOCALE,
  t: translator(DEFAULT_LOCALE),
});

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(locale) }), [locale]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
