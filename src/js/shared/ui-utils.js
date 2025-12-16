/**
 * Shared UI Utilities
 * Common UI helper functions used across the application
 */

import { emailIcon } from './icons.js';

// Constants
export const TOAST_DURATION_MS = 2500;

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default: 2500)
 */
export function showToast(message, duration = TOAST_DURATION_MS) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
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
  const bgColor =
    computedStyle.getPropertyValue('--bg-tertiary').trim() || '#f8f3ef';
  const textColor =
    computedStyle.getPropertyValue('--text-primary').trim() || '#2a2420';
  const textSecondary =
    computedStyle.getPropertyValue('--text-secondary').trim() || '#666';

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
