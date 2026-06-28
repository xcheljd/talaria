/**
 * Tests for profile validation utilities and Zod schema.
 * Migrated from tests/start-app.test.js to cover src/lib/profile-validation.ts
 */
import { describe, it, expect } from 'vitest';
import {
  validatePhone,
  formatPhone,
  validateEmail,
  validateStoreHours,
  validatePlusCode,
  validateCompanyEmail,
  requiresCompanyEmail,
  profileFormSchema,
  JOB_TITLES,
  MANAGEMENT_TITLES,
} from '@/lib/profile-validation';

// ─── validatePhone ────────────────────────────────────────────────────────────

describe('validatePhone', () => {
  it('returns valid for 10-digit phone number', () => {
    const result = validatePhone('5551234567');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('(555) 123-4567');
    expect(result.error).toBeNull();
  });

  it('returns valid for formatted phone number', () => {
    const result = validatePhone('(555) 123-4567');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('(555) 123-4567');
  });

  it('returns invalid for phone with fewer than 10 digits', () => {
    const result = validatePhone('123');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone must have 10 digits');
  });

  it('returns invalid for phone with more than 10 digits', () => {
    const result = validatePhone('123456789012');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone must have 10 digits');
  });

  it('formats a valid 10-digit string', () => {
    const result = validatePhone('8005551234');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('(800) 555-1234');
  });

  it('handles empty string', () => {
    const result = validatePhone('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone must have 10 digits');
  });
});

// ─── formatPhone ──────────────────────────────────────────────────────────────

describe('formatPhone', () => {
  it('formats 10 digits into phone format', () => {
    expect(formatPhone('5551234567')).toBe('(555) 123-4567');
  });

  it('formats another 10-digit string', () => {
    expect(formatPhone('8005551234')).toBe('(800) 555-1234');
  });
});

