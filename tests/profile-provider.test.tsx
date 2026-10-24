import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProfileProvider,
  useProfile,
  useHasProfile,
} from '../src/contexts/ProfileProvider';
import type { UserProfile } from '../src/lib/profile';

// ─── Helper Consumers ─────────────────────────────────────────────────────────

function ProfileConsumer() {
  const { profile } = useProfile();
  return <span data-testid="profile">{JSON.stringify(profile)}</span>;
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

  it('throws when useHasProfile is used outside ProfileProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useHasProfile();
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
