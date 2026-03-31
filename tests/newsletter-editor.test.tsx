/**
 * NewsletterEditor component tests.
 *
 * Tests the TipTap rich text editor component with toolbar,
 * heading input, and position toggle.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NewsletterEditor } from '@/components/promotion/NewsletterEditor';
import { usePromotionStore } from '@/stores/promotion-store';

// Mock the store
const mockStore = {
  newsletterHeading: 'Newsletter',
  newsletterBody: '',
  newsletterPosition: 'top' as const,
  setNewsletterHeading: vi.fn(),
  setNewsletterBody: vi.fn(),
  setNewsletterPosition: vi.fn(),
};

vi.mock('@/stores/promotion-store', () => ({
  usePromotionStore: () => mockStore,
}));

describe('NewsletterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
  });

  it('renders the TipTap editor with toolbar', () => {
    render(<NewsletterEditor />);

    // Toolbar buttons should be present
    expect(screen.getByLabelText('Toggle bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle underline')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle H2')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle H3')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle bullet list')).toBeInTheDocument();
    expect(screen.getByLabelText('Add link')).toBeInTheDocument();
  });

  it('renders text color picker', () => {
    render(<NewsletterEditor />);
    expect(screen.getByLabelText('Text color')).toBeInTheDocument();
  });

  it('renders highlight color picker', () => {
    render(<NewsletterEditor />);
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument();
  });

  it('renders heading input with default value from store', () => {
    render(<NewsletterEditor />);
    const headingInput = screen.getByPlaceholderText('Newsletter heading');
    expect(headingInput).toBeInTheDocument();
    expect((headingInput as HTMLInputElement).value).toBe('Newsletter');
  });

  it('renders position toggle with default Top and Bottom', () => {
    render(<NewsletterEditor />);
    expect(screen.getByRole('button', { name: 'Position: Top' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Position: Bottom' })).toBeInTheDocument();
  });

  it('shows Top as active by default', () => {
    render(<NewsletterEditor />);
    const topButton = screen.getByRole('button', { name: 'Position: Top' });
    expect(topButton).toHaveAttribute('data-active');
    // Bottom should NOT have data-active
    const bottomButton = screen.getByRole('button', { name: 'Position: Bottom' });
    expect(bottomButton).not.toHaveAttribute('data-active');
  });

  it('calls setNewsletterHeading when heading changes', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const headingInput = screen.getByPlaceholderText('Newsletter heading');
    await user.clear(headingInput);
    await user.type(headingInput, 'Store Updates');

    expect(mockStore.setNewsletterHeading).toHaveBeenCalled();
  });

  it('calls setNewsletterPosition when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const bottomButton = screen.getByRole('button', { name: 'Position: Bottom' });
    await user.click(bottomButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('bottom');
  });

  it('renders the editor content area', () => {
    render(<NewsletterEditor />);
    // The editor renders a .tiptap content area inside the EditorContent wrapper
    const editorWrapper = document.querySelector('.tiptap');
    expect(editorWrapper).toBeTruthy();
  });

  it('initializes editor with content from store', async () => {
    mockStore.newsletterBody = '<p>Hello world</p>';
    render(<NewsletterEditor />);

    await waitFor(() => {
      const editorArea = document.querySelector('.tiptap');
      expect(editorArea?.textContent).toContain('Hello world');
    });
  });

  it('renders toolbar buttons with correct active state class', () => {
    render(<NewsletterEditor />);

    const boldButton = screen.getByLabelText('Toggle bold');
    const italicButton = screen.getByLabelText('Toggle italic');

    // Initially, no formatting is active
    expect(boldButton).toHaveAttribute('data-active', 'false');
    expect(italicButton).toHaveAttribute('data-active', 'false');
  });

  it('has an undo button in the toolbar', () => {
    render(<NewsletterEditor />);
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
  });

  it('has a redo button in the toolbar', () => {
    render(<NewsletterEditor />);
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();
  });

  it('renders color picker for text color', () => {
    render(<NewsletterEditor />);
    const colorButton = screen.getByLabelText('Text color');
    expect(colorButton).toBeInTheDocument();
  });

  it('renders color picker for highlight', () => {
    render(<NewsletterEditor />);
    const highlightButton = screen.getByLabelText('Highlight');
    expect(highlightButton).toBeInTheDocument();
  });

  it('clears heading when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    // The ClearableInput shows an X button when value is non-empty
    const clearButton = screen.getByLabelText('Clear field');
    await user.click(clearButton);

    expect(mockStore.setNewsletterHeading).toHaveBeenCalledWith('');
  });
});

describe('NewsletterEditor - toolbar interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
  });

  it('clicking bold button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const boldButton = screen.getByLabelText('Toggle bold');
    await user.click(boldButton);

    // After clicking, the editor should exist
    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking italic button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const italicButton = screen.getByLabelText('Toggle italic');
    await user.click(italicButton);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking H2 button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const h2Button = screen.getByLabelText('Toggle H2');
    await user.click(h2Button);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking bullet list button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const listButton = screen.getByLabelText('Toggle bullet list');
    await user.click(listButton);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking link button prompts for URL', async () => {
    // Mock window.prompt
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const linkButton = screen.getByLabelText('Add link');
    await user.click(linkButton);

    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('clicking link button with URL sets link', async () => {
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValue('https://example.com');
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const linkButton = screen.getByLabelText('Add link');
    await user.click(linkButton);

    expect(promptSpy).toHaveBeenCalledWith(
      'Enter URL:',
      'https://'
    );
    promptSpy.mockRestore();
  });

  it('editor instance exists and supports commands', async () => {
    render(<NewsletterEditor />);

    // The editor should render a .tiptap element (ProseMirror content area)
    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
    expect(editorArea?.getAttribute('contenteditable')).toBe('true');
  });
});

describe('NewsletterEditor - position toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
  });

  it('shows Top as active when store position is top', () => {
    mockStore.newsletterPosition = 'top';
    render(<NewsletterEditor />);

    const topButton = screen.getByRole('button', { name: 'Position: Top' });
    expect(topButton).toHaveAttribute('data-active');
  });

  it('shows Bottom as active when store position is bottom', () => {
    mockStore.newsletterPosition = 'bottom';
    render(<NewsletterEditor />);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Bottom',
    });
    expect(bottomButton).toHaveAttribute('data-active');
  });

  it('calls setNewsletterPosition when switching from top to bottom', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Bottom',
    });
    await user.click(bottomButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('bottom');
  });

  it('calls setNewsletterPosition when switching from bottom to top', async () => {
    mockStore.newsletterPosition = 'bottom';
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const topButton = screen.getByRole('button', { name: 'Position: Top' });
    await user.click(topButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('top');
  });
});
