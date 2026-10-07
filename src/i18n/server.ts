import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { isLocale, LOCALE_COOKIE, type Locale, negotiate, translator } from '.';

/** The admin's language: their choice (cookie), else the browser's, else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return negotiate((await headers()).get('accept-language'));
});

export const getT = cache(async () => translator(await getLocale()));
