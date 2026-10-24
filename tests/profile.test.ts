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
  getStoreHours,
  getStorePlusCode,
  getDirections,
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
        storeDirections: 'John Doe',
        storeName: 'My Store',
        storePhone: '555-1234',
      };
      saveUserProfile(profile);
      const retrieved = getUserProfile();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.storeDirections).toBe('John Doe');
    });

    it('overwrites existing profile', () => {
      saveUserProfile({ storeDirections: 'First' });
      saveUserProfile({ storeDirections: 'Second' });
      expect(getUserProfile()!.storeDirections).toBe('Second');
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

  describe('hasProfile', () => {
    it('returns false when no profile', () => {
      expect(hasProfile()).toBe(false);
    });

    it('returns true when profile exists', () => {
      saveUserProfile({ storeDirections: 'Test' });
      expect(hasProfile()).toBe(true);
    });
  });
});
