/**
 * Shared UI Utilities
 * Common UI helper functions used across the application
 */

import { emailIcon } from './icons.js';

// Constants
export const TOAST_DURATION_MS = 3000;

// Toast icons
const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>`,
};

/**
 * Show a toast notification (stacking support)
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'default', 'success', 'error', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(
  message,
  type = 'default',
  duration = TOAST_DURATION_MS
) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ` toast-${type}` : ''}`;

  // Add icon and message
  const icon = TOAST_ICONS[type] || TOAST_ICONS.default;
  toast.innerHTML = `${icon}<span>${message}</span>`;

  // Add to container
  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = 'toast-slide-out 0.2s ease-in forwards';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/**
 * Detect user's operating system
 * @returns {string} 'windows', 'mac', or 'other'
 */
export function detectOS() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'mac';
  return 'other';
}

/**
 * Get recommended email file format based on OS
 * @returns {string} 'emltpl' for Mac, 'eml' for others
 */
export function getRecommendedFormat() {
  const os = detectOS();
  return os === 'mac' ? 'emltpl' : 'eml';
}

/**
 * Write empty state placeholder to an iframe
 * @param {HTMLIFrameElement} iframe - Target iframe element
 */
export function writeEmptyStateToIframe(iframe) {
  if (!iframe) return;

  // Handle both standard iframe and Electron webview (if applicable)
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
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
                .empty-state svg {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 1rem;
                    opacity: 0.3;
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
                ${emailIcon({ size: 80 })}
                <h3>No Preview Yet</h3>
                <p>Content will appear here when you generate a message</p>
            </div>
        </body>
        </html>
    `);
  iframeDoc.close();
}
