/**
 * Unit tests for the canonical email palette and the <mark> highlight
 * sanitization in promotion-email-html. (Dark-mode color inversion is covered
 * in dark-mode-preview.test.ts.)
 */

import { describe, it, expect } from 'vitest';
import {
  EMAIL_PALETTE,
  convertTipTapToInlineHTML,
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
        line: 'ACME – 20% OFF',
        collections: 'Aria, Volt',
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

/**
 * Characterization tests for `convertTipTapToInlineHTML`.
 *
 * These LOCK IN the current output of the converter (default palette /
 * default table style): each fixture is a minimal element and the
 * assertions pin the specific inline styles the implementation actually
 * emits, so a future regex change that stops converting a tag fails here.
 * Deliberately NOT an attempt to improve the output — plan 018 owns any
 * behavior changes.
 */
describe('convertTipTapToInlineHTML characterization', () => {
  it('returns empty string for empty or whitespace-only input', () => {
    expect(convertTipTapToInlineHTML('')).toBe('');
    expect(convertTipTapToInlineHTML('   \n\t ')).toBe('');
  });

  it('converts <table>/<td> to collapsed-border inline styles', () => {
    const html = convertTipTapToInlineHTML(
      '<table><tr><td>cell</td></tr></table>'
    );
    // Default table style: 1px solid palette.text (#333333).
    expect(html).toContain(
      'border-collapse: collapse; width: 100%; margin: 8px 0;'
    );
    expect(html).toContain('border: 1px solid #333333;');
    expect(html).toContain(
      'border: 1px solid #333333; padding: 6px 8px; vertical-align: top;'
    );
  });

  it('converts <blockquote> to border-left/margin/color inline styles', () => {
    const html = convertTipTapToInlineHTML('<blockquote>quote</blockquote>');
    // Default palette accent is #ffd700.
    expect(html).toContain(
      'border-left: 4px solid #ffd700; padding-left: 12px; margin: 8px 0; color: #555555; font-style: italic;'
    );
  });

  it('converts <pre><code> to monospace inline styles', () => {
    const html = convertTipTapToInlineHTML('<pre><code>code</code></pre>');
    // Default palette footerBg is #2c3e50. Regression guard: the <p>
    // regex must NOT swallow <pre> (a <p([^>]*)> pattern matched <pre>,
    // rewriting code blocks as paragraphs, killing the pre/code styles,
    // and leaking a stray </pre>).
    expect(html).toBe(
      '<pre style="background-color: #2c3e50; border-radius: 6px; padding: 12px 16px; margin: 8px 0; overflow-x: auto; border: 1px solid #dddddd;"><code style="font-family: \'Courier New\', Courier, monospace; font-size: 13px; line-height: 1.5; background: none;">code</code></pre>'
    );
    expect(html).not.toContain('<p style=');
  });

  it('converts <hr> to margin/border-top inline styles', () => {
    const html = convertTipTapToInlineHTML('<hr>');
    expect(html).toContain('margin: 12px 0;');
    expect(html).toContain('border: none; border-top: 1px solid #333333;');
  });

  it('preserves img src and emits max-width/block styling', () => {
    const src = 'data:image/png;base64,iVBORw0KGgo=';
    const html = convertTipTapToInlineHTML(`<img src="${src}">`);
    expect(html).toContain(`src="${src}"`);
    expect(html).toContain(
      'max-width: 100%; height: auto; display: block; margin: 8px auto;'
    );
  });

  it('converts <ul>/<li> to padding-left/margin inline styles', () => {
    const html = convertTipTapToInlineHTML('<ul><li>item</li></ul>');
    expect(html).toContain(
      "font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 8px 0; padding-left: 24px;"
    );
    expect(html).toContain(
      "font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 2px 0;"
    );
  });

  it('preserves td colspan when converting cell styles', () => {
    const html = convertTipTapToInlineHTML(
      '<table><tr><td colspan="2">wide</td></tr></table>'
    );
    expect(html).toContain('<td colspan="2" style="');
  });

  it('converts <h2> to font-size/weight inline styles', () => {
    const html = convertTipTapToInlineHTML('<h2>Title</h2>');
    expect(html).toContain('font-size: 20px;');
    expect(html).toContain(
      "font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 15px 0 8px 0; font-weight: bold;"
    );
  });

  it('sanitizes a malicious mark data-color at the converter level', () => {
    const html = convertTipTapToInlineHTML(
      '<p>Highlighted <mark data-color="red; background-image: url(x)">bad</mark> text</p>'
    );
    expect(html).not.toContain('background-image');
    expect(html).not.toContain('red; background-image');
    expect(html).not.toContain('data-color="red; background-image: url(x)"');
    expect(html).toContain('background-color: yellow;');
  });
});
