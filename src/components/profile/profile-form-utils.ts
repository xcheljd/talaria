/**
 * Shared helpers for the profile settings form.
 *
 * Both the page (on save) and the JSON export path need to turn the
 * comma-separated keyword inputs into arrays, so the helper lives here rather
 * than in either consumer.
 */

import type { ProfileFormValues } from '@/lib/profile-validation';
import { saveBlob } from '@/lib/file-save';
import { StorageKeys } from '@/lib/storage-keys';

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
      employeeName: values.employeeName?.trim() || '',
      jobTitle: values.jobTitle?.trim() || '',
      companyEmail: values.companyEmail?.trim() || '',
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
      brandLinks: (values.brandLinks ?? [])
        .map((link) => ({ name: link.name.trim(), url: link.url.trim() }))
        .filter((link) => link.name && link.url),
      brandKeywords: toKeywordList(values.brandKeywords),
      collectionKeywords: toKeywordList(values.collectionKeywords),
      lightPalette: lightPalette,
      darkPalette: darkPalette,
      currentMode: localStorage.getItem(StorageKeys.theme) || 'light',
    },
  };

  const dataStr = JSON.stringify(profileData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  await saveBlob(
    dataBlob,
    `profile-backup-${new Date().toISOString().split('T')[0]}.json`
  );
}
