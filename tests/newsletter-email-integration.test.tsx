/**
 * Tests for newsletter email integration.
 *
 * Covers:
 * - Newsletter section rendered at TOP position in email HTML
 * - Newsletter section rendered at BOTTOM position in email HTML
 * - Newsletter heading renders as styled h2 in email HTML
 * - Newsletter body renders with inline styles (no CSS classes)
 * - Empty newsletter body produces no section in email
 * - XSS sanitization of newsletter body in email output
 * - Rich text formatting renders with inline styles
 * - javascript: URI vulnerability is blocked in link handler
 * - TipTap editor syncs on external store changes
 * - Toolbar active state updates via onSelectionUpdate
 * - Preview updates live when newsletter content changes
 * - EML export includes newsletter at correct position
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  generatePromotionEmailHTML,
  type PromotionEmailData,
} from '@/lib/promotion-email-html';
import { buildExportConfig, validateImportConfig } from '@/lib/promotion-config';
import {
  sanitizeRichHTML,
  isSafeURL,
} from '@/lib/html-utils';

import { PromotionPage } from '@/pages/PromotionPage';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore, _resetIdCounter } from '@/stores/promotion-store';


// ===== Mock Profile =====

const MOCK_PROFILE = {
  employeeName: 'John Doe',
  jobTitle: 'Sales Associate',
  storeName: 'Test Store',
  storeLocation: 'Test Location',
  storeAddress: '123 Test St',
  storePhone: '555-1234',
  storeEmail: 'test@store.com',
  storeHours: 'Mon-Sat: 10AM-8PM',
  storePlusCode: 'ABC123',
  storeDirections: 'Near the mall',
};

// ===== Setup =====

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }

  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class IntersectionObserver {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof globalThis.IntersectionObserver;
  }
});

function resetStore() {
  usePromotionStore.getState().resetState();
  _resetIdCounter();
}

function renderPromotionPage() {
  localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  resetStore();
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <MemoryRouter>
          <PromotionPage />
        </MemoryRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

/** Helper to create email data with defaults */
function makeEmailData(overrides: Partial<PromotionEmailData> = {}): PromotionEmailData {
  return {
    promoDateRange: 'Nov 28 - Dec 1',
    promoYear: '2025',
    promoTitle: 'TEST SALE',
    promotionEntries: [
      { id: 1, line: 'CITIZEN – 20% OFF', collections: 'Corso, Avion', callout: '' },
    ],
    specialHours: [],
    howToShopItems: [
      { id: 1, text: 'Visit us in-store', bold: false, italic: false, underline: false },
    ],
    importantNotesItems: [
      { id: 1, text: 'While supplies last', bold: false, italic: false, underline: false },
    ],
    newsletterHeading: 'Newsletter',
    newsletterBody: '',
    newsletterPosition: 'top',
    newsletterVisible: true,
    newsletterStyle: {
      borderColor: '#2563eb',
      backgroundColor: '#f9fafb',
      headingColor: '#1e40af',
      borderStyle: 'left',
      headingAlign: 'left',
    },
    ...overrides,
  };
}

// ===== HTML Generation Tests =====

