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
  /**
   * Brand names to detect in promotion/newsletter copy so they can be featured
   * in subjects. Supplied from the profile (brand keywords +
   * company name). Defaults to none.
   */
  brandKeywords?: string[];
  /** Singular product noun used in subject copy (e.g. "watch"). Default "product". */
  productNoun?: string;
  /**
   * Plural product noun (e.g. "watches", "sunglasses"). Used wherever the
   * grammar needs a plural. Derived from the singular when not supplied.
   */
  productNounPlural?: string;
  /**
   * Collection names from the profile. Used to spot collections named in a
   * promotion line, and (low-ranked, with no discount attached) as "Featuring"
   * candidates when no entry names them. Defaults to none.
   */
  collectionKeywords?: string[];
}

/** Capitalize the first letter for use in title-style subject lines. */
function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
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

// ===== Offers =====

/**
 * One discount entry read the way the store writes it:
 *   Promotion Line  = brand + discount  ("CITIZEN - 50% OFF")
 *   Collections     = the select collections in that offer
 *   Special Callout = a highlight for those collections ("Final Sale")
 * A brand can have several offers at different percentages.
 */
export interface Offer {
  brand: string | null;
  pct: number;
  collections: string[];
  callout: string;
}

const lower = (s: string) => s.toLowerCase();

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word, case-insensitive containment. */
function mentions(text: string, word: string): boolean {
  if (!word.trim()) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}($|[^\\p{L}\\p{N}])`,
    'iu'
  ).test(text);
}

/** "CITIZEN" -> "Citizen", "TAG HEUER" -> "Tag Heuer" (keeps mixed case). */
function tidyBrand(raw: string): string {
  const t = raw.trim();
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(/\s+/)
    .map((w) => capitalizeWord(w))
    .join(' ');
}

function percentIn(text: string): number {
  const m = (text || '').match(/(\d{1,2})\s*%/);
  return m ? parseInt(m[1], 10) || 0 : 0;
}

/** "$175 $130" -> 26 (the first two prices, larger read as the original). */
function percentFromPrices(text: string): number {
  const prices = [...(text || '').matchAll(/\$\s?(\d+(?:\.\d+)?)/g)].map((m) =>
    parseFloat(m[1])
  );
  if (prices.length < 2) return 0;
  const [a, b] = prices;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi <= 0 || lo <= 0 || hi === lo) return 0;
  return Math.round((1 - lo / hi) * 100);
}

export function parseOffers(
  entries: PromotionEntry[],
  brandKeywords: string[],
  collectionKeywords: string[]
): Offer[] {
  return entries
    .map((e) => {
      const line = (e.line || '').trim();
      const callout = (e.callout || '').trim();

      // Brand: a profile keyword named in the line, else the leading words
      // before the separator in "BRAND - 50% OFF".
      let brand = brandKeywords.find((b) => mentions(line, b)) ?? null;
      if (!brand) {
        const lead = line.match(/^\s*([\p{L}&' ]{2,30}?)\s*[-–—:|]/u);
        if (lead && /\d\s*%/.test(line)) brand = tidyBrand(lead[1]);
      }

      const pct =
        percentIn(line) || percentIn(callout) || percentFromPrices(line);

      const isBrand = (c: string) =>
        (brand !== null && lower(c) === lower(brand)) ||
        brandKeywords.some((b) => lower(b) === lower(c));
      const collections: string[] = [];
      const add = (c: string) => {
        const t = c.replace(/^[\s*•]+/, '').trim();
        if (
          t &&
          !isBrand(t) &&
          !collections.some((x) => lower(x) === lower(t))
        ) {
          collections.push(t);
        }
      };
      (e.collections || '').split(/[,•]/).forEach(add);
      collectionKeywords.filter((c) => mentions(line, c)).forEach(add);

      return { brand, pct, collections, callout };
    })
    .filter(
      (o) => o.brand || o.pct > 0 || o.collections.length > 0 || o.callout
    );
}

/** "Duality", "Duality & Octava", "Duality, Octava & Phantom" */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function pluralize(noun: string): string {
  const n = noun.trim();
  if (!n) return 'products';
  if (/(s|x|z|ch|sh)$/i.test(n)) return `${n}es`;
  if (/[^aeiou]y$/i.test(n)) return `${n.slice(0, -1)}ies`;
  return `${n}s`;
}

function titleCase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w) => capitalizeWord(w))
    .join(' ');
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// ===== Candidates, scoring, selection =====

type Angle =
  | 'heading'
  | 'offer'
  | 'brand'
  | 'collection'
  | 'urgency'
  | 'occasion'
  | 'date'
  | 'generic';

interface Candidate {
  text: string;
  angle: Angle;
  /** how much real promotion data the line carries */
  specificity: number;
}

const ANGLE_BASE: Record<Angle, number> = {
  heading: 12, // the store's own words beat any template
  offer: 7,
  collection: 6,
  urgency: 6,
  occasion: 6,
  brand: 5,
  date: 3,
  generic: 0,
};

function lengthScore(n: number): number {
  if (n >= 30 && n <= 45) return 2;
  if (n >= 20 && n <= 50) return 1;
  return n > 60 ? -10 : 0;
}

/** Same name twice ("Maravista including Maravista") reads as a glitch. */
function repeatsAName(text: string): boolean {
  const words = text
    .split(/[^\p{L}\p{N}']+/u)
    .filter((w) => w.length > 3 && /^\p{Lu}/u.test(w))
    .map(lower);
  return new Set(words).size !== words.length;
}

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}%]+/u)
      .filter((w) => w.length > 2)
  );
}

function nearDuplicate(a: string, b: string): boolean {
  const A = wordSet(a);
  const B = wordSet(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / (A.size + B.size - inter) >= 0.7;
}

// ===== Subject Line Generation =====

/**
 * Generate subject line suggestions from promotion content.
 *
 * Every line that names a brand or collection only pairs it with a discount
 * from that same offer, so a subject never promises more than the email
 * offers. Results are ranked (real names and numbers first, inbox-friendly
 * length), and the top five each come from a different angle.
 */
export function generateSubjectLines(input: SubjectLineInput): string[] {
  const {
    promoDateRange,
    promotionEntries,
    newsletterHeading,
    newsletterBody,
  } = input;

  const singular = (input.productNoun || 'product').trim();
  const plural = (input.productNounPlural || '').trim() || pluralize(singular);
  // Compound modifiers use the singular ("Watch Sale", "Sunglass Deals");
  // nouns standing on their own use the plural ("New Watches", "New Sunglasses").
  const Product = titleCase(singular);
  const Products = titleCase(plural);

  const headingText = (newsletterHeading || '').trim();
  const bodyText = newsletterBody ? stripHtmlToText(newsletterBody) : '';
  const brandKeywords = (input.brandKeywords ?? []).filter((b) => b.trim());
  const collectionKeywords = (input.collectionKeywords ?? []).filter((c) =>
    c.trim()
  );

  const offers = parseOffers(
    promotionEntries,
    brandKeywords,
    collectionKeywords
  );

  // Brands in order of appearance: offers first, then any named only in the
  // newsletter copy (prose is safe for names, never for percentages).
  const brands: string[] = [];
  const addBrand = (b: string | null) => {
    if (b && !brands.some((x) => lower(x) === lower(b))) brands.push(b);
  };
  offers.forEach((o) => addBrand(o.brand));
  brandKeywords
    .filter((b) => mentions(headingText, b) || mentions(bodyText, b))
    .forEach(addBrand);

  const brandMax = (b: string) =>
    Math.max(
      0,
      ...offers
        .filter((o) => o.brand && lower(o.brand) === lower(b))
        .map((o) => o.pct)
    );
  const brandCollections = (b: string) => {
    const out: string[] = [];
    offers
      .filter((o) => o.brand && lower(o.brand) === lower(b))
      .forEach((o) =>
        o.collections.forEach((c) => !out.includes(c) && out.push(c))
      );
    return out;
  };
  const maxDiscount = Math.max(0, ...offers.map((o) => o.pct));
  const upTo = (n: number) => (n > 0 ? `Up to ${n}% OFF` : 'Special Savings');

  const cands: Candidate[] = [];
  const push = (text: string, angle: Angle, specificity = 0) =>
    cands.push({ text: text.replace(/\s+/g, ' ').trim(), angle, specificity });

  // Human-written heading, offered verbatim (skip the bare "Newsletter" default)
  if (headingText && lower(headingText) !== 'newsletter') {
    push(headingText, 'heading', 2);
  }

  // ----- Per-offer lines (names + that offer's own %) -----
  const oneBrandOfferCount = (b: string) =>
    offers.filter((o) => o.brand && lower(o.brand) === lower(b)).length;
  brands.forEach((b) => {
    const m = brandMax(b);
    if (m > 0) {
      push(
        oneBrandOfferCount(b) > 1
          ? `${b}: Up to ${m}% OFF`
          : `${b} – ${m}% OFF`,
        'offer',
        2
      );
    }
  });
  offers.forEach((o) => {
    if (o.pct > 0 && o.collections.length > 0) {
      const names = joinNames(o.collections.slice(0, 3));
      if (o.brand) push(`${o.brand} ${names} – ${o.pct}% OFF`, 'collection', 3);
      push(`${names} – ${o.pct}% OFF`, 'collection', 2);
      if (o.collections.length > 3 && o.brand) {
        push(
          `${o.brand} ${o.collections.slice(0, 2).join(', ')} & More – ${o.pct}% OFF`,
          'collection',
          3
        );
      }
    }
    const callout = lower(o.callout);
    const who = o.brand ?? joinNames(o.collections.slice(0, 2));
    if (callout.includes('final') && who && o.pct > 0) {
      push(`Final Sale: ${who} at ${o.pct}% OFF`, 'urgency', 3);
    }
    if (
      (callout.includes('limited') || callout.includes('while supplies')) &&
      who
    ) {
      push(
        o.pct > 0
          ? `Limited Stock: ${who} ${o.pct}% OFF`
          : `Limited Stock: ${who}`,
        'urgency',
        2
      );
    }
  });

  // Two brands: "up to" is the higher of THOSE two brands' offers
  if (brands.length >= 2) {
    const [b1, b2] = brands;
    const m = Math.max(brandMax(b1), brandMax(b2));
    push(
      m > 0 ? `${b1} & ${b2}: Up to ${m}% OFF` : `${b1} & ${b2} Sale Event`,
      'brand',
      2
    );
    const c1 = brandCollections(b1)[0];
    const c2 = brandCollections(b2)[0];
    const pair = c1 && c2 ? `${b1} ${c1} & ${b2} ${c2} on Sale` : '';
    if (pair && pair.length <= 50) push(pair, 'brand', 3);
  }
  brands.slice(0, 2).forEach((b) => {
    const colls = brandCollections(b);
    if (colls.length >= 2)
      push(`${b} ${joinNames(colls.slice(0, 3))} on Sale`, 'brand', 2);
    else if (brandMax(b) === 0) push(`${b} Sale Event`, 'brand', 1);
  });
  if (brands.length > 0) {
    push(`Discover ${brands[0]}`, 'brand', 1);
    push(`VIP ${Product} Sale: ${brands[0]} & More`, 'brand', 1);
  }

  // Profile collections nobody named: featured, but never with a %
  const offerColls = new Set(offers.flatMap((o) => o.collections.map(lower)));
  const spare = collectionKeywords.filter(
    (c) =>
      !offerColls.has(lower(c)) &&
      !brandKeywords.some((b) => lower(b) === lower(c))
  );
  if (offerColls.size === 0 && spare.length > 0) {
    push(`Featuring ${joinNames(spare.slice(0, 2))}`, 'collection', 1);
  }

  // ----- Whole-email lines (no names, so the email-wide max is honest) -----
  const parsedRange = promoDateRange
    ? parsePromoDateRange(promoDateRange)
    : null;
  const { season, occasions } = getSeasonAndOccasions(
    parsedRange?.start ?? undefined
  );
  const Season = capitalizeWord(season);

  if (occasions.length > 0) {
    const occasion = occasions[0];
    if (occasion.type === 'gift') {
      push(`${occasion.name} ${Product} Gifts`, 'occasion', 1);
      if (maxDiscount > 0)
        push(`${occasion.name} Gifts – ${upTo(maxDiscount)}`, 'occasion', 2);
      if (brands.length > 0)
        push(`${occasion.name}: ${brands[0]} Picks`, 'occasion', 2);
    } else if (occasion.type === 'sale') {
      push(`${occasion.name} ${Product} Sale`, 'occasion', 1);
      if (maxDiscount > 0)
        push(`${occasion.name} Savings – ${upTo(maxDiscount)}`, 'occasion', 2);
    } else if (occasion.type === 'theme' && maxDiscount > 0) {
      push(`${occasion.name} Sale – ${upTo(maxDiscount)}`, 'occasion', 2);
    }
  } else {
    push(
      maxDiscount > 0
        ? `${Season} ${Product} Sale – ${upTo(maxDiscount)}`
        : `${Season} ${Product} Sale`,
      'occasion',
      maxDiscount > 0 ? 2 : 1
    );
  }

  if (offers.some((o) => /limited|while supplies/i.test(o.callout))) {
    push('Limited Stock – Shop Now', 'urgency', 0);
  }

  if (promoDateRange) {
    push(`Sale: ${promoDateRange}`, 'date', 1);
    if (parsedRange && maxDiscount > 0) {
      const e = parsedRange.end;
      push(
        `${upTo(maxDiscount)} Through ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`,
        'date',
        2
      );
    }
    if (/\b(fri|sat|sun)/i.test(promoDateRange)) {
      push(`This Weekend: ${upTo(maxDiscount)}`, 'date', 1);
    }
  }

  if (maxDiscount > 0) push(`Don't Miss These ${Product} Deals`, 'generic', 1);
  if (maxDiscount >= 25) push('Luxury Within Reach', 'generic', 0);
  push(`Ready for New ${Products}?`, 'generic', 0);
  push('Elevate Your Style', 'generic', 0);
  push('Time for an Upgrade', 'generic', 0);

  // ----- Filter, score, diversify -----
  const seen = new Set<string>();
  const valid = cands.filter((c) => {
    const key = lower(c.text);
    if (!c.text || seen.has(key) || c.text.length > 60 || repeatsAName(c.text))
      return false;
    seen.add(key);
    return true;
  });
  const score = (c: Candidate) =>
    ANGLE_BASE[c.angle] + c.specificity * 2 + lengthScore(c.text.length);
  const ranked = valid
    .map((c, i) => ({ c, s: score(c), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);

  const picked: Candidate[] = [];
  const keep = (c: Candidate) =>
    !picked.includes(c) && !picked.some((p) => nearDuplicate(p.text, c.text));
  // Top five: the best line from each angle, in score order, with no brand
  // leading more than two of them
  const leadBrand = (t: string) =>
    brands.find((b) => lower(t).startsWith(lower(b)));
  const leads = (b: string | undefined) =>
    b ? picked.filter((p) => leadBrand(p.text) === b).length : 0;
  const angles = new Set<Angle>();
  for (const c of ranked) {
    if (picked.length >= 5) break;
    if (!angles.has(c.angle) && leads(leadBrand(c.text)) < 2 && keep(c)) {
      picked.push(c);
      angles.add(c.angle);
    }
  }
  for (const c of ranked) if (keep(c)) picked.push(c);

  return picked.map((c) => c.text);
}
