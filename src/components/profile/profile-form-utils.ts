/**
 * Shared helpers for the profile settings form.
 *
 * Both the page (on save) and the JSON export path need to turn the
 * comma-separated keyword inputs into arrays, so the helper lives here rather
 * than in either consumer.
 */

import type { ProfileFormValues } from '@/lib/profile-validation';
import type { NewsletterTheme } from '@/lib/newsletter-themes';
import { saveBlob } from '@/lib/file-save';
import { StorageKeys } from '@/lib/storage-keys';
import { readSavedSets, serializeSavedSets } from '@/stores/saved-sets-store';

/** Split a comma-separated keyword string into a trimmed, de-duplicated list. */
export function toKeywordList(value: string): string[] {
  return Array.from(
    new Set(
      (value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

/** Form field for each newsletter theme's extra phrases. */
export const THEME_FIELDS = {
  newArrivals: 'themeNewArrivals',
  backInStock: 'themeBackInStock',
  limited: 'themeLimited',
  event: 'themeEvent',
  gift: 'themeGift',
} as const satisfies Record<NewsletterTheme, keyof ProfileFormValues>;

type ThemeFieldName = (typeof THEME_FIELDS)[NewsletterTheme];

/** Profile theme phrases -> comma-separated form strings. */
export function themePhrasesToForm(
  phrases: Partial<Record<NewsletterTheme, string[]>> | undefined
): Record<ThemeFieldName, string> {
  const out = {} as Record<ThemeFieldName, string>;
  (Object.keys(THEME_FIELDS) as NewsletterTheme[]).forEach((t) => {
    const v = phrases?.[t];
    out[THEME_FIELDS[t]] = Array.isArray(v) ? v.map(String).join(', ') : '';
  });
  return out;
}

/**
 * Split form values into the profile's `themePhrases` (empty themes omitted)
 * and the remaining fields, so the per-theme form strings never land on the
 * saved profile.
 */
export function splitThemeFields<T extends ProfileFormValues>(
  values: T
): {
  rest: Omit<T, ThemeFieldName>;
  themePhrases: Partial<Record<NewsletterTheme, string[]>>;
} {
  const rest = { ...values } as Record<string, unknown>;
  const themePhrases: Partial<Record<NewsletterTheme, string[]>> = {};
  (Object.keys(THEME_FIELDS) as NewsletterTheme[]).forEach((t) => {
    const list = toKeywordList(String(values[THEME_FIELDS[t]] ?? ''));
    if (list.length) themePhrases[t] = list;
    delete rest[THEME_FIELDS[t]];
  });
  return { rest: rest as Omit<T, ThemeFieldName>, themePhrases };
}

/**
 * Serialize the current form values (plus the active palettes) to a
 * `profile-backup-<date>.json` download.
 */
export async function exportProfileJson(
  values: ProfileFormValues,
  lightPalette: string,
  darkPalette: string
): Promise<void> {
  const profileData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    profile: {
      companyName: values.companyName?.trim() || '',
      storeName: values.storeName?.trim() || '',
      storeLocation: values.storeLocation?.trim() || '',
      storePhone: values.storePhone?.trim() || '',
      storeEmail: values.storeEmail?.trim() || '',
      storeAddress: values.storeAddress?.trim() || '',
      storePlusCode: values.storePlusCode?.trim() || '',
      storeHours: values.storeHours?.trim() || '',
      storeDirections: values.storeDirections?.trim() || '',
      productNoun: values.productNoun?.trim() || '',
      productNounPlural: values.productNounPlural?.trim() || '',
      brandKeywords: toKeywordList(values.brandKeywords),
      collectionKeywords: toKeywordList(values.collectionKeywords),
      themePhrases: splitThemeFields(values).themePhrases,
      lightPalette: lightPalette,
      darkPalette: darkPalette,
      currentMode: localStorage.getItem(StorageKeys.theme) || 'light',
    },
    // Saved sets travel with the profile (readSavedSets drops bad entries).
    savedSets: serializeSavedSets(readSavedSets()),
  };

  const dataStr = JSON.stringify(profileData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  await saveBlob(
    dataBlob,
    `profile-backup-${new Date().toISOString().split('T')[0]}.json`
  );
}
