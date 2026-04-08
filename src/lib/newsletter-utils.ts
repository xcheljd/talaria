/**
 * Newsletter utility functions shared across components.
 * Deduplicated from PromotionPage.tsx and BulkEmailTools.tsx.
 */

import type { NewsletterStyle } from '@/stores/promotion-store';
import { EMAIL_PALETTE, type EmailPalette } from './promotion-email-html';

/**
 * Resolve newsletter style colors from the email palette.
 * When a style value is null (auto mode), the corresponding email palette
 * color is used so the newsletter visually matches the rest of the email.
 *
 * Accepts an optional custom palette; defaults to EMAIL_PALETTE.
 * This is a pure function — no DOM access required.
 */
export function resolveNewsletterColors(
  style: NewsletterStyle,
  palette: EmailPalette = EMAIL_PALETTE
): {
  borderColor: string;
  backgroundColor: string;
  headingColor: string;
  tableBorderColor: string;
  tableHeaderBg: string;
} {
  return {
    borderColor: style.borderColor ?? palette.footerBg,
    backgroundColor: style.backgroundColor ?? palette.sectionBg,
    headingColor: style.headingColor ?? palette.footerBg,
    tableBorderColor: style.tableBorderColor ?? palette.text,
    tableHeaderBg: style.tableHeaderBg ?? palette.sectionBg,
  };
}
