/**
 * NewsletterEditor — TipTap rich text editor for the Newsletter card.
 *
 * Provides:
 * - Formatting toolbar: Bold, Italic, Underline, Text Color, Highlight,
 *   H2, H3, Bullet List, Link, Undo, Redo, Alignment
 * - Heading is the first H2 element in the editor body (auto-synced to store)
 * - Position toggle (Top/Bottom) for email placement
 * - Syncs editor content to Zustand store on every change
 */

import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  Link,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  AlignLeft,
  AlignCenter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeURL } from '@/lib/html-utils';
import { Button } from '@/components/ui/button';
import {
  usePromotionStore,
  type NewsletterPosition,
} from '@/stores/promotion-store';

// ===== Heading Extraction Helper =====

/** Extract the text content of the first H2 element from HTML. */
function extractHeadingFromHTML(html: string): string {
  const match = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  if (!match) return '';
  // Strip any inner HTML tags to get plain text
  return match[1].replace(/<[^>]*>/g, '').trim();
}

// ===== Toolbar Button =====

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-active={active}
      disabled={disabled}
      className={cn('h-7 w-7', active && 'bg-accent text-accent-foreground')}
    >
      {children}
    </Button>
  );
}

// ===== Toolbar Separator =====

function ToolbarSeparator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

// ===== Color Input =====

interface ColorInputProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  children: React.ReactNode;
}

