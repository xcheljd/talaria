/**
 * Desktop API for Tauri
 * Provides unified access to desktop features (download folder management)
 * Falls back gracefully when running in browser
 *
 * Uses window.__TAURI__ global instead of @tauri-apps/api imports
 * to avoid Vite bundling issues with dynamic imports
 */

/**
 * Check if running in a desktop app context (Tauri)
 * @returns {boolean}
 */
export function isDesktopApp() {
  return !!(window.__TAURI__ && window.__TAURI__.core);
}

/**
 * Get the configured download directory
 * @returns {Promise<string|null>} The download directory path, or null if in browser
 */
export async function getDownloadDir() {
  if (window.__TAURI__ && window.__TAURI__.core) {
    return window.__TAURI__.core.invoke('get_download_dir');
  }
  return null;
}

/**
 * Open folder picker dialog to choose download directory
 * @returns {Promise<string|null>} The selected path, or null if cancelled or in browser
 */
export async function chooseDownloadDir() {
  if (window.__TAURI__ && window.__TAURI__.core) {
    try {
      return await window.__TAURI__.core.invoke('choose_download_dir');
    } catch (e) {
      // User cancelled the dialog
      return null;
    }
  }
  return null;
}
