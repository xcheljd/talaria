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
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock the store (state must be hoisted above vi.mock — vitest hoists
// mock factories, so a plain const would be referenced before init)
const { mockStore } = vi.hoisted(() => {
  const state = {
    newsletterHeading: 'Newsletter',
    newsletterBody: '',
    newsletterPosition: 'top' as 'top' | 'bottom',
    newsletterVisible: true,
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
      clearNewsletter: vi.fn(),
    },
  };
});

// The component reads the newsletter domain store (plan 022 slice), so mock
// THAT store — its actual dependency. The promotion-store types are
// type-only imports, erased at compile time.
vi.mock('@/stores/newsletter-store', () => ({
  useNewsletterStore: () => mockStore,
}));

// Mirrors App.tsx: Tooltip primitives require an ancestor TooltipProvider,
// which the app supplies once at the root.
function renderEditor() {
  return render(
    <TooltipProvider>
      <NewsletterEditor />
    </TooltipProvider>
  );
}

/** Placement + box/table style now live in the Style popover. */
async function openStyle(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('newsletter-style-btn'));
}

describe('NewsletterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterHeading = 'Newsletter';
    mockStore.newsletterBody = '';
    mockStore.newsletterPosition = 'top';
    mockStore.newsletterVisible = true;
    mockStore.newsletterStyle = {
      borderColor: null,
      backgroundColor: null,
      headingColor: null,
      borderStyle: 'left',
      headingAlign: 'left',
    };
  });

  it('renders the TipTap editor with toolbar', () => {
    renderEditor();

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
    renderEditor();
    expect(screen.getByLabelText('Text color')).toBeInTheDocument();
  });

  it('renders highlight color picker', () => {
    renderEditor();
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument();
  });

  it('renders position toggle with default Above % and Below %', async () => {
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);
    expect(
      screen.getByRole('button', { name: 'Position: Above %' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Position: Below %' })
    ).toBeInTheDocument();
  });

  it('shows Above % as active by default', async () => {
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);
    const topButton = screen.getByRole('button', { name: 'Position: Above %' });
    expect(topButton).toHaveAttribute('data-active');
    // Below % should NOT have data-active
    const bottomButton = screen.getByRole('button', {
      name: 'Position: Below %',
    });
    expect(bottomButton).not.toHaveAttribute('data-active');
  });

  it('calls setNewsletterPosition when toggle is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Below %',
    });
    await user.click(bottomButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('bottom');
  });

  it('renders the editor content area', () => {
    renderEditor();
    // The editor renders a .tiptap content area inside the EditorContent wrapper
    const editorWrapper = document.querySelector('.tiptap');
    expect(editorWrapper).toBeTruthy();
  });

  it('initializes editor with content from store', async () => {
    mockStore.newsletterBody = '<p>Hello world</p>';
    renderEditor();

    await waitFor(() => {
      const editorArea = document.querySelector('.tiptap');
      expect(editorArea?.textContent).toContain('Hello world');
    });
  });

  it('renders toolbar buttons with correct active state class', () => {
    renderEditor();

    const boldButton = screen.getByLabelText('Bold');
    const italicButton = screen.getByLabelText('Italic');

    // Initially, no formatting is active
    expect(boldButton).toHaveAttribute('data-active', 'false');
    expect(italicButton).toHaveAttribute('data-active', 'false');
  });

  it('has an undo button in the toolbar', () => {
    renderEditor();
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
  });

  it('has a redo button in the toolbar', () => {
    renderEditor();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();
  });

  it('renders color picker for text color', () => {
    renderEditor();
    const colorButton = screen.getByLabelText('Text color');
    expect(colorButton).toBeInTheDocument();
  });

  it('renders color picker for highlight', () => {
    renderEditor();
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
    renderEditor();

    const boldButton = screen.getByLabelText('Bold');
    await user.click(boldButton);

    // After clicking, the editor should exist
    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking italic button calls editor chain command', async () => {
    const user = userEvent.setup();
    renderEditor();

    const italicButton = screen.getByLabelText('Italic');
    await user.click(italicButton);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking H2 button calls editor chain command', async () => {
    const user = userEvent.setup();
    renderEditor();

    const h2Button = screen.getByLabelText('Heading 2');
    await user.click(h2Button);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking bullet list button calls editor chain command', async () => {
    const user = userEvent.setup();
    renderEditor();

    const listButton = screen.getByLabelText('Bullet list');
    await user.click(listButton);

    const editorArea = document.querySelector('.tiptap');
    expect(editorArea).toBeTruthy();
  });

  it('clicking link button opens link popover', async () => {
    const user = userEvent.setup();
    renderEditor();

    const linkButton = screen.getByLabelText('Add link');
    await user.click(linkButton);

    // Popover should appear with URL input
    expect(screen.getByTestId('link-url-input')).toBeInTheDocument();
    expect(screen.getByTestId('link-submit-btn')).toBeInTheDocument();
  });

  it('clicking link button shows URL input field', async () => {
    const user = userEvent.setup();
    renderEditor();

    const linkButton = screen.getByLabelText('Add link');
    await user.click(linkButton);

    // URL input should be pre-filled with https://
    const urlInput = screen.getByTestId('link-url-input') as HTMLInputElement;
    expect(urlInput.value).toBe('https://');
  });

  it('editor instance exists and supports commands', async () => {
    renderEditor();

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

  it('shows Above % as active when store position is top', async () => {
    mockStore.newsletterPosition = 'top';
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);

    const topButton = screen.getByRole('button', { name: 'Position: Above %' });
    expect(topButton).toHaveAttribute('data-active');
  });

  it('shows Below % as active when store position is bottom', async () => {
    mockStore.newsletterPosition = 'bottom';
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Below %',
    });
    expect(bottomButton).toHaveAttribute('data-active');
  });

  it('calls setNewsletterPosition when switching from top to bottom', async () => {
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);

    const bottomButton = screen.getByRole('button', {
      name: 'Position: Below %',
    });
    await user.click(bottomButton);

    expect(mockStore.setNewsletterPosition).toHaveBeenCalledWith('bottom');
  });

  it('calls setNewsletterPosition when switching from bottom to top', async () => {
    mockStore.newsletterPosition = 'bottom';
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);

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

  it('keeps box and table style out of the card until Style is opened', () => {
    renderEditor();
    expect(screen.getByTestId('newsletter-style-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('border-style-left')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Position: Above %' })
    ).not.toBeInTheDocument();
  });

  it('opens Style on the Box & heading tab with every box control', async () => {
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);

    expect(screen.getByTestId('newsletter-customize-toggle')).toHaveAttribute(
      'data-state',
      'active'
    );
    for (const id of [
      'border-style-left',
      'border-style-full',
      'border-style-none',
      'border-style-top',
      'picker-borderColor',
      'picker-backgroundColor',
      'picker-headingColor',
      'swatch-borderColor',
      'swatch-backgroundColor',
      'swatch-headingColor',
      'auto-borderColor',
      'auto-backgroundColor',
      'auto-headingColor',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('switches to the Tables tab', async () => {
    const user = userEvent.setup();
    renderEditor();
    await openStyle(user);
    await user.click(screen.getByTestId('newsletter-table-style-toggle'));

    expect(screen.getByTestId('table-border-style-solid')).toBeInTheDocument();
    expect(screen.queryByTestId('border-style-left')).not.toBeInTheDocument();
  });

  it('shows heading alignment beside the Heading field', () => {
    renderEditor();
    expect(screen.getByLabelText('Align heading left')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByLabelText('Align heading center')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls setNewsletterStyle when border style button is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await openStyle(user);
    await user.click(screen.getByTestId('border-style-full'));

    expect(mockStore.setNewsletterStyle).toHaveBeenCalledWith({
      borderStyle: 'full',
    });
  });

  it('calls setNewsletterStyle when heading align button is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByLabelText('Align heading center'));

    expect(mockStore.setNewsletterStyle).toHaveBeenCalledWith({
      headingAlign: 'center',
    });
  });

  it('calls setNewsletterStyle when Auto button is clicked', async () => {
    mockStore.newsletterStyle.borderColor = '#ff0000';
    const user = userEvent.setup();
    renderEditor();

    await openStyle(user);
    await user.click(screen.getByTestId('auto-borderColor'));

    expect(mockStore.setNewsletterStyle).toHaveBeenCalledWith({
      borderColor: null,
    });
  });

  it('Auto button is disabled when color is already null', async () => {
    const user = userEvent.setup();
    renderEditor();

    await openStyle(user);

    expect(screen.getByTestId('auto-borderColor')).toBeDisabled();
  });
});

describe('NewsletterEditor - Heading field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.newsletterVisible = true;
    mockStore.newsletterHeading = 'Holiday shipping';
    mockStore.newsletterBody = '<p>Order early.</p>';
  });

  it('shows the heading in its own field, not the editor rule', () => {
    renderEditor();
    expect(screen.getByLabelText('Heading')).toHaveValue('Holiday shipping');
    expect(
      screen.queryByText(/becomes the newsletter heading/i)
    ).not.toBeInTheDocument();
  });

  it('typing in Heading updates the store', () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Gift guide' },
    });
    expect(mockStore.setNewsletterHeading).toHaveBeenCalledWith('Gift guide');
  });
});

