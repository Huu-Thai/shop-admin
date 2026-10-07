'use client';

import { useI18n } from '@/i18n/client';
import { useHour } from '@/lib/use-document';

/** Time-of-day greeting in the admin's own time zone (computed in the browser). */
export function Greeting({ name }: { name: string }) {
  const { t } = useI18n();
  const hour = useHour();
  const key =
    hour === null
      ? 'dash.greeting.hello'
      : hour < 12
        ? 'dash.greeting.morning'
        : hour < 18
          ? 'dash.greeting.afternoon'
          : 'dash.greeting.evening';
  return (
    <>
      {t(key)}, {name}
    </>
  );
}
