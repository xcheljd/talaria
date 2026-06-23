/**
 * Newsletter utility functions shared across components.
 */

import type {
  NewsletterStyle,
  PromotionEntry,
  SpecialHour,
  HowToShopItem,
  ImportantNotesItem,
  SectionBoxStyle,
  NewsletterPosition,
} from '@/stores/promotion-store';
import {
  EMAIL_PALETTE,
  type EmailPalette,
  type PromotionEmailData,
} from './promotion-email-html';

/**
 * Resolve newsletter style colors from the email palette.
 * When a style value is null (auto mode), the corresponding email palette
 * color is used so the newsletter visually matches the rest of the email.
 *
 * Accepts an optional custom palette; defaults to EMAIL_PALETTE.
 * This is a pure function — no DOM access required.
 *
 * Dark-mode preview is handled downstream by inverting the generated HTML's
 * colors (see applyDarkModePreview), not here — so the same resolved colors
 * feed both the light preview and the always-light export.
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

export type EmailDataSource = {
  promoDateRange: string;
  promoYear: string;
  promoTitle: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  howToShopStyle: SectionBoxStyle;
  importantNotesStyle: SectionBoxStyle;
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
  newsletterVisible: boolean;
  newsletterStyle: NewsletterStyle;
  emailPalette: EmailPalette;
  preheaderText: string;
};

/** Build a PromotionEmailData object from store state. */
export function buildPromotionEmailData(
  source: EmailDataSource
): PromotionEmailData {
  const palette = source.emailPalette;
  const resolved = resolveNewsletterColors(source.newsletterStyle, palette);
  return {
    promoDateRange: source.promoDateRange,
    promoYear: source.promoYear,
    promoTitle: source.promoTitle,
    promotionEntries: source.promotionEntries,
    specialHours: source.specialHours,
    howToShopItems: source.howToShopItems,
    importantNotesItems: source.importantNotesItems,
    howToShopStyle: source.howToShopStyle,
    importantNotesStyle: source.importantNotesStyle,
    newsletterHeading: source.newsletterHeading,
    newsletterBody: source.newsletterBody,
    newsletterPosition: source.newsletterPosition,
    newsletterVisible: source.newsletterVisible,
    newsletterStyle: {
      ...resolved,
      borderStyle: source.newsletterStyle.borderStyle,
      headingAlign: source.newsletterStyle.headingAlign,
      tableBorderWidth: source.newsletterStyle.tableBorderWidth,
      tableBorderStyle: source.newsletterStyle.tableBorderStyle,
    },
    emailPalette: palette,
    preheaderText: source.preheaderText,
  };
}