describe('NewsletterEditor - empty state and Clear all', () => {
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

  it('shows the empty state (no editor, no checkbox) when the newsletter is off', () => {
    mockStore.newsletterVisible = false;
    renderEditor();
    expect(screen.getByText('No newsletter in this email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bold')).toBeNull();
    expect(screen.queryByTestId('newsletter-visible-toggle')).toBeNull();
  });

  it('Start a newsletter puts it in the email', async () => {
    mockStore.newsletterVisible = false;
    const user = userEvent.setup();
    renderEditor();
    await user.click(
      screen.getByRole('button', { name: /start a newsletter/i })
    );
    expect(mockStore.setNewsletterVisible).toHaveBeenCalledWith(true);
  });

  it('Clear all empties the newsletter and removes it from the email', async () => {
    mockStore.newsletterVisible = true;
    mockStore.newsletterBody = '<h2>Hi</h2><p>Body</p>';
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByTestId('newsletter-clear-btn'));
    expect(mockStore.clearNewsletter).toHaveBeenCalled();
    expect(mockStore.setNewsletterVisible).toHaveBeenCalledWith(false);
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
    renderEditor();

    // No menu until the user right-clicks.
    expect(
      screen.queryByTestId('newsletter-context-menu')
    ).not.toBeInTheDocument();

    fireEvent.contextMenu(getEditorArea());

    expect(screen.getByTestId('newsletter-context-menu')).toBeInTheDocument();
    expect(screen.getByText('Paste as plain text')).toBeInTheDocument();
  });

  it('dismisses the menu on Escape', () => {
    renderEditor();
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

    renderEditor();
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

    renderEditor();
    fireEvent.contextMenu(getEditorArea());
    await userEvent.click(screen.getByText('Paste as plain text'));

    expect(readText).toHaveBeenCalled();
    // The default body had no such text and nothing was inserted.
    expect(getEditorArea().textContent).not.toContain('Plain pasted text');
  });
});
