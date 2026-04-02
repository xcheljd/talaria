/**
 * Newsletter utility functions shared across components.
 * Deduplicated from PromotionPage.tsx and BulkEmailTools.tsx.
 */

import type { NewsletterStyle } from '@/stores/promotion-store';

/**
 * Resolve newsletter style colors from CSS custom properties.
 * Falls back to hardcoded defaults when style values are null (auto mode).
 */
export function resolveNewsletterColors(style: NewsletterStyle): {
  borderColor: string;
  backgroundColor: string;
  headingColor: string;
} {
  const root = document.documentElement;
  const computed = getComputedStyle(root);

  return {
    borderColor:
      style.borderColor ??
      (computed.getPropertyValue('--primary').trim() || '#2c3e50'),
    backgroundColor:
      style.backgroundColor ??
      (computed.getPropertyValue('--muted').trim() || '#f5f5f5'),
    headingColor:
      style.headingColor ??
      (computed.getPropertyValue('--primary').trim() || '#2c3e50'),
  };
}
