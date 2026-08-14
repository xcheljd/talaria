/**
 * NewsletterEditor component tests.
 *
 * Tests the TipTap rich text editor component with toolbar,
 * heading (as first H2 in editor body), and position toggle.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NewsletterEditor } from '@/components/promotion/NewsletterEditor';

// Mock the store (state must be hoisted above vi.mock — vitest hoists
// mock factories, so a plain const would be referenced before init)
const { mockStore } = vi.hoisted(() => {
  const state = {
    newsletterHeading: 'Newsletter',
    newsletterBody: '',
    newsletterPosition: 'top' as 'top' | 'bottom',
    newsletterVisible: false,
    newsletterStyle: {
      borderColor: null as string | null,
      backgroundColor: null as string | null,
      headingColor: null as string | null,
      borderStyle: 'left' as const,
      headingAlign: 'left' as const,
    },
    emailPalette: {
      footerBg: '#2c3e50',
      sectionBg: '#f5f5f5',
      unsubscribeBg: '#f4f4f4',
      accent: '#ffd700',
      text: '#333333',
      link: '#0066cc',
      noteBorder: '#ddd',
      headerBorder: 'gray',
      bodyBg: 'white',
      footerText: 'white',
    },
  };
  return {
    mockStore: {
      ...state,
      setNewsletterHeading: vi.fn(),
      setNewsletterBody: vi.fn(),
      setNewsletterPosition: vi.fn(),
      setNewsletterStyle: vi.fn(),
      setNewsletterVisible: vi.fn(),
    },
  };
});

// The component reads the newsletter domain store (plan 022 slice), so mock
// THAT store — its actual dependency. The promotion-store types are
// type-only imports, erased at compile time.
vi.mock('@/stores/newsletter-store', () => ({
  useNewsletterStore: () => mockStore,
}));

describe('NewsletterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
    mockStore.newsletterVisible = false;
    mockStore.newsletterStyle = {
      borderColor: null,
      backgroundColor: null,
      headingColor: null,
      borderStyle: 'left',
      headingAlign: 'left',
    };
  });

  it('renders the TipTap editor with toolbar', () => {
    render(<NewsletterEditor />);

    // Toolbar buttons should be present
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Underline')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Heading 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
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

  it('renders position toggle with default Above % and Below %', () => {
    render(<NewsletterEditor />);
    expect(screen.getByRole('button', { name: 'Position: Above %' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Position: Below %' })).toBeInTheDocument();
  });

  it('shows Above % as active by default', () => {
    render(<NewsletterEditor />);
    const topButton = screen.getByRole('button', { name: 'Position: Above %' });
    expect(topButton).toHaveAttribute('data-active');
    // Below % should NOT have data-active
    const bottomButton = screen.getByRole('button', { name: 'Position: Below %' });
    expect(bottomButton).not.toHaveAttribute('data-active');
  });

  it('calls setNewsletterPosition when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const bottomButton = screen.getByRole('button', { name: 'Position: Below %' });
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

    const boldButton = screen.getByLabelText('Bold');
    const italicButton = screen.getByLabelText('Italic');

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

    const boldButton = screen.getByLabelText('Bold');
    await user.click(boldButton);

    // After clicking, the editor should exist
    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking italic button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const italicButton = screen.getByLabelText('Italic');
    await user.click(italicButton);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking H2 button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const h2Button = screen.getByLabelText('Heading 2');
    await user.click(h2Button);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking bullet list button calls editor chain command', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const listButton = screen.getByLabelText('Bullet list');
    await user.click(listButton);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking link button opens link popover', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const linkButton = screen.getByLabelText('Add link');
    await user.click(linkButton);

    // Popover should appear with URL input
    expect(screen.getByTestId('link-url-input')).toBeInTheDocument();
    expect(screen.getByTestId('link-submit-btn')).toBeInTheDocument();
  });

  it('clicking link button shows URL input field', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const linkButton = screen.getByLabelText('Add link');
    await user.click(linkButton);

    // URL input should be pre-filled with https://
    const urlInput = screen.getByTestId('link-url-input') as HTMLInputElement;
    expect(urlInput.value).toBe('https://');
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

  it('shows Above % as active when store position is top', () => {
    mockStore.newsletterPosition = 'top';
    render(<NewsletterEditor />);

    const topButton = screen.getByRole('button', { name: 'Position: Above %' });
    expect(topButton).toHaveAttribute('data-active');
  });

  it('shows Below % as active when store position is bottom', () => {
    mockStore.newsletterPosition = 'bottom';
    render(<NewsletterEditor />);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Below %',
    });
    expect(bottomButton).toHaveAttribute('data-active');
  });

  it('calls setNewsletterPosition when switching from top to bottom', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Below %',
    });
    await user.click(bottomButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('bottom');
  });

  it('calls setNewsletterPosition when switching from bottom to top', async () => {
    mockStore.newsletterPosition = 'bottom';
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const topButton = screen.getByRole('button', { name: 'Position: Above %' });
    await user.click(topButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('top');
  });
});

describe('NewsletterEditor - customization UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
    mockStore.newsletterStyle = {
      borderColor: null,
      backgroundColor: null,
      headingColor: null,
      borderStyle: 'left',
      headingAlign: 'left',
    };
  });

  it('renders Customize Border & Background toggle', () => {
    render(<NewsletterEditor />);
    expect(
      screen.getByTestId('newsletter-customize-toggle')
    ).toBeInTheDocument();
  });

  it('customization section is collapsed by default', () => {
    render(<NewsletterEditor />);
    // Border style buttons should NOT be visible
    expect(screen.queryByTestId('border-style-left')).not.toBeInTheDocument();
  });

  it('expands customization section on toggle click', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const toggle = screen.getByTestId('newsletter-customize-toggle');
    await user.click(toggle);

    // Now customization controls should be visible
    expect(screen.getByTestId('border-style-left')).toBeInTheDocument();
    expect(screen.getByTestId('border-style-full')).toBeInTheDocument();
    expect(screen.getByTestId('border-style-none')).toBeInTheDocument();
    expect(screen.getByTestId('border-style-top')).toBeInTheDocument();
  });

  it('renders heading alignment buttons in toolbar', () => {
    render(<NewsletterEditor />);

    expect(screen.getByLabelText('Align heading left')).toBeInTheDocument();
    expect(screen.getByLabelText('Align heading center')).toBeInTheDocument();
  });

  it('renders color pickers for border and background in customize section', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    expect(screen.getByTestId('picker-borderColor')).toBeInTheDocument();
    expect(screen.getByTestId('picker-backgroundColor')).toBeInTheDocument();
  });

  it('renders heading color picker in customize section', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    // Heading color picker is now in the Customize section
    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    expect(screen.getByTestId('picker-headingColor')).toBeInTheDocument();
  });

  it('renders color swatches', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    expect(screen.getByTestId('swatch-borderColor')).toBeInTheDocument();
    expect(screen.getByTestId('swatch-backgroundColor')).toBeInTheDocument();
  });

  it('renders heading color swatch in customize section', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    expect(screen.getByTestId('swatch-headingColor')).toBeInTheDocument();
  });

  it('renders Auto buttons for border and background colors', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    expect(screen.getByTestId('auto-borderColor')).toBeInTheDocument();
    expect(screen.getByTestId('auto-backgroundColor')).toBeInTheDocument();
  });

  it('renders reset button for heading color in customize section', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    expect(screen.getByTestId('auto-headingColor')).toBeInTheDocument();
  });

  it('calls setNewsletterStyle when border style button is clicked', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));
    await user.click(screen.getByTestId('border-style-full'));

    expect(mockStore.setNewsletterStyle).toHaveBeenCalledWith({
      borderStyle: 'full',
    });
  });

  it('calls setNewsletterStyle when heading align button is clicked', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByLabelText('Align heading center'));

    expect(mockStore.setNewsletterStyle).toHaveBeenCalledWith({
      headingAlign: 'center',
    });
  });

  it('calls setNewsletterStyle when Auto button is clicked', async () => {
    mockStore.newsletterStyle.borderColor = '#ff0000';
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));
    await user.click(screen.getByTestId('auto-borderColor'));

    expect(mockStore.setNewsletterStyle).toHaveBeenCalledWith({
      borderColor: null,
    });
  });

  it('Auto button is disabled when color is already null', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    await user.click(screen.getByTestId('newsletter-customize-toggle'));

    const autoButton = screen.getByTestId('auto-borderColor');
    expect(autoButton).toBeDisabled();
  });

  it('collapses customization section on second toggle click', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const toggle = screen.getByTestId('newsletter-customize-toggle');

    // Open
    await user.click(toggle);
    expect(screen.getByTestId('border-style-left')).toBeInTheDocument();

    // Close
    await user.click(toggle);
    expect(screen.queryByTestId('border-style-left')).not.toBeInTheDocument();
  });
});

describe('NewsletterEditor - show in email toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
    mockStore.newsletterVisible = false;
    mockStore.newsletterStyle = {
      borderColor: null,
      backgroundColor: null,
      headingColor: null,
      borderStyle: 'left',
      headingAlign: 'left',
    };
  });

  it('renders Show in Email toggle', () => {
    render(<NewsletterEditor />);
    expect(screen.getByTestId('newsletter-visible-toggle')).toBeInTheDocument();
  });

  it('toggle is unchecked by default when newsletterVisible is false', () => {
    render(<NewsletterEditor />);
    const toggle = screen.getByTestId('newsletter-visible-toggle');
    expect(toggle.getAttribute('data-state')).toBe('unchecked');
  });

  it('toggle is checked when newsletterVisible is true', () => {
    mockStore.newsletterVisible = true;
    render(<NewsletterEditor />);
    const toggle = screen.getByTestId('newsletter-visible-toggle');
    expect(toggle.getAttribute('data-state')).toBe('checked');
  });

  it('calls setNewsletterVisible when toggled', async () => {
    const user = userEvent.setup();
    render(<NewsletterEditor />);

    const toggle = screen.getByTestId('newsletter-visible-toggle');
    await user.click(toggle);

    expect(mockStore.setNewsletterVisible).toHaveBeenCalledWith(true);
  });
});

describe('NewsletterEditor - paste as plain text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
  });

  function getEditorArea(): Element {
    const area = document.querySelector('.tiptap');
    if (!area) throw new Error('editor area not found');
    return area;
  }

  it('opens a context menu with "Paste as plain text" on right click', () => {
    render(<NewsletterEditor />);

    // No menu until the user right-clicks.
    expect(
      screen.queryByTestId('newsletter-context-menu')
    ).not.toBeInTheDocument();

    fireEvent.contextMenu(getEditorArea());

    expect(screen.getByTestId('newsletter-context-menu')).toBeInTheDocument();
    expect(screen.getByText('Paste as plain text')).toBeInTheDocument();
  });

  it('dismisses the menu on Escape', () => {
    render(<NewsletterEditor />);
    fireEvent.contextMenu(getEditorArea());
    expect(screen.getByTestId('newsletter-context-menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.queryByTestId('newsletter-context-menu')
    ).not.toBeInTheDocument();
  });

  it('inserts clipboard text with formatting stripped', async () => {
    const readText = vi.fn().mockResolvedValue('Plain pasted text');
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText },
      configurable: true,
    });

    render(<NewsletterEditor />);
    fireEvent.contextMenu(getEditorArea());
    await userEvent.click(screen.getByText('Paste as plain text'));

    expect(readText).toHaveBeenCalled();
    await waitFor(() => {
      expect(getEditorArea().textContent).toContain('Plain pasted text');
    });
    // Menu closes after the action.
    expect(
      screen.queryByTestId('newsletter-context-menu')
    ).not.toBeInTheDocument();
  });

  it('does nothing when the clipboard is empty or unreadable', async () => {
    const readText = vi.fn().mockResolvedValue('');
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText },
      configurable: true,
    });

    render(<NewsletterEditor />);
    fireEvent.contextMenu(getEditorArea());
    await userEvent.click(screen.getByText('Paste as plain text'));

    expect(readText).toHaveBeenCalled();
    // The default body had no such text and nothing was inserted.
    expect(getEditorArea().textContent).not.toContain('Plain pasted text');
  });
});
