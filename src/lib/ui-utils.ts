/**
 * Shared UI Utilities
 * Common UI helper functions used across the application.
 * Migrated from src/js/shared/ui-utils.js
 *
 * Note: showToast is replaced by Sonner in the React app. The utility
 * functions here are the non-DOM-dependent ones that remain useful.
 */

export const TOAST_DURATION_MS = 3000;

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get scroll behavior based on user's motion preference.
 */
export function getScrollBehavior(): 'smooth' | 'auto' {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Announce a message to screen readers via a live region.
 * @param message - The message to announce
 * @param priority - Announcement priority (default: 'polite')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
}

/**
 * Detect user's operating system.
 */
export function detectOS(): 'windows' | 'mac' | 'other' {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'mac';
  return 'other';
}

/**
 * Get recommended email file format based on OS.
 * @returns 'emltpl' for Mac, 'eml' for others
 */
export function getRecommendedFormat(): 'emltpl' | 'eml' {
  const os = detectOS();
  return os === 'mac' ? 'emltpl' : 'eml';
}

/**
 * Show a toast notification (stacking support).
 * NOTE: In the React app, prefer using Sonner's toast() function instead.
 * This is kept for backward compatibility with legacy vanilla JS.
 */
export function showToast(
  message: string,
  type: 'default' | 'success' | 'error' | 'warning' = 'default',
  duration: number = TOAST_DURATION_MS
): void {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ` toast-${type}` : ''}`;

  const icons: Record<string, string> = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  };

  const icon = icons[type] || icons.default;
  toast.innerHTML = `${icon}<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-slide-out 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Write empty state placeholder to an iframe.
 */
export function writeEmptyStateToIframe(
  iframe: HTMLIFrameElement | null
): void {
  if (!iframe) return;

  const iframeDoc =
    iframe.contentDocument ||
    (iframe.contentWindow?.document as Document | null | undefined);
  if (!iframeDoc) return;

  const computedStyle = getComputedStyle(document.documentElement);
  const bgColor = computedStyle.getPropertyValue('--card').trim() || '#f6f8fa';
  const textColor =
    computedStyle.getPropertyValue('--foreground').trim() || '#24292f';
  const textSecondary =
    computedStyle.getPropertyValue('--muted-foreground').trim() || '#57606a';

  iframeDoc.open();
  iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Aptos', Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    margin: 0;
                    background: ${bgColor};
                    color: ${textSecondary};
                    text-align: center;
                    padding: 2rem;
                }
                .empty-state {
                    max-width: 400px;
                }
                .empty-state h3 {
                    font-size: 1.2rem;
                    margin: 0 0 0.5rem 0;
                    color: ${textColor};
                }
                .empty-state p {
                    font-size: 0.9rem;
                    margin: 0;
                    color: ${textSecondary};
                }
            </style>
        </head>
        <body>
            <div class="empty-state">
                <h3>No Preview Yet</h3>
                <p>Content will appear here when you generate a message</p>
            </div>
        </body>
        </html>
    `);
  iframeDoc.close();
}
