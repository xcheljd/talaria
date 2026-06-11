/**
 * React hook for Tauri IPC operations.
 * Detects Tauri environment and provides typed wrappers for IPC calls.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  invoke as tauriInvoke,
  isTauri as isTauriEnv,
} from '@tauri-apps/api/core';

export function isTauriEnvironment(): boolean {
  return isTauriEnv();
}

export interface UseTauriReturn {
  isTauri: boolean;
  isLoading: boolean;
  error: Error | null;
  invoke: <T = unknown>(
    command: string,
    args?: Record<string, unknown>
  ) => Promise<T>;
  openFolderDialog: () => Promise<string | null>;
}

export function useTauri(): UseTauriReturn {
  const [isTauri, setIsTauri] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsTauri(isTauriEnv());
  }, []);

  const invokeCommand = useCallback(
    async <T = unknown>(
      command: string,
      args?: Record<string, unknown>
    ): Promise<T> => {
      if (!isTauriEnv()) {
        throw new Error(
          'Tauri IPC not available. This feature requires the desktop app.'
        );
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await tauriInvoke<T>(command, args);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const openFolderDialog = useCallback(async (): Promise<string | null> => {
    try {
      const result = await invokeCommand<string>('choose_download_dir');
      return result;
    } catch {
      return null;
    }
  }, [invokeCommand]);

  return { isTauri, isLoading, error, invoke: invokeCommand, openFolderDialog };
}
