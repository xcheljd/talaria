/**
 * Profile Data Access Layer
 * Centralized access to user profile data stored in localStorage.
 * Migrated from src/js/shared/profile.js
 */

/** User profile shape */
export interface UserProfile {
  employeeName?: string;
  jobTitle?: string;
  companyEmail?: string;
  storeName?: string;
  storeLocation?: string;
  storeAddress?: string;
  storePlusCode?: string;
  storePhone?: string;
  storeEmail?: string;
  storeHours?: string;
  storeDirections?: string;
}

/** Signature data extracted from profile */
export interface SignatureData {
  name: string;
  title: string;
  location: string;
  address: string;
  phone: string;
  jobTitle: string;
  companyEmail: string;
  storeEmail: string;
}

/**
 * Get the complete user profile from localStorage.
 * @returns User profile object or null if not set
 */
export function getUserProfile(): UserProfile | null {
  const stored = localStorage.getItem('userProfile');
  return stored ? (JSON.parse(stored) as UserProfile) : null;
}

/**
 * Save user profile to localStorage.
 */
export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem('userProfile', JSON.stringify(profile));
}

/**
 * Get store phone number with fallback default.
 */
export function getStorePhone(): string {
  const profile = getUserProfile();
  return profile?.storePhone || '702-357-8990';
}

/**
 * Get store name with fallback default.
 */
export function getStoreName(): string {
  const profile = getUserProfile();
  return profile?.storeName || 'Citizen Company Store';
}

/**
 * Get store location with fallback default.
 */
export function getStoreLocation(): string {
  const profile = getUserProfile();
  return profile?.storeLocation || 'the South Premium Outlets';
}

/**
 * Get full store location (with "Citizen Company Store at" prefix).
 */
export function getFullStoreLocation(): string {
  return `Citizen Company Store at ${getStoreLocation()}`;
}

/**
 * Get store address with fallback default.
 */
export function getStoreAddress(): string {
  const profile = getUserProfile();
  return (
    profile?.storeAddress || '7400 Las Vegas Blvd S #46, Las Vegas, NV 89123'
  );
}

/**
 * Get store email with fallback default.
 * If no store email is set, derives from store name.
 */
export function getStoreEmail(): string {
  const profile = getUserProfile();
  if (profile?.storeEmail) {
    return profile.storeEmail;
  } else if (profile?.storeName) {
    const emailPrefix = profile.storeName.toLowerCase().replace(/\s+/g, '');
    return `${emailPrefix}@citizenwatchgroup.com`;
  } else {
    return 'store@citizenwatchgroup.com';
  }
}

/**
 * Get company email with fallback default (empty string).
 */
export function getCompanyEmail(): string {
  const profile = getUserProfile();
  return profile?.companyEmail || '';
}

/**
 * Get store hours with fallback default.
 */
export function getStoreHours(): string {
  const profile = getUserProfile();
  return profile?.storeHours || 'Mon-Sat: 10AM-8PM, Sun: 11AM-7PM';
}

/**
 * Get store Plus Code with fallback default.
 */
export function getStorePlusCode(): string {
  const profile = getUserProfile();
  return profile?.storePlusCode || '8CQQ9C3P+85';
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
    location: profile.storeLocation || 'the South Premium Outlets',
    address: profile.storeAddress || '',
    phone: profile.storePhone || '702-357-8990',
    jobTitle: (profile.jobTitle || '').toLowerCase(),
    companyEmail: profile.companyEmail || '',
    storeEmail: profile.storeEmail || '',
  };
}

/**
 * Check if profile has been set up.
 */
export function hasProfile(): boolean {
  return getUserProfile() !== null;
}
