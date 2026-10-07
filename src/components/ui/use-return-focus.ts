'use client';

import { useEffect, useState } from 'react';

/**
 * Return focus to whatever opened an overlay. Radix does this only when a `Trigger` is used; most
 * of our sheets and dialogs are opened from state and unmount on close, so the element focused
 * at first render is remembered and focused again on close and on unmount.
 */
export function useReturnFocus() {
  const [opener] = useState(() =>
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null),
  );
  const restore = () => {
    // Wait a frame so the overlay's own focus trap has let go.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (opener?.isConnected && (!active || active === document.body)) opener.focus();
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => restore, []);
  return (e: Event) => {
    if (!opener?.isConnected) return;
    e.preventDefault();
    opener.focus();
  };
}
