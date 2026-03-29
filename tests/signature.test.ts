import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEmployeeSignature,
  COMPANY_INFO,
  BRAND_LINKS,
  MANAGER_TITLES,
  ENVIRONMENT_MESSAGE,
} from '../src/lib/signature';
import { saveUserProfile, type UserProfile } from '../src/lib/profile';

describe('signature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const managerProfile: UserProfile = {
    employeeName: 'Jane Smith',
    jobTitle: 'General Manager',
    storeLocation: 'the South Premium Outlets',
    storeAddress: '7400 Las Vegas Blvd S',
    storePhone: '702-555-1234',
    companyEmail: 'jane.smith@citizenwatch.com',
    storeEmail: 'southstore@citizenwatchgroup.com',
  };

  const staffProfile: UserProfile = {
    employeeName: 'Bob Jones',
    jobTitle: 'Sales Associate',
    storeLocation: 'the North Outlets',
    storeAddress: '456 North Ave',
    storePhone: '702-555-5678',
    companyEmail: '',
    storeEmail: 'northstore@citizenwatchgroup.com',
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
      expect(sig).toContain(COMPANY_INFO.companyName);
      expect(sig).toContain(COMPANY_INFO.storeName);
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
      expect(sig).toContain('jane.smith@citizenwatch.com');
    });

    it('uses store email for non-management titles', () => {
      saveUserProfile(staffProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain('northstore@citizenwatchgroup.com');
    });

    it('includes environment message', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      expect(sig).toContain(ENVIRONMENT_MESSAGE);
    });

    it('includes brand links as text', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('text');
      BRAND_LINKS.forEach((brand) => {
        expect(sig).toContain(brand.name);
      });
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
      expect(sig).toContain('jane.smith@citizenwatch.com');
    });

    it('includes brand link hrefs', () => {
      saveUserProfile(managerProfile);
      const sig = getEmployeeSignature('html');
      BRAND_LINKS.forEach((brand) => {
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