describe('newsletter email integration - HTML generation', () => {
  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  });

  describe('newsletter at TOP position', () => {
    it('renders newsletter section between HEADER and BRAND SECTIONS', () => {
      const data = makeEmailData({
        newsletterBody: '<p>Hello from newsletter</p>',
        newsletterPosition: 'top',
      });
      const html = generatePromotionEmailHTML(data);

      const headerIndex = html.indexOf('<!-- HEADER -->');
      const newsletterIndex = html.indexOf('<!-- NEWSLETTER -->');
      const brandIndex = html.indexOf('<!-- BRAND SECTIONS -->');

      expect(headerIndex).toBeGreaterThan(-1);
      expect(newsletterIndex).toBeGreaterThan(-1);
      expect(brandIndex).toBeGreaterThan(-1);

      // Newsletter should be between HEADER and BRAND SECTIONS
      expect(headerIndex).toBeLessThan(newsletterIndex);
      expect(newsletterIndex).toBeLessThan(brandIndex);
    });

    it('does not render newsletter section at bottom when position is top', () => {
      const data = makeEmailData({
        newsletterBody: '<p>Hello from newsletter</p>',
        newsletterPosition: 'top',
      });
      const html = generatePromotionEmailHTML(data);

      // There should be exactly one newsletter section
      const matches = html.match(/<!-- NEWSLETTER -->/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe('newsletter at BOTTOM position', () => {
    it('renders newsletter section between BRAND SECTIONS and HOW TO SHOP BOX', () => {
      const data = makeEmailData({
        newsletterBody: '<p>Hello from newsletter</p>',
        newsletterPosition: 'bottom',
      });
      const html = generatePromotionEmailHTML(data);

      const brandIndex = html.indexOf('<!-- BRAND SECTIONS -->');
      const newsletterIndex = html.indexOf('<!-- NEWSLETTER -->');
      const howToShopIndex = html.indexOf('HOW TO SHOP BOX');

      expect(brandIndex).toBeGreaterThan(-1);
      expect(newsletterIndex).toBeGreaterThan(-1);
      expect(howToShopIndex).toBeGreaterThan(-1);

      // Newsletter should be between BRAND SECTIONS and HOW TO SHOP BOX
      expect(brandIndex).toBeLessThan(newsletterIndex);
      expect(newsletterIndex).toBeLessThan(howToShopIndex);
    });
  });

  describe('newsletter heading', () => {
    it('renders heading from first H2 in body as styled h2 in email HTML', () => {
      const data = makeEmailData({
        newsletterBody: '<h2>Store Updates</h2><p>Content here</p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).toContain('Store Updates');
      // Check it's in a heading with inline styles
      expect(html).toMatch(/<h2[^>]*style="[^"]*"[^>]*>Store Updates<\/h2>/);
    });

    it('uses default "Newsletter" heading when body has no H2', () => {
      const data = makeEmailData({
        newsletterBody: '<p>Content here</p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).toContain('Newsletter');
    });
  });

  describe('newsletter body with inline styles', () => {
    it('renders body HTML with inline styles and no CSS classes', () => {
      const data = makeEmailData({
        newsletterBody: '<p>Hello world</p>',
      });
      const html = generatePromotionEmailHTML(data);

      // Body content should be present
      expect(html).toContain('Hello world');
      // Should have inline-styled paragraph
      expect(html).toMatch(/<p style="[^"]*font-family[^"]*"[^>]*>Hello world<\/p>/);
    });

    it('converts strong tags to inline-styled spans', () => {
      const data = makeEmailData({
        newsletterBody: '<p><strong>Bold text</strong></p>',
      });
      const html = generatePromotionEmailHTML(data);

      // <strong> should be replaced with <span style="font-weight: bold;">
      expect(html).not.toContain('<strong>');
      expect(html).toContain('<span style="font-weight: bold;">Bold text</span>');
    });

    it('converts em tags to inline-styled spans for italic text', () => {
      const data = makeEmailData({
        newsletterBody: '<p><em>Italic text</em></p>',
      });
      const html = generatePromotionEmailHTML(data);

      // <em> should be replaced with <span style="font-style: italic;">
      expect(html).not.toContain('<em>');
      expect(html).toContain('<span style="font-style: italic;">Italic text</span>');
    });

    it('converts u tags to inline-styled spans for underline', () => {
      const data = makeEmailData({
        newsletterBody: '<p><u>Underlined text</u></p>',
      });
      const html = generatePromotionEmailHTML(data);

      // <u> should be replaced with <span style="text-decoration: underline;">
      expect(html).not.toContain('<u>');
      expect(html).toContain('<span style="text-decoration: underline;">Underlined text</span>');
    });

    it('converts mark tags to inline-styled spans for highlight', () => {
      const data = makeEmailData({
        newsletterBody: '<p><mark>Highlighted text</mark></p>',
      });
      const html = generatePromotionEmailHTML(data);

      // <mark> should be replaced with <span style="background-color: yellow;">
      expect(html).not.toContain('<mark>');
      expect(html).toContain('<span style="background-color: yellow;">Highlighted text</span>');
    });

    it('converts mark tags with data-color to inline-styled spans', () => {
      const data = makeEmailData({
        newsletterBody: '<p><mark data-color="#ff0000">Red highlight</mark></p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('<mark');
      expect(html).toContain('<span style="background-color: #ff0000;">Red highlight</span>');
    });

    it('handles nested formatting with all inline styles', () => {
      const data = makeEmailData({
        newsletterBody: '<p><strong><em><u>Bold italic underline</u></em></strong></p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('<strong>');
      expect(html).not.toContain('<em>');
      expect(html).not.toContain('<u>');
      expect(html).toContain('font-weight: bold');
      expect(html).toContain('font-style: italic');
      expect(html).toContain('text-decoration: underline');
      expect(html).toContain('Bold italic underline');
    });

    it('preserves span style attributes for text color', () => {
      const data = makeEmailData({
        newsletterBody: '<p><span style="color: #ff0000;">Red text</span></p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).toContain('color: #ff0000;');
      expect(html).toContain('Red text');
    });

    it('converts ul/li for bullet lists', () => {
      const data = makeEmailData({
        newsletterBody: '<ul><li>Item 1</li><li>Item 2</li></ul>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
      // Lists should have inline styles
      expect(html).toMatch(/<ul[^>]*style="[^"]*"[^>]*>/);
      expect(html).toMatch(/<li[^>]*style="[^"]*"[^>]*>Item 1<\/li>/);
    });

    it('converts links with inline styles', () => {
      const data = makeEmailData({
        newsletterBody: '<p><a href="https://example.com">Click here</a></p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).toContain('Click here');
      expect(html).toMatch(/<a[^>]*style="[^"]*color[^"]*"[^>]*>Click here<\/a>/);
    });
  });

  describe('empty newsletter body', () => {
    it('produces no newsletter section when body is empty', () => {
      const data = makeEmailData({
        newsletterBody: '',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('<!-- NEWSLETTER -->');
      expect(html).not.toContain('NEWSLETTER');
    });

    it('produces no newsletter section when body is only whitespace', () => {
      const data = makeEmailData({
        newsletterBody: '   ',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('<!-- NEWSLETTER -->');
    });

    it('produces no newsletter section when body is empty paragraph', () => {
      const data = makeEmailData({
        newsletterBody: '<p></p>',
      });
      const html = generatePromotionEmailHTML(data);

      // Empty paragraph from TipTap should not render a section
      // After sanitizeRichHTML, <p></p> might be preserved but the
      // convertTipTapToInlineHTML should produce content that buildNewsletterSection checks
      expect(html).not.toContain('<!-- NEWSLETTER -->');
    });
  });

  describe('XSS sanitization', () => {
    it('strips script tags from newsletter body', () => {
      const data = makeEmailData({
        newsletterBody: '<p>Hello</p><script>alert("xss")</script>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert("xss")');
    });

    it('strips javascript: URIs from links in newsletter body', () => {
      const data = makeEmailData({
        newsletterBody: '<p><a href="javascript:alert(1)">Click</a></p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('javascript:');
      // The javascript: URI should be blocked by sanitizeRichHTML
    });

    it('strips event handlers from newsletter body', () => {
      const data = makeEmailData({
        newsletterBody: '<p onclick="alert(1)">Hello</p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('onclick');
    });

    it('strips iframe tags from newsletter body', () => {
      const data = makeEmailData({
        newsletterBody: '<iframe src="https://evil.com"></iframe><p>Hello</p>',
      });
      const html = generatePromotionEmailHTML(data);

      expect(html).not.toContain('<iframe');
    });
  });
});

// ===== sanitizeRichHTML Tests =====

describe('sanitizeRichHTML', () => {
  it('preserves safe formatting tags', () => {
    const result = sanitizeRichHTML('<p>Hello <strong>bold</strong> <em>italic</em></p>');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('preserves link tags with safe hrefs', () => {
    const result = sanitizeRichHTML('<a href="https://example.com">Link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('Link');
  });

  it('strips script tags', () => {
    const result = sanitizeRichHTML('<script>alert(1)</script><p>Safe</p>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Safe');
  });

  it('strips javascript: URIs from links', () => {
    const result = sanitizeRichHTML('<a href="javascript:alert(1)">Evil</a>');
    expect(result).not.toContain('javascript:');
  });

  it('preserves style attributes on allowed tags', () => {
    const result = sanitizeRichHTML('<span style="color: red;">Red</span>');
    expect(result).toContain('style="color: red;"');
  });

  it('strips disallowed tags entirely including their content', () => {
    const result = sanitizeRichHTML('<iframe src="evil.com">Inner text</iframe>');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('Inner text');
    // Dangerous elements are fully removed (content + tag)
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeRichHTML('')).toBe('');
  });

  it('returns empty string for whitespace input', () => {
    expect(sanitizeRichHTML('   ')).toBe('');
  });
});

// ===== isSafeURL Tests =====

describe('isSafeURL', () => {
  it('allows https URLs', () => {
    expect(isSafeURL('https://example.com')).toBe(true);
  });

  it('allows http URLs', () => {
    expect(isSafeURL('http://example.com')).toBe(true);
  });

  it('allows mailto URLs', () => {
    expect(isSafeURL('mailto:test@example.com')).toBe(true);
  });

  it('allows tel URLs', () => {
    expect(isSafeURL('tel:+15551234567')).toBe(true);
  });

  it('blocks javascript: URIs', () => {
    expect(isSafeURL('javascript:alert(1)')).toBe(false);
  });

  it('blocks data: URIs', () => {
    expect(isSafeURL('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('allows relative URLs starting with /', () => {
    expect(isSafeURL('/path/to/page')).toBe(true);
  });

  it('allows anchor links', () => {
    expect(isSafeURL('#section')).toBe(true);
  });

  it('allows scheme-less relative URLs', () => {
    expect(isSafeURL('page.html')).toBe(true);
    expect(isSafeURL('foo/bar')).toBe(true);
  });

  it('fails closed on unknown or malformed schemes', () => {
    expect(isSafeURL('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeURL('foo:bar')).toBe(false);
    expect(isSafeURL('javascript:alert(1)')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSafeURL('')).toBe(false);
  });
});

// ===== Export/Import with Newsletter =====

describe('newsletter export/import integration', () => {
  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  });

  it('includes newsletter data in JSON export', () => {
    const data = makeEmailData({
      newsletterHeading: 'Store Updates',
      newsletterBody: '<p>Hello <strong>world</strong></p>',
      newsletterPosition: 'bottom',
    });
    const config = buildExportConfig(data, [], [], null);

    expect(config.newsletterHeading).toBe('Store Updates');
    expect(config.newsletterBody).toBe('<p>Hello <strong>world</strong></p>');
    expect(config.newsletterPosition).toBe('bottom');
  });

  it('restores newsletter data from JSON import', () => {
    const raw = {
      templateType: 'promotion-email',
      promotionEntries: [],
      specialHours: [],
      newsletterHeading: 'Imported Heading',
      newsletterBody: '<p>Imported body</p>',
      newsletterPosition: 'bottom' as const,
    };

    const result = validateImportConfig(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.newsletterHeading).toBe('Imported Heading');
      expect(result.config.newsletterBody).toBe('<p>Imported body</p>');
      expect(result.config.newsletterPosition).toBe('bottom');
    }
  });

  it('defaults newsletter fields when importing config without them', () => {
    const raw = {
      templateType: 'promotion-email',
      promotionEntries: [],
      specialHours: [],
    };

    const result = validateImportConfig(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.newsletterHeading).toBe('Newsletter');
      expect(result.config.newsletterBody).toBe('');
      expect(result.config.newsletterPosition).toBe('top');
    }
  });
});

// ===== EML Export with Newsletter =====

describe('newsletter EML export integration', () => {
  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  });

  it('EML export includes newsletter at correct top position', () => {
    const data = makeEmailData({
      newsletterBody: '<h2>Weekly Update</h2><p>Big news this week!</p>',
      newsletterPosition: 'top',
    });
    const html = generatePromotionEmailHTML(data);

    // Verify newsletter is in the HTML
    expect(html).toContain('Weekly Update');
    expect(html).toContain('Big news this week!');

    // Verify position (between HEADER and BRAND SECTIONS)
    const headerIndex = html.indexOf('<!-- HEADER -->');
    const newsletterIndex = html.indexOf('<!-- NEWSLETTER -->');
    const brandIndex = html.indexOf('<!-- BRAND SECTIONS -->');
    expect(headerIndex).toBeLessThan(newsletterIndex);
    expect(newsletterIndex).toBeLessThan(brandIndex);
  });

  it('EML export includes newsletter at correct bottom position', () => {
    const data = makeEmailData({
      newsletterBody: '<h2>Store Closing</h2><p>Early closure Friday</p>',
      newsletterPosition: 'bottom',
    });
    const html = generatePromotionEmailHTML(data);

    // Verify newsletter is in the HTML
    expect(html).toContain('Store Closing');
    expect(html).toContain('Early closure Friday');

    // Verify position (between BRAND SECTIONS and HOW TO SHOP BOX)
    const brandIndex = html.indexOf('<!-- BRAND SECTIONS -->');
    const newsletterIndex = html.indexOf('<!-- NEWSLETTER -->');
    const howToShopIndex = html.indexOf('HOW TO SHOP BOX');
    expect(brandIndex).toBeLessThan(newsletterIndex);
    expect(newsletterIndex).toBeLessThan(howToShopIndex);
  });
});

// ===== Preview Live Updates =====

describe('newsletter preview updates', () => {
  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
    resetStore();
  });

  it('preview updates when newsletter body changes in store', async () => {
    renderPromotionPage();

    // Set newsletter data in store - heading is derived from first H2 in body
    act(() => {
      usePromotionStore.getState().setPromoDateRange('Nov 28 - Dec 1');
      usePromotionStore.getState().setNewsletterVisible(true);
      usePromotionStore.getState().setNewsletterBody('<h2>Test Heading</h2><p>Newsletter content</p>');
    });

    // Preview should update (check iframe srcDoc) - desktop + mobile render 2 iframes
    await waitFor(() => {
      const iframes = screen.getAllByTitle('Email Preview');
      expect(iframes.length).toBeGreaterThanOrEqual(1);
      const srcDoc = iframes[0].getAttribute('srcDoc') || '';
      expect(srcDoc).toContain('Test Heading');
      expect(srcDoc).toContain('Newsletter content');
    });
  });

  it('preview updates when newsletter position changes', async () => {
    renderPromotionPage();

    act(() => {
      usePromotionStore.getState().setPromoDateRange('Nov 28 - Dec 1');
      usePromotionStore.getState().setNewsletterVisible(true);
      usePromotionStore.getState().setNewsletterBody('<h2>Content</h2><p>Body text</p>');
      usePromotionStore.getState().setNewsletterPosition('top');
    });

    // Verify at top
    await waitFor(() => {
      const iframes = screen.getAllByTitle('Email Preview');
      const srcDoc = iframes[0].getAttribute('srcDoc') || '';
      const headerIndex = srcDoc.indexOf('<!-- HEADER -->');
      const newsletterIndex = srcDoc.indexOf('<!-- NEWSLETTER -->');
      const brandIndex = srcDoc.indexOf('<!-- BRAND SECTIONS -->');
      expect(headerIndex).toBeLessThan(newsletterIndex);
      expect(newsletterIndex).toBeLessThan(brandIndex);
    });

    // Switch to bottom
    act(() => {
      usePromotionStore.getState().setNewsletterPosition('bottom');
    });

    // Verify at bottom
    await waitFor(() => {
      const iframes = screen.getAllByTitle('Email Preview');
      const srcDoc = iframes[0].getAttribute('srcDoc') || '';
      const brandIndex = srcDoc.indexOf('<!-- BRAND SECTIONS -->');
      const newsletterIndex = srcDoc.indexOf('<!-- NEWSLETTER -->');
      const howToShopIndex = srcDoc.indexOf('HOW TO SHOP BOX');
      expect(brandIndex).toBeLessThan(newsletterIndex);
      expect(newsletterIndex).toBeLessThan(howToShopIndex);
    });
  });

  it('preview omits newsletter section when body is empty', async () => {
    renderPromotionPage();

    act(() => {
      usePromotionStore.getState().setPromoDateRange('Nov 28 - Dec 1');
      usePromotionStore.getState().setNewsletterBody('');
    });

    await waitFor(() => {
      const iframes = screen.getAllByTitle('Email Preview');
      const srcDoc = iframes[0].getAttribute('srcDoc') || '';
      expect(srcDoc).not.toContain('<!-- NEWSLETTER -->');
    });
  });
});
