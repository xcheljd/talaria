import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { StorageKeys } from '@/lib/storage-keys';
import {
  getUserProfile,
  saveUserProfile as persistProfile,
  getStorePhone as getStorePhoneUtil,
  getStoreName as getStoreNameUtil,
  getStoreLocation as getStoreLocationUtil,
  getEmployeeName as getEmployeeNameUtil,
  getJobTitle as getJobTitleUtil,
  getCompanyEmail as getCompanyEmailUtil,
  getStoreEmail as getStoreEmailUtil,
  getCompanyName as getCompanyNameUtil,
  getProductNoun as getProductNounUtil,
  getProductNounPlural as getProductNounPluralUtil,
  getBrandLinks as getBrandLinksUtil,
  getBrandKeywords as getBrandKeywordsUtil,
  getCollectionKeywords as getCollectionKeywordsUtil,
  hasProfile as hasProfileUtil,
  DEFAULT_COMPANY_NAME,
  DEFAULT_STORE_NAME,
  DEFAULT_PRODUCT_NOUN,
  DEFAULT_PRODUCT_NOUN_PLURAL,
  type UserProfile,
  type BrandLink,
} from '@/lib/profile';

// ─── Context Value Interface ──────────────────────────────────────────────────

interface ProfileContextValue {
  profile: UserProfile | null;
  saveProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  /** Re-read profile from localStorage (useful for cross-tab sync) */
  reloadProfile: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    getUserProfile()
  );

  const saveProfile = useCallback((newProfile: UserProfile) => {
    persistProfile(newProfile);
    setProfile(newProfile);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(StorageKeys.userProfile);
    setProfile(null);
  }, []);

  const reloadProfile = useCallback(() => {
    setProfile(getUserProfile());
  }, []);

  return (
    <ProfileContext.Provider
      value={{ profile, saveProfile, clearProfile, reloadProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

// ─── Internal hook (shared validation) ────────────────────────────────────────

function useProfileContext(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('Profile hooks must be used within a ProfileProvider');
  }
  return context;
}

/**
 * Access the full profile context: profile data, save, clear, reload.
 * Must be used within a ProfileProvider.
 */
export function useProfile(): ProfileContextValue {
  return useProfileContext();
}

/**
 * Get store phone number (empty when unset).
 */
export function useStorePhone(): string {
  const { profile } = useProfileContext();
  return profile?.storePhone || '';
}

/**
 * Get company / brand name with neutral fallback default.
 */
export function useCompanyName(): string {
  const { profile } = useProfileContext();
  return profile?.companyName || DEFAULT_COMPANY_NAME;
}

/**
 * Get store name with neutral fallback default.
 */
export function useStoreName(): string {
  const { profile } = useProfileContext();
  return profile?.storeName || DEFAULT_STORE_NAME;
}

/**
 * Get store location (empty when unset).
 */
export function useStoreLocation(): string {
  const { profile } = useProfileContext();
  return profile?.storeLocation || '';
}

/**
 * Get the singular product noun with neutral fallback (e.g. "watch").
 */
export function useProductNoun(): string {
  const { profile } = useProfileContext();
  return profile?.productNoun?.trim() || DEFAULT_PRODUCT_NOUN;
}

/**
 * Get the plural product noun with neutral fallback (e.g. "watches").
 */
export function useProductNounPlural(): string {
  const { profile } = useProfileContext();
  return profile?.productNounPlural?.trim() || DEFAULT_PRODUCT_NOUN_PLURAL;
}

/**
 * Get the configured signature brand links (empty when none set).
 */
export function useBrandLinks(): BrandLink[] {
  const { profile } = useProfileContext();
  return profile?.brandLinks ?? [];
}

/**
 * Get the brand keywords featured in subject-line suggestions.
 */
export function useBrandKeywords(): string[] {
  const { profile } = useProfileContext();
  return profile?.brandKeywords ?? [];
}

/**
 * Get the collection keywords featured in subject-line suggestions.
 */
export function useCollectionKeywords(): string[] {
  const { profile } = useProfileContext();
  return profile?.collectionKeywords ?? [];
}

/**
 * Get employee name with fallback default.
 */
export function useEmployeeName(): string {
  const { profile } = useProfileContext();
  return profile?.employeeName || 'Your Name';
}

/**
 * Get employee job title with fallback default.
 */
export function useJobTitle(): string {
  const { profile } = useProfileContext();
  return profile?.jobTitle || 'Sales Associate';
}

/**
 * Get company email with fallback (empty string).
 */
export function useCompanyEmail(): string {
  const { profile } = useProfileContext();
  return profile?.companyEmail || '';
}

/**
 * Get store email (empty when unset).
 */
export function useStoreEmail(): string {
  const { profile } = useProfileContext();
  return profile?.storeEmail || '';
}

/**
 * Check if a user profile has been set up.
 */
export function useHasProfile(): boolean {
  const { profile } = useProfileContext();
  return profile !== null;
}

// Re-export the utility functions for non-React contexts
export {
  getStorePhoneUtil as getStorePhone,
  getStoreNameUtil as getStoreName,
  getStoreLocationUtil as getStoreLocation,
  getEmployeeNameUtil as getEmployeeName,
  getJobTitleUtil as getJobTitle,
  getCompanyEmailUtil as getCompanyEmail,
  getStoreEmailUtil as getStoreEmail,
  getCompanyNameUtil as getCompanyName,
  getProductNounUtil as getProductNoun,
  getProductNounPluralUtil as getProductNounPlural,
  getBrandLinksUtil as getBrandLinks,
  getBrandKeywordsUtil as getBrandKeywords,
  getCollectionKeywordsUtil as getCollectionKeywords,
  hasProfileUtil as hasProfile,
};
