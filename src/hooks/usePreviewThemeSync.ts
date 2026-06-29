import { useCallback, useEffect, useState } from 'react';
import { StorageKeys } from '@/lib/storage-keys';

const PREVIEW_SYNC_THEME_EVENT = 'preview-sync-theme-change';

/**
 * Whether the live email preview's light/dark follows the app theme. Default
 * true (linked): toggling the app's light/dark mode switches the preview too,
 * and the preview's own light/dark toggle drives the app theme — so the two
 * always agree. Set to false to keep the preview independent, with its own
 * persisted light/dark choice (see StorageKeys.previewDark).
 *
 * Persists to localStorage so the selection survives app restarts. All hook
 * instances stay in sync via a custom event on the same window (mirrors
 * useDevMode), so a toggle in Settings propagates without a reload.
 */
export function usePreviewThemeSync() {
  const [enabled, setEnabled] = useState<boolean>(
    // Default ON: absent key → linked. Only an explicit 'false' opts out.
    () => localStorage.getItem(StorageKeys.previewSyncTheme) !== 'false'
  );

  const setSyncPreviewTheme = useCallback((next: boolean) => {
    localStorage.setItem(StorageKeys.previewSyncTheme, String(next));
    setEnabled(next);
    // Notify other hook instances in the same document
    window.dispatchEvent(
      new CustomEvent(PREVIEW_SYNC_THEME_EVENT, { detail: next })
    );
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setEnabled(detail);
    };
    window.addEventListener(PREVIEW_SYNC_THEME_EVENT, handler);
    return () => window.removeEventListener(PREVIEW_SYNC_THEME_EVENT, handler);
  }, []);

  return { syncPreviewTheme: enabled, setSyncPreviewTheme } as const;
}
