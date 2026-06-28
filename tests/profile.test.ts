import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserProfile,
  saveUserProfile,
  getStorePhone,
  getStoreName,
  getStoreLocation,
  getFullStoreLocation,
  getStoreAddress,
  getStoreEmail,
  getCompanyEmail,
  getStoreHours,
  getStorePlusCode,
  getDirections,
  getEmployeeName,
  getJobTitle,
  extractSignatureData,
  hasProfile,
  type UserProfile,
} from '../src/lib/profile';

describe('profile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getUserProfile / saveUserProfile', () => {
    it('returns null when no profile is saved', () => {
      expect(getUserProfile()).toBeNull();
    });

    it('saves and retrieves a profile', () => {
      const profile: UserProfile = {
        employeeName: 'John Doe',
        jobTitle: 'Sales Associate',
        storeName: 'My Store',
        storePhone: '555-1234',
      };
      saveUserProfile(profile);
      const retrieved = getUserProfile();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.employeeName).toBe('John Doe');
      expect(retrieved!.jobTitle).toBe('Sales Associate');
    });

    it('overwrites existing profile', () => {
      saveUserProfile({ employeeName: 'First' });
      saveUserProfile({ employeeName: 'Second' });
      expect(getUserProfile()!.employeeName).toBe('Second');
    });
  });

  describe('getStorePhone', () => {
    it('returns stored phone number', () => {
      saveUserProfile({ storePhone: '555-9999' });
      expect(getStorePhone()).toBe('555-9999');
    });

    it('returns empty string when no profile', () => {
      expect(getStorePhone()).toBe('');
    });
  });

  describe('getStoreName', () => {
    it('returns stored store name', () => {
      saveUserProfile({ storeName: 'Test Store' });
      expect(getStoreName()).toBe('Test Store');
    });

    it('returns neutral default when no profile', () => {
      expect(getStoreName()).toBe('Your Store');
    });
  });

  describe('getStoreLocation', () => {
    it('returns stored location', () => {
      saveUserProfile({ storeLocation: 'the North Premium Outlets' });
      expect(getStoreLocation()).toBe('the North Premium Outlets');
    });

    it('returns empty string when no profile', () => {
      expect(getStoreLocation()).toBe('');
    });
  });

  describe('getFullStoreLocation', () => {
    it('returns "<store name> at <location>"', () => {
      saveUserProfile({ storeName: 'My Store', storeLocation: 'the Mall' });
      expect(getFullStoreLocation()).toBe('My Store at the Mall');
    });

    it('falls back to just the store name when no location', () => {
      saveUserProfile({ storeName: 'My Store' });
      expect(getFullStoreLocation()).toBe('My Store');
    });
  });

  describe('getStoreAddress', () => {
    it('returns stored address', () => {
      saveUserProfile({ storeAddress: '123 Main St' });
      expect(getStoreAddress()).toBe('123 Main St');
    });

    it('returns empty string when no profile', () => {
      expect(getStoreAddress()).toBe('');
    });
  });

  describe('getStoreEmail', () => {
    it('returns stored email', () => {
      saveUserProfile({ storeEmail: 'test@store.com' });
      expect(getStoreEmail()).toBe('test@store.com');
    });

    it('returns empty string when no store email set', () => {
      saveUserProfile({ storeName: 'My Store' });
      expect(getStoreEmail()).toBe('');
    });

    it('returns empty string when no profile', () => {
      expect(getStoreEmail()).toBe('');
    });
  });

  describe('getCompanyEmail', () => {
    it('returns stored company email', () => {
      saveUserProfile({ companyEmail: 'admin@company.com' });
      expect(getCompanyEmail()).toBe('admin@company.com');
    });

    it('returns empty string when no profile', () => {
      expect(getCompanyEmail()).toBe('');
    });
  });

  describe('getStoreHours', () => {
    it('returns stored hours', () => {
      saveUserProfile({ storeHours: '9-5 daily' });
      expect(getStoreHours()).toBe('9-5 daily');
    });

    it('returns default when no profile', () => {
      expect(getStoreHours()).toBe('Mon-Sat: 10AM-8PM, Sun: 11AM-7PM');
    });
  });

  describe('getStorePlusCode', () => {
    it('returns stored plus code', () => {
      saveUserProfile({ storePlusCode: 'ABC123' });
      expect(getStorePlusCode()).toBe('ABC123');
    });

    it('returns empty string when no profile', () => {
      expect(getStorePlusCode()).toBe('');
    });
  });

  describe('getDirections', () => {
    it('returns stored directions', () => {
      saveUserProfile({ storeDirections: 'Turn left at the light' });
      expect(getDirections()).toBe('Turn left at the light');
    });

    it('returns empty string when no profile', () => {
      expect(getDirections()).toBe('');
    });
  });

  describe('getEmployeeName', () => {
    it('returns stored name', () => {
      saveUserProfile({ employeeName: 'Jane' });
      expect(getEmployeeName()).toBe('Jane');
    });

    it('returns default when no profile', () => {
      expect(getEmployeeName()).toBe('Your Name');
    });
  });

  describe('getJobTitle', () => {
    it('returns stored title', () => {
      saveUserProfile({ jobTitle: 'General Manager' });
      expect(getJobTitle()).toBe('General Manager');
    });

    it('returns default when no profile', () => {
      expect(getJobTitle()).toBe('Sales Associate');
    });
  });

  describe('extractSignatureData', () => {
    it('returns full signature data from profile', () => {
      saveUserProfile({
        employeeName: 'John Doe',
        jobTitle: 'General Manager',
        storeLocation: 'the Outlet Mall',
        storeAddress: '123 Main St',
        storePhone: '555-1234',
        companyEmail: 'john@company.com',
        storeEmail: 'store@company.com',
      });

      const sig = extractSignatureData();
      expect(sig.name).toBe('John Doe');
      expect(sig.title).toBe('General Manager');
      expect(sig.location).toBe('the Outlet Mall');
      expect(sig.address).toBe('123 Main St');
      expect(sig.phone).toBe('555-1234');
      expect(sig.jobTitle).toBe('general manager');
      expect(sig.companyEmail).toBe('john@company.com');
      expect(sig.storeEmail).toBe('store@company.com');
    });

    it('returns defaults when no profile', () => {
      const sig = extractSignatureData();
      expect(sig.name).toBe('Employee Name');
      expect(sig.title).toBe('Sales Associate');
      expect(sig.jobTitle).toBe(''); // empty string since no jobTitle set
    });
  });

  describe('hasProfile', () => {
    it('returns false when no profile', () => {
      expect(hasProfile()).toBe(false);
    });

    it('returns true when profile exists', () => {
      saveUserProfile({ employeeName: 'Test' });
      expect(hasProfile()).toBe(true);
    });
  });
});
