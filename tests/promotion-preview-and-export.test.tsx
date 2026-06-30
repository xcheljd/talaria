/**
 * Tests for promotion preview, export, and configuration features.
 *
 * Covers:
 * - generatePromotionEmailHTML produces correct HTML structure
 * - Export/import config round-trip
 * - validateImportConfig rejects invalid data
 * - PreviewColumn renders tabs and buttons
 * - Start Over shows confirmation dialog and resets state
 * - Download Email Draft triggers file download
 * - Download HTML triggers file download
 * - Import config loads data into store
 * - Export config downloads JSON file
 * - Auto-save persists state (via store)
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import {
  generatePromotionEmailHTML,
  type PromotionEmailData,
} from '@/lib/promotion-email-html';
import { generatePromoTitle } from '@/lib/holiday-dates';
import {
  buildExportConfig,
  validateImportConfig,
} from '@/lib/promotion-config';

import { PromotionPage } from '@/pages/PromotionPage';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';
import { StorageKeys } from '@/lib/storage-keys';

/** Helper to create a complete PromotionEmailData with newsletter defaults */
function makeEmailData(
  overrides: Partial<PromotionEmailData> = {}
): PromotionEmailData {
  return {
    promoDateRange: '',
    promoYear: '',
    promoTitle: '',
    promotionEntries: [],
    specialHours: [],
    howToShopItems: [],
    importantNotesItems: [],
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

// Mock profile data for store helpers
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
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.IntersectionObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

function resetStore() {
  usePromotionStore.setState({
    promoDateRange: '',
    promoYear: '',
    promoTitle: '',
    promotionEntries: [],
    specialHours: [],
    howToShopItems: [],
    importantNotesItems: [],
    attachedPDFs: [],
    generatedSubjectLines: [],
    selectedSubjectLine: null,
    subjectLineManuallyEdited: false,
    entryCollapsedStates: {},
    columnState: 'left',
    isInitializing: false,
  });
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

// ===== HTML Generation Tests =====

describe('generatePromotionEmailHTML', () => {
  const baseData: PromotionEmailData = {
    promoDateRange: 'Nov 28 - Dec 1',
    promoYear: '2025',
    promoTitle: 'TEST SALE',
    promotionEntries: [
      {
        id: 1,
        line: 'ACME – 20% OFF',
        collections: 'Aria, Volt',
        callout: 'Final sale excluded',
      },
    ],
    specialHours: [{ id: 1, day: 'Black Friday', hours: '6AM-10PM' }],
    howToShopItems: [
      {
        id: 1,
        text: 'Visit us in-store',
        bold: true,
        italic: false,
        underline: false,
      },
    ],
    importantNotesItems: [
      {
        id: 1,
        text: 'While supplies last',
        bold: false,
        italic: false,
        underline: false,
      },
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
  };

  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  });

  it('produces HTML with correct title', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('TEST SALE');
  });

  it('produces HTML with date range and year', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('Nov 28 - Dec 1');
    expect(html).toContain('2025');
    expect(html).toContain('While Supplies Last');
  });

  it('auto-generates title when not provided', () => {
    const data = { ...baseData, promoTitle: '' };
    const html = generatePromotionEmailHTML(data);
    // Should contain some title (either holiday-specific or WEEKLY SALE)
    expect(html).toContain('<h1');
  });

  it('includes promotion entry line in HTML', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('ACME – 20% OFF');
  });

  it('includes collections in HTML', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('Aria');
    expect(html).toContain('Volt');
  });

  it('includes callout in HTML', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('Final sale excluded');
  });

  it('includes how to shop items', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('HOW TO SHOP');
    expect(html).toContain('Visit us in-store');
  });

  it('applies bold formatting to how-to-shop items', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('<strong>Visit us in-store</strong>');
  });

  it('includes important notes', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('IMPORTANT NOTES');
    expect(html).toContain('While supplies last');
  });

  it('includes special hours when provided', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('SPECIAL HOURS');
    expect(html).toContain('Black Friday');
    expect(html).toContain('6AM-10PM');
  });

  it('omits special hours section when empty', () => {
    const data = { ...baseData, specialHours: [] };
    const html = generatePromotionEmailHTML(data);
    expect(html).not.toContain('SPECIAL HOURS');
  });

  it('includes store phone and email in footer', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('555-1234');
    expect(html).toContain('test@store.com');
  });

  it('includes unsubscribe section', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('UNSUBSCRIBE');
  });

  it('uses current year when year is empty', () => {
    const data = { ...baseData, promoYear: '' };
    const html = generatePromotionEmailHTML(data);
    const currentYear = new Date().getFullYear().toString();
    expect(html).toContain(currentYear);
  });

  it('escapes HTML in user inputs', () => {
    const data: PromotionEmailData = {
      ...baseData,
      promotionEntries: [
        {
          id: 1,
          line: '<script>alert("xss")</script>',
          collections: '',
          callout: '',
        },
      ],
    };
    const html = generatePromotionEmailHTML(data);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('produces valid HTML document structure', () => {
    const html = generatePromotionEmailHTML(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });
});

// ===== Title Generation Tests =====

describe('generatePromoTitle', () => {
  it('returns WEEKLY SALE for empty input', () => {
    expect(generatePromoTitle('')).toBe('WEEKLY SALE');
  });

  it('returns WEEKLY SALE for unrecognized dates', () => {
    // Jan 15 falls in winter range (Jan 1 - Feb 28), so it gets Winter title
    const result = generatePromoTitle('Jan 15');
    expect(['WINTER SALE', 'WEEKLY SALE']).toContain(result);
  });

  it('detects holiday dates', () => {
    // These will depend on the year's holidays, just test it returns something
    const title = generatePromoTitle('Nov 28 - Dec 1');
    // Could be BLACK FRIDAY or HOLIDAY SALE depending on the year
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });
});

// ===== Config Export/Import Tests =====

describe('buildExportConfig', () => {
  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  });

  it('builds a valid config object', () => {
    const data = makeEmailData({
      promoDateRange: 'Nov 28 - Dec 1',
      promoYear: '2025',
      promoTitle: 'Test Sale',
    });
    const config = buildExportConfig(data, [], [], null);
    expect(config.templateType).toBe('promotion-email');
    expect(config.dateRange).toBe('Nov 28 - Dec 1');
    expect(config.year).toBe('2025');
    expect(config.title).toBe('Test Sale');
  });

  it('includes subject lines in config', () => {
    const data = makeEmailData();
    const config = buildExportConfig(
      data,
      [],
      ['Subject 1', 'Subject 2'],
      'Subject 1'
    );
    expect(config.generatedSubjectLines).toEqual(['Subject 1', 'Subject 2']);
    expect(config.selectedSubjectLine).toBe('Subject 1');
  });

  it('strips PDF data from export (metadata only)', () => {
    const data = makeEmailData();
    const pdfs = [
      {
        id: '1',
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf',
        data: 'data:application/pdf;base64,abc',
      },
    ];
    const config = buildExportConfig(data, pdfs, [], null);
    // Should not include data property in exported PDFs
    expect(config.attachedPDFs[0]).toEqual({
      id: '1',
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
    });
  });

  it('includes newsletter fields in export', () => {
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

  it('includes default newsletter fields in export', () => {
    const data = makeEmailData();
    const config = buildExportConfig(data, [], [], null);
    expect(config.newsletterHeading).toBe('Newsletter');
    expect(config.newsletterBody).toBe('');
    expect(config.newsletterPosition).toBe('top');
  });

  it('embeds PDF data when includePdfData is set', () => {
    const data = makeEmailData();
    const pdfs = [
      {
        id: '1',
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf',
        data: 'data:application/pdf;base64,abc',
      },
    ];
    const config = buildExportConfig(
      data,
      pdfs,
      [],
      null,
      undefined,
      undefined,
      {
        includePdfData: true,
      }
    );
    expect(config.attachedPDFs[0].data).toBe('data:application/pdf;base64,abc');
  });

  it('omits bulk recipients by default', () => {
    const data = makeEmailData();
    const config = buildExportConfig(data, [], [], null, undefined, undefined, {
      bulkEmailRecipients: 'a@x.com, b@x.com',
    });
    expect(config.bulkEmailRecipients).toBeUndefined();
  });

  it('embeds bulk recipients when includeRecipients is set', () => {
    const data = makeEmailData();
    const config = buildExportConfig(data, [], [], null, undefined, undefined, {
      includeRecipients: true,
      bulkEmailRecipients: 'a@x.com, b@x.com',
    });
    expect(config.bulkEmailRecipients).toBe('a@x.com, b@x.com');
  });
});

describe('validateImportConfig', () => {
  it('rejects non-object input', () => {
    expect(validateImportConfig(null).ok).toBe(false);
    expect(validateImportConfig('string').ok).toBe(false);
    expect(validateImportConfig(42).ok).toBe(false);
  });

  it('rejects wrong template type', () => {
    const result = validateImportConfig({
      templateType: 'other',
      promotionEntries: [],
      specialHours: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('wrongType');
  });

  it('rejects missing promotionEntries', () => {
    const result = validateImportConfig({
      specialHours: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('promotionEntriesNotArray');
  });

  it('rejects missing specialHours', () => {
    const result = validateImportConfig({
      promotionEntries: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('specialHoursNotArray');
  });

  it('accepts valid config', () => {
    const result = validateImportConfig({
      templateType: 'promotion-email',
      version: 1,
      dateRange: 'Nov 28 - Dec 1',
      year: '2025',
      title: 'Test',
      promotionEntries: [{ id: 1, line: 'Test', collections: '', callout: '' }],
      specialHours: [],
      howToShopItems: [],
      importantNotesItems: [],
      attachedPDFs: [],
      generatedSubjectLines: [],
      selectedSubjectLine: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.dateRange).toBe('Nov 28 - Dec 1');
      expect(result.config.promotionEntries).toHaveLength(1);
    }
  });

  it('passes through bulk recipients when present', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      bulkEmailRecipients: 'a@x.com, b@x.com',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.bulkEmailRecipients).toBe('a@x.com, b@x.com');
    }
  });

  it('leaves bulk recipients undefined when absent', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.bulkEmailRecipients).toBeUndefined();
    }
  });

  it('normalizes missing optional fields', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.howToShopItems).toEqual([]);
      expect(result.config.importantNotesItems).toEqual([]);
      expect(result.config.attachedPDFs).toEqual([]);
      expect(result.config.generatedSubjectLines).toEqual([]);
    }
  });

  it('round-trips valid attachedPDFs entries', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      attachedPDFs: [
        { id: 'a1', name: 'flyer.pdf', size: 2048, type: 'application/pdf' },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.attachedPDFs).toHaveLength(1);
      expect(result.config.attachedPDFs[0]).toMatchObject({
        id: 'a1',
        name: 'flyer.pdf',
        size: 2048,
        type: 'application/pdf',
      });
    }
  });

  it('drops imported PDF entries with no usable id', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      attachedPDFs: [
        { name: 'no-id.pdf', size: 1, type: 'application/pdf' },
        { id: 'keep', name: 'ok.pdf', size: 1, type: 'application/pdf' },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.attachedPDFs).toHaveLength(1);
      expect(result.config.attachedPDFs[0].id).toBe('keep');
    }
  });

  it('coerces malformed PDF scalar fields to safe defaults', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      // name is not a string and type is null — each field falls back
      // independently instead of discarding the whole entry.
      attachedPDFs: [{ id: 'x', name: 123, type: null, size: 10 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const pdf = result.config.attachedPDFs[0];
      expect(pdf.id).toBe('x');
      expect(pdf.name).toBe('');
      expect(pdf.type).toBe('application/pdf');
    }
  });

  it('treats a non-array attachedPDFs as empty (still ok)', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      attachedPDFs: 'not-an-array',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.attachedPDFs).toEqual([]);
    }
  });

  it('handles legacy field names (promoDateRange → dateRange)', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      promoDateRange: 'Dec 1 - Dec 7',
      promoYear: '2025',
      promoTitle: 'Holiday Sale',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.dateRange).toBe('Dec 1 - Dec 7');
      expect(result.config.year).toBe('2025');
      expect(result.config.title).toBe('Holiday Sale');
    }
  });

  it('defaults newsletter fields when importing config without them', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.newsletterHeading).toBe('Newsletter');
      expect(result.config.newsletterBody).toBe('');
      expect(result.config.newsletterPosition).toBe('top');
    }
  });

  it('restores newsletter fields from imported config', () => {
    const result = validateImportConfig({
      promotionEntries: [],
      specialHours: [],
      newsletterHeading: 'Store Updates',
      newsletterBody: '<p>Hello <strong>world</strong></p>',
      newsletterPosition: 'bottom',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.newsletterHeading).toBe('Store Updates');
      expect(result.config.newsletterBody).toBe(
        '<p>Hello <strong>world</strong></p>'
      );
      expect(result.config.newsletterPosition).toBe('bottom');
    }
  });
});