// ─── validateEmail ────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('returns valid for a proper email', () => {
    const result = validateEmail('user@store.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns valid for any well-formed email domain', () => {
    expect(validateEmail('name@acme.com').isValid).toBe(true);
    expect(validateEmail('user@gmail.com').isValid).toBe(true);
  });

  it('returns invalid for malformed email', () => {
    const result = validateEmail('invalid');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('returns invalid for email without domain', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for empty string', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });
});

// ─── validateStoreHours ───────────────────────────────────────────────────────

describe('validateStoreHours', () => {
  it('returns valid for proper store hours format', () => {
    const result = validateStoreHours('Mon–Sat: 10AM–8PM | Sun: 10AM–7PM');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns invalid for empty string', () => {
    const result = validateStoreHours('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Store hours are required');
  });

  it('returns invalid for whitespace-only', () => {
    const result = validateStoreHours('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Store hours are required');
  });

  it('returns invalid when missing day names', () => {
    const result = validateStoreHours('10AM–8PM');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('day names');
  });

  it('returns invalid when missing times', () => {
    const result = validateStoreHours('Monday to Saturday');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('times');
  });

  it('returns invalid for completely wrong format', () => {
    const result = validateStoreHours('bad format');
    expect(result.isValid).toBe(false);
  });
});

// ─── validatePlusCode ─────────────────────────────────────────────────────────

describe('validatePlusCode', () => {
  it('returns valid for empty string (optional field)', () => {
    const result = validatePlusCode('');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns valid for short plus code format', () => {
    const result = validatePlusCode('QXGV+2H');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('QXGV+2H');
  });

  it('uppercases the plus code', () => {
    const result = validatePlusCode('qxgv+2h');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('QXGV+2H');
  });

  it('returns invalid for full plus code (8+3 chars)', () => {
    // Full format like 849VQXGV+2H has 8 chars before +, regex only allows 2-4
    const result = validatePlusCode('849VQXGV+2H');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid Plus Code format');
  });

  it('returns invalid for bad format', () => {
    const result = validatePlusCode('bad code!!!');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid Plus Code format');
  });

  it('handles whitespace-only as valid (optional)', () => {
    const result = validatePlusCode('   ');
    expect(result.isValid).toBe(true);
  });
});

// ─── validateCompanyEmail ─────────────────────────────────────────────────────

describe('validateCompanyEmail', () => {
  it('returns valid for non-management title regardless of email', () => {
    const result = validateCompanyEmail('anything@gmail.com', 'Sales Associate');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns invalid when management title and no email', () => {
    const result = validateCompanyEmail('', 'General Manager');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Company email is required for management positions');
  });

  it('returns valid for management title with any valid email domain', () => {
    expect(
      validateCompanyEmail('name@acme.com', 'General Manager').isValid
    ).toBe(true);
    expect(
      validateCompanyEmail('personal@gmail.com', 'General Manager').isValid
    ).toBe(true);
  });

  it('returns invalid for malformed email with management title', () => {
    const result = validateCompanyEmail('invalid', 'General Manager');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('checks all management titles', () => {
    MANAGEMENT_TITLES.forEach((title) => {
      const result = validateCompanyEmail('', title);
      expect(result.isValid).toBe(false);
    });
  });
});

// ─── requiresCompanyEmail ─────────────────────────────────────────────────────

describe('requiresCompanyEmail', () => {
  it('returns true for management titles', () => {
    expect(requiresCompanyEmail('General Manager')).toBe(true);
    expect(requiresCompanyEmail('Assistant Store Manager')).toBe(true);
    expect(requiresCompanyEmail('Associate Store Manager')).toBe(true);
    expect(requiresCompanyEmail('Area Manager')).toBe(true);
    expect(requiresCompanyEmail('Regional Manager')).toBe(true);
    expect(requiresCompanyEmail('District Manager')).toBe(true);
  });

  it('returns false for non-management titles', () => {
    expect(requiresCompanyEmail('Sales Associate')).toBe(false);
    expect(requiresCompanyEmail('Sales Associate/Keyholder')).toBe(false);
    expect(requiresCompanyEmail('')).toBe(false);
  });
});

// ─── Zod Schema Validation ───────────────────────────────────────────────────

describe('profileFormSchema', () => {
  const validData = {
    employeeName: 'John Smith',
    jobTitle: 'Sales Associate',
    companyEmail: '',
    companyName: 'Acme Inc.',
    storeName: 'Acme Downtown',
    storeLocation: 'the Downtown Shopping Center',
    storeAddress: '123 Main St',
    storePlusCode: 'QXGV+2H',
    storePhone: '5551234567',
    storeEmail: 'store@acme.com',
    storeHours: 'Mon–Sat: 10AM–8PM | Sun: 10AM–7PM',
    storeDirections: 'Entrance E',
    productNoun: 'watch',
    productNounPlural: 'watches',
    brandLinks: [],
    brandKeywords: '',
    collectionKeywords: '',
  };

  it('validates a complete valid profile', () => {
    const result = profileFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty required fields', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      employeeName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing job title', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      jobTitle: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone number', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      storePhone: '123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      storeEmail: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid store hours', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      storeHours: 'bad format',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid plus code', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      storePlusCode: 'bad code!!!',
    });
    expect(result.success).toBe(false);
  });

  it('allows empty plus code (optional)', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      storePlusCode: '',
    });
    expect(result.success).toBe(true);
  });

  it('allows empty store address', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      storeAddress: '',
    });
    expect(result.success).toBe(true);
  });

  it('requires company email for management titles', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      jobTitle: 'General Manager',
      companyEmail: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed company email for management', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      jobTitle: 'General Manager',
      companyEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts any valid company email domain for management', () => {
    expect(
      profileFormSchema.safeParse({
        ...validData,
        jobTitle: 'General Manager',
        companyEmail: 'name@acme.com',
      }).success
    ).toBe(true);
    expect(
      profileFormSchema.safeParse({
        ...validData,
        jobTitle: 'General Manager',
        companyEmail: 'name@gmail.com',
      }).success
    ).toBe(true);
  });

  it('rejects missing company name', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      companyName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a brand link with a non-http URL', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      brandLinks: [{ name: 'Acme', url: 'not-a-url' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts brand links with http(s) URLs', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      brandLinks: [{ name: 'Acme', url: 'https://acme.example.com/' }],
    });
    expect(result.success).toBe(true);
  });

  it('ignores company email for non-management', () => {
    const result = profileFormSchema.safeParse({
      ...validData,
      jobTitle: 'Sales Associate',
      companyEmail: '',
    });
    expect(result.success).toBe(true);
  });

  it('JOB_TITLES contains expected titles', () => {
    expect(JOB_TITLES).toContain('Sales Associate');
    expect(JOB_TITLES).toContain('General Manager');
    expect(JOB_TITLES.length).toBe(8);
  });

  it('MANAGEMENT_TITLES contains expected titles', () => {
    expect(MANAGEMENT_TITLES).toContain('General Manager');
    expect(MANAGEMENT_TITLES).toContain('Assistant Store Manager');
    expect(MANAGEMENT_TITLES.length).toBe(6);
  });
});
