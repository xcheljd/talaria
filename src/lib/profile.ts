/**
 * Profile Data Access Layer
 * Centralized access to user profile data stored in localStorage.
 */

import { StorageKeys } from '@/lib/storage-keys';

/** A single brand/website link shown in the email signature footer. */
export interface BrandLink {
  name: string;
  url: string;
}

/** User profile shape */
export interface UserProfile {
  employeeName?: string;
  jobTitle?: string;
  companyEmail?: string;
  /** Parent company / brand name shown in signatures (e.g. "Acme Inc."). */
  companyName?: string;
  storeName?: string;
  storeLocation?: string;
  storeAddress?: string;
  storePlusCode?: string;
  storePhone?: string;
  storeEmail?: string;
  storeHours?: string;
  storeDirections?: string;
  /** Brand/website links rendered in the signature footer. */
  brandLinks?: BrandLink[];
  /** What the brand sells, singular (e.g. "watch", "candle"). Default "product". */
  productNoun?: string;
  /** Plural product noun (e.g. "watches"). Default "products". */
  productNounPlural?: string;
  /** Brand names featured in generated subject lines (e.g. "Acme", "Zenith"). */
  brandKeywords?: string[];
  /** Collection names featured in generated subject lines (e.g. "Aria", "Volt"). */
  collectionKeywords?: string[];
}

/** Signature data extracted from profile */
export interface SignatureData {
  name: string;
  title: string;
  companyName: string;
  storeName: string;
  location: string;
  address: string;
  phone: string;
  jobTitle: string;
  companyEmail: string;
  storeEmail: string;
  brandLinks: BrandLink[];
}

// ─── Neutral defaults ───────────────────────────────────────────────────────
// These fallbacks are intentionally brand-agnostic so the app ships ready for
// any company. Real values come from the profile saved on the Settings page.

export const DEFAULT_COMPANY_NAME = 'Your Company';
export const DEFAULT_STORE_NAME = 'Your Store';
export const DEFAULT_PRODUCT_NOUN = 'product';
export const DEFAULT_PRODUCT_NOUN_PLURAL = 'products';

/**
 * Get the complete user profile from localStorage.
 * @returns User profile object or null if not set
 */
export function getUserProfile(): UserProfile | null {
  const stored = localStorage.getItem(StorageKeys.userProfile);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    console.warn('Stored user profile is corrupted; ignoring it');
    return null;
  }
}

/**
 * Save user profile to localStorage.
 */
export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(StorageKeys.userProfile, JSON.stringify(profile));
}

/**
 * Get store phone number (empty when unset).
 */
export function getStorePhone(): string {
  const profile = getUserProfile();
  return profile?.storePhone || '';
}

/**
 * Get company / brand name with neutral fallback default.
 */
export function getCompanyName(): string {
  const profile = getUserProfile();
  return profile?.companyName || DEFAULT_COMPANY_NAME;
}

/**
 * Get store name with neutral fallback default.
 */
export function getStoreName(): string {
  const profile = getUserProfile();
  return profile?.storeName || DEFAULT_STORE_NAME;
}

/**
 * Get store location (empty when unset).
 */
export function getStoreLocation(): string {
  const profile = getUserProfile();
  return profile?.storeLocation || '';
}

/**
 * Get full store location ("<Store Name> at <location>"). Falls back to just
 * the store name when no location has been provided.
 */
export function getFullStoreLocation(): string {
  const location = getStoreLocation();
  const storeName = getStoreName();
  return location ? `${storeName} at ${location}` : storeName;
}

/**
 * Get store address (empty when unset).
 */
export function getStoreAddress(): string {
  const profile = getUserProfile();
  return profile?.storeAddress || '';
}

/**
 * Get store email (empty when unset).
 */
export function getStoreEmail(): string {
  const profile = getUserProfile();
  return profile?.storeEmail || '';
}

/**
 * Get company email with fallback default (empty string).
 */
export function getCompanyEmail(): string {
  const profile = getUserProfile();
  return profile?.companyEmail || '';
}

/**
 * Get store hours with generic fallback default.
 */
export function getStoreHours(): string {
  const profile = getUserProfile();
  return profile?.storeHours || 'Mon-Sat: 10AM-8PM, Sun: 11AM-7PM';
}

/**
 * Get store Plus Code (empty when unset).
 */
export function getStorePlusCode(): string {
  const profile = getUserProfile();
  return profile?.storePlusCode || '';
}

/**
 * Get the singular product noun with neutral fallback (e.g. "watch").
 */
export function getProductNoun(): string {
  const profile = getUserProfile();
  return profile?.productNoun?.trim() || DEFAULT_PRODUCT_NOUN;
}

/**
 * Get the plural product noun with neutral fallback (e.g. "watches").
 */
export function getProductNounPlural(): string {
  const profile = getUserProfile();
  return profile?.productNounPlural?.trim() || DEFAULT_PRODUCT_NOUN_PLURAL;
}

/**
 * Get the configured signature brand links (empty when none set).
 */
export function getBrandLinks(): BrandLink[] {
  const profile = getUserProfile();
  return profile?.brandLinks ?? [];
}

/**
 * Get the brand keywords featured in subject-line suggestions.
 */
export function getBrandKeywords(): string[] {
  const profile = getUserProfile();
  return profile?.brandKeywords ?? [];
}

/**
 * Get the collection keywords featured in subject-line suggestions.
 */
export function getCollectionKeywords(): string[] {
  const profile = getUserProfile();
  return profile?.collectionKeywords ?? [];
}

/**
 * Get directions to store.
 */
export function getDirections(): string {
  const profile = getUserProfile();
  return profile?.storeDirections || '';
}

/**
 * Get employee name with fallback default.
 */
export function getEmployeeName(): string {
  const profile = getUserProfile();
  return profile?.employeeName || 'Your Name';
}

/**
 * Get employee job title with fallback default.
 */
export function getJobTitle(): string {
  const profile = getUserProfile();
  return profile?.jobTitle || 'Sales Associate';
}

/**
 * Extract signature data from user profile with fallbacks.
 * Centralized here so signature.ts doesn't need appState.
 */
export function extractSignatureData(): SignatureData {
  const profile = getUserProfile() || {};

  return {
    name: profile.employeeName || 'Employee Name',
    title: profile.jobTitle || 'Sales Associate',
    companyName: profile.companyName || DEFAULT_COMPANY_NAME,
    storeName: profile.storeName || DEFAULT_STORE_NAME,
    location: profile.storeLocation || '',
    address: profile.storeAddress || '',
    phone: profile.storePhone || '',
    jobTitle: (profile.jobTitle || '').toLowerCase(),
    companyEmail: profile.companyEmail || '',
    storeEmail: profile.storeEmail || '',
    brandLinks: profile.brandLinks ?? [],
  };
}

/**
 * Check if profile has been set up.
 */
export function hasProfile(): boolean {
  return getUserProfile() !== null;
}
