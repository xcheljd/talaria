import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePhone,
  formatPhone,
  validateEmail,
  validateStoreHours,
  validatePlusCode,
  validateCompanyEmail,
  requiresCompanyEmail,
  syncPaletteSelects,
} from '../src/js/start-app.js';

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

describe('formatPhone', () => {
  it('formats 10 digits into phone format', () => {
    expect(formatPhone('5551234567')).toBe('(555) 123-4567');
  });

  it('formats another 10-digit string', () => {
    expect(formatPhone('8005551234')).toBe('(800) 555-1234');
  });
});

describe('validateEmail', () => {
  it('returns valid for a proper email', () => {
    const result = validateEmail('user@store.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns valid for citizen email', () => {
    const result = validateEmail('name@citizenwatchgroup.com');
    expect(result.isValid).toBe(true);
    expect(result.isCitizenEmail).toBe(true);
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

  it('detects non-citizen email', () => {
    const result = validateEmail('user@gmail.com');
    expect(result.isValid).toBe(true);
    expect(result.isCitizenEmail).toBe(false);
  });
});

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

describe('validatePlusCode', () => {
  it('returns valid for empty string (optional field)', () => {
    const result = validatePlusCode('');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns valid for short plus code format', () => {
    const result = validatePlusCode('CWC8+R9');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('CWC8+R9');
  });

  it('uppercases the plus code', () => {
    const result = validatePlusCode('cwc8+r9');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('CWC8+R9');
  });

  it('returns invalid for full plus code (8+3 chars)', () => {
    // Full format like 849VCWC8+R9 has 8 chars before +, regex only allows 2-4
    const result = validatePlusCode('849VCWC8+R9');
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

  it('returns invalid when management title and non-citizen email', () => {
    const result = validateCompanyEmail('personal@gmail.com', 'General Manager');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Company email must be @citizenwatchgroup.com');
  });

  it('returns valid when management title and citizen email', () => {
    const result = validateCompanyEmail('name@citizenwatchgroup.com', 'General Manager');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns invalid for malformed email with management title', () => {
    const result = validateCompanyEmail('invalid', 'General Manager');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('checks all management titles', () => {
    const managementTitles = [
      'Assistant Store Manager',
      'Associate Store Manager',
      'General Manager',
      'Area Manager',
      'Regional Manager',
      'District Manager',
    ];
    managementTitles.forEach((title) => {
      const result = validateCompanyEmail('', title);
      expect(result.isValid).toBe(false);
    });
  });
});

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

describe('syncPaletteSelects', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('sets lightPaletteSelect value from localStorage', () => {
    localStorage.setItem('lightPalette', 'nord');
    const lightSelect = document.createElement('select');
    lightSelect.id = 'lightPaletteSelect';
    lightSelect.innerHTML = '<option value="github"></option><option value="nord"></option>';
    document.body.appendChild(lightSelect);

    const darkSelect = document.createElement('select');
    darkSelect.id = 'darkPaletteSelect';
    darkSelect.innerHTML = '<option value="github"></option><option value="kanagawa"></option>';
    document.body.appendChild(darkSelect);

    syncPaletteSelects();
    expect(lightSelect.value).toBe('nord');
  });

  it('sets darkPaletteSelect value from localStorage', () => {
    localStorage.setItem('darkPalette', 'kanagawa');
    const lightSelect = document.createElement('select');
    lightSelect.id = 'lightPaletteSelect';
    lightSelect.innerHTML = '<option value="github"></option><option value="nord"></option>';
    document.body.appendChild(lightSelect);

    const darkSelect = document.createElement('select');
    darkSelect.id = 'darkPaletteSelect';
    darkSelect.innerHTML = '<option value="github"></option><option value="kanagawa"></option>';
    document.body.appendChild(darkSelect);

    syncPaletteSelects();
    expect(darkSelect.value).toBe('kanagawa');
  });

  it('defaults to github when localStorage has no palette value', () => {
    const lightSelect = document.createElement('select');
    lightSelect.id = 'lightPaletteSelect';
    lightSelect.innerHTML = '<option value="github"></option><option value="nord"></option>';
    document.body.appendChild(lightSelect);

    const darkSelect = document.createElement('select');
    darkSelect.id = 'darkPaletteSelect';
    darkSelect.innerHTML = '<option value="github"></option><option value="kanagawa"></option>';
    document.body.appendChild(darkSelect);

    syncPaletteSelects();
    expect(lightSelect.value).toBe('github');
    expect(darkSelect.value).toBe('github');
  });

  it('does not throw when select elements are missing', () => {
    expect(() => syncPaletteSelects()).not.toThrow();
  });
});