function ColorInput({ label, color, onChange, children }: ColorInputProps) {
  return (
    <div className="relative flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label={label}
        tabIndex={0}
        onClick={() => {
          // Trigger the hidden color input
          const input = document.querySelector(
            `[data-color-input="${label}"]`
          ) as HTMLInputElement;
          input?.click();
        }}
      >
        {children}
      </Button>
      <input
        type="color"
        value={color}
        data-color-input={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => onChange(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

// ===== XSS Sanitization Extension =====

/** TipTap extension that strips dangerous HTML from pasted content. */
const SanitizePasteExtension = Extension.create({
  name: 'sanitizePaste',
  priority: 110,

  transformPastedHTML(html) {
    let cleanHtml = html;

    // Remove script tags and their contents
    cleanHtml = cleanHtml.replace(
      /<script\b[^<]*(?:(?!<\/script>)[^<]*)*<\/script>/gi,
      ''
    );

    // Remove event handler attributes (onclick, onerror, onload, etc.)
    cleanHtml = cleanHtml.replace(
      /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      ''
    );

    // Remove javascript: protocol from href attributes
    cleanHtml = cleanHtml.replace(
      /href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi,
      'href="#"'
    );

    return cleanHtml;
  },
});

// ===== Main Component =====

export function NewsletterEditor() {
  const store = usePromotionStore();
  const [showCustomize, setShowCustomize] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      SanitizePasteExtension,
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: store.newsletterBody || '<h2>Newsletter</h2><p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Don't update store with empty paragraph
      const isEmpty =
        html === '<p></p>' || html === '<p><br></p>' || html === '';
      const body = isEmpty ? '' : html;
      store.setNewsletterBody(body);

      // Auto-derive heading from first H2 in editor body
      const heading = body ? extractHeadingFromHTML(body) : '';
      if (heading !== store.newsletterHeading) {
        store.setNewsletterHeading(heading);
      }
    },
    // Force toolbar active state to update on cursor movement / selection changes
    onSelectionUpdate: () => {
      // This triggers a re-render so toolbar buttons reflect current cursor position
    },
  });

  // Sync editor when store changes from external source (import, Start Over)
  useEffect(() => {
    if (!editor) return;

    const currentEditorHTML = editor.getHTML();
    const storeBody = store.newsletterBody || '<h2>Newsletter</h2><p></p>';

    // Only update if content actually differs (avoid infinite loops)
    if (currentEditorHTML !== storeBody) {
      editor.commands.setContent(storeBody);
    }
  }, [store.newsletterBody, editor]);

  // ===== Position Toggle =====
  const handlePositionChange = useCallback(
    (position: NewsletterPosition) => {
      store.setNewsletterPosition(position);
    },
    [store]
  );

  // ===== Link Handler =====
  const handleLinkClick = useCallback(() => {
    if (!editor) return;

    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt('Enter URL:', 'https://');
    if (url) {
      // Validate URL protocol to prevent javascript: URI vulnerability
      if (!isSafeURL(url)) {
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  // ===== Color Handlers =====
  const handleTextColor = useCallback(
    (color: string) => {
      editor?.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const handleHighlight = useCallback(
    (color: string) => {
      editor?.chain().focus().toggleHighlight({ color }).run();
    },
    [editor]
  );

  return (
    <div className="space-y-3">
      {/* Show in Email Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="newsletter-visible-toggle"
          checked={store.newsletterVisible}
          onChange={(e) => store.setNewsletterVisible(e.target.checked)}
          className="h-4 w-4 rounded border-border"
          data-testid="newsletter-visible-toggle"
        />
        <label
          htmlFor="newsletter-visible-toggle"
          className="text-sm font-medium cursor-pointer select-none"
        >
          Show in Email
        </label>
      </div>

      {/* Position Toggle */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Position in Email
        </label>
        <div className="flex gap-1">
          <Button
            variant={store.newsletterPosition === 'top' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handlePositionChange('top')}
            data-active={store.newsletterPosition === 'top' || undefined}
            aria-label="Position: Above %"
          >
            <ArrowUpFromLine className="h-3 w-3" />
            Above %
          </Button>
          <Button
            variant={
              store.newsletterPosition === 'bottom' ? 'default' : 'outline'
            }
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handlePositionChange('bottom')}
            data-active={store.newsletterPosition === 'bottom' || undefined}
            aria-label="Position: Below %"
          >
            <ArrowDownFromLine className="h-3 w-3" />
            Below %
          </Button>
        </div>
      </div>

      {/* Customize Section */}
      <div className="rounded-md border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setShowCustomize(!showCustomize)}
          data-testid="newsletter-customize-toggle"
          aria-expanded={showCustomize}
        >
          <span>Customize Border & Background</span>
          {showCustomize ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {showCustomize && (
          <div className="space-y-3 border-t px-3 py-3">
            {/* Border Style Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Border Style
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: 'left', label: 'Left', preview: 'border-l-4' },
                    { value: 'full', label: 'Full', preview: 'border' },
                    { value: 'none', label: 'None', preview: '' },
                    { value: 'top', label: 'Top', preview: 'border-t-4' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex h-8 w-12 items-center justify-center rounded-md border text-[10px] transition-colors ${
                      store.newsletterStyle.borderStyle === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      store.setNewsletterStyle({ borderStyle: opt.value })
                    }
                    aria-label={`Border style: ${opt.label}`}
                    data-testid={`border-style-${opt.value}`}
                  >
                    <div
                      className={`h-5 w-8 bg-muted ${
                        opt.value === 'left'
                          ? 'border-l-[3px] border-l-primary'
                          : opt.value === 'full'
                            ? 'border border-primary'
                            : opt.value === 'top'
                              ? 'border-t-[3px] border-t-primary'
                              : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Pickers */}
            {(
              [
                {
                  key: 'borderColor' as const,
                  label: 'Border Color',
                },
                {
                  key: 'backgroundColor' as const,
                  label: 'Background',
                },
                {
                  key: 'headingColor' as const,
                  label: 'Heading Color',
                },
              ] as const
            ).map((picker) => {
              const currentValue = store.newsletterStyle[picker.key];
              return (
                <div key={picker.key} className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground min-w-[90px]">
                    {picker.label}
                  </label>
                  <div
                    className="h-5 w-5 rounded border border-border shrink-0"
                    style={{
                      backgroundColor: currentValue ?? '#888',
                      backgroundImage: currentValue
                        ? undefined
                        : 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)',
                      backgroundSize: currentValue ? undefined : '8px 8px',
                    }}
                    data-testid={`swatch-${picker.key}`}
                  />
                  <input
                    type="color"
                    value={currentValue ?? '#2563eb'}
                    onChange={(e) =>
                      store.setNewsletterStyle({
                        [picker.key]: e.target.value,
                      })
                    }
                    className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                    aria-label={`Pick ${picker.label}`}
                    data-testid={`picker-${picker.key}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                    onClick={() =>
                      store.setNewsletterStyle({ [picker.key]: null })
                    }
                    disabled={currentValue === null}
                    aria-label={`Reset ${picker.label} to auto`}
                    data-testid={`auto-${picker.key}`}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Auto
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/30 p-1">
        {/* Undo / Redo */}
        <ToolbarButton
          active={false}
          onClick={() => editor?.chain().focus().undo().run()}
          label="Undo"
          disabled={!editor?.can().undo()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={false}
          onClick={() => editor?.chain().focus().redo().run()}
          label="Redo"
          disabled={!editor?.can().redo()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Bold */}
        <ToolbarButton
          active={editor?.isActive('bold') || false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          label="Toggle bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          active={editor?.isActive('italic') || false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          label="Toggle italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          active={editor?.isActive('underline') || false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          label="Toggle underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Text Color */}
        <ColorInput
          label="Text color"
          color="#000000"
          onChange={handleTextColor}
        >
          <Palette className="h-3.5 w-3.5" />
        </ColorInput>

        {/* Highlight */}
        <ColorInput
          label="Highlight"
          color="#fef08a"
          onChange={handleHighlight}
        >
          <Highlighter className="h-3.5 w-3.5" />
        </ColorInput>

        <ToolbarSeparator />

        {/* H2 */}
        <ToolbarButton
          active={editor?.isActive('heading', { level: 2 }) || false}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label="Toggle H2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* H3 */}
        <ToolbarButton
          active={editor?.isActive('heading', { level: 3 }) || false}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          label="Toggle H3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Bullet List */}
        <ToolbarButton
          active={editor?.isActive('bulletList') || false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          label="Toggle bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Link */}
        <ToolbarButton
          active={editor?.isActive('link') || false}
          onClick={handleLinkClick}
          label="Add link"
        >
          <Link className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Heading Alignment */}
        <ToolbarButton
          active={store.newsletterStyle.headingAlign === 'left'}
          onClick={() => store.setNewsletterStyle({ headingAlign: 'left' })}
          label="Align heading left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={store.newsletterStyle.headingAlign === 'center'}
          onClick={() => store.setNewsletterStyle({ headingAlign: 'center' })}
          label="Align heading center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor Content Area */}
      <div className="rounded-md border min-h-[200px] overflow-hidden">
        <EditorContent
          editor={editor}
          className="newsletter-editor prose prose-sm max-w-none p-3 min-h-[200px] focus:outline-none"
        />
      </div>
    </div>
  );
}
