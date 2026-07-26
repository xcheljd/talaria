/**
 * Tests for ProfileSettingsPage React component.
 * Uses @testing-library/react to verify rendering, validation, and interactions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProfileSettingsPage } from '@/pages/ProfileSettingsPage';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';

// Mock Radix Select / Radix primitives for jsdom
beforeEach(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Helpers

function renderPage(initialProfile?: Record<string, string>) {
  if (initialProfile) {
    localStorage.setItem('userProfile', JSON.stringify(initialProfile));
  }

  return render(
    <ThemeProvider>
      <ProfileProvider>
        <BrowserRouter>
          <ProfileSettingsPage />
        </BrowserRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

/**
 * Helper to select an option from a Radix shadcn Select component.
 * Radix Select renders both a hidden native select (with <option> elements)
 * and a portal-based listbox. This helper finds the correct option in the
 * portal (the last matching role="option").
 */
async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  optionText: string
) {
  await user.click(trigger);
  const options = await screen.findAllByRole('option', { name: optionText });
  // Click the last match (the visible portal option, not the hidden native one)
  await user.click(options[options.length - 1]);
}

// Tests

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // Rendering

  it('renders the profile form with all fields', () => {
    renderPage();

    // Sidebar heading + brand
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText('Talaria')).toBeTruthy();

    // Check all field labels (some appear in multiple elements)
    expect(screen.getAllByText(/Your Name/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Job Title/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Name/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Location/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Address/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Google Plus Code/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Phone/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Email/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Hours/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Store Directions/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the preferences section with palette selectors', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    expect(screen.getByText(/Light Mode Color Palette/i)).toBeTruthy();
    expect(screen.getByText(/Dark Mode Color Palette/i)).toBeTruthy();
    expect(screen.getByText(/Download Folder \(Desktop app\)/i)).toBeTruthy();
  });

  it('renders action buttons', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Save/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Import/i })).toBeTruthy();
  });

  it('does not show company email field initially', () => {
    renderPage();

    // The Company Email label should NOT be present when no management title is selected
    const companyEmailLabels = screen.queryAllByText(/^Company Email/);
    expect(companyEmailLabels.length).toBe(0);
  });

  // Company Email Toggle

  it('shows company email field when management title is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    const jobTitleTrigger = screen.getByRole('combobox', { name: /Job Title/i });
    await selectOption(user, jobTitleTrigger, 'General Manager');

    // Company email field should now be visible
    await waitFor(() => {
      const companyEmailLabels = screen.queryAllByText(/^Company Email/);
      expect(companyEmailLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('hides company email field when switching back to non-management title', async () => {
    const user = userEvent.setup();
    renderPage();

    // First select a management title
    const jobTitleTrigger = screen.getByRole('combobox', { name: /Job Title/i });
    await selectOption(user, jobTitleTrigger, 'General Manager');

    await waitFor(() => {
      expect(screen.queryAllByText(/^Company Email/).length).toBeGreaterThanOrEqual(1);
    });

    // Then switch to non-management
    await selectOption(user, jobTitleTrigger, 'Sales Associate');

    await waitFor(() => {
      expect(screen.queryAllByText(/^Company Email/).length).toBe(0);
    });
  });

  // Validation

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderPage();

    const submitButton = screen.getByRole('button', { name: /Save/i });
    await user.click(submitButton);

    // Zod validation should trigger errors for required fields
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/is required/i);
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Profile Pre-fill

  it('pre-fills form with saved profile data', () => {
    renderPage({
      employeeName: 'John Smith',
      jobTitle: 'Sales Associate',
      storeName: 'Acme Company Store - Orlando',
      storeLocation: 'the Orlando Premium Outlets',
      storePhone: '555-123-4567',
      storeEmail: 'orlando@example.com',
      storeHours: 'Mon-Sat: 10AM-8PM | Sun: 10AM-7PM',
    });

    const nameInput = screen.getByPlaceholderText(/John Smith/i) as HTMLInputElement;
    expect(nameInput.value).toBe('John Smith');
  });

  // Save

  it('saves profile to localStorage on valid submit', async () => {
    const user = userEvent.setup();
    renderPage();

    // Fill in required fields
    const nameInput = screen.getByPlaceholderText(/John Smith/i);
    await user.type(nameInput, 'Jane Doe');

    // Select job title using helper
    const jobTitleTrigger = screen.getByRole('combobox', { name: /Job Title/i });
    await selectOption(user, jobTitleTrigger, 'Sales Associate');

    const companyNameInput = screen.getByPlaceholderText(/Acme Inc\./i);
    await user.type(companyNameInput, 'Acme Inc.');

    const storeNameInput = screen.getByPlaceholderText(/Acme Store - Orlando/i);
    await user.type(storeNameInput, 'Acme Store');

    const storeLocationInput = screen.getByPlaceholderText(/the Downtown Shopping Center/i);
    await user.type(storeLocationInput, 'the Mall');

    const storePhoneInput = screen.getByPlaceholderText(/555-123-4567/i);
    await user.type(storePhoneInput, '5551234567');

    const storeEmailInput = screen.getByPlaceholderText(/store@company.com/i);
    await user.type(storeEmailInput, 'store@acme.com');

    // Submit
    const submitButton = screen.getByRole('button', { name: /Save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Profile saved successfully/i)).toBeTruthy();
    });

    // Check localStorage
    const saved = JSON.parse(localStorage.getItem('userProfile') || '{}');
    expect(saved.employeeName).toBe('Jane Doe');
    expect(saved.storeName).toBe('Acme Store');
    expect(saved.companyName).toBe('Acme Inc.');
  });

  // Export

  it('exports profile as JSON file', async () => {
    const user = userEvent.setup();
    const createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLSpy = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

    renderPage({
      employeeName: 'Test User',
      jobTitle: 'Sales Associate',
      storeName: 'Test Store',
      storeLocation: 'the Test Location',
      storePhone: '5551234567',
      storeEmail: 'test@store.com',
      storeHours: 'Mon-Sat: 10AM-8PM',
    });

    const exportButton = screen.getByRole('button', { name: /Export/i });
    await user.click(exportButton);

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  // Import Dialog

  it('opens import dialog when Import button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    const importButton = screen.getByRole('button', { name: /Import/i });
    await user.click(importButton);

    await waitFor(() => {
      expect(screen.getByText('Import Profile')).toBeTruthy();
      expect(screen.getByText(/Select a JSON file/i)).toBeTruthy();
    });
  });

  // Download Folder

  it('shows desktop app only message when not in Tauri', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    expect(screen.getByText(/Desktop app only/i)).toBeTruthy();
  });

  // Palette Selectors

  it('renders palette selectors with correct options', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    expect(screen.getByText(/Light Mode Color Palette/i)).toBeTruthy();
    expect(screen.getByText(/Dark Mode Color Palette/i)).toBeTruthy();
  });

  // Sync email preview with app theme

  it('sync-preview-theme switch defaults to on (linked)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    const sw = screen.getByTestId('sync-preview-theme-switch');
    expect(sw).toBeChecked();
  });

  it('toggling sync-preview-theme persists the choice to localStorage', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    const sw = screen.getByTestId('sync-preview-theme-switch');
    await user.click(sw);

    await waitFor(() => {
      expect(localStorage.getItem('preview.syncTheme')).toBe('false');
    });
    expect(sw).not.toBeChecked();
  });

  it('reflects a saved opt-out (off) on mount', async () => {
    localStorage.setItem('preview.syncTheme', 'false');
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    expect(screen.getByTestId('sync-preview-theme-switch')).not.toBeChecked();
  });
});
