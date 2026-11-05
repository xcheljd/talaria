/**
 * Subject lines read each discount entry as ONE offer:
 *   Promotion Line = brand + discount, Collections = that offer's collections,
 *   Special Callout = a highlight for those collections.
 * Every subject that names a brand or collection must use that offer's own
 * percentage, so a subject never promises more than the email offers.
 */
import { describe, it, expect } from 'vitest';
import {
  generateSubjectLines,
  parseOffers,
  type Offer,
  type SubjectLineInput,
} from '@/lib/subject-line-generator';
import type { PromotionEntry } from '@/stores/promotion-store';

const entry = (
  id: number,
  line: string,
  collections: string,
  callout = ''
): PromotionEntry => ({ id, line, collections, callout });

// Shaped like a real outlet email (Citizen/Bulova tiers, Final Sale on one)
const OUTLET: SubjectLineInput = {
  promoDateRange: 'November 5 - 14',
  promotionEntries: [
    entry(
      1,
      'CITIZEN - 50% OFF',
      'Armor Ti, Atomic, Axiom, Crystal, Endicott, Garrison, Promaster Fugu'
    ),
    entry(
      2,
      'CITIZEN- 60% OFF',
      'Axiom, Crystal, Garrison, Promaster Ecozilla, Promaster Fugu'
    ),
    entry(
      3,
      'BULOVA - 40% OFF',
      'Archive 150th Anniversary, Marine Star, Lunar Pilot, Regatta'
    ),
    entry(4, 'BULOVA - 80% OFF', 'Duality, Octava, Phantom', 'Final Sale'),
  ],
  brandKeywords: ['Citizen', 'Bulova'],
  productNoun: 'watch',
  productNounPlural: 'watches',
};

// The demo store, entered the same way
const SUNGLASSES: SubjectLineInput = {
  promoDateRange: 'November 5 - 14',
  promotionEntries: [
    entry(1, 'MARAVISTA - 15% OFF', 'Sundrift, Canyon'),
    entry(2, 'ALDERMOOR - 20% OFF', 'Driftwood'),
    entry(3, 'VELLAMY - 25% OFF', 'Riptide', 'Final Sale'),
  ],
  newsletterHeading: 'Fall Shades Event',
  brandKeywords: ['Maravista', 'Aldermoor', 'Vellamy', 'Coastwell'],
  collectionKeywords: ['Sundrift', 'Canyon', 'Driftwood', 'Riptide'],
  productNoun: 'sunglass',
  productNounPlural: 'sunglasses',
};

const offersOf = (i: SubjectLineInput) =>
  parseOffers(
    i.promotionEntries,
    i.brandKeywords ?? [],
    i.collectionKeywords ?? []
  );

/**
 * A subject is honest when every % it states can be backed by the offers it
 * names: "Up to N%" = the highest offer among the named brands/collections;
 * an exact "N% OFF" = one offer that has N% and contains every name.
 * Lines naming nothing may use the email-wide maximum.
 */
function isHonest(subject: string, offers: Offer[]): boolean {
  const m = subject.match(/(\d+)% OFF/);
  if (!m) return true;
  const n = parseInt(m[1], 10);
  const lc = subject.toLowerCase();
  const names = [
    ...new Set(offers.flatMap((o) => [o.brand ?? '', ...o.collections])),
  ].filter((x) => x && lc.includes(x.toLowerCase()));
  if (names.length === 0) return n === Math.max(...offers.map((o) => o.pct));
  const named = (o: Offer) =>
    names.some(
      (x) =>
        o.brand === x ||
        o.collections.some((c) => c.toLowerCase() === x.toLowerCase())
    );
  if (/up to/i.test(subject)) {
    return n === Math.max(...offers.filter(named).map((o) => o.pct));
  }
  return offers.some(
    (o) =>
      o.pct === n &&
      names.every(
        (x) =>
          o.brand === x ||
          o.collections.some((c) => c.toLowerCase() === x.toLowerCase())
      )
  );
}

