import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProfileProvider,
  useProfile,
  useStorePhone,
  useStoreName,
  useStoreLocation,
  useStoreEmail,
  useHasProfile,
} from '../src/contexts/ProfileProvider';
import type { UserProfile } from '../src/lib/profile';

// ─── Helper Consumers ─────────────────────────────────────────────────────────

function ProfileConsumer() {
  const { profile } = useProfile();
  return <span data-testid="profile">{JSON.stringify(profile)}</span>;
}

function StorePhoneConsumer() {
  const phone = useStorePhone();
  return <span data-testid="phone">{phone}</span>;
}

function StoreNameConsumer() {
  const name = useStoreName();
  return <span data-testid="store-name">{name}</span>;
}

function StoreLocationConsumer() {
  const location = useStoreLocation();
  return <span data-testid="location">{location}</span>;
}

function StoreEmailConsumer() {
  const email = useStoreEmail();
  return <span data-testid="store-email">{email}</span>;
}

function HasProfileConsumer() {
  const has = useHasProfile();
  return <span data-testid="has-profile">{has ? 'true' : 'false'}</span>;
}

function SaveButton({ profile }: { profile: UserProfile }) {
  const { saveProfile } = useProfile();
  return (
    <button data-testid="save-btn" onClick={() => saveProfile(profile)}>
      Save
    </button>
  );
}

function ClearButton() {
  const { clearProfile } = useProfile();
  return (
    <button data-testid="clear-btn" onClick={() => clearProfile()}>
      Clear
    </button>
  );
}

function AllHooksConsumer() {
  const { profile } = useProfile();
  return (
    <div>
      <span data-testid="profile">{JSON.stringify(profile)}</span>
      <StorePhoneConsumer />
      <StoreNameConsumer />
      <StoreLocationConsumer />
      <StoreEmailConsumer />
      <HasProfileConsumer />
    </div>
  );
}

// ─── useProfile hook ──────────────────────────────────────────────────────────

describe('ProfileProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides null profile when no saved profile', () => {
    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    );
    expect(screen.getByTestId('profile').textContent).toBe('null');
  });

  it('loads saved profile from localStorage', () => {
    const profile: UserProfile = {
      storeDirections: 'John Doe',
      storePhone: '555-1234',
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));

    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    );

    const rendered = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(rendered.storeDirections).toBe('John Doe');
    expect(rendered.storePhone).toBe('555-1234');
  });

  it('saves profile to localStorage and updates context', async () => {
    function SaveAndShow() {
      const { profile } = useProfile();
      return (
        <div>
          <span data-testid="profile">{JSON.stringify(profile)}</span>
          <SaveButton
            profile={{ storeDirections: 'Jane', storePhone: '555-9999' }}
          />
        </div>
      );
    }

    render(
      <ProfileProvider>
        <SaveAndShow />
      </ProfileProvider>
    );

    expect(screen.getByTestId('profile').textContent).toBe('null');

    await userEvent.click(screen.getByTestId('save-btn'));

    const rendered = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(rendered.storeDirections).toBe('Jane');
    expect(rendered.storePhone).toBe('555-9999');
    expect(localStorage.getItem('userProfile')).toContain('Jane');
  });

  it('clears profile from localStorage and context', async () => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ storeDirections: 'Existing' })
    );

    function ShowAndClear() {
      const { profile } = useProfile();
      return (
        <div>
          <span data-testid="profile">{JSON.stringify(profile)}</span>
          <ClearButton />
        </div>
      );
    }

    render(
      <ProfileProvider>
        <ShowAndClear />
      </ProfileProvider>
    );

    // Profile should be loaded
    expect(
      JSON.parse(screen.getByTestId('profile').textContent!).storeDirections
    ).toBe('Existing');

    await userEvent.click(screen.getByTestId('clear-btn'));

    // Profile should be null
    expect(screen.getByTestId('profile').textContent).toBe('null');
    expect(localStorage.getItem('userProfile')).toBeNull();
  });

  it('overwrites existing profile on save', async () => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ storeDirections: 'First' })
    );

    function SaveAndShow() {
      const { profile } = useProfile();
      return (
        <div>
          <span data-testid="profile">{JSON.stringify(profile)}</span>
          <SaveButton profile={{ storeDirections: 'Second' }} />
        </div>
      );
    }

    render(
      <ProfileProvider>
        <SaveAndShow />
      </ProfileProvider>
    );

    await userEvent.click(screen.getByTestId('save-btn'));

    const rendered = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(rendered.storeDirections).toBe('Second');
    expect(localStorage.getItem('userProfile')).toContain('Second');
  });

  it('throws when useProfile is used outside ProfileProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useProfile();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      /Profile hooks must be used within a ProfileProvider/
    );

    spy.mockRestore();
  });

  it('throws when useStorePhone is used outside ProfileProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useStorePhone();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      /Profile hooks must be used within a ProfileProvider/
    );

    spy.mockRestore();
  });
});

// ─── Convenience hooks ────────────────────────────────────────────────────────

