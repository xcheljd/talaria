/**
 * React hook for Tauri IPC operations.
 * Detects Tauri environment and provides typed wrappers for IPC calls.
 */

import { useState, useCallback, useEffect } from 'react';

/** Tauri core invoke type */
type TauriInvoke = (
  cmd: string,
  args?: Record<string, unknown>
) => Promise<unknown>;

/** Shape of the Tauri window object */
interface TauriWindow {
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke;
    };
  };
}

/**
 * Check if the app is running inside Tauri.
 */
export function isTauriEnvironment(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    (window as unknown as TauriWindow).__TAURI__?.core?.invoke
  );
}

export interface UseTauriReturn {
  /** Whether the app is running in Tauri */
  isTauri: boolean;
  /** Whether an IPC call is in progress */
  isLoading: boolean;
  /** Last error from IPC call */
  error: Error | null;

  /**
   * Invoke a Tauri IPC command.
   * @param command - The command name registered in src-tauri/src/lib.rs
   * @param args - Arguments to pass to the command
   * @returns The result of the IPC call
   */
  invoke: <T = unknown>(
    command: string,
    args?: Record<string, unknown>
  ) => Promise<T>;

  /**
   * Open a native folder picker dialog.
   * Uses the 'open_download_folder_dialog' Tauri command.
   * @returns The selected folder path, or null if cancelled
   */
  openFolderDialog: () => Promise<string | null>;
}

/**
 * React hook for Tauri desktop integration.
 * Provides typed wrappers for IPC calls and environment detection.
 * Gracefully degrades when not running in Tauri (returns errors for IPC calls).
 */
export function useTauri(): UseTauriReturn {
  const [isTauri, setIsTauri] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  const getInvoke = useCallback((): TauriInvoke => {
    const tauriWindow = window as unknown as TauriWindow;
    const invoke = tauriWindow.__TAURI__?.core?.invoke;
    if (!invoke) {
      throw new Error(
        'Tauri IPC not available. This feature requires the desktop app.'
      );
    }
    return invoke;
  }, []);

  const invokeCommand = useCallback(
    async <T = unknown>(
      command: string,
      args?: Record<string, unknown>
    ): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        const invoke = getInvoke();
        const result = (await invoke(command, args)) as T;
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getInvoke]
  );

  const openFolderDialog = useCallback(async (): Promise<string | null> => {
    try {
      const result = await invokeCommand<string>('open_download_folder_dialog');
      return result;
    } catch {
      return null;
    }
  }, [invokeCommand]);

  return {
    isTauri,
    isLoading,
    error,
    invoke: invokeCommand,
    openFolderDialog,
  };
}