describe('parseOffers', () => {
  it('reads brand, percent, collections and callout per entry', () => {
    const offers = offersOf(OUTLET);
    expect(offers[0]).toMatchObject({ brand: 'Citizen', pct: 50 });
    expect(offers[1]).toMatchObject({ brand: 'Citizen', pct: 60 }); // "CITIZEN- 60%"
    expect(offers[3]).toMatchObject({
      brand: 'Bulova',
      pct: 80,
      collections: ['Duality', 'Octava', 'Phantom'],
      callout: 'Final Sale',
    });
  });

  it('takes the brand from the line even without profile keywords', () => {
    const [o] = parseOffers(
      [entry(1, 'TAG HEUER – 30% OFF', 'Carrera')],
      [],
      []
    );
    expect(o).toMatchObject({
      brand: 'Tag Heuer',
      pct: 30,
      collections: ['Carrera'],
    });
  });

  it('never lists a brand as one of its own collections', () => {
    const [o] = parseOffers(
      [entry(1, 'MARAVISTA - 15% OFF', 'Maravista, Sundrift')],
      ['Maravista'],
      []
    );
    expect(o.collections).toEqual(['Sundrift']);
  });

  it('falls back to the callout or a price pair for the percent', () => {
    const offers = parseOffers(
      [
        entry(1, 'ACME Aria', '', '25% off'),
        entry(2, 'ACME Volt $200 $150', ''),
      ],
      ['Acme'],
      []
    );
    expect(offers.map((o) => o.pct)).toEqual([25, 25]);
  });
});

describe('generateSubjectLines — per-offer honesty', () => {
  for (const [label, input] of [
    ['outlet', OUTLET],
    ['sunglasses', SUNGLASSES],
  ] as const) {
    it(`${label}: every stated % belongs to the offer it names`, () => {
      const offers = offersOf(input);
      const dishonest = generateSubjectLines(input).filter(
        (s) => !isHonest(s, offers)
      );
      expect(dishonest).toEqual([]);
    });

    it(`${label}: no name repeats and nothing exceeds 60 characters`, () => {
      for (const s of generateSubjectLines(input)) {
        expect(s.length).toBeLessThanOrEqual(60);
        expect(s).not.toMatch(/\b(\w{4,})\b.*\b\1\b/i);
      }
    });
  }

  it('pairs collections with their own offer, not the email maximum', () => {
    const result = generateSubjectLines(OUTLET);
    expect(result).toContain('Bulova Duality, Octava & Phantom – 80% OFF');
    expect(result.some((s) => /Armor Ti.*80%/.test(s))).toBe(false);
    expect(result).toContain('Citizen: Up to 60% OFF');
  });

  it('ties Final Sale to the offer that carries it', () => {
    expect(generateSubjectLines(OUTLET)).toContain(
      'Final Sale: Bulova at 80% OFF'
    );
    expect(generateSubjectLines(SUNGLASSES)).toContain(
      'Final Sale: Vellamy at 25% OFF'
    );
  });

  it("does not credit one brand with another brand's collections", () => {
    const bad = generateSubjectLines(SUNGLASSES).filter(
      (s) =>
        /Maravista/.test(s) &&
        /Driftwood|Riptide/.test(s) &&
        !/Aldermoor|Vellamy/.test(s)
    );
    expect(bad).toEqual([]);
  });

  it('makes no claims the promotion cannot back up', () => {
    for (const s of generateSubjectLines(OUTLET)) {
      expect(s).not.toMatch(/New Arrivals/i);
      expect(s).not.toMatch(/Gifts/i); // November 5 is not a gift occasion
    }
  });
});

describe('generateSubjectLines — wording and ranking', () => {
  it('uses the plural where the grammar needs it', () => {
    const result = generateSubjectLines(SUNGLASSES);
    expect(result).toContain('Ready for New Sunglasses?');
    expect(result.some((s) => /New Sunglass\b(?!es)/.test(s))).toBe(false);
    expect(result).toContain('Fall Sunglass Sale – Up to 25% OFF'); // compound stays singular
  });

  it("ranks the store's own heading first", () => {
    expect(generateSubjectLines(SUNGLASSES)[0]).toBe('Fall Shades Event');
  });

  it('keeps generic filler out of the top five', () => {
    const top = generateSubjectLines(OUTLET).slice(0, 5);
    expect(
      top.some((s) =>
        /Elevate Your Style|Time for an Upgrade|Luxury Within Reach/.test(s)
      )
    ).toBe(false);
  });

  it('gives the top five different angles', () => {
    const top = generateSubjectLines(OUTLET).slice(0, 5);
    // at most two of the top five lead with the same brand
    const citizenFirst = top.filter((s) => s.startsWith('Citizen')).length;
    expect(citizenFirst).toBeLessThanOrEqual(2);
  });

  it('offers a season line even without a discount', () => {
    const result = generateSubjectLines({
      promoDateRange: 'October 1 - 10',
      promotionEntries: [entry(1, 'New Collection', '')],
      productNoun: 'watch',
    });
    expect(result).toContain('Fall Watch Sale');
  });
});
