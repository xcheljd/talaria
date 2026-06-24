/**
 * Tests for the dark-mode live-preview color transform.
 *
 * The preview emulates how aggressive email clients (Outlook Windows, Gmail
 * iOS) render a light email in dark mode: a *full* inversion that flips the
 * lightness of every color — backgrounds, text, borders, AND inline
 * editor-chosen text/highlight colors — while preserving hue. Because a
 * lightness flip swaps a foreground and its background together, contrast (and
 * therefore readability) is preserved by construction.
 *
 * Two models are emulated: 'full' (flip every color) and 'partial' (only darken
 * light backgrounds and lighten dark text/borders, leaving already-dark areas) —
 * matching the two ways real clients invert.
 *
 * Covers:
 * - invertColorForDarkMode: hex, named, rgb()/rgba(), hue preservation, passthrough
 * - applyDarkModePreview full vs partial: role-aware rewriting inside style="…"
 *   only, never body text
 * - end-to-end: light surfaces darken, the newsletter heading stays legible
 *   (the original regression) in both models, the footer stays dark under partial
 *   but flips under full, and editor-chosen body colors are inverted too
 * - the always-light export HTML is never mutated
 */

import { describe, it, expect, vi } from 'vitest';
import {
  EMAIL_PALETTE,
  applyDarkModePreview,
  applyDarkModeToDocument,
  invertColorForDarkMode,
  generatePromotionEmailHTML,
} from '@/lib/promotion-email-html';
import {
  buildPromotionEmailData,
  type EmailDataSource,
} from '@/lib/newsletter-utils';
import { DEFAULT_NEWSLETTER_STYLE } from '@/stores/promotion-store';

vi.mock('@/lib/profile', () => ({
  getStorePhone: vi.fn().mockReturnValue('702-357-8990'),
  getStoreEmail: vi.fn().mockReturnValue('store@citizenwatchgroup.com'),
  getStoreAddress: vi.fn().mockReturnValue('123 Test St'),
  getStoreHours: vi.fn().mockReturnValue('Mon-Sat 10AM-8PM'),
  getStorePlusCode: vi.fn().mockReturnValue(''),
  getDirections: vi.fn().mockReturnValue(''),
  getEmployeeName: vi.fn().mockReturnValue('Test User'),
}));

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** HSL lightness (0-1) of a hex color. */
function lightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

describe('invertColorForDarkMode', () => {
  it('maps white to a near-black (~#1a1a1a), not pure black', () => {
    const out = invertColorForDarkMode('#ffffff');
    expect(lightness(out)).toBeGreaterThan(0.05);
    expect(lightness(out)).toBeLessThan(0.15);
  });

  it('maps black to a light gray, not pure white', () => {
    const out = invertColorForDarkMode('#000000');
    expect(lightness(out)).toBeGreaterThan(0.85);
    expect(lightness(out)).toBeLessThan(0.95);
  });

  it('leaves a mid-lightness gray near its original lightness', () => {
    expect(lightness(invertColorForDarkMode('#808080'))).toBeCloseTo(0.5, 1);
  });

  it('preserves hue: a dark navy becomes a light blue, still blue-dominant', () => {
    const out = invertColorForDarkMode('#0a1a3a');
    expect(lightness(out)).toBeGreaterThan(0.6); // lightened
    const [r, , b] = hexToRgb(out);
    expect(b).toBeGreaterThan(r); // still blue
  });

  it('inverts named colors to hex', () => {
    expect(lightness(invertColorForDarkMode('white'))).toBeLessThan(0.15);
  });

  it('inverts rgb()/rgba() and keeps the alpha channel', () => {
    expect(invertColorForDarkMode('rgb(255, 255, 255)')).toMatch(
      /^rgb\(\d+, \d+, \d+\)$/
    );
    expect(invertColorForDarkMode('rgba(255, 255, 255, 0.5)')).toContain(
      ', 0.5)'
    );
  });

  it('passes through colors it cannot parse, unchanged', () => {
    expect(invertColorForDarkMode('cornflowerblue')).toBe('cornflowerblue');
    expect(invertColorForDarkMode('var(--surface)')).toBe('var(--surface)');
  });

  it('is deterministic', () => {
    expect(invertColorForDarkMode('#2c3e50')).toBe(
      invertColorForDarkMode('#2c3e50')
    );
  });
});

