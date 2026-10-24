/**
 * Brand links were removed; saved/imported profiles that still carry them
 * fold the names into brand keywords so subject suggestions don't change.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getUserProfile, migrateBrandLinks } from '@/lib/profile';
import { StorageKeys } from '@/lib/storage-keys';

describe('migrateBrandLinks', () => {
  it('moves link names into brandKeywords and drops the links', () => {
    const out = migrateBrandLinks({
      storeName: 'Acme',
      brandKeywords: ['Zenith'],
      brandLinks: [
        { name: 'Meridian', url: 'https://meridian.example.com' },
        { name: 'zenith', url: 'https://zenith.example.com' },
        { name: '  ', url: 'https://blank.example.com' },
      ],
    });
    expect(out).toEqual({
      storeName: 'Acme',
      brandKeywords: ['Zenith', 'Meridian'],
    });
    expect('brandLinks' in out).toBe(false);
  });

  it('leaves profiles without brand links untouched', () => {
    const p = { storeName: 'Acme', brandKeywords: ['Zenith'] };
    expect(migrateBrandLinks(p)).toBe(p);
  });

  it('tolerates malformed brandLinks values', () => {
    expect(migrateBrandLinks({ brandLinks: 'oops' })).toEqual({
      brandKeywords: [],
    });
    expect(
      migrateBrandLinks({ brandLinks: [null, 3, { url: 'x' }, { name: 'A' }] })
    ).toEqual({ brandKeywords: ['A'] });
  });
});

describe('getUserProfile migrates stored profiles', () => {
  beforeEach(() => localStorage.clear());

  it('returns brand link names as brand keywords', () => {
    localStorage.setItem(
      StorageKeys.userProfile,
      JSON.stringify({
        storeName: 'Acme',
        brandLinks: [{ name: 'Meridian', url: 'https://m.example.com' }],
      })
    );
    const p = getUserProfile();
    expect(p?.brandKeywords).toEqual(['Meridian']);
    expect(p && 'brandLinks' in p).toBe(false);
  });
});