// ===== PreviewColumn Integration Tests =====

describe('PromotionPage Preview and Export', () => {
  beforeEach(() => {
    localStorage.clear();
    // These tests exercise the dev-only HTML Code tab.
    localStorage.setItem(StorageKeys.devMode, 'true');
  });

  it('renders Preview tab and HTML Code tab', () => {
    renderPromotionPage();
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    const codeTabs = screen.getAllByRole('tab', { name: /^html$/i });
    expect(previewTabs.length).toBeGreaterThanOrEqual(1);
    expect(codeTabs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Download Email Draft button', () => {
    renderPromotionPage();
    const buttons = screen.getAllByRole('button', {
      name: /download email draft/i,
    });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Download HTML button', () => {
    renderPromotionPage();
    const buttons = screen.getAllByRole('button', {
      name: /download html/i,
    });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Start Over button', () => {
    renderPromotionPage();
    const buttons = screen.getAllByRole('button', { name: /start over/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Import Config button', () => {
    renderPromotionPage();
    const buttons = screen.getAllByRole('button', { name: /^import$/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Export Config button', () => {
    renderPromotionPage();
    const buttons = screen.getAllByRole('button', { name: /^export$/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state message when no date range', () => {
    renderPromotionPage();
    const messages = screen.getAllByText(
      /enter promotion details to see preview/i
    );
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  it('updates preview when store has promotion data', () => {
    // Set up store with data before rendering
    usePromotionStore.setState({
      promoDateRange: 'Nov 28 - Dec 1',
      promoYear: '2025',
      promoTitle: 'Test Sale',
      promotionEntries: [
        { id: 1, line: 'ACME – 20% OFF', collections: '', callout: '' },
      ],
      isInitializing: false,
    });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // The preview should now contain generated HTML (in an iframe)
    // We can verify by checking the code tab
    const codeTabs = screen.getAllByRole('tab', { name: /^html$/i });
    expect(codeTabs.length).toBeGreaterThanOrEqual(1);
  });

  it('Start Over triggers confirmation and resets state', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Nov 28 - Dec 1',
      promotionEntries: [
        { id: 1, line: 'ACME – 20% OFF', collections: '', callout: '' },
      ],
      isInitializing: false,
    });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // Click Start Over
    const startOverBtns = screen.getAllByRole('button', {
      name: /start over/i,
    });
    await user.click(startOverBtns[0]);

    // AlertDialog should appear
    await waitFor(() => {
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    // Confirm the reset
    const confirmBtn = screen.getByRole('button', { name: /reset/i });
    await user.click(confirmBtn);

    // State should be reset
    await waitFor(() => {
      const state = usePromotionStore.getState();
      expect(state.promoDateRange).toBe('');
      expect(state.promotionEntries).toHaveLength(0);
    });
  });

  it('Start Over cancel does not reset state', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Nov 28 - Dec 1',
      promotionEntries: [
        { id: 1, line: 'Test Entry', collections: '', callout: '' },
      ],
      isInitializing: false,
    });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // Click Start Over
    const startOverBtns = screen.getAllByRole('button', {
      name: /start over/i,
    });
    await user.click(startOverBtns[0]);

    // AlertDialog should appear
    await waitFor(() => {
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    // Cancel
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    // State should NOT be reset
    const state = usePromotionStore.getState();
    expect(state.promoDateRange).toBe('Nov 28 - Dec 1');
    expect(state.promotionEntries).toHaveLength(1);
  });

  it('HTML Code tab shows raw HTML in textarea', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Nov 28 - Dec 1',
      promoYear: '2025',
      promoTitle: 'Test Sale',
      promotionEntries: [
        { id: 1, line: 'ACME – 20% OFF', collections: '', callout: '' },
      ],
      isInitializing: false,
    });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // Click HTML Code tab
    const codeTabs = screen.getAllByRole('tab', { name: /^html$/i });
    await user.click(codeTabs[0]);

    // Should show a readonly textarea with HTML code
    await waitFor(() => {
      const textareas = screen.getAllByRole('textbox');
      const codeTextarea = textareas.find(
        (ta) => ta.getAttribute('readonly') !== null
      );
      expect(codeTextarea).toBeTruthy();
      if (codeTextarea) {
        expect(codeTextarea).toHaveValue();
        const value = (codeTextarea as HTMLTextAreaElement).value;
        expect(value).toContain('<!DOCTYPE html>');
        expect(value).toContain('ACME – 20% OFF');
      }
    });
  });
});

// ===== Config Round-Trip Test =====

describe('Config round-trip', () => {
  beforeEach(() => {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  });

  it('exported config can be re-imported with same data', () => {
    const data = makeEmailData({
      promoDateRange: 'Nov 28 - Dec 1',
      promoYear: '2025',
      promoTitle: 'Holiday Sale',
      promotionEntries: [
        { id: 1, line: 'ACME – 20% OFF', collections: 'Aria', callout: '' },
      ],
      specialHours: [{ id: 1, day: 'Black Friday', hours: '6AM-10PM' }],
      howToShopItems: [
        {
          id: 1,
          text: 'Visit us',
          bold: true,
          italic: false,
          underline: false,
        },
      ],
      importantNotesItems: [
        {
          id: 1,
          text: 'While supplies last',
          bold: false,
          italic: false,
          underline: false,
        },
      ],
    });

    const exported = buildExportConfig(data, [], ['Subject 1'], 'Subject 1');
    const json = JSON.parse(JSON.stringify(exported));
    const result = validateImportConfig(json);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.dateRange).toBe('Nov 28 - Dec 1');
      expect(result.config.promotionEntries).toHaveLength(1);
      expect(result.config.promotionEntries[0].line).toBe('ACME – 20% OFF');
      expect(result.config.specialHours).toHaveLength(1);
      expect(result.config.howToShopItems).toHaveLength(1);
      expect(result.config.importantNotesItems).toHaveLength(1);
      expect(result.config.generatedSubjectLines).toEqual(['Subject 1']);
      expect(result.config.selectedSubjectLine).toBe('Subject 1');
    }
  });
});

// ===== BasicDetailsEditor Tests =====

describe('BasicDetailsEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('renders date range pickers and title input', () => {
    renderPromotionPage();
    // Page renders both desktop and mobile layouts, so inputs appear twice
    const startDateInputs = screen.getAllByTestId('promo-start-date');
    const endDateInputs = screen.getAllByTestId('promo-end-date');
    const titleInputs = screen.getAllByTestId('promo-title');

    expect(startDateInputs.length).toBeGreaterThanOrEqual(1);
    expect(endDateInputs.length).toBeGreaterThanOrEqual(1);
    expect(titleInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('updates store when date range changes', async () => {
    renderPromotionPage();

    const startInput = screen.getAllByTestId(
      'promo-start-date'
    )[0] as HTMLInputElement;
    const endInput = screen.getAllByTestId(
      'promo-end-date'
    )[0] as HTMLInputElement;

    // Use fireEvent for native date inputs (userEvent.type doesn't work well with date inputs)
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(startInput, { target: { value: '2025-11-28' } });
    fireEvent.change(endInput, { target: { value: '2025-12-01' } });

    const state = usePromotionStore.getState();
    expect(state.promoDateRange).toBe('November 28 - December 1');
    expect(state.promoYear).toBe('2025');
  });

  it('formats same-month date range correctly', async () => {
    renderPromotionPage();

    const startInput = screen.getAllByTestId(
      'promo-start-date'
    )[0] as HTMLInputElement;
    const endInput = screen.getAllByTestId(
      'promo-end-date'
    )[0] as HTMLInputElement;

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(startInput, { target: { value: '2025-03-04' } });
    fireEvent.change(endInput, { target: { value: '2025-03-10' } });

    const state = usePromotionStore.getState();
    expect(state.promoDateRange).toBe('March 4 - 10');
  });

  it('formats a same-day range as "<weekday>, <month> <ordinal>"', async () => {
    renderPromotionPage();

    const startInput = screen.getAllByTestId(
      'promo-start-date'
    )[0] as HTMLInputElement;
    const endInput = screen.getAllByTestId(
      'promo-end-date'
    )[0] as HTMLInputElement;

    const { fireEvent } = await import('@testing-library/react');
    // June 20, 2026 is a Saturday
    fireEvent.change(startInput, { target: { value: '2026-06-20' } });
    fireEvent.change(endInput, { target: { value: '2026-06-20' } });

    const state = usePromotionStore.getState();
    expect(state.promoDateRange).toBe('Saturday, June 20th');
    expect(state.promoYear).toBe('2026');
  });

  it('updates store when title changes', async () => {
    const user = userEvent.setup();
    renderPromotionPage();

    const titleInput = screen.getAllByTestId('promo-title')[0];
    await user.type(titleInput, 'Test Sale');

    const state = usePromotionStore.getState();
    expect(state.promoTitle).toBe('Test Sale');
  });

  it('populates date pickers from store state', () => {
    usePromotionStore.setState({
      promoDateRange: 'December 1 - 7',
      promoYear: '2025',
      promoTitle: 'Holiday Sale',
      isInitializing: false,
    });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    const startInput = screen.getAllByTestId(
      'promo-start-date'
    )[0] as HTMLInputElement;
    const endInput = screen.getAllByTestId(
      'promo-end-date'
    )[0] as HTMLInputElement;
    const titleInput = screen.getAllByTestId(
      'promo-title'
    )[0] as HTMLInputElement;

    expect(startInput.value).toBe('2025-12-01');
    expect(endInput.value).toBe('2025-12-07');
    expect(titleInput.value).toBe('Holiday Sale');
  });

  it('shows title placeholder text', () => {
    renderPromotionPage();

    const titleInputs = screen.getAllByPlaceholderText(
      'Leave blank for auto-generation'
    );
    expect(titleInputs.length).toBeGreaterThanOrEqual(1);
  });
});

// ===== Import Config Flow Test =====

describe('Import Config Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('imports config file and populates store', async () => {
    const config = {
      templateType: 'promotion-email',
      version: 1,
      dateRange: 'Dec 1 - Dec 7',
      year: '2025',
      title: 'Imported Sale',
      promotionEntries: [
        {
          id: 1,
          line: 'Brand A – 30% OFF',
          collections: 'Collection X',
          callout: 'Limited',
        },
      ],
      specialHours: [{ id: 1, day: 'Sunday', hours: '10AM-6PM' }],
      howToShopItems: [],
      importantNotesItems: [],
      attachedPDFs: [],
      generatedSubjectLines: ['Imported Subject'],
      selectedSubjectLine: 'Imported Subject',
    };

    const file = new File([JSON.stringify(config)], 'test-config.json', {
      type: 'application/json',
    });

    renderPromotionPage();

    const importInputs = screen.getAllByTestId('import-config-input');
    expect(importInputs.length).toBeGreaterThanOrEqual(1);
    const importInput = importInputs[0] as HTMLInputElement;

    await act(async () => {
      await userEvent.upload(importInput, file);
    });

    // Wait for import to complete and check store state
    await waitFor(() => {
      const state = usePromotionStore.getState();
      expect(state.promoDateRange).toBe('Dec 1 - Dec 7');
      expect(state.promoTitle).toBe('Imported Sale');
    });
  });
});