describe('Profile convenience hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('useStorePhone', () => {
    it('returns empty string when no profile', () => {
      render(
        <ProfileProvider>
          <StorePhoneConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('phone').textContent).toBe('');
    });

    it('returns stored phone', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storePhone: '555-0000' })
      );
      render(
        <ProfileProvider>
          <StorePhoneConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('phone').textContent).toBe('555-0000');
    });

    it('updates after save', async () => {
      function PhoneWithSave() {
        const phone = useStorePhone();
        const { saveProfile } = useProfile();
        return (
          <div>
            <span data-testid="phone">{phone}</span>
            <button
              data-testid="save-btn"
              onClick={() => saveProfile({ storePhone: '999-8888' })}
            >
              Save
            </button>
          </div>
        );
      }

      render(
        <ProfileProvider>
          <PhoneWithSave />
        </ProfileProvider>
      );

      expect(screen.getByTestId('phone').textContent).toBe('');

      await userEvent.click(screen.getByTestId('save-btn'));

      expect(screen.getByTestId('phone').textContent).toBe('999-8888');
    });
  });

  describe('useStoreName', () => {
    it('returns neutral default when no profile', () => {
      render(
        <ProfileProvider>
          <StoreNameConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-name').textContent).toBe('Your Store');
    });

    it('returns stored name', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeName: 'Test Store' })
      );
      render(
        <ProfileProvider>
          <StoreNameConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-name').textContent).toBe('Test Store');
    });
  });

  describe('useStoreLocation', () => {
    it('returns empty string when no profile', () => {
      render(
        <ProfileProvider>
          <StoreLocationConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('location').textContent).toBe('');
    });

    it('returns stored location', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeLocation: 'the Mall' })
      );
      render(
        <ProfileProvider>
          <StoreLocationConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('location').textContent).toBe('the Mall');
    });
  });

  describe('useStoreEmail', () => {
    it('returns empty string when no profile', () => {
      render(
        <ProfileProvider>
          <StoreEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-email').textContent).toBe('');
    });

    it('returns stored email', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeEmail: 'mystore@store.com' })
      );
      render(
        <ProfileProvider>
          <StoreEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-email').textContent).toBe(
        'mystore@store.com'
      );
    });

    it('returns empty string when no store email set', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeName: 'My Store' })
      );
      render(
        <ProfileProvider>
          <StoreEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-email').textContent).toBe('');
    });
  });

  describe('useHasProfile', () => {
    it('returns false when no profile', () => {
      render(
        <ProfileProvider>
          <HasProfileConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('has-profile').textContent).toBe('false');
    });

    it('returns true when profile exists', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeDirections: 'Test' })
      );
      render(
        <ProfileProvider>
          <HasProfileConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('has-profile').textContent).toBe('true');
    });

    it('returns false after clearing profile', async () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeDirections: 'Test' })
      );

      function HasProfileWithClear() {
        const has = useHasProfile();
        return (
          <div>
            <span data-testid="has-profile">{has ? 'true' : 'false'}</span>
            <ClearButton />
          </div>
        );
      }

      render(
        <ProfileProvider>
          <HasProfileWithClear />
        </ProfileProvider>
      );

      expect(screen.getByTestId('has-profile').textContent).toBe('true');

      await userEvent.click(screen.getByTestId('clear-btn'));

      expect(screen.getByTestId('has-profile').textContent).toBe('false');
    });
  });
});

// ─── All hooks together ───────────────────────────────────────────────────────

describe('All profile hooks together', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('all hooks update when profile is saved', async () => {
    function AllWithSave() {
      const { saveProfile } = useProfile();
      return (
        <div>
          <AllHooksConsumer />
          <button
            data-testid="save-btn"
            onClick={() =>
              saveProfile({
                storeDirections: 'John Doe',
                storePhone: '555-1234',
                storeName: 'My Store',
                storeLocation: 'the North Mall',
                storeEmail: 'store@company.com',
              })
            }
          >
            Save
          </button>
        </div>
      );
    }

    render(
      <ProfileProvider>
        <AllWithSave />
      </ProfileProvider>
    );

    // Before save - all defaults
    expect(screen.getByTestId('phone').textContent).toBe('');
    expect(screen.getByTestId('store-name').textContent).toBe('Your Store');
    expect(screen.getByTestId('location').textContent).toBe('');
    expect(screen.getByTestId('store-email').textContent).toBe('');
    expect(screen.getByTestId('has-profile').textContent).toBe('false');

    await userEvent.click(screen.getByTestId('save-btn'));

    // After save - all updated
    expect(screen.getByTestId('phone').textContent).toBe('555-1234');
    expect(screen.getByTestId('store-name').textContent).toBe('My Store');
    expect(screen.getByTestId('location').textContent).toBe('the North Mall');
    expect(screen.getByTestId('store-email').textContent).toBe(
      'store@company.com'
    );
    expect(screen.getByTestId('has-profile').textContent).toBe('true');
  });
});

// ─── Re-render behavior ───────────────────────────────────────────────────────

describe('ProfileProvider re-render behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reloadProfile re-reads from localStorage', async () => {
    function ReloadConsumer() {
      const { profile, reloadProfile } = useProfile();
      return (
        <div>
          <span data-testid="profile">{JSON.stringify(profile)}</span>
          <button data-testid="reload-btn" onClick={reloadProfile}>
            Reload
          </button>
        </div>
      );
    }

    render(
      <ProfileProvider>
        <ReloadConsumer />
      </ProfileProvider>
    );

    expect(screen.getByTestId('profile').textContent).toBe('null');

    // Simulate external change to localStorage (e.g., another tab)
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ storeDirections: 'External User' })
    );

    await userEvent.click(screen.getByTestId('reload-btn'));

    expect(
      JSON.parse(screen.getByTestId('profile').textContent!).storeDirections
    ).toBe('External User');
  });
});
