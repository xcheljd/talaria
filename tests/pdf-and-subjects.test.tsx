/**
 * Tests for PDFAttachments and SubjectLineGenerator components.
 *
 * Tests cover:
 * - PDF drop zone renders and accepts file input
 * - PDF file validation and processing
 * - PDF list displays attached PDFs with name/size/remove
 * - PDF preview dialog opens and closes
 * - Subject line generation from promotion content
 * - Subject line dropdown selection
 * - Subject line editing with character count
 * - Regenerate button
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PDFAttachments } from '@/components/promotion/PDFAttachments';
import { SubjectLineGenerator } from '@/components/promotion/SubjectLineGenerator';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';


// Mock ResizeObserver for Radix components
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock IndexedDB functions
vi.mock('@/lib/db', () => ({
  savePDFToIndexedDB: vi.fn().mockResolvedValue('mock-id'),
  getPDFFromIndexedDB: vi.fn().mockResolvedValue(null),
  deletePDFFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  clearAllPDFsFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  initIndexedDB: vi.fn().mockResolvedValue(true),
}));

// ===== Test Helpers =====

function resetStore() {
  usePromotionStore.setState({
    promotionEntries: [],
    specialHours: [],
    howToShopItems: [],
    importantNotesItems: [],
    attachedPDFs: [],
    generatedSubjectLines: [],
    selectedSubjectLine: null,
    subjectLineManuallyEdited: false,
    entryCollapsedStates: {},
    columnState: 'left',
    isInitializing: false,
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// ===== PDFAttachments Tests =====

describe('PDFAttachments', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('renders the upload drop zone', () => {
    renderWithProviders(<PDFAttachments />);
    expect(
      screen.getByText('Click to upload or drag and drop PDF files')
    ).toBeInTheDocument();
  });

  it('renders the file size hint', () => {
    renderWithProviders(<PDFAttachments />);
    expect(screen.getByText('Maximum 10MB per file')).toBeInTheDocument();
  });

  it('renders a hidden file input', () => {
    renderWithProviders(<PDFAttachments />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toBe('.pdf,application/pdf');
    expect(input.multiple).toBe(true);
  });

  it('shows attached PDFs from the store', () => {
    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'catalog.pdf',
          size: 1024 * 512,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,SGVsbG8=',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    expect(screen.getByText('catalog.pdf')).toBeInTheDocument();
    expect(screen.getByText('512.0 KB')).toBeInTheDocument();
  });

  it('shows multiple attached PDFs', () => {
    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'catalog.pdf',
          size: 1024 * 100,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,SGVsbG8=',
        },
        {
          id: 'pdf-2',
          name: 'price-list.pdf',
          size: 1024 * 2048,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,V29ybGQ=',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    expect(screen.getByText('catalog.pdf')).toBeInTheDocument();
    expect(screen.getByText('price-list.pdf')).toBeInTheDocument();
    expect(screen.getByText('100.0 KB')).toBeInTheDocument();
    expect(screen.getByText('2.00 MB')).toBeInTheDocument();
  });

  it('renders remove buttons for each PDF', () => {
    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'catalog.pdf',
          size: 1024,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,SGVsbG8=',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    expect(
      screen.getByRole('button', { name: /remove catalog\.pdf/i })
    ).toBeInTheDocument();
  });

  it('removes PDF from store when remove button is clicked', async () => {
    const user = userEvent.setup();
    const { deletePDFFromIndexedDB } = await import('@/lib/db');

    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'catalog.pdf',
          size: 1024,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,SGVsbG8=',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    await user.click(
      screen.getByRole('button', { name: /remove catalog\.pdf/i })
    );

    expect(deletePDFFromIndexedDB).toHaveBeenCalledWith('pdf-1');
    expect(usePromotionStore.getState().attachedPDFs).toHaveLength(0);
  });

  it('opens preview dialog when PDF name is clicked', async () => {
    const user = userEvent.setup();

    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'catalog.pdf',
          size: 1024,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,SGVsbG8=',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    // The button's accessible name is "catalog.pdf" (text content)
    const pdfButton = screen.getByRole('button', { name: 'catalog.pdf' });
    await user.click(pdfButton);

    // Dialog should open - look for dialog content
    await waitFor(() => {
      const dialog = document.querySelector('[data-slot="dialog-content"]');
      expect(dialog).toBeInTheDocument();
    });

    // Should show download button in dialog
    expect(
      screen.getByRole('button', { name: /download/i })
    ).toBeInTheDocument();
  });

  it('shows warning icon for PDFs without data', () => {
    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'missing.pdf',
          size: 1024,
          type: 'application/pdf',
          data: undefined,
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('does not show PDF list when no PDFs are attached', () => {
    renderWithProviders(<PDFAttachments />);
    // Should not show any remove buttons
    expect(
      screen.queryByRole('button', { name: /remove/i })
    ).not.toBeInTheDocument();
  });

  // ===== Save Status Indicator Tests =====

  it('shows save warning indicator when saveStatus is warning', () => {
    usePromotionStore.setState({ saveStatus: 'warning' });

    renderWithProviders(<PDFAttachments />);

    expect(screen.getByText('Save issue')).toBeInTheDocument();
    expect(
      screen.getByTitle('Last save may not have completed')
    ).toBeInTheDocument();
  });

  it('does not show save warning indicator when saveStatus is ok', () => {
    usePromotionStore.setState({ saveStatus: 'ok' });

    renderWithProviders(<PDFAttachments />);

    expect(screen.queryByText('Save issue')).not.toBeInTheDocument();
  });

  it('save warning indicator does not disable remove buttons', () => {
    usePromotionStore.setState({
      saveStatus: 'warning',
      attachedPDFs: [
        {
          id: 'pdf-1',
          name: 'catalog.pdf',
          size: 1024,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,SGVsbG8=',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);

    // Warning indicator is visible
    expect(screen.getByText('Save issue')).toBeInTheDocument();

    // Remove button is still present and not disabled
    const removeButton = screen.getByRole('button', {
      name: /remove catalog\.pdf/i,
    });
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).not.toBeDisabled();
  });

  it('save warning indicator does not disable the upload zone', () => {
    usePromotionStore.setState({ saveStatus: 'warning' });

    renderWithProviders(<PDFAttachments />);

    // Upload zone is still clickable
    expect(
      screen.getByText('Click to upload or drag and drop PDF files')
    ).toBeInTheDocument();

    // File input is still present
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it('save warning indicator disappears when saveStatus resets to ok', async () => {
    usePromotionStore.setState({ saveStatus: 'warning' });

    renderWithProviders(<PDFAttachments />);

    // Initially visible
    expect(screen.getByText('Save issue')).toBeInTheDocument();

    // Reset to ok — triggers re-render via Zustand subscription
    usePromotionStore.setState({ saveStatus: 'ok' });

    // Should disappear after React re-render
    await waitFor(() => {
      expect(screen.queryByText('Save issue')).not.toBeInTheDocument();
    });
  });
});

// ===== SubjectLineGenerator Tests =====

describe('SubjectLineGenerator', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders prompt to add discount entries when store is empty', () => {
    renderWithProviders(<SubjectLineGenerator />);
    expect(screen.getByText(/add discount entries first/i)).toBeInTheDocument();
  });

  it('renders generate button when entries exist but no subject lines', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
    });

    renderWithProviders(<SubjectLineGenerator />);

    expect(
      screen.getByRole('button', { name: /generate subject lines/i })
    ).toBeInTheDocument();
  });

  it('generates subject lines when generate button is clicked', async () => {
    const user = userEvent.setup();

    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
    });

    renderWithProviders(<SubjectLineGenerator />);

    await user.click(
      screen.getByRole('button', { name: /generate subject lines/i })
    );

    // Store should now have generated subject lines
    const state = usePromotionStore.getState();
    expect(state.generatedSubjectLines.length).toBeGreaterThan(0);
    expect(state.selectedSubjectLine).toBeTruthy();
  });

  it('renders regenerate button when lines are generated', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: [
        'Citizen: Up to 20% OFF',
        'Elevate Your Style',
        'Time for an Upgrade',
      ],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    expect(
      screen.getByRole('button', { name: /regenerate/i })
    ).toBeInTheDocument();
  });

  it('renders subject line dropdown when lines are generated', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Citizen: Up to 20% OFF', 'Elevate Your Style'],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    // Should show the label for the dropdown
    expect(
      screen.getByText('Choose a subject line suggestion:')
    ).toBeInTheDocument();
  });

  it('renders editable input with selected subject', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Citizen: Up to 20% OFF'],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    const input = screen.getByDisplayValue(
      'Citizen: Up to 20% OFF'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('shows character count badge', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Citizen: Up to 20% OFF'],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    // The badge contains the character count — match the subject line badge (not preheader's "/ 100 chars")
    const badge = screen.getByText(/^\d+ chars/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/\d+ chars/);
  });

  it('shows optimal indicator for short subject lines', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Citizen: Up to 20% OFF'],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    // Should show ✓ for optimal length (<= 50 chars)
    const badge = screen.getByText(/^\d+ chars/);
    expect(badge.textContent).toContain('✓');
  });

  it('shows warning for long subject lines (>50 chars)', () => {
    const longSubject = 'A'.repeat(55);
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: [longSubject],
      selectedSubjectLine: longSubject,
    });

    renderWithProviders(<SubjectLineGenerator />);

    expect(screen.getByText(/55 chars \(>50\)/)).toBeInTheDocument();
  });

  it('updates subject line when input is edited', async () => {
    const user = userEvent.setup();

    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Citizen: Up to 20% OFF'],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    const input = screen.getByDisplayValue('Citizen: Up to 20% OFF');
    await user.clear(input);
    await user.type(input, 'My Custom Subject');

    expect(usePromotionStore.getState().selectedSubjectLine).toBe(
      'My Custom Subject'
    );
    expect(usePromotionStore.getState().subjectLineManuallyEdited).toBe(true);
  });

  it('regenerates subject lines when regenerate is clicked', async () => {
    const user = userEvent.setup();

    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Old Subject'],
      selectedSubjectLine: 'Old Subject',
      subjectLineManuallyEdited: true,
    });

    renderWithProviders(<SubjectLineGenerator />);

    await user.click(screen.getByRole('button', { name: /regenerate/i }));

    const state = usePromotionStore.getState();
    expect(state.subjectLineManuallyEdited).toBe(false);
    // Should have generated new lines
    expect(state.generatedSubjectLines.length).toBeGreaterThan(0);
  });

  it('shows customizable label when subject line is selected', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'CITIZEN – 20% OFF', collections: '', callout: '' },
      ],
      generatedSubjectLines: ['Citizen: Up to 20% OFF'],
      selectedSubjectLine: 'Citizen: Up to 20% OFF',
    });

    renderWithProviders(<SubjectLineGenerator />);

    expect(
      screen.getByText('Selected Subject Line (customizable):')
    ).toBeInTheDocument();
  });
});
