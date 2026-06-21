/**
 * Subject line generation from promotion content.
 * Migrated from src/js/promotion-ui.js generateSubjectLines()
 * Pure functions with no React or DOM dependencies.
 */

import type { PromotionEntry } from '@/stores/promotion-store';
import { parsePromoDateRange, generatePromoTitle } from './holiday-dates';

// Re-exported for callers/tests that import it from this module
export { generatePromoTitle };

// ===== Types =====

export interface SubjectLineInput {
  promoDateRange: string;
  promotionEntries: PromotionEntry[];
  /** Newsletter heading — offered verbatim as a subject-line candidate. */
  newsletterHeading?: string;
  /**
   * Newsletter body (rich HTML). Scanned for brand names ONLY. Never mined for
   * discount percentages: prose exclusion fine-print (e.g. "Excludes Promotion
   * (60% Off+)", "90-Day No Discount Models") would otherwise be misread as the
   * headline offer and advertise a discount you aren't running.
   */
  newsletterBody?: string;
}

/**
 * Strip HTML tags to plain text for keyword scanning. Pure (no DOM) so the
 * generator stays portable; good enough for case-insensitive `.includes()`.
 */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== Season & Occasion Detection =====

interface SeasonOccasions {
  season: string;
  occasions: Array<{ name: string; type: string }>;
}

function getSeasonAndOccasions(referenceDate?: Date): SeasonOccasions {
  const now = referenceDate ?? new Date();
  const month = now.getMonth();
  const day = now.getDate();

  let season = 'winter';
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'fall';

  const occasions: Array<{ name: string; type: string }> = [];

  if (month === 1 && day <= 14) {
    occasions.push({ name: "Valentine's Day", type: 'gift' });
  }
  if (month === 4 && day <= 14) {
    occasions.push({ name: "Mother's Day", type: 'gift' });
  }
  if (month === 5 && day <= 21) {
    occasions.push({ name: "Father's Day", type: 'gift' });
  }
  if ((month === 5 && day >= 20) || (month === 6 && day <= 4)) {
    occasions.push({ name: 'July 4th', type: 'sale' });
  }
  if ((month === 6 && day >= 20) || month === 7 || (month === 8 && day <= 7)) {
    occasions.push({ name: 'Back to School', type: 'sale' });
  }
  if (month === 9 && day >= 15) {
    occasions.push({ name: 'Halloween', type: 'theme' });
  }
  if (month === 10 && day >= 20) {
    occasions.push({ name: 'Black Friday', type: 'sale' });
  }
  if (month === 11 && day <= 25) {
    occasions.push({ name: 'Holiday', type: 'gift' });
  }
  if ((month === 11 && day >= 26) || (month === 0 && day <= 7)) {
    occasions.push({ name: 'New Year', type: 'sale' });
  }

  return { season, occasions };
}

// ===== Subject Line Generation =====

/**
 * Generate subject line suggestions from promotion content.
 * Returns an array of unique, filtered subject lines sorted by optimal length.
 */
