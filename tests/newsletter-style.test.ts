/**
 * Tests for newsletter style customization.
 *
 * Covers:
 * - Store actions: setNewsletterStyle, clearNewsletter, resetState, persistence
 * - Email generation with each border style (left, full, none, top)
 * - Email generation with custom vs auto colors
 * - Export/import config with newsletterStyle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  usePromotionStore,
  _resetIdCounter,
  DEFAULT_NEWSLETTER_STYLE,
} from '@/stores/promotion-store';
import {
  generatePromotionEmailHTML,
  buildExportConfig,
  validateImportConfig,
  type PromotionEmailData,
} from '@/lib/promotion-email-html';

// Mock the db module
vi.mock('@/lib/db', () => ({
  initIndexedDB: vi.fn().mockResolvedValue(true),
  savePDFToIndexedDB: vi.fn().mockResolvedValue('pdf-id'),
  getPDFFromIndexedDB: vi.fn().mockResolvedValue(null),
  deletePDFFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  clearAllPDFsFromIndexedDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock the profile module
vi.mock('@/lib/profile', () => ({
  getStorePhone: vi.fn().mockReturnValue('702-357-8990'),
  getStoreEmail: vi.fn().mockReturnValue('store@citizenwatchgroup.com'),
  getStoreAddress: vi.fn().mockReturnValue('123 Test St'),
  getStoreHours: vi.fn().mockReturnValue('Mon-Sat 10AM-8PM'),
  getStorePlusCode: vi.fn().mockReturnValue(''),
  getDirections: vi.fn().mockReturnValue(''),
  getEmployeeName: vi.fn().mockReturnValue('Test User'),
}));

function getFreshStore() {
  return usePromotionStore.getState();
}

const DEFAULT_STYLE: PromotionEmailData['newsletterStyle'] = {
  borderColor: '#2563eb',
  backgroundColor: '#f9fafb',
  headingColor: '#1e40af',
  borderStyle: 'left',
  headingAlign: 'left',
};

function makeEmailData(
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
    newsletterBody: '<p>Hello world</p>',
    newsletterPosition: 'top',
    newsletterVisible: true,
    newsletterStyle: { ...DEFAULT_STYLE },
    ...overrides,
  };
}

describe('newsletter style - store actions', () => {
  beforeEach(() => {
    usePromotionStore.getState().resetState();
    _resetIdCounter();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with default newsletterStyle', () => {
    const state = getFreshStore();
    expect(state.newsletterStyle).toEqual(DEFAULT_NEWSLETTER_STYLE);
  });

  it('sets borderColor override', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ borderColor: '#ff0000' });
    expect(getFreshStore().newsletterStyle.borderColor).toBe('#ff0000');
    // Other fields should remain default
    expect(getFreshStore().newsletterStyle.borderStyle).toBe('left');
  });

  it('sets backgroundColor override', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ backgroundColor: '#ffffff' });
    expect(getFreshStore().newsletterStyle.backgroundColor).toBe('#ffffff');
  });

  it('sets headingColor override', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ headingColor: '#333333' });
    expect(getFreshStore().newsletterStyle.headingColor).toBe('#333333');
  });

  it('sets borderStyle to full', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ borderStyle: 'full' });
    expect(getFreshStore().newsletterStyle.borderStyle).toBe('full');
  });

  it('sets borderStyle to none', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ borderStyle: 'none' });
    expect(getFreshStore().newsletterStyle.borderStyle).toBe('none');
  });

  it('sets borderStyle to top', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ borderStyle: 'top' });
    expect(getFreshStore().newsletterStyle.borderStyle).toBe('top');
  });

  it('sets headingAlign to center', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ headingAlign: 'center' });
    expect(getFreshStore().newsletterStyle.headingAlign).toBe('center');
  });

  it('merges partial updates', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ borderColor: '#ff0000' });
    store.setNewsletterStyle({ borderStyle: 'full' });

    const style = getFreshStore().newsletterStyle;
    expect(style.borderColor).toBe('#ff0000');
    expect(style.borderStyle).toBe('full');
    // Non-updated fields stay at default
    expect(style.headingAlign).toBe('left');
    expect(style.backgroundColor).toBeNull();
  });

  it('resets borderColor to null (auto) via partial update', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({ borderColor: '#ff0000' });
    expect(getFreshStore().newsletterStyle.borderColor).toBe('#ff0000');

    store.setNewsletterStyle({ borderColor: null });
    expect(getFreshStore().newsletterStyle.borderColor).toBeNull();
  });

  it('clearNewsletter resets newsletterStyle to defaults', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({
      borderColor: '#ff0000',
      backgroundColor: '#ffffff',
      headingColor: '#333333',
      borderStyle: 'full',
      headingAlign: 'center',
    });

    store.clearNewsletter();

    expect(getFreshStore().newsletterStyle).toEqual(DEFAULT_NEWSLETTER_STYLE);
  });

  it('resetState resets newsletterStyle to defaults', () => {
    const store = getFreshStore();
    store.setNewsletterStyle({
      borderColor: '#ff0000',
      borderStyle: 'full',
    });

    store.resetState();

    expect(getFreshStore().newsletterStyle).toEqual(DEFAULT_NEWSLETTER_STYLE);
  });

  it('saves newsletterStyle to localStorage', async () => {
    const store = getFreshStore();
    store.setNewsletterStyle({
      borderColor: '#ff0000',
      borderStyle: 'full',
    });

    await store.saveToIndexedDB();

    const saved = JSON.parse(localStorage.getItem('promotionBuilderState')!);
    expect(saved.newsletterStyle.borderColor).toBe('#ff0000');
    expect(saved.newsletterStyle.borderStyle).toBe('full');
    expect(saved.newsletterStyle.backgroundColor).toBeNull();
  });

  it('loads newsletterStyle from localStorage', async () => {
    const savedData = {
      promotionEntries: [],
      specialHours: [],
      howToShopItems: [],
      importantNotesItems: [],
      attachedPDFs: [],
      generatedSubjectLines: [],
      selectedSubjectLine: null,
      newsletterStyle: {
        borderColor: '#ff0000',
        backgroundColor: '#ffffff',
        headingColor: '#333333',
        borderStyle: 'full',
        headingAlign: 'center',
      },
    };
    localStorage.setItem(
      'promotionBuilderState',
      JSON.stringify(savedData)
    );

    const store = getFreshStore();
    await store.loadFromIndexedDB();

    const state = getFreshStore();
    expect(state.newsletterStyle.borderColor).toBe('#ff0000');
    expect(state.newsletterStyle.backgroundColor).toBe('#ffffff');
    expect(state.newsletterStyle.headingColor).toBe('#333333');
    expect(state.newsletterStyle.borderStyle).toBe('full');
    expect(state.newsletterStyle.headingAlign).toBe('center');
  });

  it('loads default newsletterStyle when localStorage has no newsletterStyle', async () => {
    const savedData = {
      promotionEntries: [],
      specialHours: [],
      howToShopItems: [],
      importantNotesItems: [],
      attachedPDFs: [],
      generatedSubjectLines: [],
      selectedSubjectLine: null,
    };
    localStorage.setItem(
      'promotionBuilderState',
      JSON.stringify(savedData)
    );

    const store = getFreshStore();
    await store.loadFromIndexedDB();

    expect(getFreshStore().newsletterStyle).toEqual(DEFAULT_NEWSLETTER_STYLE);
  });
});

describe('newsletter style - email generation', () => {
  beforeEach(() => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({
        employeeName: 'Test User',
        jobTitle: 'Sales Associate',
        storeName: 'Test Store',
        storeLocation: 'Test Location',
        storeAddress: '123 Test St',
        storePhone: '555-1234',
        storeEmail: 'test@store.com',
        storeHours: 'Mon-Sat: 10AM-8PM',
        storePlusCode: 'ABC123',
        storeDirections: '',
      })
    );
  });

  describe('border style: left (default)', () => {
    it('renders left border', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: { ...DEFAULT_STYLE, borderStyle: 'left' },
        })
      );
      expect(html).toContain('border-left: 4px solid #2563eb');
    });
  });

  describe('border style: full', () => {
    it('renders full border', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: { ...DEFAULT_STYLE, borderStyle: 'full' },
        })
      );
      expect(html).toContain('border: 1px solid #2563eb');
      expect(html).not.toContain('border-left: 4px solid');
    });
  });

  describe('border style: none', () => {
    it('renders no border property on newsletter section', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: { ...DEFAULT_STYLE, borderStyle: 'none' },
        })
      );

      // Extract the newsletter section to check its border
      const newsletterMatch = html.match(
        /<!-- NEWSLETTER -->([\s\S]*?)<\/div>/m
      );
      expect(newsletterMatch).toBeTruthy();

      const newsletterDiv = newsletterMatch![1];
      // The newsletter div should not have border-left or border-top
      expect(newsletterDiv).not.toContain('border-left:');
      expect(newsletterDiv).not.toContain('border-top:');
    });
  });

  describe('border style: top', () => {
    it('renders top border', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: { ...DEFAULT_STYLE, borderStyle: 'top' },
        })
      );
      expect(html).toContain('border-top: 4px solid #2563eb');
      expect(html).not.toContain('border-left: 4px solid');
    });
  });

  describe('custom colors', () => {
    it('uses custom borderColor', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: {
            ...DEFAULT_STYLE,
            borderColor: '#ff0000',
          },
        })
      );
      expect(html).toContain('border-left: 4px solid #ff0000');
    });

    it('uses custom backgroundColor', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: {
            ...DEFAULT_STYLE,
            backgroundColor: '#e0e0e0',
          },
        })
      );
      // Background color is on the newsletter div
      expect(html).toMatch(/background-color:\s*#e0e0e0/);
    });

    it('uses custom headingColor', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: {
            ...DEFAULT_STYLE,
            headingColor: '#990000',
          },
        })
      );
      expect(html).toContain('color: #990000');
    });

    it('uses all custom colors together', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: {
            borderColor: '#ff0000',
            backgroundColor: '#e0e0e0',
            headingColor: '#990000',
            borderStyle: 'full',
            headingAlign: 'center',
          },
        })
      );
      expect(html).toContain('border: 1px solid #ff0000');
      expect(html).toMatch(/background-color:\s*#e0e0e0/);
      expect(html).toContain('color: #990000');
      expect(html).toContain('text-align: center');
    });
  });

  describe('heading alignment', () => {
    it('renders left alignment by default', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: { ...DEFAULT_STYLE, headingAlign: 'left' },
        })
      );
      expect(html).toContain('text-align: left');
    });

    it('renders center alignment', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterStyle: { ...DEFAULT_STYLE, headingAlign: 'center' },
        })
      );
      expect(html).toContain('text-align: center');
    });
  });

  describe('empty newsletter body', () => {
    it('does not render newsletter section when body is empty', () => {
      const html = generatePromotionEmailHTML(
        makeEmailData({
          newsletterBody: '',
          newsletterStyle: {
            borderColor: '#ff0000',
            backgroundColor: '#e0e0e0',
            headingColor: '#990000',
            borderStyle: 'full',
            headingAlign: 'center',
          },
        })
      );
      expect(html).not.toContain('<!-- NEWSLETTER -->');
      expect(html).not.toContain('#ff0000');
    });
  });
});

describe('newsletter style - export/import config', () => {
  beforeEach(() => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({
        employeeName: 'Test User',
        jobTitle: 'Sales Associate',
        storeName: 'Test Store',
        storeLocation: 'Test Location',
        storeAddress: '123 Test St',
        storePhone: '555-1234',
        storeEmail: 'test@store.com',
        storeHours: 'Mon-Sat: 10AM-8PM',
        storePlusCode: 'ABC123',
        storeDirections: '',
      })
    );
  });

  it('includes newsletterStyle in export', () => {
    const data = makeEmailData();
    const style = {
      borderColor: '#ff0000' as string | null,
      backgroundColor: '#ffffff' as string | null,
      headingColor: '#333333' as string | null,
      borderStyle: 'full' as const,
      headingAlign: 'center' as const,
    };
    const config = buildExportConfig(data, [], [], null, style);

    expect(config.newsletterStyle.borderColor).toBe('#ff0000');
    expect(config.newsletterStyle.backgroundColor).toBe('#ffffff');
    expect(config.newsletterStyle.headingColor).toBe('#333333');
    expect(config.newsletterStyle.borderStyle).toBe('full');
    expect(config.newsletterStyle.headingAlign).toBe('center');
  });

  it('defaults newsletterStyle when not provided in export', () => {
    const data = makeEmailData();
    const config = buildExportConfig(data, [], [], null);

    expect(config.newsletterStyle).toEqual({
      borderColor: null,
      backgroundColor: null,
      headingColor: null,
      borderStyle: 'left',
      headingAlign: 'left',
      tableBorderColor: null,
      tableBorderWidth: 1,
      tableBorderStyle: 'solid',
      tableHeaderBg: null,
    });
  });

  it('round-trips newsletterStyle through export/import', () => {
    const data = makeEmailData();
    const style = {
      borderColor: '#ff0000' as string | null,
      backgroundColor: null as string | null,
      headingColor: '#333333' as string | null,
      borderStyle: 'top' as const,
      headingAlign: 'center' as const,
    };
    const exported = buildExportConfig(data, [], [], null, style);
    const json = JSON.parse(JSON.stringify(exported));
    const result = validateImportConfig(json);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.newsletterStyle.borderColor).toBe('#ff0000');
      expect(result.config.newsletterStyle.backgroundColor).toBeNull();
      expect(result.config.newsletterStyle.headingColor).toBe('#333333');
      expect(result.config.newsletterStyle.borderStyle).toBe('top');
      expect(result.config.newsletterStyle.headingAlign).toBe('center');
    }
  });

  it('provides default newsletterStyle when importing config without it', () => {
    const configWithoutStyle = {
      templateType: 'promotion-email',
      promotionEntries: [],
      specialHours: [],
    };
    const result = validateImportConfig(configWithoutStyle);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.newsletterStyle).toEqual({
        borderColor: null,
        backgroundColor: null,
        headingColor: null,
        borderStyle: 'left',
        headingAlign: 'left',
        tableBorderColor: null,
        tableBorderWidth: 1,
        tableBorderStyle: 'solid',
        tableHeaderBg: null,
      });
    }
  });
});
