/**
 * Subject and preheader suggestions drawn from the newsletter copy: theme
 * phrases ("just in", "back in stock", "trunk show"), names from the same
 * sentence only, heading + offer, preheaders that add to the subject, and the
 * profile's extra theme phrases.
 */
import { describe, it, expect } from 'vitest';
import {
  generateSubjectLines,
  generatePreheaders,
  type SubjectLineInput,
} from '@/lib/subject-line-generator';
import { detectThemes, splitSentences } from '@/lib/newsletter-themes';
import {
  splitThemeFields,
  themePhrasesToForm,
} from '@/components/profile/profile-form-utils';
import type { ProfileFormValues } from '@/lib/profile-validation';
import type { PromotionEntry } from '@/stores/promotion-store';

const entry = (
  id: number,
  line: string,
  collections: string,
  callout = ''
): PromotionEntry => ({
  id,
  line,
  collections,
  callout,
});

const BASE: SubjectLineInput = {
  promoDateRange: 'November 5 - 14',
  promotionEntries: [
    entry(1, 'CITIZEN - 50% OFF', 'Armor Ti, Atomic, Axiom'),
    entry(2, 'BULOVA - 80% OFF', 'Duality, Octava, Phantom', 'Final Sale'),
  ],
  brandKeywords: ['Citizen', 'Bulova'],
  collectionKeywords: ['Promaster Ecozilla', 'Lunar Pilot'],
  productNoun: 'watch',
  productNounPlural: 'watches',
};

const withBody = (body: string, extra: Partial<SubjectLineInput> = {}) =>
  generateSubjectLines({ ...BASE, newsletterBody: body, ...extra });

describe('newsletter themes', () => {
  it('names a new arrival from the sentence that announces it', () => {
    const result = withBody(
      '<p>Introducing the Citizen Promaster Ecozilla, just landed in store.</p>'
    );
    expect(result).toContain('Just In: Citizen Promaster Ecozilla');
    expect(result).toContain('New Arrivals: Citizen Promaster Ecozilla');
  });

  it('never credits names from another sentence as new', () => {
    const result = withBody(
      '<p>New arrivals hit the floor this week.</p><p>Our Bulova Lunar Pilot stays a favorite.</p>'
    );
    expect(
      result.some(
        (s) => /New Arrivals:|Just In:/.test(s) && /Lunar Pilot|Bulova/.test(s)
      )
    ).toBe(false);
    expect(result).toContain('Just In: New Watches');
    expect(result).toContain('New Arrivals Are Here');
  });

  it('skips negated phrases', () => {
    const result = withBody(
      '<p>No new arrivals this month, but every Citizen is on sale.</p>'
    );
    expect(
      result.some((s) => /New Arrivals|Just In|Now In Store/.test(s))
    ).toBe(false);
  });

  it('covers back in stock, limited, events and gifts', () => {
    const result = withBody(
      '<p>The Bulova Lunar Pilot is back in stock.</p>' +
        '<p>A limited edition Promaster Ecozilla.</p>' +
        '<p>Join us Saturday for our trunk show.</p>' +
        '<p>Gift-ready picks for him.</p>'
    );
    expect(result).toContain('Back in Stock: Bulova Lunar Pilot');
    expect(result).toContain('Limited Edition: Promaster Ecozilla');
    expect(result).toContain("You're Invited: In-Store Trunk Show");
    expect(result).toContain("Watch Gifts They'll Love");
  });

  it('reads the heading too', () => {
    const result = generateSubjectLines({
      ...BASE,
      newsletterHeading: 'Just In: Fall Arrivals',
    });
    expect(result[0]).toBe('Just In: Fall Arrivals'); // the heading, verbatim
    expect(result).toContain('Just In: New Watches');
  });

  it('honors extra phrases from the profile', () => {
    const plain = withBody('<p>Fresh drop: the Lunar Pilot.</p>');
    expect(plain.some((s) => /Just In/.test(s))).toBe(false);
    const custom = withBody('<p>Fresh drop: the Lunar Pilot.</p>', {
      themePhrases: { newArrivals: ['fresh drop'] },
    });
    expect(custom).toContain('Just In: Lunar Pilot');
  });

  it('ranks a named theme line above generic filler and in the top five', () => {
    const result = withBody(
      '<p>Introducing the Citizen Promaster Ecozilla.</p>'
    );
    const i = result.indexOf('Just In: Citizen Promaster Ecozilla');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(5);
    expect(i).toBeLessThan(result.indexOf('Elevate Your Style'));
  });

  it('splits sentences on punctuation, line breaks and bullets', () => {
    expect(splitSentences('One. Two!\nThree • Four')).toEqual([
      'One.',
      'Two!',
      'Three',
      'Four',
    ]);
  });

  it('detects at most one hit per theme', () => {
    const hits = detectThemes(
      ['Just in: Aria.', 'New arrivals: Volt.'],
      [],
      ['Aria', 'Volt']
    );
    expect(hits.filter((h) => h.theme === 'newArrivals')).toHaveLength(1);
  });
});