export function generateSubjectLines(input: SubjectLineInput): string[] {
  const {
    promoDateRange,
    promotionEntries,
    newsletterHeading,
    newsletterBody,
  } = input;

  const headingText = (newsletterHeading || '').trim();
  const bodyText = newsletterBody ? stripHtmlToText(newsletterBody) : '';

  // Extract brands from promotion lines AND newsletter content (heading + body).
  // Brand names are safe to read from prose; discount percentages are not (see
  // the SubjectLineInput.newsletterBody doc), so only `maxDiscount` below stays
  // scoped to structured promotion entries.
  const brandKeywords = ['Citizen', 'Bulova', 'Alpina', 'Frederique Constant'];
  const brandCorpus = [
    ...promotionEntries.map((e) => e.line || ''),
    headingText,
    bodyText,
  ];
  const brands = [
    ...new Set(
      brandCorpus
        .flatMap((text) =>
          brandKeywords.filter((brand) =>
            text.toLowerCase().includes(brand.toLowerCase())
          )
        )
        .filter(Boolean)
    ),
  ];

  // Extract max discount percentage
  const discountPattern = /(\d+)[\s%]*%/;
  const maxDiscount = Math.max(
    0,
    ...promotionEntries.map((e) => {
      const match = (e.line || '').match(discountPattern);
      return match ? parseInt(match[1], 10) || 0 : 0;
    })
  );

  // Extract collections
  const collections: string[] = [];
  const collectionsByBrand: Record<string, string[]> = {};
  promotionEntries.forEach((e) => {
    if (e.collections) {
      const entryBrand = brandKeywords.find((brand) =>
        (e.line || '').toLowerCase().includes(brand.toLowerCase())
      );

      e.collections.split(',').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed && !collections.includes(trimmed)) {
          collections.push(trimmed);
          if (entryBrand) {
            if (!collectionsByBrand[entryBrand]) {
              collectionsByBrand[entryBrand] = [];
            }
            collectionsByBrand[entryBrand].push(trimmed);
          }
        }
      });
    }
  });
  const topCollections = collections.slice(0, 3);

  // Check callouts for scarcity/urgency
  const callouts = promotionEntries
    .filter((e) => e.callout && e.callout.trim())
    .map((e) => e.callout!.toLowerCase());
  const hasLimitedStock = callouts.some(
    (c) => c.includes('limited') || c.includes('while supplies')
  );
  const hasFinalSale = callouts.some((c) => c.includes('final'));

  // Build discount phrase
  const getDiscountPhrase = (discount: number): string =>
    discount > 0 ? `Up to ${discount}% OFF` : 'Special Savings';

  const subjects: string[] = [];

  // The newsletter heading is human-written copy — offer it verbatim as a
  // candidate. The length filter at the end drops it if it's over 60 chars.
  // Skip the bare default placeholder ("Newsletter"), which is never a useful
  // subject line and is present until the user writes a real heading.
  if (headingText && headingText.toLowerCase() !== 'newsletter') {
    subjects.push(headingText);
  }

  // Use the promotion date range to determine season/occasion, not today's date
  const parsedRange = promoDateRange
    ? parsePromoDateRange(promoDateRange)
    : null;
  const { season, occasions } = getSeasonAndOccasions(
    parsedRange?.start ?? undefined
  );

  // TIER 1: High-Impact Contextual
  if (occasions.length > 0) {
    const occasion = occasions[0];
    if (occasion.type === 'gift') {
      subjects.push(`${occasion.name} Watch Gifts`);
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Gifts – ${getDiscountPhrase(maxDiscount)}`
        );
      }
      if (brands.length > 0) {
        subjects.push(`${occasion.name}: ${brands[0]} Picks`);
      }
    } else if (occasion.type === 'sale') {
      subjects.push(`${occasion.name} Watch Sale`);
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Savings – ${getDiscountPhrase(maxDiscount)}`
        );
      }
    } else if (occasion.type === 'theme') {
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Sale – ${getDiscountPhrase(maxDiscount)}`
        );
      }
    }
  } else {
    const seasonCapitalized = season.charAt(0).toUpperCase() + season.slice(1);
    if (maxDiscount > 0) {
      subjects.push(
        `${seasonCapitalized} Watch Sale – ${getDiscountPhrase(maxDiscount)}`
      );
    }
  }

  // Scarcity/urgency
  if (hasLimitedStock) {
    subjects.push('Limited Stock – Shop Now');
  }
  if (hasFinalSale) {
    subjects.push('Final Sale: Extra Savings Inside');
  }

  // Brand + discount
  if (brands.length > 0 && maxDiscount > 0) {
    if (brands.length === 1) {
      subjects.push(`${brands[0]}: ${getDiscountPhrase(maxDiscount)}`);
    } else {
      subjects.push(
        `${brands[0]} & ${brands[1]}: ${getDiscountPhrase(maxDiscount)}`
      );
    }
  } else if (brands.length > 0) {
    subjects.push(`${brands[0]} Sale Event`);
  }

  // TIER 2: Value & Aspiration
  if (maxDiscount >= 30) {
    subjects.push(`Perfect Watch Gifts – Up to ${maxDiscount}% OFF`);
  }

  subjects.push('Elevate Your Style');
  subjects.push('Time for an Upgrade');
  if (maxDiscount > 0) {
    subjects.push(
      `Timeless Style, Limited Time – ${getDiscountPhrase(maxDiscount)}`
    );
  }
  if (brands.length > 0) {
    subjects.push(`Discover ${brands[0]} Excellence`);
  }
  if (maxDiscount >= 25) {
    subjects.push('Luxury Within Reach');
  }

  // TIER 3: Engagement
  subjects.push('Your New Watch Awaits');
  if (maxDiscount >= 20) {
    subjects.push('Ready for a New Watch?');
  }

  // Discount-focused
  if (maxDiscount > 0) {
    subjects.push(`Up to ${maxDiscount}% OFF This Week`);
  }

  // TIER 4: Informational
  if (promoDateRange) {
    subjects.push(`Sale: ${promoDateRange}`);
    const lowerDate = promoDateRange.toLowerCase();
    if (
      lowerDate.includes('fri') ||
      lowerDate.includes('sat') ||
      lowerDate.includes('sun')
    ) {
      subjects.push(`This Weekend: ${getDiscountPhrase(maxDiscount)}`);
    }
  }

  // Brand + Collections
  if (brands.length > 0 && topCollections.length > 0) {
    const collectionsStr = topCollections.slice(0, 3).join(', ');
    subjects.push(`${brands[0]} including ${collectionsStr}`);
  }
  if (
    brands.length >= 2 &&
    collectionsByBrand[brands[0]]?.length > 0 &&
    collectionsByBrand[brands[1]]?.length > 0
  ) {
    const collection1 = collectionsByBrand[brands[0]][0];
    const collection2 = collectionsByBrand[brands[1]][0];
    subjects.push(
      `${brands[0]} & ${brands[1]} including ${collection1}, ${collection2}`
    );
  }

  // TIER 5: Generic
  if (maxDiscount > 0) {
    subjects.push("Don't Miss These Watch Deals");
  }
  if (brands.length > 0) {
    subjects.push(`VIP Watch Sale: ${brands[0]} & More`);
  }

  if (subjects.length < 3) {
    if (maxDiscount > 0) {
      subjects.push(`Up to ${maxDiscount}% OFF – This Week Only`);
    } else {
      subjects.push('New Deals This Week');
    }
  }

  // Filter: deduplicate and remove overly long subjects
  const uniqueSubjects = [...new Set(subjects)];
  const filteredSubjects = uniqueSubjects
    .filter((s) => s.length <= 60)
    .sort((a, b) => {
      const aScore = a.length >= 20 && a.length <= 45 ? 0 : 1;
      const bScore = b.length >= 20 && b.length <= 45 ? 0 : 1;
      return aScore - bScore;
    });

  return filteredSubjects.length > 0 ? filteredSubjects : uniqueSubjects;
}
