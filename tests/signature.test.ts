import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEmployeeSignature,
  MANAGER_TITLES,
  ENVIRONMENT_MESSAGE,
} from '../src/lib/signature';
import { saveUserProfile, type UserProfile } from '../src/lib/profile';

describe('signature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const brandLinks = [
    { name: 'Acme', url: 'https://acme.example.com/' },
    { name: 'Zenith', url: 'https://zenith.example.com/' },
  ];

  const managerProfile: UserProfile = {
    employeeName: 'Jane Smith',
    jobTitle: 'General Manager',
    companyName: 'Acme Watch Co.',
    storeName: 'Acme Downtown',
    storeLocation: 'the South Premium Outlets',
    storeAddress: '7400 Main St',
    storePhone: '702-555-1234',
    companyEmail: 'jane.smith@acme.com',
    storeEmail: 'southstore@acme.com',
    brandLinks,
  };

  const staffProfile: UserProfile = {
    employeeName: 'Bob Jones',
    jobTitle: 'Sales Associate',
    companyName: 'Acme Watch Co.',
    storeName: 'Acme North',
    storeLocation: 'the North Outlets',
    storeAddress: '456 North Ave',
    storePhone: '702-555-5678',
    companyEmail: '',
    storeEmail: 'northstore@acme.com',
    brandLinks,
  };

  describe('getEmployeeSignature (text format)', () => {
    it('produces plain text signature with employee name and title', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('Jane Smith');
      expect(sig).toContain('General Manager');
    });

    it('includes company info', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain(managerProfile.companyName);
      expect(sig).toContain(managerProfile.storeName);
    });

    it('includes phone number', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('Tel/SMS:');
      expect(sig).toContain('702-555-1234');
    });

    it('uses company email for management titles', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('jane.smith@acme.com');
    });

    it('uses store email for non-management titles', () => {
      saveUserProfile(staffProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('northstore@acme.com');
    });

    it('includes environment message', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain(ENVIRONMENT_MESSAGE);
    });

    it('includes brand links as text', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      brandLinks.forEach((brand) => {
        expect(sig).toContain(brand.name);
      });
    });

    it('omits brand links when none are configured', () => {
      saveUserProfile({ ...managerProfile, brandLinks: [] });
      const sig = getEmployeeSignature('text');
      expect(sig).not.toContain('Acme |');
      expect(sig).toContain('Jane Smith');
    });

    it('handles missing address', () => {
      const noAddress = { ...staffProfile, storeAddress: '' };
      saveUserProfile(noAddress);
      const sig = getEmployeeSignature('text');
      // Should still contain other info
      expect(sig).toContain('Bob Jones');
    });
  });

  describe('getEmployeeSignature (html format)', () => {
    it('produces HTML signature with employee name', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('Jane Smith');
      expect(sig).toContain('General Manager');
    });

    it('includes HTML styling', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('<div');
      expect(sig).toContain('style=');
    });

    it('includes mailto links for email', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('mailto:');
      expect(sig).toContain('jane.smith@acme.com');
    });

    it('includes brand link hrefs', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      brandLinks.forEach((brand) => {
        expect(sig).toContain(brand.url);
        expect(sig).toContain(brand.name);
      });
    });

    it('uses standard email colors by default', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('#000000');
      expect(sig).toContain('#0066cc');
    });
  });

  describe('getEmployeeSignature (brand link URL scheme validation)', () => {
    it('omits javascript: brand links from HTML signature output', () => {
      saveUserProfile({
        ...managerProfile,
        brandLinks: [
          { name: 'Acme', url: 'https://acme.example.com/' },
          { name: 'Evil', url: 'javascript:alert(1)' },
        ],
      });
      const sig = getEmployeeSignature('html');
      expect(sig).not.toContain('javascript:');
      expect(sig).not.toContain('<a href="javascript:');
      expect(sig).not.toContain('Evil');
      expect(sig).toContain('https://acme.example.com/');
    });

    it('omits data:text/html brand links from HTML signature output', () => {
      saveUserProfile({
        ...managerProfile,
        brandLinks: [
          { name: 'Data', url: 'data:text/html,<script>alert(1)</script>' },
        ],
      });
      const sig = getEmployeeSignature('html');
      expect(sig).not.toContain('data:text/html');
      expect(sig).not.toContain('Data');
    });

    it('still emits https:// brand links', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('href="https://acme.example.com/"');
      expect(sig).toContain('Acme');
    });

    it('still emits relative brand URLs', () => {
      saveUserProfile({
        ...managerProfile,
        brandLinks: [
          { name: 'Acme', url: 'https://acme.example.com/' },
          { name: 'Rel', url: '/relative/path' },
        ],
      });
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('href="/relative/path"');
      expect(sig).toContain('Rel');
    });

    it('escapes quote characters in emitted brand-link hrefs (attribute-injection guard)', () => {
      saveUserProfile({
        ...managerProfile,
        brandLinks: [
          { name: 'Acme', url: 'https://acme.example.com/' },
          {
            name: 'Quote',
            url: 'http://x"/onmouseover="alert(1)',
          },
        ],
      });
      const sig = getEmployeeSignature('html');
      // The quote must be entity-escaped so it cannot break out of the
      // href attribute (escapeAttr, not sanitizeHTML, for attribute context).
      expect(sig).not.toContain('href="http://x"');
      expect(sig).toContain('href="http://x&quot;/onmouseover=&quot;alert(1)"');
      expect(sig).toContain('Quote');
    });

    it('still emits mailto: and tel: brand links', () => {
      saveUserProfile({
        ...managerProfile,
        brandLinks: [
          { name: 'Mail', url: 'mailto:brands@acme.com' },
          { name: 'Tel', url: 'tel:+17025551234' },
        ],
      });
      const sig = getEmployeeSignature('html');
      expect(sig).toContain('href="mailto:brands@acme.com"');
      expect(sig).toContain('href="tel:+17025551234"');
    });
  });

  describe('manager title detection', () => {
    it.each(MANAGER_TITLES)('detects "%s" as manager', (title) => {
      saveUserProfile({
        ...managerProfile,
        jobTitle: title,
        companyEmail: 'manager@company.com',
        storeEmail: 'store@company.com',
      });
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('manager@company.com');
    });

    it('uses store email for assistant manager without company email', () => {
      saveUserProfile({
        ...managerProfile,
        jobTitle: 'assistant manager',
        companyEmail: '',
        storeEmail: 'fallback@store.com',
      });
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('fallback@store.com');
    });
  });
});
