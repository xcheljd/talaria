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
  hasProfile as hasProfileUtil,
  type UserProfile,
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
 * Get store phone number with fallback default.
 */
export function useStorePhone(): string {
  const { profile } = useProfileContext();
  return profile?.storePhone || '702-357-8990';
}

/**
 * Get store name with fallback default.
 */
export function useStoreName(): string {
  const { profile } = useProfileContext();
  return profile?.storeName || 'Citizen Company Store';
}

/**
 * Get store location with fallback default.
 */
export function useStoreLocation(): string {
  const { profile } = useProfileContext();
  return profile?.storeLocation || 'the South Premium Outlets';
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
 * Get store email with fallback derivation logic.
 */
export function useStoreEmail(): string {
  const { profile } = useProfileContext();
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
  hasProfileUtil as hasProfile,
};