describe('applyDarkModePreview', () => {
  it('inverts colors inside style attributes', () => {
    const out = applyDarkModePreview(
      '<div style="background-color: #ffffff; color: #000000;">x</div>'
    );
    const bg = out.match(/background-color:\s*(#[0-9a-f]{6})/i)![1];
    const fg = out.match(/[^-]color:\s*(#[0-9a-f]{6})/i)![1];
    expect(lightness(bg)).toBeLessThan(0.15); // white surface → dark
    expect(lightness(fg)).toBeGreaterThan(0.85); // black text → light
  });

  it('only rewrites colors inside style="…", never body text', () => {
    const out = applyDarkModePreview(
      '<p style="color: #333333">Snow white #ffffff today</p>'
    );
    // The styled color is inverted...
    expect(out).not.toContain('color: #333333');
    // ...but the visible text — which merely mentions white / #ffffff — is intact.
    expect(out).toContain('>Snow white #ffffff today<');
  });

  it('does not mutate its input', () => {
    const input = '<div style="color: #ffffff">x</div>';
    const copy = input;
    applyDarkModePreview(input);
    expect(input).toBe(copy);
  });
});

describe('applyDarkModePreview — partial inversion', () => {
  it('darkens a light background but leaves an already-dark one alone', () => {
    const out = applyDarkModePreview(
      '<div style="background-color: #ffffff">a</div>' +
        '<div style="background-color: #222222">b</div>',
      'partial'
    );
    const bgs = [...out.matchAll(/background-color:\s*([^;"]+)/gi)].map((m) =>
      m[1].trim()
    );
    expect(lightness(bgs[0])).toBeLessThan(0.2); // light surface → dark
    expect(bgs[1]).toBe('#222222'); // already dark → untouched
  });

  it('lightens dark text but leaves already-light text alone', () => {
    const out = applyDarkModePreview(
      '<p style="color: #111111">a</p><p style="color: #eeeeee">b</p>',
      'partial'
    );
    const fgs = [...out.matchAll(/[^-]color:\s*([^;"]+)/gi)].map((m) =>
      m[1].trim()
    );
    expect(lightness(fgs[0])).toBeGreaterThan(0.8); // dark text → light
    expect(fgs[1]).toBe('#eeeeee'); // already light → untouched
  });
});

describe('end-to-end dark-mode email', () => {
  function makeSource(
    overrides: Partial<EmailDataSource> = {}
  ): EmailDataSource {
    return {
      promoDateRange: 'Nov 28 - Dec 1',
      promoYear: '2025',
      promoTitle: 'HOLIDAY SALE',
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      specialHours: [],
      howToShopItems: [],
      importantNotesItems: [],
      howToShopStyle: { borderColor: null, backgroundColor: null },
      importantNotesStyle: { borderColor: null, backgroundColor: null },
      newsletterHeading: 'Newsletter',
      newsletterBody: '<h2>This Month</h2><p>Hello world</p>',
      newsletterPosition: 'top',
      newsletterVisible: true,
      newsletterStyle: { ...DEFAULT_NEWSLETTER_STYLE },
      emailPalette: { ...EMAIL_PALETTE },
      preheaderText: '',
      ...overrides,
    };
  }

  const light = (s: EmailDataSource) =>
    generatePromotionEmailHTML(buildPromotionEmailData(s));

  function newsletterHeadingColor(html: string): string | null {
    const section = html.match(/<!-- NEWSLETTER -->([\s\S]*?)<\/div>/m);
    const h2 = section?.[1].match(/<h2[^>]*style="([^"]*)"/);
    return h2?.[1].match(/color:\s*(#[0-9a-f]{6})/i)?.[1] ?? null;
  }

  function newsletterBgColor(html: string): string | null {
    const div = html.match(/<!-- NEWSLETTER -->\s*<div style="([^"]*)"/m);
    return div?.[1].match(/background-color:\s*(#[0-9a-f]{6})/i)?.[1] ?? null;
  }

  it('darkens the light body background', () => {
    const dark = applyDarkModePreview(light(makeSource()));
    // bodyBg defaults to the named color "white"; after inversion it is dark.
    expect(dark).not.toContain('background-color: white');
  });

  it('keeps the newsletter heading legible (regression) — light on dark', () => {
    const dark = applyDarkModePreview(light(makeSource()));
    const heading = newsletterHeadingColor(dark);
    const bg = newsletterBgColor(dark);
    expect(heading).toBeTruthy();
    expect(bg).toBeTruthy();
    // Heading clearly lighter than its background → visible, not dark-on-dark.
    expect(lightness(heading!) - lightness(bg!)).toBeGreaterThan(0.3);
  });

  it('inverts editor-chosen body text colors too', () => {
    const source = makeSource({
      newsletterBody:
        '<h2>This Month</h2><p><span style="color: #0a1a3a">navy note</span></p>',
    });
    const lightHtml = light(source);
    expect(lightHtml).toContain('#0a1a3a'); // present in the light build
    const dark = applyDarkModePreview(lightHtml);
    expect(dark).not.toContain('#0a1a3a'); // inverted away in dark preview
  });

  it('does not alter the always-light export HTML', () => {
    const lightHtml = light(makeSource());
    // The export path uses this string directly; dark preview is separate.
    expect(lightHtml).toContain('background-color: white');
  });

  it('partial keeps the dark footer dark; full flips it light', () => {
    const lightHtml = light(makeSource());
    const footerBgRe = /email-footer[^>]*background-color:\s*([^;"]+)/i;

    const partialBg = applyDarkModePreview(lightHtml, 'partial').match(
      footerBgRe
    )?.[1];
    const fullBg = applyDarkModePreview(lightHtml, 'full').match(
      footerBgRe
    )?.[1];

    expect(partialBg).toBe('#2c3e50'); // already dark → left untouched
    expect(lightness(fullBg!)).toBeGreaterThan(0.5); // full inversion → light
  });

  it('keeps the newsletter heading legible under partial inversion too', () => {
    const partial = applyDarkModePreview(light(makeSource()), 'partial');
    const heading = newsletterHeadingColor(partial);
    const bg = newsletterBgColor(partial);
    expect(heading).toBeTruthy();
    expect(bg).toBeTruthy();
    // Auto heading (a dark color) lightens; its light section bg darkens.
    expect(lightness(heading!) - lightness(bg!)).toBeGreaterThan(0.3);
  });
});

describe('applyDarkModeToDocument (in-place, no reload)', () => {
  function makeDoc(body: string): Document {
    return new DOMParser().parseFromString(
      `<!DOCTYPE html><html><body>${body}</body></html>`,
      'text/html'
    );
  }
  // CSSOM normalizes colors to rgb(); read lightness from there so assertions
  // don't depend on hex-vs-rgb serialization.
  function bgLightness(el: HTMLElement): number {
    const m = el.style.backgroundColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return -1;
    const [r, g, b] = [m[1], m[2], m[3]].map((n) => parseInt(n, 10) / 255);
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  }

  it('inverts a light background in place and stashes the original style', () => {
    const doc = makeDoc('<div id="a" style="background-color: #ffffff;">x</div>');
    const el = doc.getElementById('a') as HTMLElement;
    applyDarkModeToDocument(doc, 'full');
    expect(bgLightness(el)).toBeLessThan(0.2); // white → dark
    expect(el.hasAttribute('data-pp-light-style')).toBe(true);
  });

  it('reverts to the original light style (and clears the stash)', () => {
    const doc = makeDoc('<div id="a" style="background-color: #ffffff;">x</div>');
    const el = doc.getElementById('a') as HTMLElement;
    applyDarkModeToDocument(doc, 'full');
    applyDarkModeToDocument(doc, 'light');
    expect(bgLightness(el)).toBeGreaterThan(0.9); // white again
    expect(el.hasAttribute('data-pp-light-style')).toBe(false);
  });

  it('re-derives from the original when switching full → partial', () => {
    // A dark (footer-like) bg: full flips it light, partial keeps it dark.
    const doc = makeDoc('<div id="f" style="background-color: #2c3e50;">x</div>');
    const el = doc.getElementById('f') as HTMLElement;
    applyDarkModeToDocument(doc, 'full');
    expect(bgLightness(el)).toBeGreaterThan(0.5); // dark → light
    applyDarkModeToDocument(doc, 'partial');
    expect(bgLightness(el)).toBeLessThan(0.3); // back to (original) dark
  });

  it('is idempotent for a given mode', () => {
    const doc = makeDoc('<div id="a" style="background-color: #ffffff;">x</div>');
    const el = doc.getElementById('a') as HTMLElement;
    applyDarkModeToDocument(doc, 'full');
    const once = el.style.backgroundColor;
    applyDarkModeToDocument(doc, 'full');
    expect(el.style.backgroundColor).toBe(once);
  });
});
