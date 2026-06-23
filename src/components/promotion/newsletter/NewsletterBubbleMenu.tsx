/**
 * NewsletterBubbleMenu — a Microsoft Word-style mini toolbar that floats above
 * the current text selection in the newsletter editor. It surfaces the most
 * common inline/block formatting (font size, bold/italic/underline/strike,
 * font color & highlight, alignment, bullet/numbered lists, link) right where
 * the user is working, mirroring the full NewsletterToolbar's commands.
 *
 * Color labels are intentionally distinct from the main toolbar's ("Font color"
 * / "Highlight color" vs "Text color" / "Highlight") because ColorInput locates
 * its hidden <input type="color"> by label via querySelector — sharing a label
 * across two on-screen instances would make one trigger the other.
 */

import { useCallback, useEffect, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  Link as LinkIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { isSafeURL } from '@/lib/html-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { FONT_SIZES } from './extensions';
import { ToolbarButton, ToolbarSeparator, ColorInput } from './toolbar';

/**
 * Nearest scrollable ancestor of the editor — i.e. the builder column. Used as
 * the floating menu's shift boundary so a right-edge selection keeps the menu
 * inside that column instead of pushing it across the resizable divider.
 */
function getScrollBoundary(el: HTMLElement): HTMLElement | undefined {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === 'auto' || oy === 'scroll') return node;
    node = node.parentElement;
  }
  return undefined;
}

export function NewsletterBubbleMenu({ editor }: { editor: Editor | null }) {
  const [lastTextColor, setLastTextColor] = useState('#000000');
  const [lastHighlightColor, setLastHighlightColor] = useState('#fef08a');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');

  // Resolve the shift boundary (the builder column) after paint, once the
  // editor's DOM is attached. The BubbleMenu plugin captures its options when
  // it registers, so we key the menu on this to re-register with the resolved
  // boundary instead of the detached-first-render `undefined`.
  const [boundary, setBoundary] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    if (editor) setBoundary(getScrollBoundary(editor.view.dom));
  }, [editor]);

  const handleTextColor = useCallback(
    (color: string) => {
      setLastTextColor(color);
      editor?.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const handleHighlight = useCallback(
    (color: string) => {
      setLastHighlightColor(color);
      editor?.chain().focus().toggleHighlight({ color }).run();
    },
    [editor]
  );

  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setLinkUrl(editor.getAttributes('link').href || 'https://');
    setLinkOpen(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor || !linkUrl) return;
    if (isSafeURL(linkUrl)) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run();
    }
    setLinkOpen(false);
    setLinkUrl('https://');
  }, [editor, linkUrl]);

  if (!editor) return null;

  const currentFontSize = editor.getAttributes('textStyle')?.fontSize
    ? parseInt(editor.getAttributes('textStyle').fontSize)
    : 14;

  return (
    <BubbleMenu
      // Remount once the boundary resolves so the plugin re-registers with it.
      key={boundary ? 'bounded' : 'unbounded'}
      editor={editor}
      // Only over a real text selection, and not where inline formatting is
      // meaningless (code blocks, selected images).
      shouldShow={({ editor, from, to }) =>
        from !== to &&
        editor.isEditable &&
        !editor.isActive('codeBlock') &&
        !editor.isActive('image')
      }
      // Render into <body> so the menu escapes the editor card's
      // `overflow-hidden` and the resizable panel divider. `shift` (bounded to
      // the builder column) then keeps it from crossing the divider, and the
      // high z-index keeps it above the divider and preview pane.
      appendTo={() => document.body}
      options={{
        placement: 'top',
        offset: 8,
        strategy: 'fixed',
        flip: true,
        shift: { boundary, padding: 8 },
      }}
      className="z-50 flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
    >
      {/* Font size */}
      <Popover>
        <PopoverTrigger asChild>
          <ToolbarButton active={false} onClick={() => {}} label="Font size">
            <span className="text-[10px] font-semibold leading-none">
              {currentFontSize}
            </span>
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent className="w-24 p-1" side="top" align="start">
          <div className="flex flex-col gap-0.5">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={cn(
                  'rounded px-2 py-1 text-xs text-left hover:bg-accent transition-colors',
                  editor.getAttributes('textStyle')?.fontSize === `${size}px` &&
                    'bg-accent font-medium'
                )}
                onClick={() =>
                  editor.chain().focus().setFontSize(`${size}px`).run()
                }
              >
                {size}px
              </button>
            ))}
            <hr className="my-0.5 border-border" />
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left text-muted-foreground hover:bg-accent transition-colors"
              onClick={() => editor.chain().focus().unsetFontSize().run()}
            >
              Default
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarSeparator />

      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
        shortcut="Ctrl+B"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
        shortcut="Ctrl+I"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Underline"
        shortcut="Ctrl+U"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
        shortcut="Ctrl+Shift+S"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      <ColorInput
        label="Font color"
        color={lastTextColor}
        onChange={handleTextColor}
      >
        <Palette className="h-3.5 w-3.5" />
      </ColorInput>
      <ColorInput
        label="Highlight color"
        color={lastHighlightColor}
        onChange={handleHighlight}
      >
        <Highlighter className="h-3.5 w-3.5" />
      </ColorInput>

      <ToolbarSeparator />

      <ToolbarButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        label="Align left"
        shortcut="Ctrl+Shift+L"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        label="Align center"
        shortcut="Ctrl+Shift+E"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        label="Align right"
        shortcut="Ctrl+Shift+R"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
        shortcut="Ctrl+Shift+8"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
        shortcut="Ctrl+Shift+7"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Link */}
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <ToolbarButton
            active={editor.isActive('link')}
            onClick={handleLinkClick}
            label="Add link"
            shortcut="Ctrl+K"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" side="top" align="start">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Link URL
            </label>
            <div className="flex gap-1.5">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://"
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLinkSubmit();
                  }
                }}
                data-testid="bubble-link-url-input"
              />
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleLinkSubmit}
                data-testid="bubble-link-submit-btn"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </BubbleMenu>
  );
}
