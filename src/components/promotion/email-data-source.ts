import { type PromotionState } from '@/stores/promotion-store';
import { type EmailDataSource } from '@/lib/newsletter-utils';

/**
 * Fields consumed by buildPromotionEmailData (the EmailDataSource shape).
 * Shared by the page-level emailHTML memo, the auto-save hook, and
 * PreviewColumn so they all stay in sync with what HTML generation actually
 * reads. The return type annotation makes typecheck fail if this selector
 * drifts from EmailDataSource.
 */
export const selectEmailDataSource = (s: PromotionState): EmailDataSource => ({
  promoDateRange: s.promoDateRange,
  promoYear: s.promoYear,
  promoTitle: s.promoTitle,
  promotionEntries: s.promotionEntries,
  specialHours: s.specialHours,
  howToShopItems: s.howToShopItems,
  importantNotesItems: s.importantNotesItems,
  howToShopStyle: s.howToShopStyle,
  importantNotesStyle: s.importantNotesStyle,
  newsletterHeading: s.newsletterHeading,
  newsletterBody: s.newsletterBody,
  newsletterPosition: s.newsletterPosition,
  newsletterVisible: s.newsletterVisible,
  newsletterStyle: s.newsletterStyle,
  emailPalette: s.emailPalette,
  preheaderText: s.preheaderText,
});
