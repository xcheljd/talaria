/**
 * Unit tests for the canonical email palette and the <mark> highlight
 * sanitization in promotion-email-html. (Dark-mode color inversion is covered
 * in dark-mode-preview.test.ts.)
 */

import { describe, it, expect } from 'vitest';
import {
  EMAIL_PALETTE,
  generatePromotionEmailHTML,
  type PromotionEmailData,
} from '../src/lib/promotion-email-html';

describe('EMAIL_PALETTE', () => {
  it('exposes all canonical palette keys', () => {
    expect(Object.keys(EMAIL_PALETTE).sort()).toEqual(
      [
        'accent',
        'bodyBg',
        'footerBg',
        'footerText',
        'headerBorder',
        'link',
        'noteBorder',
        'sectionBg',
        'text',
        'unsubscribeBg',
      ].sort()
    );
  });
});

/**
 * Regression tests for the <mark data-color="..."> → inline-style conversion.
 *
 * `convertTipTapToInlineHTML` is module-private, so these tests drive the
 * code path through the public `generatePromotionEmailHTML` entry by passing
 * TipTap-style highlight markup in the newsletter body. The captured
 * data-color value must be validated (via SAFE_COLOR_RE) before it is
 * inlined into a `style` attribute so a malicious value can't inject
 * additional CSS declarations.
 */

const NEWSLETTER_STYLE: PromotionEmailData['newsletterStyle'] = {
  borderColor: '#2563eb',
  backgroundColor: '#f9fafb',
  headingColor: '#1e40af',
  borderStyle: 'left',
  headingAlign: 'left',
};

function makeEmailData(
  newsletterBody: string,
  overrides: Partial<PromotionEmailData> = {}
): PromotionEmailData {
  return {
    promoDateRange: 'Nov 28 - Dec 1',
    promoYear: '2025',
    promoTitle: 'TEST SALE',
    promotionEntries: [
      {
        id: 1,
        line: 'CITIZEN – 20% OFF',
        collections: 'Corso, Avion',
        callout: '',
      },
    ],
    specialHours: [],
    howToShopItems: [],
    importantNotesItems: [],
    newsletterHeading: 'Newsletter',
    newsletterBody,
    newsletterPosition: 'top',
    newsletterVisible: true,
    newsletterStyle: { ...NEWSLETTER_STYLE },
    ...overrides,
  };
}

describe('mark data-color sanitization', () => {
  it('passes a valid hex color through to the inlined style', () => {
    const html = generatePromotionEmailHTML(
      makeEmailData(
        '<p>Highlighted <mark data-color="#ff0000">red</mark> text</p>'
      )
    );
    expect(html).toContain('background-color: #ff0000;');
  });

  it('passes a valid named color through to the inlined style', () => {
    const html = generatePromotionEmailHTML(
      makeEmailData('<p>Highlighted <mark data-color="red">red</mark> text</p>')
    );
    expect(html).toContain('background-color: red;');
  });

  it('rejects a semicolon-injection attempt and falls back to yellow', () => {
    const html = generatePromotionEmailHTML(
      makeEmailData(
        '<p>Highlighted <mark data-color="red; background-image: url(x)">bad</mark> text</p>'
      )
    );
    // The raw injection payload must NOT survive verbatim anywhere in the output.
    expect(html).not.toContain('background-image');
    expect(html).not.toContain('red; background-image');
    // The invalid value falls back to the established default.
    expect(html).toContain('background-color: yellow;');
    // And the literal malicious data-color value is not re-emitted.
    expect(html).not.toContain('data-color="red; background-image: url(x)"');
  });

  it('falls back to yellow for a <mark> with no data-color attribute', () => {
    const html = generatePromotionEmailHTML(
      makeEmailData('<p>Highlighted <mark>plain</mark> text</p>')
    );
    expect(html).toContain('background-color: yellow;');
  });
});
