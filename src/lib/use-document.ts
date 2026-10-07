'use client';

import { useSyncExternalStore } from 'react';
import { themeConfig } from '@/theme/config';

/** Re-renders when the colour mode (class) or preset (data-theme) of <html> changes. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  return () => observer.disconnect();
}

export function usePreset(): string {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? themeConfig.defaultPreset,
    () => themeConfig.defaultPreset,
  );
}

/** Resolved values of CSS custom properties (`names` without the leading `--`). */
export function useCssVars(names: readonly string[]): Record<string, string> {
  const joined = useSyncExternalStore(
    subscribe,
    () => {
      const style = getComputedStyle(document.documentElement);
      return names.map((n) => style.getPropertyValue(`--${n}`).trim()).join('|');
    },
    () => '',
  );
  const values = joined.split('|');
  return Object.fromEntries(names.map((n, i) => [n, values[i] ?? '']));
}

const noop = () => () => {};

/** The browser's current hour (null while server rendering). */
export function useHour(): number | null {
  return useSyncExternalStore(
    noop,
    () => new Date().getHours(),
    () => null,
  );
}