describe('heading + offer', () => {
  it('pairs a neutral heading with the email-wide best offer', () => {
    const result = generateSubjectLines({
      ...BASE,
      newsletterHeading: 'Holiday Preview',
    });
    expect(result).toContain('Holiday Preview: Up to 80% OFF');
  });

  it("uses only a named brand's own discount", () => {
    const result = generateSubjectLines({
      ...BASE,
      newsletterHeading: 'Citizen Week',
    });
    expect(result).toContain('Citizen Week: 50% OFF');
    expect(result.some((s) => /Citizen Week.*80%/.test(s))).toBe(false);
  });

  it('never takes a percentage from the newsletter prose', () => {
    const result = generateSubjectLines({
      promoDateRange: '',
      promotionEntries: [],
      newsletterHeading: 'Holiday Preview',
      newsletterBody: '<p>Just in: up to 90% off everything.</p>',
    });
    expect(result.some((s) => /\d+\s*%/.test(s))).toBe(false);
  });
});

describe('generatePreheaders', () => {
  const body =
    '<p>Introducing the Citizen Promaster Ecozilla.</p><p>Visit us this weekend.</p>';

  it("leads with the newsletter's own first sentence", () => {
    const result = generatePreheaders({
      ...BASE,
      newsletterBody: body,
      subject: 'Holiday Preview',
    });
    expect(result[0]).toBe('Introducing the Citizen Promaster Ecozilla.');
    expect(result).toContain(
      'Introducing the Citizen Promaster Ecozilla. Visit us this weekend.'
    );
  });

  it('drops lines that repeat the subject', () => {
    const result = generatePreheaders({
      ...BASE,
      newsletterBody: body,
      subject: 'Introducing the Citizen Promaster Ecozilla',
    });
    expect(result.some((s) => s.startsWith('Introducing'))).toBe(false);
  });

  it('keeps every suggestion within 100 characters when copy is long', () => {
    const long = `<p>${'A very long opening sentence that keeps going '.repeat(4)}.</p>`;
    const result = generatePreheaders({ ...BASE, newsletterBody: long });
    expect(result[0]).not.toContain('very long opening');
  });

  it('still suggests something with no content', () => {
    expect(
      generatePreheaders({ promoDateRange: '', promotionEntries: [] }).length
    ).toBeGreaterThan(0);
  });
});

describe('profile theme phrases', () => {
  it('round-trips between form strings and the profile', () => {
    const form = themePhrasesToForm({
      newArrivals: ['fresh drop', 'just dropped'],
    });
    expect(form.themeNewArrivals).toBe('fresh drop, just dropped');
    expect(form.themeGift).toBe('');
    const { rest, themePhrases } = splitThemeFields({
      companyName: 'Acme',
      ...form,
    } as unknown as ProfileFormValues);
    expect(themePhrases).toEqual({
      newArrivals: ['fresh drop', 'just dropped'],
    });
    expect(Object.keys(rest).some((k) => k.startsWith('theme'))).toBe(false);
  });
});
