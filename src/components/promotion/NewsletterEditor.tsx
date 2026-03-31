/**
 * NewsletterEditor — TipTap rich text editor for the Newsletter card.
 *
 * Provides:
 * - Formatting toolbar: Bold, Italic, Underline, Text Color, Highlight,
 *   H2, H3, Bullet List, Link, Undo, Redo
 * - Heading input (ClearableInput) above the editor
 * - Position toggle (Top/Bottom) for email placement
 * - Syncs editor content to Zustand store on every change
 */

import { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import {
  usePromotionStore,
  type NewsletterPosition,
} from '@/stores/promotion-store';

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

// ===== Main Component =====

export function NewsletterEditor() {
  const store = usePromotionStore();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: store.newsletterBody || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Don't update store with empty paragraph
      const isEmpty =
        html === '<p></p>' || html === '<p><br></p>' || html === '';
      store.setNewsletterBody(isEmpty ? '' : html);
    },
  });

  // ===== Heading Change =====
  const handleHeadingChange = useCallback(
    (value: string) => {
      store.setNewsletterHeading(value);
    },
    [store]
  );

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
      {/* Heading Input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Heading
        </label>
        <ClearableInput
          value={store.newsletterHeading}
          onChange={handleHeadingChange}
          placeholder="Newsletter heading"
          className="h-8 text-sm"
          data-field="newsletterHeading"
        />
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
            aria-label="Position: Top"
          >
            <ArrowUpFromLine className="h-3 w-3" />
            Top
          </Button>
          <Button
            variant={
              store.newsletterPosition === 'bottom' ? 'default' : 'outline'
            }
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handlePositionChange('bottom')}
            data-active={store.newsletterPosition === 'bottom' || undefined}
            aria-label="Position: Bottom"
          >
            <ArrowDownFromLine className="h-3 w-3" />
            Bottom
          </Button>
        </div>
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
