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
  DEFAULT_COMPANY_NAME,
  DEFAULT_PRODUCT_NOUN,
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
 * Get company / brand name with neutral fallback default.
 */
export function useCompanyName(): string {
  const { profile } = useProfileContext();
  return profile?.companyName || DEFAULT_COMPANY_NAME;
}

/**
 * Get the singular product noun with neutral fallback (e.g. "watch").
 */
export function useProductNoun(): string {
  const { profile } = useProfileContext();
  return profile?.productNoun?.trim() || DEFAULT_PRODUCT_NOUN;
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
 * Check if a user profile has been set up.
 */
export function useHasProfile(): boolean {
  const { profile } = useProfileContext();
  return profile !== null;
}
