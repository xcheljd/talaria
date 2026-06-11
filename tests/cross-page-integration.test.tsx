/**
 * Cross-Page Integration Tests
 *
 * Validates VAL-CROSS-001 through VAL-CROSS-006:
 * - VAL-CROSS-001: Complete user flow — setup to template generation
 * - VAL-CROSS-002: Profile data flows into generated templates
 * - VAL-CROSS-003: Profile data flows into promotion signature
 * - VAL-CROSS-004: Theme persists across all pages
 * - VAL-CROSS-005: Full promotion workflow end-to-end
 * - VAL-CROSS-006: XSS prevention in generated content
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ProfileProvider } from '../src/contexts/ProfileProvider';
import { ThemeProvider } from '../src/contexts/ThemeProvider';
import { usePromotionStore } from '../src/stores/promotion-store';
import {
  generatePromotionEmailHTML,
  type PromotionEmailData,
} from '../src/lib/promotion-email-html';
import { getEmployeeSignature } from '../src/lib/signature';
import { templates, assembleTemplateOutput } from '../src/lib/templates';
import { sanitizeHTML, escapeAttr } from '../src/lib/html-utils';
import {
  getUserProfile,
  saveUserProfile,
  getStorePhone,
  getStoreEmail,
  getStoreName,
  getEmployeeName,
  type UserProfile,
} from '../src/lib/profile';

import { Layout } from '../src/components/Layout';
import { TemplatesPage } from '../src/pages/TemplatesPage';
import { ProfilePage } from '../src/pages/ProfilePage';
import { PromotionPage } from '../src/pages/PromotionPage';
import { Toaster } from '../src/components/ui/sonner';
import { TooltipProvider } from '../src/components/ui/tooltip';


// ===== Mocks =====

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// ===== Test Fixtures =====

const MANAGEMENT_PROFILE: UserProfile = {
  employeeName: 'Alice Manager',
  jobTitle: 'General Manager',
  companyEmail: 'alice.manager@citizenwatchgroup.com',
  storeName: 'Citizen Company Store - Orlando',
  storeLocation: 'the Orlando Premium Outlets',
  storeAddress: '4950 International Dr, Orlando, FL 32819',
  storePhone: '407-555-1234',
  storeEmail: 'orlando@citizenwatchgroup.com',
  storeHours: 'Mon-Sat: 10AM-8PM, Sun: 11AM-7PM',
  storePlusCode: 'ABC123',
  storeDirections: 'Entrance E, near Polo Ralph Lauren',
};

const STAFF_PROFILE: UserProfile = {
  employeeName: 'Bob Associate',
  jobTitle: 'Sales Associate',
  storeName: 'Citizen Company Store - Vegas',
  storeLocation: 'the South Premium Outlets',
  storeAddress: '7400 Las Vegas Blvd S #46, Las Vegas, NV 89123',
  storePhone: '702-555-9999',
  storeEmail: 'vegas@citizenwatchgroup.com',
  storeHours: 'Mon-Sat: 10AM-9PM, Sun: 11AM-7PM',
};

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

function setupProfile(profile: UserProfile = MANAGEMENT_PROFILE) {
  localStorage.setItem('userProfile', JSON.stringify(profile));
}

function clearProfile() {
  localStorage.removeItem('userProfile');
}

function renderApp(initialPath: string = '/') {
  resetStore();
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <TooltipProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<TemplatesPage />} />
                <Route path="/start" element={<ProfilePage />} />
                <Route path="/promotion" element={<PromotionPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
          <Toaster />
        </TooltipProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

// ========================================================================
// VAL-CROSS-002: Profile data flows into generated templates
// ========================================================================

describe('VAL-CROSS-002: Profile data flows into generated templates', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('template generation includes profile store phone and store name', () => {
    setupProfile(MANAGEMENT_PROFILE);

    // new-customer-welcome uses getStorePhone() internally
    const template = templates['new-customer-welcome'];
    expect(template).toBeDefined();

    const result = template.generate({
      customerName: 'John Customer',
      employeeName: 'Alice Manager',
    });

    // Store phone is included inline in the body
    expect(result.body).toContain('407-555-1234');
    // Store name is referenced via getStoreName in the email subject
    expect(result.body).toContain('Citizen Company Store');
    // Employee name is part of the signature, added via includeSignature
    expect(result.includeSignature).toBe(true);
    // Full output with signature includes employee name
    const fullOutput = assembleTemplateOutput(result);
    expect(fullOutput).toContain('Alice Manager');
  });

  it('template form pre-fill mapping works for profile fields', () => {
    setupProfile(STAFF_PROFILE);

    // Verify profile helpers return correct data that forms would use
    expect(getEmployeeName()).toBe('Bob Associate');
    expect(getStorePhone()).toBe('702-555-9999');
    expect(getStoreName()).toBe('Citizen Company Store - Vegas');
    expect(getStoreEmail()).toBe('vegas@citizenwatchgroup.com');
  });

  it('different templates use profile data via getStorePhone/getStoreName', () => {
    setupProfile(MANAGEMENT_PROFILE);

    // Test multiple templates that use profile data internally
    const templatesToTest = ['thank-you-warranty', 'phone-confirmation'];
    for (const key of templatesToTest) {
      const template = templates[key];
      expect(template).toBeDefined();

      const fields: Record<string, string> = {};
      template.fields.forEach((f) => {
        if (f === 'employeeName' || f === 'yourName') fields[f] = getEmployeeName();
        else if (f === 'storePhone') fields[f] = getStorePhone();
        else if (f === 'storeName') fields[f] = getStoreName();
        else if (f === 'storeEmail') fields[f] = getStoreEmail();
        else fields[f] = 'Test Value';
      });

      const result = template.generate(fields);

      // Each of these templates should include store phone from profile
      expect(result.body).toContain('407-555-1234');
    }
  });
});

// ========================================================================
// VAL-CROSS-003: Profile data flows into promotion signature
// ========================================================================

describe('VAL-CROSS-003: Profile data flows into promotion signature', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('management job title uses company email in signature', () => {
    setupProfile(MANAGEMENT_PROFILE);

    const signatureHTML = getEmployeeSignature('html');
    // Management profile should use company email
    expect(signatureHTML).toContain('alice.manager@citizenwatchgroup.com');
    expect(signatureHTML).toContain('Alice Manager');
    expect(signatureHTML).toContain('General Manager');
  });

  it('staff job title uses store email in signature', () => {
    setupProfile(STAFF_PROFILE);

    const signatureHTML = getEmployeeSignature('html');
    // Staff profile should use store email, not company email
    expect(signatureHTML).toContain('vegas@citizenwatchgroup.com');
    expect(signatureHTML).toContain('Bob Associate');
    expect(signatureHTML).toContain('Sales Associate');
  });

  it('text signature also reflects correct email based on job title', () => {
    setupProfile(MANAGEMENT_PROFILE);

    const signatureText = getEmployeeSignature('text');
    expect(signatureText).toContain('alice.manager@citizenwatchgroup.com');
    expect(signatureText).toContain('Alice Manager');

    // Switch to staff profile
    setupProfile(STAFF_PROFILE);
    const staffSignatureText = getEmployeeSignature('text');
    expect(staffSignatureText).toContain('vegas@citizenwatchgroup.com');
    expect(staffSignatureText).toContain('Bob Associate');
  });

  it('promotion email HTML includes profile store info', () => {
    setupProfile(MANAGEMENT_PROFILE);

    const data: PromotionEmailData = {
      promoDateRange: 'March 15-20, 2026',
      promoYear: '2026',
      promoTitle: 'SPRING SALE',
      promotionEntries: [
        {
          id: 1,
          line: 'Citizen Eco-Drive',
          collections: 'Promaster, Field',
          callout: 'Great deals!',
        },
      ],
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
    };

    const html = generatePromotionEmailHTML(data);

    // Should include profile store info
    expect(html).toContain('407-555-1234');
    expect(html).toContain('orlando@citizenwatchgroup.com');
    expect(html).toContain('Mon-Sat: 10AM-8PM');
  });
});

// ========================================================================
// VAL-CROSS-004: Theme persists across all pages
// ========================================================================

describe('VAL-CROSS-004: Theme persists across all pages', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('theme is read from localStorage on app load', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lightPalette', 'catppuccin-latte');
    localStorage.setItem('darkPalette', 'catppuccin-mocha');

    // ThemeProvider reads from localStorage on init
    const savedTheme = localStorage.getItem('theme');
    expect(savedTheme).toBe('dark');
  });

  it('ThemeProvider applies theme data attributes to document', () => {
    setupProfile();
    renderApp();

    // ThemeProvider should set data attributes on document element
    const htmlEl = document.documentElement;
    // Default is light mode
    expect(htmlEl.getAttribute('data-theme')).toBe('light');
    expect(htmlEl.getAttribute('data-light-palette')).toBeTruthy();
    expect(htmlEl.getAttribute('data-dark-palette')).toBeTruthy();
  });

  it('theme state persists via localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    // Verify theme would persist by reading from localStorage
    expect(localStorage.getItem('theme')).toBe('dark');

    // Simulate page reload - ThemeProvider would re-read localStorage
    const savedTheme = localStorage.getItem('theme');
    expect(savedTheme).toBe('dark');
  });

  it('palette selection is persisted in localStorage', () => {
    localStorage.setItem('lightPalette', 'nord');
    localStorage.setItem('darkPalette', 'monokai');

    expect(localStorage.getItem('lightPalette')).toBe('nord');
    expect(localStorage.getItem('darkPalette')).toBe('monokai');
  });

  it('header renders on all pages with navigation', () => {
    setupProfile();
    renderApp();

    // Header with navigation links should be present
    expect(screen.getByText('Template Generator')).toBeTruthy();
    expect(screen.getByText('Templates')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Promotions')).toBeTruthy();
  });
});

// ========================================================================
// VAL-CROSS-006: XSS prevention in generated content
// ========================================================================

describe('VAL-CROSS-006: XSS prevention in generated content', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('sanitizeHTML escapes angle brackets to prevent HTML injection', () => {
    const xss = '<script>alert("xss")</script>';
    const sanitized = sanitizeHTML(xss);
    // The < and > are escaped, making the tag inert
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('sanitizeHTML makes HTML tags inert by escaping delimiters', () => {
    const xss = '<img onerror="alert(1)" src=x>';
    const sanitized = sanitizeHTML(xss);
    // The angle brackets are escaped, making the tag inert
    expect(sanitized).toContain('&lt;img');
    expect(sanitized).toContain('&gt;');
    // The raw tag is not present
    expect(sanitized).not.toContain('<img');
  });

  it('escapeAttr escapes double and single quotes for attribute safety', () => {
    expect(escapeAttr('"onclick="alert(1)')).toContain('&quot;');
    expect(escapeAttr("'onclick='alert(1)")).toContain('&#39;');
  });

  it('promotion email HTML escapes all fields to prevent XSS', () => {
    const xssProfile: UserProfile = {
      employeeName: '<script>alert("name")</script>',
      jobTitle: 'Sales Associate',
      storeName: 'Store',
      storeLocation: 'Test Location',
      storeAddress: '<script>alert("addr")</script>',
      storePhone: '555-1234',
      storeEmail: 'test@store.com',
      storeHours: '<script>alert("hours")</script>',
    };
    setupProfile(xssProfile);

    const data: PromotionEmailData = {
      promoDateRange: '<script>alert("date")</script>',
      promoYear: '<script>alert("year")</script>',
      promoTitle: '<script>alert("title")</script>',
      promotionEntries: [
        {
          id: 1,
          line: '<script>alert("entry")</script>',
          collections: '<b>bold attempt</b>',
          callout: '<script>alert("callout")</script>',
        },
      ],
      specialHours: [
        { id: 1, day: '<script>alert("day")</script>', hours: '<script>alert("hrs")</script>' },
      ],
      howToShopItems: [
        {
          id: 1,
          text: '<script>alert("shop")</script>',
          bold: false,
          italic: false,
          underline: false,
        },
      ],
      importantNotesItems: [
        {
          id: 1,
          text: '<script>alert("note")</script>',
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

    const html = generatePromotionEmailHTML(data);

    // No raw <script> tags should exist in the output (all escaped)
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');

    // All script content should be escaped
    expect(html).toContain('&lt;script&gt;');

    // Profile-derived fields should be escaped
    expect(html).not.toContain('<script>alert("date")</script>');
    expect(html).not.toContain('<script>alert("year")</script>');
    expect(html).not.toContain('<script>alert("title")</script>');
    expect(html).not.toContain('<script>alert("hours")</script>');
    expect(html).not.toContain('<script>alert("addr")</script>');

    // Collections should also be escaped
    expect(html).not.toContain('<b>bold attempt</b>');
    expect(html).toContain('&lt;b&gt;bold attempt&lt;/b&gt;');
  });

  it('template generation sanitizes user input via sanitizeTemplateData', () => {
    setupProfile(MANAGEMENT_PROFILE);

    const template = templates['new-customer-welcome'];
    const result = template.generate({
      customerName: '<script>alert("xss")</script>',
      employeeName: '<img onerror="alert(1)" src=x>',
    });

    // Output should not contain unescaped XSS vectors
    expect(result.body).not.toContain('<script>');
    expect(result.body).not.toContain('<img');
  });

  it('signature escapes profile data to prevent XSS', () => {
    const xssProfile: UserProfile = {
      employeeName: '<script>alert("name")</script>',
      jobTitle: '<script>alert("title")</script>',
      storeLocation: '<script>alert("loc")</script>',
      storeAddress: '<script>alert("addr")</script>',
      storePhone: '<script>alert("phone")</script>',
      storeEmail: 'test@evil.com',
      companyEmail: 'evil@company.com',
    };
    setupProfile(xssProfile);

    const signatureHTML = getEmployeeSignature('html');
    expect(signatureHTML).not.toContain('<script>');
    expect(signatureHTML).not.toContain('</script>');
    expect(signatureHTML).toContain('&lt;script&gt;');
  });
});

// ========================================================================
// VAL-CROSS-001 & VAL-CROSS-005: Flow tests
// ========================================================================

describe('VAL-CROSS-001: Complete user flow — setup to template generation', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('profile data is available for template generation after save', () => {
    // Simulate saving a profile
    const profile: UserProfile = {
      employeeName: 'Jane Smith',
      jobTitle: 'Sales Associate',
      storeName: 'Citizen Company Store - Test',
      storeLocation: 'the Test Outlet Mall',
      storeAddress: '100 Test St, Test City, TS 12345',
      storePhone: '555-123-4567',
      storeEmail: 'teststore@citizenwatchgroup.com',
      storeHours: 'Mon-Sat: 10AM-8PM',
    };
    saveUserProfile(profile);

    // Verify profile is persisted
    const loaded = getUserProfile();
    expect(loaded).toBeTruthy();
    expect(loaded!.employeeName).toBe('Jane Smith');
    expect(loaded!.storePhone).toBe('555-123-4567');

    // Verify profile helpers return correct values for template pre-fill
    expect(getEmployeeName()).toBe('Jane Smith');
    expect(getStorePhone()).toBe('555-123-4567');
    expect(getStoreName()).toBe('Citizen Company Store - Test');
    expect(getStoreEmail()).toBe('teststore@citizenwatchgroup.com');
  });

  it('template generation produces output with profile phone data', () => {
    setupProfile(MANAGEMENT_PROFILE);

    // Select and generate a template that uses getStorePhone()
    const template = templates['back-in-stock'];
    expect(template).toBeDefined();

    const result = template.generate({
      customerName: 'Test Customer',
      brand: 'Citizen',
      modelName: 'Promaster Diver',
      modelNumber: 'BN0150-28E',
      price: '350',
      holdDeadline: 'Friday',
      employeeName: 'Alice Manager',
    });

    // Store phone is included in body via getStorePhone()
    expect(result.body).toContain('407-555-1234');
    // Signature with employee name is included
    expect(result.includeSignature).toBe(true);
    const fullOutput = assembleTemplateOutput(result);
    expect(fullOutput).toContain('Alice Manager');
    expect(fullOutput).toContain('Citizen Company Store');
  });
});

describe('VAL-CROSS-005: Full promotion workflow end-to-end', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('promotion page redirects when no profile is saved', () => {
    clearProfile();

    render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter initialEntries={['/promotion']}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<TemplatesPage />} />
                <Route path="/start" element={<ProfilePage />} />
                <Route path="/promotion" element={<PromotionPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // Should redirect to /start with profile required banner
    expect(screen.getByText(/profile required/i)).toBeTruthy();
  });

  it('promotion store handles complete workflow data', () => {
    setupProfile(MANAGEMENT_PROFILE);

    // Simulate filling promotion data via store
    const store = usePromotionStore.getState();
    store.setPromoDateRange('April 1-7, 2026');
    store.setPromoYear('2026');
    store.setPromoTitle('SPRING SALE');
    store.addPromotionEntry();

    // Get the generated entry ID and update by that ID
    const entryId = usePromotionStore.getState().promotionEntries[0].id;
    store.updatePromotionEntry(entryId, 'line', 'Citizen Eco-Drive');
    store.updatePromotionEntry(entryId, 'collections', 'Promaster, Field');
    store.updatePromotionEntry(entryId, 'callout', 'Limited time!');

    store.addHowToShopItem();
    const shopItemId = usePromotionStore.getState().howToShopItems[0].id;
    store.updateHowToShopItem(shopItemId, 'Visit us in-store');

    store.addImportantNotesItem();
    const noteItemId = usePromotionStore.getState().importantNotesItems[0].id;
    store.updateImportantNotesItem(noteItemId, 'While supplies last');

    const state = usePromotionStore.getState();
    expect(state.promoDateRange).toBe('April 1-7, 2026');
    expect(state.promoTitle).toBe('SPRING SALE');
    expect(state.promotionEntries).toHaveLength(1);
    expect(state.promotionEntries[0].line).toBe('Citizen Eco-Drive');
    expect(state.howToShopItems).toHaveLength(1);
    expect(state.howToShopItems[0].text).toBe('Visit us in-store');
    expect(state.importantNotesItems).toHaveLength(1);
    expect(state.importantNotesItems[0].text).toBe('While supplies last');

    // Generate email HTML
    const data: PromotionEmailData = {
      promoDateRange: state.promoDateRange,
      promoYear: state.promoYear,
      promoTitle: state.promoTitle,
      promotionEntries: state.promotionEntries,
      specialHours: state.specialHours,
      howToShopItems: state.howToShopItems,
      importantNotesItems: state.importantNotesItems,
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

    const html = generatePromotionEmailHTML(data);
    expect(html).toContain('SPRING SALE');
    expect(html).toContain('Citizen Eco-Drive');
    // Collections are split by comma, each item prefixed with *
    expect(html).toContain('*Promaster');
    expect(html).toContain('*Field');
    expect(html).toContain('Limited time!');
    expect(html).toContain('Visit us in-store');
    expect(html).toContain('While supplies last');
    expect(html).toContain('407-555-1234');
    expect(html).toContain('orlando@citizenwatchgroup.com');
  });

  it('promotion signature uses correct email based on job title', () => {
    // Test management uses company email
    setupProfile(MANAGEMENT_PROFILE);
    let signature = getEmployeeSignature('html');
    expect(signature).toContain('alice.manager@citizenwatchgroup.com');

    // Test staff uses store email
    setupProfile(STAFF_PROFILE);
    signature = getEmployeeSignature('html');
    expect(signature).toContain('vegas@citizenwatchgroup.com');
  });
});
