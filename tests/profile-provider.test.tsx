import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProfileProvider,
  useProfile,
  useStorePhone,
  useStoreName,
  useStoreLocation,
  useEmployeeName,
  useJobTitle,
  useCompanyEmail,
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

function EmployeeNameConsumer() {
  const name = useEmployeeName();
  return <span data-testid="employee-name">{name}</span>;
}

function JobTitleConsumer() {
  const title = useJobTitle();
  return <span data-testid="job-title">{title}</span>;
}

function CompanyEmailConsumer() {
  const email = useCompanyEmail();
  return <span data-testid="company-email">{email}</span>;
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
      <EmployeeNameConsumer />
      <JobTitleConsumer />
      <CompanyEmailConsumer />
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
      employeeName: 'John Doe',
      jobTitle: 'Sales Associate',
      storePhone: '555-1234',
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));

    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    );

    const rendered = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(rendered.employeeName).toBe('John Doe');
    expect(rendered.jobTitle).toBe('Sales Associate');
    expect(rendered.storePhone).toBe('555-1234');
  });

  it('saves profile to localStorage and updates context', async () => {
    function SaveAndShow() {
      const { profile } = useProfile();
      return (
        <div>
          <span data-testid="profile">{JSON.stringify(profile)}</span>
          <SaveButton profile={{ employeeName: 'Jane', storePhone: '555-9999' }} />
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
    expect(rendered.employeeName).toBe('Jane');
    expect(rendered.storePhone).toBe('555-9999');
    expect(localStorage.getItem('userProfile')).toContain('Jane');
  });

  it('clears profile from localStorage and context', async () => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ employeeName: 'Existing' })
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
    expect(JSON.parse(screen.getByTestId('profile').textContent!).employeeName).toBe('Existing');

    await userEvent.click(screen.getByTestId('clear-btn'));

    // Profile should be null
    expect(screen.getByTestId('profile').textContent).toBe('null');
    expect(localStorage.getItem('userProfile')).toBeNull();
  });

  it('overwrites existing profile on save', async () => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ employeeName: 'First' })
    );

    function SaveAndShow() {
      const { profile } = useProfile();
      return (
        <div>
          <span data-testid="profile">{JSON.stringify(profile)}</span>
          <SaveButton profile={{ employeeName: 'Second' }} />
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
    expect(rendered.employeeName).toBe('Second');
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
    it('returns default when no profile', () => {
      render(
        <ProfileProvider>
          <StorePhoneConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('phone').textContent).toBe('702-357-8990');
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

      expect(screen.getByTestId('phone').textContent).toBe('702-357-8990');

      await userEvent.click(screen.getByTestId('save-btn'));

      expect(screen.getByTestId('phone').textContent).toBe('999-8888');
    });
  });

  describe('useStoreName', () => {
    it('returns default when no profile', () => {
      render(
        <ProfileProvider>
          <StoreNameConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-name').textContent).toBe(
        'Citizen Company Store'
      );
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
    it('returns default when no profile', () => {
      render(
        <ProfileProvider>
          <StoreLocationConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('location').textContent).toBe(
        'the South Premium Outlets'
      );
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

  describe('useEmployeeName', () => {
    it('returns default when no profile', () => {
      render(
        <ProfileProvider>
          <EmployeeNameConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('employee-name').textContent).toBe('Your Name');
    });

    it('returns stored name', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ employeeName: 'Jane' })
      );
      render(
        <ProfileProvider>
          <EmployeeNameConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('employee-name').textContent).toBe('Jane');
    });
  });

  describe('useJobTitle', () => {
    it('returns default when no profile', () => {
      render(
        <ProfileProvider>
          <JobTitleConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('job-title').textContent).toBe('Sales Associate');
    });

    it('returns stored title', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ jobTitle: 'General Manager' })
      );
      render(
        <ProfileProvider>
          <JobTitleConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('job-title').textContent).toBe('General Manager');
    });
  });

  describe('useCompanyEmail', () => {
    it('returns empty string when no profile', () => {
      render(
        <ProfileProvider>
          <CompanyEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('company-email').textContent).toBe('');
    });

    it('returns stored company email', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ companyEmail: 'admin@company.com' })
      );
      render(
        <ProfileProvider>
          <CompanyEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('company-email').textContent).toBe(
        'admin@company.com'
      );
    });
  });

  describe('useStoreEmail', () => {
    it('returns default when no profile', () => {
      render(
        <ProfileProvider>
          <StoreEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-email').textContent).toBe(
        'store@citizenwatchgroup.com'
      );
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

    it('derives email from store name when no store email set', () => {
      localStorage.setItem(
        'userProfile',
        JSON.stringify({ storeName: 'My Store' })
      );
      render(
        <ProfileProvider>
          <StoreEmailConsumer />
        </ProfileProvider>
      );
      expect(screen.getByTestId('store-email').textContent).toBe(
        'mystore@citizenwatchgroup.com'
      );
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
        JSON.stringify({ employeeName: 'Test' })
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
        JSON.stringify({ employeeName: 'Test' })
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
                employeeName: 'John Doe',
                jobTitle: 'General Manager',
                storePhone: '555-1234',
                storeName: 'My Store',
                storeLocation: 'the North Mall',
                companyEmail: 'john@company.com',
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
    expect(screen.getByTestId('phone').textContent).toBe('702-357-8990');
    expect(screen.getByTestId('store-name').textContent).toBe('Citizen Company Store');
    expect(screen.getByTestId('location').textContent).toBe('the South Premium Outlets');
    expect(screen.getByTestId('employee-name').textContent).toBe('Your Name');
    expect(screen.getByTestId('job-title').textContent).toBe('Sales Associate');
    expect(screen.getByTestId('company-email').textContent).toBe('');
    expect(screen.getByTestId('store-email').textContent).toBe('store@citizenwatchgroup.com');
    expect(screen.getByTestId('has-profile').textContent).toBe('false');

    await userEvent.click(screen.getByTestId('save-btn'));

    // After save - all updated
    expect(screen.getByTestId('phone').textContent).toBe('555-1234');
    expect(screen.getByTestId('store-name').textContent).toBe('My Store');
    expect(screen.getByTestId('location').textContent).toBe('the North Mall');
    expect(screen.getByTestId('employee-name').textContent).toBe('John Doe');
    expect(screen.getByTestId('job-title').textContent).toBe('General Manager');
    expect(screen.getByTestId('company-email').textContent).toBe('john@company.com');
    expect(screen.getByTestId('store-email').textContent).toBe('store@company.com');
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
      JSON.stringify({ employeeName: 'External User' })
    );

    await userEvent.click(screen.getByTestId('reload-btn'));

    expect(JSON.parse(screen.getByTestId('profile').textContent!).employeeName).toBe('External User');
  });
});
