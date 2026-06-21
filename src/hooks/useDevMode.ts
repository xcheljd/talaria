import { useCallback, useEffect, useState } from 'react';
import { StorageKeys } from '@/lib/storage-keys';

const DEV_MODE_EVENT = 'dev-mode-change';

/**
 * Whether dev mode is enabled. Default false. When dev mode is off, advanced
 * surfaces (Templates page, promotion HTML Code tab, Email Theme /
 * Accessibility / Outlook cards) are hidden from regular users.
 *
 * Persists to localStorage so the selection survives app restarts. All hook
 * instances stay in sync via a custom event on the same window.
 */
export function useDevMode() {
  const [enabled, setEnabled] = useState<boolean>(
    () => localStorage.getItem(StorageKeys.devMode) === 'true'
  );

  const setDevMode = useCallback((next: boolean) => {
    localStorage.setItem(StorageKeys.devMode, String(next));
    setEnabled(next);
    // Notify other hook instances in the same document
    window.dispatchEvent(new CustomEvent(DEV_MODE_EVENT, { detail: next }));
  }, []);

  // Keep state in sync across hook instances so a toggle in settings
  // propagates to mounted route components without a page reload.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setEnabled(detail);
    };
    window.addEventListener(DEV_MODE_EVENT, handler);
    return () => window.removeEventListener(DEV_MODE_EVENT, handler);
  }, []);

  return { devMode: enabled, setDevMode } as const;
}
