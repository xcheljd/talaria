/**
 * Newsletter themes: phrases in the newsletter copy ("just in", "back in
 * stock", "trunk show") that unlock themed subject lines.
 *
 * A theme only fires when one of its phrases actually appears in the
 * newsletter heading or body, and not in a negated form ("no new arrivals
 * this month"). Names attached to a theme come only from the SAME sentence as
 * the phrase, so "Introducing the Citizen Promaster Ecozilla" can name the
 * Ecozilla, but a brand mentioned elsewhere in the email cannot be credited
 * as new. Pure functions, no React or DOM.
 */

export type NewsletterTheme =
  'newArrivals' | 'backInStock' | 'limited' | 'event' | 'gift';

export const NEWSLETTER_THEMES: NewsletterTheme[] = [
  'newArrivals',
  'backInStock',
  'limited',
  'event',
  'gift',
];

/** Built-in trigger phrases. Profile phrases are added on top, never replace. */
export const THEME_PHRASES: Record<NewsletterTheme, string[]> = {
  newArrivals: [
    'new arrival',
    'new arrivals',
    'just in',
    'just arrived',
    'just landed',
    'now in stock',
    'now available',
    'introducing',
    'debut',
    'debuts',
    'new collection',
    'newest',
    'first look',
  ],
  backInStock: [
    'back in stock',
    'restocked',
    'restock',
    'back by popular demand',
    'is back',
    'are back',
  ],
  limited: [
    'limited edition',
    'limited release',
    'special edition',
    'numbered edition',
    'exclusive',
  ],
  event: [
    'trunk show',
    'in-store event',
    'join us',
    'rsvp',
    "you're invited",
    'launch party',
    'meet the',
  ],
  gift: [
    'gift',
    'gifts',
    'gift guide',
    'for him',
    'for her',
    'stocking stuffer',
    'gift-ready',
  ],
};

/** Labels for the settings form. */
export const THEME_LABELS: Record<NewsletterTheme, string> = {
  newArrivals: 'New arrivals',
  backInStock: 'Back in stock',
  limited: 'Limited / exclusive',
  event: 'In-store event',
  gift: 'Gifts',
};

export interface ThemeHit {
  theme: NewsletterTheme;
  /** the phrase that matched, lowercase */
  phrase: string;
  /** brands named in the same sentence */
  brands: string[];
  /** collections named in the same sentence */
  collections: string[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word, case-insensitive find; returns match index or -1. */
function findWord(text: string, word: string): number {
  if (!word.trim()) return -1;
  const re = new RegExp(
    `(^|[^\\p{L}\\p{N}])(${escapeRegExp(word)})(?=$|[^\\p{L}\\p{N}])`,
    'iu'
  );
  const m = re.exec(text);
  return m ? m.index + m[1].length : -1;
}

const NEGATION =
  /\b(no|not|never|without|isn't|aren't|won't|nothing)\b(\s+\S+){0,2}\s*$/i;

/** Split copy into sentences (also on line breaks / list items). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+|•/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Detect themes in the newsletter. `sentences` should include the heading as
 * its own sentence. One hit per theme: the first non-negated sentence, with
 * the names in that sentence (a sentence that names something is preferred).
 */
export function detectThemes(
  sentences: string[],
  brands: string[],
  collections: string[],
  customPhrases: Partial<Record<NewsletterTheme, string[]>> = {}
): ThemeHit[] {
  const hits: ThemeHit[] = [];
  for (const theme of NEWSLETTER_THEMES) {
    const phrases = [
      ...THEME_PHRASES[theme],
      ...(customPhrases[theme] ?? []).map((p) => p.trim().toLowerCase()),
    ].filter(Boolean);
    let best: ThemeHit | null = null;
    for (const sentence of sentences) {
      for (const phrase of phrases) {
        const at = findWord(sentence, phrase);
        if (at < 0) continue;
        if (NEGATION.test(sentence.slice(0, at))) continue;
        const hit: ThemeHit = {
          theme,
          phrase,
          brands: brands.filter((b) => findWord(sentence, b) >= 0),
          collections: collections.filter((c) => findWord(sentence, c) >= 0),
        };
        const named = hit.brands.length + hit.collections.length > 0;
        if (!best) best = hit;
        else if (named && best.brands.length + best.collections.length === 0) {
          best = hit;
        }
        break; // one phrase per sentence is enough
      }
      if (best && best.brands.length + best.collections.length > 0) break;
    }
    if (best) hits.push(best);
  }
  return hits;
}
